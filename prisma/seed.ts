import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding de la base de données...\n');

  // 1. Créer l'entreprise par défaut
  const company = await prisma.company.upsert({
    where: { siret: '12345678901234' },
    update: {},
    create: {
      nom: 'Bâtiment Pro SARL',
      siret: '12345678901234',
      adresse: '123 Rue de la Construction, 75001 Paris',
      telephone: '0145678900',
      email: 'contact@batiment-pro.fr',
      tvaDefaut: 20.0,
      devise: 'EUR',
    },
  });
  console.log(`✅ Entreprise créée : ${company.nom} (ID: ${company.id})`);

  // 2. Créer le compte Admin initial
  const adminPassword = await bcrypt.hash('Admin@2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@batiment-pro.fr' },
    update: {},
    create: {
      companyId: company.id,
      nom: 'Admin',
      prenom: 'Super',
      email: 'admin@batiment-pro.fr',
      password: adminPassword,
      role: 'ADMIN',
      actif: true,
      mustChangePassword: false, // L'admin initial n'a pas besoin de changer
    },
  });
  console.log(`✅ Admin créé : ${admin.email} (ID: ${admin.id})`);
  console.log(`   Mot de passe : Admin@2026!`);
