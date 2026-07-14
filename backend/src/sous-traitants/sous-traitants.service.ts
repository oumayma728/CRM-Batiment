import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSousTraitantDto } from './dto/create-sous-traitant.dto.js';
import { UpdateSousTraitantDto } from './dto/update-sous-traitant.dto.js';
import { QuerySousTraitantDto } from './dto/query-sous-traitant.dto.js';
import { CreateContratDto } from './dto/create-contrat.dto.js';
import { CreateAssuranceDto } from './dto/create-assurance.dto.js';
import { CreatePaiementDto } from './dto/create-paiement.dto.js';
import { CreateNotationDto } from './dto/create-notation.dto.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';

// Days before expiry to trigger alert
const ALERT_DAYS_BEFORE_EXPIRY = 30;

@Injectable()
export class SousTraitantsService {
  private readonly logger = new Logger(SousTraitantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── SOUS-TRAITANTS CRUD ──────────────────────────────────────────────────

  async create(dto: CreateSousTraitantDto, user: CurrentUserPayload) {
    return this.prisma.sousTraitant.create({
      data: {
        companyId: user.companyId,
        nom: dto.nom,
        siret: dto.siret,
        contact: dto.contact,
        email: dto.email,
        telephone: dto.telephone,
        adresse: dto.adresse,
        specialite: dto.specialite,
        actif: dto.actif ?? true,
      },
    });
  }

  async findAll(query: QuerySousTraitantDto, user: CurrentUserPayload) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { companyId: user.companyId };

    if (query.search) {
      where.OR = [
        { nom: { contains: query.search, mode: 'insensitive' } },
        { contact: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { specialite: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.actif !== undefined) {
      where.actif = query.actif;
    }

    const [data, total] = await Promise.all([
      this.prisma.sousTraitant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nom: 'asc' },
        include: {
          _count: {
            select: {
              contrats: true,
              assurances: true,
              notations: true,
            },
          },
          assurances: {
            where: {
              dateExpiration: {
                lte: new Date(Date.now() + ALERT_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000),
                gte: new Date(),
              },
            },
            select: { id: true, type: true, dateExpiration: true },
          },
        },
      }),
      this.prisma.sousTraitant.count({ where }),
    ]);

    return {
      data: data.map((st) => ({
        ...st,
        assurancesExpirantBientot: st.assurances,
        assurances: undefined,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, user: CurrentUserPayload) {
    const st = await this.prisma.sousTraitant.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        contrats: { orderBy: { dateDebut: 'desc' } },
        assurances: { orderBy: { dateExpiration: 'asc' } },
        paiements: { orderBy: { date: 'desc' } },
        disponibilites: { orderBy: { dateDebut: 'asc' } },
        notations: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!st) {
      throw new NotFoundException(`Sous-traitant #${id} introuvable.`);
    }

    const now = new Date();
    const alertThreshold = new Date(Date.now() + ALERT_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000);

    const noteMoyenne =
      st.notations.length > 0
        ? Math.round((st.notations.reduce((sum, n) => sum + n.note, 0) / st.notations.length) * 10) / 10
        : null;

    return {
      ...st,
      noteMoyenne,
      assurancesExpirees: st.assurances.filter((a) => a.dateExpiration < now),
      assurancesExpirantBientot: st.assurances.filter(
        (a) => a.dateExpiration >= now && a.dateExpiration <= alertThreshold,
      ),
    };
  }

  async update(id: number, dto: UpdateSousTraitantDto, user: CurrentUserPayload) {
    await this.findOne(id, user);

    return this.prisma.sousTraitant.update({
      where: { id },
      data: {
        nom: dto.nom,
        siret: dto.siret,
        contact: dto.contact,
        email: dto.email,
        telephone: dto.telephone,
        adresse: dto.adresse,
        specialite: dto.specialite,
        actif: dto.actif,
      },
    });
  }

  async remove(id: number, user: CurrentUserPayload) {
    await this.findOne(id, user);
    return this.prisma.sousTraitant.delete({ where: { id } });
  }

  // ─── CONTRATS ────────────────────────────────────────────────────────────

  async addContrat(sousTraitantId: number, dto: CreateContratDto, user: CurrentUserPayload) {
    await this.findOne(sousTraitantId, user);

    return this.prisma.contratSousTraitant.create({
      data: {
        sousTraitantId,
        reference: dto.reference,
        dateDebut: new Date(dto.dateDebut),
        dateFin: dto.dateFin ? new Date(dto.dateFin) : undefined,
        montant: dto.montant,
        description: dto.description,
        statut: dto.statut ?? 'ACTIF',
      },
    });
  }

  async removeContrat(sousTraitantId: number, contratId: number, user: CurrentUserPayload) {
    await this.findOne(sousTraitantId, user);
    await this.prisma.contratSousTraitant.delete({ where: { id: contratId } });
    return { message: `Contrat #${contratId} supprimé.` };
  }

  // ─── ASSURANCES ──────────────────────────────────────────────────────────

  async addAssurance(sousTraitantId: number, dto: CreateAssuranceDto, user: CurrentUserPayload) {
    await this.findOne(sousTraitantId, user);

    return this.prisma.assuranceSousTraitant.create({
      data: {
        sousTraitantId,
        type: dto.type,
        compagnie: dto.compagnie,
        numeroPolice: dto.numeroPolice,
        dateDebut: new Date(dto.dateDebut),
        dateExpiration: new Date(dto.dateExpiration),
        montantGarantie: dto.montantGarantie,
        alerteEnvoyee: false,
      },
    });
  }

  async removeAssurance(sousTraitantId: number, assuranceId: number, user: CurrentUserPayload) {
    await this.findOne(sousTraitantId, user);
    await this.prisma.assuranceSousTraitant.delete({ where: { id: assuranceId } });
    return { message: `Assurance #${assuranceId} supprimée.` };
  }

  // ─── PAIEMENTS ────────────────────────────────────────────────────────────

  async addPaiement(sousTraitantId: number, dto: CreatePaiementDto, user: CurrentUserPayload) {
    await this.findOne(sousTraitantId, user);

    return this.prisma.paiementSousTraitant.create({
      data: {
        sousTraitantId,
        montant: dto.montant,
        date: dto.date ? new Date(dto.date) : new Date(),
        reference: dto.reference,
        statut: dto.statut ?? 'EN_ATTENTE',
        notes: dto.notes,
      },
    });
  }

  // ─── NOTATIONS ────────────────────────────────────────────────────────────

  async addNotation(
    sousTraitantId: number,
    dto: CreateNotationDto,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);

    return this.prisma.notationSousTraitant.create({
      data: {
        sousTraitantId,
        note: dto.note,
        commentaire: dto.commentaire,
        critere: dto.critere,
        evaluateurId: user.userId,
      },
    });
  }

  // ─── ALERTES ASSURANCES (job automatique) ────────────────────────────────

  /**
   * P1 — Job d'alertes : détecte les assurances expirant bientôt et loggue
   * (en production, brancher un scheduler NestJS @Cron ou un cron externe)
   */
  async checkAssurancesExpirantes() {
    const threshold = new Date(Date.now() + ALERT_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000);

    const assurancesExpirantes = await this.prisma.assuranceSousTraitant.findMany({
      where: {
        dateExpiration: { lte: threshold, gte: new Date() },
        alerteEnvoyee: false,
      },
      include: {
        sousTraitant: { select: { id: true, nom: true, email: true, companyId: true } },
      },
    });

    let alertCount = 0;

    for (const assurance of assurancesExpirantes) {
      this.logger.warn(
        `[ALERTE ASSURANCE] ${assurance.sousTraitant.nom} — ${assurance.type} expire le ${assurance.dateExpiration.toLocaleDateString('fr-FR')}`,
      );

      // Mark alert as sent to avoid duplicates
      await this.prisma.assuranceSousTraitant.update({
        where: { id: assurance.id },
        data: { alerteEnvoyee: true },
      });

      alertCount++;
    }

    return { alertesEnvoyees: alertCount };
  }
}
