import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient, NegotiationStatus, OfferBy, PaymentStatus, ProposalStatus } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Helper for standardized contract errors
const sendApiError = (res: Response, status: number, code: string, message: string) => {
  return res.status(status).json({ error: { code, message } });
};

// GET /api/health - Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running smoothly!' });
});

// GET /api/me - Authenticated user info
app.get('/api/me', async (_req: Request, res: Response) => {
  const user = await prisma.user.findFirst();
  if (!user) return sendApiError(res, 401, 'UNAUTHENTICATED', 'Please sign in to continue');

  res.json({
    id: user.id,
    name: user.name,
    roles: (user.roles || [user.role]).map((r: string) => r.toLowerCase()),
  });
});

// GET /api/listings - Search public listings (floorPrice hidden)
app.get('/api/listings', async (req: Request, res: Response) => {
  try {
    const { keyword, category, maxPrice } = req.query;

    const where: any = {};
    if (category) where.category = String(category);
    if (maxPrice) where.listPrice = { lte: Number(maxPrice) };
    if (keyword) {
      where.OR = [
        { title: { contains: String(keyword), mode: 'insensitive' } },
        { description: { contains: String(keyword), mode: 'insensitive' } },
      ];
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        seller: true,
        negotiations: { where: { status: NegotiationStatus.OPEN } },
      },
    });

    const result = listings.map((l) => ({
      id: l.id,
      title: l.title,
      sellerName: l.seller.name,
      description: l.description,
      categories: [l.category],
      tags: [l.category.toLowerCase()],
      listPrice: l.listPrice,
      deliveryDays: l.deliveryDays ?? 7,
      locked: l.negotiations.length > 0,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// POST /api/proposals - Create a negotiation proposal
app.post('/api/proposals', async (req: Request, res: Response) => {
  try {
    const { listingId, requestId } = req.body;

    const activeNeg = await prisma.negotiation.findFirst({
      where: { listingId, status: NegotiationStatus.OPEN },
    });
    if (activeNeg) {
      return sendApiError(res, 409, 'SELLER_LOCKED', 'Listing is currently in an active negotiation');
    }

    const proposal = await prisma.proposal.create({
      data: { listingId, requestId, status: ProposalStatus.PENDING },
    });

    res.status(201).json({ id: proposal.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// POST /api/proposals/:id/accept - Accept proposal & create active negotiation
app.post('/api/proposals/:id/accept', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findUnique({
        where: { id: String(id) },
        include: { listing: true, request: true },
      });

      if (!proposal || proposal.status !== ProposalStatus.PENDING) {
        throw new Error('NOT_FOUND');
      }

      const activeNeg = await tx.negotiation.findFirst({
        where: { listingId: proposal.listingId, status: NegotiationStatus.OPEN },
      });
      if (activeNeg) throw new Error('SELLER_LOCKED');

      const negotiation = await tx.negotiation.create({
        data: {
          listingId: proposal.listingId,
          buyerId: proposal.request.buyerId,
          status: NegotiationStatus.OPEN,
          buyerMaxPrice: proposal.request.maxPrice,
          currentRound: 1,
        },
      });

      const updatedProposal = await tx.proposal.update({
        where: { id: String(id) },
        data: { status: ProposalStatus.ACCEPTED, negotiationId: negotiation.id },
        include: {
          listing: { include: { seller: true } },
          request: { include: { buyer: true } },
        },
      });

      return updatedProposal;
    });

    res.json({
      id: result.id,
      direction: 'incoming',
      status: 'accepted',
      createdAt: result.createdAt,
      listing: {
        id: result.listing.id,
        title: result.listing.title,
        sellerName: result.listing.seller.name,
        listPrice: result.listing.listPrice,
      },
      request: {
        id: result.request.id,
        title: result.request.title,
        buyerName: result.request.buyer.name,
        deliverables: result.request.deliverables,
        deadline: result.request.deadline,
      },
      negotiationId: result.negotiationId,
    });
  } catch (error: any) {
    if (error.message === 'SELLER_LOCKED') {
      return sendApiError(res, 409, 'SELLER_LOCKED', 'Listing locked by another negotiation');
    }
    return sendApiError(res, 404, 'NOT_FOUND', 'Proposal not found');
  }
});

// GET /api/negotiations/:id - Fetch negotiation thread with role-based view
app.get('/api/negotiations/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const callerId = (req.headers['x-user-id'] as string) || '';

    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: {
        listing: { include: { seller: true } },
        offers: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        auditEvents: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!negotiation) return sendApiError(res, 404, 'NOT_FOUND', 'Negotiation not found');

    const isBuyer = callerId === negotiation.buyerId;
    const viewerRole = isBuyer ? 'buyer' : 'seller';

    res.json({
      id: negotiation.id,
      status: negotiation.status === NegotiationStatus.OPEN ? 'active' : negotiation.status.toLowerCase(),
      viewerRole,
      service: negotiation.listing.title,
      counterpartName: isBuyer ? negotiation.listing.seller.name : 'Buyer',
      listPrice: negotiation.listing.listPrice,
      round: negotiation.currentRound,
      maxRounds: 3,
      waitingOn: 'seller',
      ...(isBuyer
        ? { buyerLimits: { target: (negotiation.buyerMaxPrice || 0) * 0.9, max: negotiation.buyerMaxPrice } }
        : { sellerLimits: { floor: negotiation.listing.floorPrice } }),
      agreedPrice: negotiation.finalPrice || null,
      offers: negotiation.offers.map((o) => ({
        round: o.roundNumber,
        role: o.offeredBy === OfferBy.BUYER_AGENT ? 'buyer' : 'seller',
        amount: o.proposedPrice,
        note: 'Processed by negotiation engine',
      })),
      messages: negotiation.messages,
      auditEvents: negotiation.auditEvents,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch negotiation thread' });
  }
});

// POST /api/negotiations/offer - Submit offer with Round limits & Seller Lock
app.post('/api/negotiations/offer', async (req: Request, res: Response) => {
  try {
    const { listingId, buyerId, amount } = req.body;
    const numericAmount = Number(amount);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let negotiation = await tx.negotiation.findFirst({
        where: { listingId, buyerId, status: NegotiationStatus.OPEN },
        include: { offers: true },
      });

      if (!negotiation) {
        negotiation = await tx.negotiation.create({
          data: {
            listingId,
            buyerId,
            status: NegotiationStatus.OPEN,
            buyerMaxPrice: numericAmount,
            currentRound: 1,
          },
          include: { offers: true },
        });
      }

      if (negotiation.currentRound > 3) {
        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: NegotiationStatus.FAILED },
        });
        throw new Error('MAX_ROUNDS_EXCEEDED');
      }

      const activeRound = negotiation.currentRound;
      const isAutoAccepted = numericAmount >= listing.floorPrice;

      const offer = await tx.offer.create({
        data: {
          negotiationId: negotiation.id,
          proposedPrice: numericAmount,
          roundNumber: activeRound,
          offeredBy: OfferBy.BUYER_AGENT,
        },
      });

      if (isAutoAccepted) {
        negotiation = await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: NegotiationStatus.AGREED, finalPrice: numericAmount },
          include: { offers: true },
        });
      } else {
        const nextRound = activeRound + 1;
        if (nextRound > 3) {
          negotiation = await tx.negotiation.update({
            where: { id: negotiation.id },
            data: { status: NegotiationStatus.FAILED, currentRound: nextRound },
            include: { offers: true },
          });
        } else {
          negotiation = await tx.negotiation.update({
            where: { id: negotiation.id },
            data: { currentRound: nextRound },
            include: { offers: true },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          negotiationId: negotiation.id,
          eventType: isAutoAccepted ? 'OFFER_AUTO_ACCEPTED' : 'OFFER_SUBMITTED',
          payload: JSON.stringify({
            offerId: offer.id,
            amount: numericAmount,
            roundNumber: activeRound,
          }),
        },
      });

      return { offer, negotiationStatus: negotiation.status, isAutoAccepted };
    });

    res.status(201).json({
      message: result.isAutoAccepted
        ? 'Offer accepted automatically!'
        : 'Offer submitted to seller.',
      offer: result.offer,
      negotiationStatus: result.negotiationStatus,
    });
  } catch (error: any) {
    if (error.message === 'MAX_ROUNDS_EXCEEDED') {
      return res.status(400).json({
        error: 'Negotiation failed: Maximum 3 rounds exceeded.',
        status: NegotiationStatus.FAILED,
      });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to process offer' });
  }
});

