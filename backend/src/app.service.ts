import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async seedDatabase() {
    console.log('🌱 Seeding database...');

    // Create company
    const company = await this.prisma.company.upsert({
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
    console.log(`✅ Company created: ${company.nom}`);

    // Create Admin user
    const adminPassword = await bcrypt.hash('Admin@2026!', 12);
    const admin = await this.prisma.user.upsert({
      where: { email: 'admin@crm.local' },
      update: {},
      create: {
        companyId: company.id,
        nom: 'Admin',
        prenom: 'Super',
        email: 'admin@crm.local',
        password: adminPassword,
        role: 'ADMIN',
        actif: true,
        mustChangePassword: false,
      },
    });
    console.log(`✅ Admin user created: ${admin.email}`);

    // Create Technico user
    const technicoPassword = await bcrypt.hash('Technico@2026!', 12);
    const technico = await this.prisma.user.upsert({
      where: { email: 'technico@crm.local' },
      update: {},
      create: {
        companyId: company.id,
        nom: 'Dupont',
        prenom: 'Marc',
        email: 'technico@crm.local',
        password: technicoPassword,
        role: 'TECHNICO',
        telephone: '0678901234',
        actif: true,
        mustChangePassword: false,
      },
    });
    console.log(`✅ Technico user created: ${technico.email}`);

    return {
      message: '✅ Database seeded successfully!',
      users: [
        { email: admin.email, password: 'Admin@2026!', role: 'ADMIN' },
        { email: technico.email, password: 'Technico@2026!', role: 'TECHNICO' },
      ],
    };
  }
}
