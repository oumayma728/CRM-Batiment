const { PrismaClient } = require('./generated/prisma/client');
const p = new PrismaClient();

async function main() {
  const clients = await p.client.findMany({
    where: { telephone: { not: null } },
    take: 5,
    select: { id: true, nom: true, prenom: true, telephone: true },
  });
  console.log(JSON.stringify(clients, null, 2));
  
  // Also get their devis/chantiers
  if (clients.length > 0) {
    const devis = await p.devis.findMany({
      where: { clientId: { in: clients.map(c => c.id) } },
      take: 5,
      select: { id: true, clientId: true, reference: true, statut: true, chantierId: true },
    });
    console.log('\n--- DEVIS ---');
    console.log(JSON.stringify(devis, null, 2));
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