// GET /api/negotiations/:id/messages - Chat history query
app.get('/api/negotiations/:id/messages', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const messages = await prisma.message.findMany({
      where: { negotiationId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// POST /api/negotiations/:id/messages - Send a message
app.post('/api/negotiations/:id/messages', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { senderId, content } = req.body;

    const message = await prisma.message.create({
      data: {
        negotiationId: id,
        senderId,
        content,
      },
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/payments/webhook - Idempotent PayPal update handler
app.post('/api/payments/webhook', async (req: Request, res: Response) => {
  try {
    const { paypalOrderId, negotiationId, amount, status } = req.body;

    const existingPayment = await prisma.payment.findUnique({
      where: { paypalOrderId },
    });

    if (existingPayment) {
      return res.status(200).json({
        message: 'Payment already processed (idempotent response).',
        payment: existingPayment,
      });
    }

    const paymentStatus: PaymentStatus =
      status === 'COMPLETED' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING;

    const payment = await prisma.payment.create({
      data: {
        paypalOrderId,
        negotiationId,
        amount: Number(amount),
        status: paymentStatus,
      },
    });

    res.status(201).json({
      message: 'Payment recorded successfully.',
      payment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process payment webhook' });
  }
});

// GET /api/internal/negotiations/:id/rematch-candidates - Engine Rematch Query
app.get('/api/internal/negotiations/:id/rematch-candidates', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const buyerTargetPrice = negotiation.buyerMaxPrice || negotiation.listing.listPrice;
    const category = negotiation.listing.category;

    const candidates = await prisma.listing.findMany({
      where: {
        category,
        id: { not: negotiation.listingId },
        listPrice: { lte: buyerTargetPrice * 1.2 },
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        listPrice: true,
        sellerId: true,
        createdAt: true,
      },
    });

    res.json({
      negotiationId: id,
      category,
      buyerTargetPrice,
      candidateCount: candidates.length,
      candidates,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to find rematch candidates' });
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});