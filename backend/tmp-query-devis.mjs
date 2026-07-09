import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const stats = await prisma.devis.groupBy({
    by: ['statut'],
    _count: true,
    _sum: { totalTTC: true },
  });
  console.log('STATS:', JSON.stringify(stats, null, 2));

  const won = await prisma.devis.findMany({
    where: { statut: { in: ['ACCEPTE', 'SIGNE'] } },
    select: {
      id: true,
      statut: true,
      totalTTC: true,
      dateValidation: true,
      signatureClientDate: true,
      createdAt: true,
    },
  });
  console.log('WON:', JSON.stringify(won, null, 2));

  const sample = await prisma.devis.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      statut: true,
      totalTTC: true,
      dateValidation: true,
      createdAt: true,
    },
  });
  console.log('RECENT:', JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
