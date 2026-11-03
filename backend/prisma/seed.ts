import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

 
  const seller = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {
      roles: [Role.SELLER],
    },
    create: {
      email: 'seller@example.com',
      name: 'Alice Seller',
      role: Role.SELLER,
      roles: [Role.SELLER],
    },
  });

  
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {
      roles: [Role.BUYER],
    },
    create: {
      email: 'buyer@example.com',
      name: 'Bob Buyer',
      role: Role.BUYER,
      roles: [Role.BUYER],
    },
  });

  // 3. Create candidate listing #1 (Mechanical Keyboard)
  const listing1 = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      title: 'Vintage Mechanical Keyboard',
      description: 'Fully customized hot-swappable keyboard in prime condition.',
      category: 'Electronics',
      listPrice: 150.0,
      floorPrice: 110.0,
    },
  });

  // 4. Create candidate listing #2 (Ergonomic Wireless Keyboard for rematch candidate test)
  const listing2 = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      title: 'Ergonomic Wireless Keyboard',
      description: 'Brand new wireless keyboard with wrist rest.',
      category: 'Electronics',
      listPrice: 95.0,
      floorPrice: 80.0,
    },
  });

  console.log('Seed completed successfully!');
  console.log({ seller, buyer, listing1, listing2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });