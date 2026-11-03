import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDemoData() {
  console.log('Resetting demo database...');

  await prisma.auditEvent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.dealApproval.deleteMany({});
  await prisma.proposal.deleteMany({});     
  await prisma.negotiation.deleteMany({});
  await prisma.buyerRequest.deleteMany({}); 
  await prisma.listing.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Database cleaned successfully!');
}

resetDemoData()
  .catch((e) => {
    console.error('Failed to reset demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });