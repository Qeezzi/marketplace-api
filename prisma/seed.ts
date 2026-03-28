import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function seedId(name: string): string {
  return `seed-${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
}

async function main() {
  const catalog: Array<{
    name: string;
    description: string;
    price: Prisma.Decimal;
    stock: number;
  }> = [
    {
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      price: new Prisma.Decimal('29.99'),
      stock: 500,
    },
    {
      name: 'USB-C Hub',
      description: '7-in-1 hub',
      price: new Prisma.Decimal('49.50'),
      stock: 200,
    },
    {
      name: 'Mechanical Keyboard',
      description: 'Tactile switches',
      price: new Prisma.Decimal('119.00'),
      stock: 80,
    },
  ];

  for (const item of catalog) {
    const id = seedId(item.name);
    await prisma.product.upsert({
      where: { id },
      update: {},
      create: { id, ...item },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
