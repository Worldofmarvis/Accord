import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient, OfferBy, NegotiationStatus, PaymentStatus } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running smoothly!' });
});

// GET /api/listings - Public query (hides secret floorPrice)
app.get('/api/listings', async (req: Request, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
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
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// INTERNAL ONLY: Engine limits query (Buyer Max & Seller Floor)
app.get('/api/internal/negotiations/:id/limits', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      select: {
        id: true,
        buyerMaxPrice: true,
        listing: {
          select: {
            floorPrice: true,
          },
        },
      },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    res.json({
      negotiationId: negotiation.id,
      buyerMaxPrice: negotiation.buyerMaxPrice,
      sellerFloorPrice: negotiation.listing.floorPrice,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

// POST /api/negotiations/offer - Submit offer with Day 3 & Day 4 constraints
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

    // Execute within Prisma transaction to enforce Seller Lock
    const result = await prisma.$transaction(async (tx) => {
      let negotiation = await tx.negotiation.findFirst({
        where: { listingId, buyerId, status: NegotiationStatus.OPEN },
      });

      if (!negotiation) {
        negotiation = await tx.negotiation.create({
          data: {
            listingId,
            buyerId,
            status: NegotiationStatus.OPEN,
            buyerMaxPrice: numericAmount,
          },
        });
      }

      const currentRound = negotiation.currentRound ?? 1;

      if (currentRound > 3) {
        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: NegotiationStatus.FAILED },
        });
        throw new Error('MAX_ROUNDS_EXCEEDED');
      }

      const isAutoAccepted = numericAmount >= listing.floorPrice;

      const offer = await tx.offer.create({
        data: {
          negotiationId: negotiation.id,
          proposedPrice: numericAmount,
          roundNumber: currentRound,
          offeredBy: OfferBy.BUYER_AGENT,
        },
      });

      if (isAutoAccepted) {
        negotiation = await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: NegotiationStatus.AGREED, finalPrice: numericAmount },
        });
      }

      await tx.auditEvent.create({
        data: {
          negotiationId: negotiation.id,
          eventType: isAutoAccepted ? 'OFFER_AUTO_ACCEPTED' : 'OFFER_SUBMITTED',
          payload: JSON.stringify({
            offerId: offer.id,
            amount: numericAmount,
            roundNumber: currentRound,
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

// GET /api/negotiations/:id - Fetch negotiation thread
app.get('/api/negotiations/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: {
        offers: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        auditEvents: { orderBy: { createdAt: 'asc' } },
        listing: { select: { title: true, listPrice: true } },
      },
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation thread not found' });
    }

    res.json(negotiation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch negotiation thread' });
  }
});

// GET /api/negotiations/:id/messages - Chat history query
app.get('/api/negotiations/:id/messages', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
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
    const id = req.params.id as string;
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

    // Check if payment record already exists (Idempotency check)
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

// GET /api/internal/negotiations/:id/rematch-candidates - Day 5 Rematch Query
app.get('/api/internal/negotiations/:id/rematch-candidates', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
  
      // 1. Fetch original negotiation to find category and buyer's target price
      const negotiation = await prisma.negotiation.findUnique({
        where: { id },
        include: { listing: true },
      });
  
      if (!negotiation) {
        return res.status(404).json({ error: 'Negotiation not found' });
      }
  
      const buyerTargetPrice = negotiation.buyerMaxPrice || negotiation.listing.listPrice;
      const category = negotiation.listing.category;
  
      // 2. Query other listings in the same category matching the price range
      const candidates = await prisma.listing.findMany({
        where: {
          category,
          id: { not: negotiation.listingId }, // Exclude current listing
          listPrice: { lte: buyerTargetPrice * 1.2 }, // Fits budget window
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