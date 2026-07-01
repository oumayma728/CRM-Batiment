import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import type { CurrentUserPayload } from './common/interfaces/jwt-payload.interface.js';

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

  // ─────────────────────────────────────────────────────────────
  // Dashboard Admin – statistiques P0
  // ─────────────────────────────────────────────────────────────
  async getDashboardStats(user: CurrentUserPayload) {
    const companyId = user.companyId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── 1. Prospects actifs (30 jours) = demandes de devis créées dans les 30 derniers jours
    const prospectsActifs = await this.prisma.demandeDevis.count({
      where: {
        companyId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // ── 2. Devis envoyés / acceptés / refusés (tous temps pour graphique)
    const [devisEnvoyes, devisAcceptes, devisRefuses, devisBrouillons, devisSigne] =
      await Promise.all([
        this.prisma.devis.count({ where: { companyId, statut: 'ENVOYE' } }),
        this.prisma.devis.count({ where: { companyId, statut: 'ACCEPTE' } }),
        this.prisma.devis.count({ where: { companyId, statut: 'REFUSE' } }),
        this.prisma.devis.count({ where: { companyId, statut: 'BROUILLON' } }),
        this.prisma.devis.count({ where: { companyId, statut: 'SIGNE' } }),
      ]);

    // ── 3. Taux de conversion & CA signé du mois
    const totalDevisEnvoye = devisEnvoyes + devisAcceptes + devisRefuses + devisSigne;
    const tauxConversion =
      totalDevisEnvoye > 0
        ? Math.round(((devisAcceptes + devisSigne) / totalDevisEnvoye) * 100)
        : 0;

    // CA signé = somme des totalTTC des devis SIGNE créés ce mois
    const caSigneMoisResult = await this.prisma.devis.aggregate({
      where: {
        companyId,
        statut: { in: ['SIGNE', 'ACCEPTE'] },
        dateValidation: { gte: startOfMonth },
      },
      _sum: { totalTTC: true },
    });
    const caSigneMois = caSigneMoisResult._sum.totalTTC ?? 0;

  // ── 4. Factures impayées (statut ENVOYEE)
  const [facturesImpayeesResult, facturesImpayeesNombre] = await Promise.all([
    this.prisma.facture.aggregate({
      where: {
        statut: 'ENVOYEE',
        devis: {
          companyId,
        },
      },
      _sum: {
        montantTTC: true,
      },
    }),

    this.prisma.facture.count({
      where: {
        statut: 'ENVOYEE',
        devis: {
          companyId,
        },
      },
    }),
  ]);

  const facturesImpayeesMontant = facturesImpayeesResult._sum.montantTTC ?? 0;
    // ── 5. Chantiers en retard : dateFinPrevue dépassée et statut pas TERMINE/CLOTURE
    const chantiersEnRetard = await this.prisma.chantier.count({
      where: {
        companyId,
        statut: { notIn: ['TERMINE', 'CLOTURE'] },
        dateFin: { lt: now },
      },
    });

    // ── 6. Commandes fournisseur en attente (CREEE ou ENVOYEE)
    const commandesEnAttente =
      await this.prisma.commandeFournisseur.count({
        where: {
          statutLivraison: {
            in: ['CREEE', 'ENVOYEE'],
          },
          devis: {
            companyId,
          },
        },
      });

    // ── 7. Marge moyenne par devis (sur tous les devis avec coutTotal > 0)
    const margeDevisResult = await this.prisma.devis.aggregate({
      where: {
        companyId,
        coutTotal: { gt: 0 },
      },
      _avg: { margePourcent: true },
    });
    const margeMoyenneDevis = Math.round(margeDevisResult._avg.margePourcent ?? 0);

    return {
      prospectsActifs,
      devis: {
        envoyes: devisEnvoyes,
        acceptes: devisAcceptes,
        refuses: devisRefuses,
        brouillons: devisBrouillons,
        signes: devisSigne,
      },
      tauxConversion,
      caSigneMois,
      facturesImpayees: {
        montant: facturesImpayeesMontant,
        nombre: facturesImpayeesNombre,
      },
      chantiersEnRetard,
      commandesEnAttente,
      margeMoyenneDevis,
    };
  }
}