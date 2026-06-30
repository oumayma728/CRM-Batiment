import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { fakerFR as faker } from '@faker-js/faker';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const tunisianCities = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Nabeul', 'Kairouan', 'Gabès', 'Monastir', 'Ariana', 'Ben Arous', 'Gafsa', 'Mahdia', 'Hammamet', 'Djerba', 'Zarzis'];

function generateTunisianPhone() {
  const prefixes = ['2', '5', '9', '4', '7'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `+216 ${prefix}${faker.string.numeric(7)}`;
}

async function main() {
  console.log('🌱 Generating 25 rows of mock data for each CRUD table...\n');

  // Fetch default company
  const company = await prisma.company.findFirst({
    where: { nom: 'Bâtiment Pro SARL' }
  });

  if (!company) {
    console.error('❌ Default company "Bâtiment Pro SARL" not found. Please run "npm run seed" first.');
    process.exit(1);
  }

  // Fetch admin user
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@batiment-pro.fr' }
  });

  console.log(`✅ Using Company: ${company.nom} (ID: ${company.id})`);

  // 1. Clients
  console.log('Generating 25 Clients...');
  const clients = [];
  for (let i = 0; i < 25; i++) {
    const isCompany = faker.datatype.boolean();
    const city = faker.helpers.arrayElement(tunisianCities);
    const client = await prisma.client.create({
      data: {
        companyId: company.id,
        nom: isCompany ? faker.company.name() : faker.person.lastName(),
        prenom: isCompany ? null : faker.person.firstName(),
        telephone: generateTunisianPhone(),
        email: faker.internet.email(),
        adresseClient: `${faker.location.streetAddress()}, ${city}`,
        adresseChantier: `${faker.location.streetAddress()}, ${city}`,
        source: faker.helpers.arrayElement(['CHATBOT', 'TECHNICO_COMMERCIAL', 'APPEL', 'RECOMMANDATION', 'SITE_WEB', 'AUTRE']),
        notes: faker.lorem.sentence()
      }
    });
    clients.push(client);
  }
  console.log('✅ 25 Clients generated.');

  // 2. Fournisseurs
  console.log('Generating 25 Fournisseurs...');
  const fournisseurs = [];
  for (let i = 0; i < 25; i++) {
    const city = faker.helpers.arrayElement(tunisianCities);
    const fournisseur = await prisma.fournisseur.create({
      data: {
        companyId: company.id,
        nom: faker.company.name(),
        contact: faker.person.fullName(),
        email: faker.internet.email(),
        telephone: generateTunisianPhone(),
        adresse: `${faker.location.streetAddress()}, ${city}`,
        typesMateriaux: faker.helpers.arrayElement(['Ciment et Briques', 'Plomberie', 'Électricité', 'Bois et Menuiserie', 'Peinture', 'Carrelage']),
        delaiLivraison: faker.number.int({ min: 1, max: 14 }),
        conditions: 'Paiement à 30 jours',
      }
    });
    fournisseurs.push(fournisseur);
  }
  console.log('✅ 25 Fournisseurs generated.');

  // 3. Equipes
  console.log('Generating 25 Equipes...');
  const equipes = [];
  const teamTypes = ['Gros Œuvre', 'Plomberie', 'Électricité', 'Finitions', 'Menuiserie'];
  for (let i = 0; i < 25; i++) {
    const equipe = await prisma.equipe.create({
      data: {
        companyId: company.id,
        nom: `Équipe ${faker.helpers.arrayElement(teamTypes)} - ${faker.helpers.arrayElement(tunisianCities)}`,
        type: faker.helpers.arrayElement(['INTERNE', 'SOUS_TRAITANT']),
      }
    });
    equipes.push(equipe);
  }
  console.log('✅ 25 Equipes generated.');

  // 4. Chantiers
  console.log('Generating 25 Chantiers...');
  const chantiers = [];
  for (let i = 0; i < 25; i++) {
    const client = faker.helpers.arrayElement(clients);
    const city = faker.helpers.arrayElement(tunisianCities);
    const chantier = await prisma.chantier.create({
      data: {
        companyId: company.id,
        clientId: client.id,
        reference: `CH-${faker.string.alphanumeric(8).toUpperCase()}`,
        adresse: `${faker.location.streetAddress()}, ${city}`,
        description: faker.lorem.paragraph(),
        statut: faker.helpers.arrayElement(['VISITE_TECHNIQUE', 'PLANIFIE', 'DEMARRE', 'EN_COURS', 'TERMINE', 'CLOTURE']),
        dateDebut: faker.date.recent({ days: 30 }),
        dateFin: faker.date.future({ years: 1 }),
      }
    });
    chantiers.push(chantier);
  }
  console.log('✅ 25 Chantiers generated.');

  // 5. Taches
  console.log('Generating 25 Taches...');
  for (let i = 0; i < 25; i++) {
    const chantier = faker.helpers.arrayElement(chantiers);
    await prisma.tache.create({
      data: {
        chantierId: chantier.id,
        libelle: faker.helpers.arrayElement(['Préparation du terrain', 'Fondations', 'Coulage béton', 'Installation électrique', 'Plomberie sanitaire', 'Pose carrelage', 'Peinture intérieure', 'Menuiserie extérieure']),
        description: faker.lorem.sentence(),
        statut: faker.helpers.arrayElement(['A_FAIRE', 'EN_COURS', 'TERMINEE', 'BLOQUEE']),
        dateDebut: faker.date.recent({ days: 10 }),
        dateFin: faker.date.future({ years: 0.5 }),
        avancement: faker.number.int({ min: 0, max: 100 }),
      }
    });
  }
  console.log('✅ 25 Taches generated.');

  // 6. DemandesDevis
  console.log('Generating 25 DemandesDevis...');
  const demandes = [];
  for (let i = 0; i < 25; i++) {
    const client = faker.helpers.arrayElement(clients);
    const demande = await prisma.demandeDevis.create({
      data: {
        companyId: company.id,
        clientId: client.id,
        createurId: adminUser ? adminUser.id : null,
        source: faker.helpers.arrayElement(['CHATBOT', 'TECHNICO_COMMERCIAL', 'APPEL', 'RECOMMANDATION', 'SITE_WEB']),
        description: faker.lorem.paragraph(),
        statut: faker.helpers.arrayElement(['NOUVEAU', 'EN_COURS', 'QUALIFIE', 'CONVERTI', 'PERDU'])
      }
    });
    demandes.push(demande);
  }
  console.log('✅ 25 DemandesDevis generated.');

  // 7. Devis
  console.log('Generating 25 Devis...');
  const devisList = [];
  for (let i = 0; i < 25; i++) {
    const client = faker.helpers.arrayElement(clients);
    const chantier = faker.helpers.arrayElement(chantiers);
    const demande = faker.helpers.arrayElement(demandes);
    
    const totalHT = faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 });
    const totalTVA = totalHT * 0.19; // 19% TVA in Tunisia for most services
    const totalTTC = totalHT + totalTVA;

    const devis = await prisma.devis.create({
      data: {
        companyId: company.id,
        clientId: client.id,
        chantierId: faker.datatype.boolean() ? chantier.id : null,
        demandeDevisId: faker.datatype.boolean() ? demande.id : null,
        createurId: adminUser ? adminUser.id : null,
        reference: `DEV-${faker.string.alphanumeric(8).toUpperCase()}`,
        statut: faker.helpers.arrayElement(['BROUILLON', 'ENVOYE', 'ACCEPTE', 'SIGNE', 'REFUSE', 'ANNULE']),
        totalHT,
        totalTVA,
        totalTTC,
        coutTotal: totalHT * 0.7,
        profit: totalHT * 0.3,
        margePourcent: 30,
        tauxTVA: 19.0,
      }
    });
    devisList.push(devis);
  }
  console.log('✅ 25 Devis generated.');

  // 8. Factures
  console.log('Generating 25 Factures...');
  for (let i = 0; i < 25; i++) {
    const devis = faker.helpers.arrayElement(devisList);
    
    await prisma.facture.create({
      data: {
        devisId: devis.id,
        reference: `FAC-${faker.string.alphanumeric(8).toUpperCase()}`,
        montantHT: devis.totalHT,
        montantTVA: devis.totalTVA,
        montantTTC: devis.totalTTC,
        statut: faker.helpers.arrayElement(['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE']),
        tauxTVA: 19.0,
        typeFacture: faker.helpers.arrayElement(['ACOMPTE', 'FINALE']),
        nomClient: "Mock Client",
        emailClient: faker.internet.email(),
        companyNom: company.nom,
      }
    });
  }
  console.log('✅ 25 Factures generated.');

  console.log('\n🎉 Mock data generation complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during mock seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
