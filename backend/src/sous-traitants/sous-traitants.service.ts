import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSousTraitantDto } from './dto/create-sous-traitant.dto.js';
import { UpdateSousTraitantDto } from './dto/update-sous-traitant.dto.js';
import { QuerySousTraitantDto } from './dto/query-sous-traitant.dto.js';
import { CreateContratDto } from './dto/create-contrat.dto.js';
import { CreateAssuranceDto } from './dto/create-assurance.dto.js';
import { CreatePaiementDto } from './dto/create-paiement.dto.js';
import { CreateNotationDto } from './dto/create-notation.dto.js';
import { UpdateContratDto } from './dto/update-contrat.dto.js';
import { UpdateAssuranceDto } from './dto/update-assurance.dto.js';
import { UpdatePaiementDto } from './dto/update-paiement.dto.js';
import { CreateDisponibiliteDto } from './dto/create-disponibilite.dto.js';
import { UpdateDisponibiliteDto } from './dto/update-disponibilite.dto.js';
import { UpdateNotationDto } from './dto/update-notation.dto.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';

// Days before expiry to trigger alert
const ALERT_DAYS_BEFORE_EXPIRY = 30;

@Injectable()
export class SousTraitantsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SousTraitantsService.name);
  private insuranceAlertTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {}

  private async validatePortalAccount(
    userId: number | undefined,
    companyId: number,
  ) {
    if (userId === undefined) return;
    const account = await this.prisma.user.findFirst({
      where: { id: userId, companyId, role: 'SOUS_TRAITANT', actif: true },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException(
        'Le compte portail doit etre un sous-traitant actif de cette entreprise.',
      );
    }
  }

  async onModuleInit() {
    await this.runInsuranceAlertJob();
    this.insuranceAlertTimer = setInterval(
      () => {
        void this.runInsuranceAlertJob();
      },
      24 * 60 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.insuranceAlertTimer) clearInterval(this.insuranceAlertTimer);
  }

  private async runInsuranceAlertJob() {
    try {
      const result = await this.checkAssurancesExpirantes();
      if (result.alertesEnvoyees > 0) {
        this.logger.log(
          `${result.alertesEnvoyees} alerte(s) assurance envoyee(s).`,
        );
      }
    } catch (error) {
      this.logger.error('Le job automatique des assurances a echoue.', error);
    }
  }

  // ─── SOUS-TRAITANTS CRUD ──────────────────────────────────────────────────

  async create(dto: CreateSousTraitantDto, user: CurrentUserPayload) {
    await this.validatePortalAccount(dto.userId, user.companyId);
    return this.prisma.sousTraitant.create({
      data: {
        companyId: user.companyId,
        userId: dto.userId,
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
                lte: new Date(
                  Date.now() + ALERT_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000,
                ),
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
    const alertThreshold = new Date(
      Date.now() + ALERT_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000,
    );

    const noteMoyenne =
      st.notations.length > 0
        ? Math.round(
            (st.notations.reduce((sum, n) => sum + n.note, 0) /
              st.notations.length) *
              10,
          ) / 10
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

  async update(
    id: number,
    dto: UpdateSousTraitantDto,
    user: CurrentUserPayload,
  ) {
    await this.findOne(id, user);
    await this.validatePortalAccount(dto.userId, user.companyId);

    return this.prisma.sousTraitant.update({
      where: { id },
      data: {
        userId: dto.userId,
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

  async addContrat(
    sousTraitantId: number,
    dto: CreateContratDto,
    user: CurrentUserPayload,
  ) {
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

  async removeContrat(
    sousTraitantId: number,
    contratId: number,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    await this.prisma.contratSousTraitant.deleteMany({
      where: { id: contratId, sousTraitantId },
    });
    return { message: `Contrat #${contratId} supprimé.` };
  }

  async updateContrat(
    sousTraitantId: number,
    contratId: number,
    dto: UpdateContratDto,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    return this.prisma.contratSousTraitant.update({
      where: { id: contratId, sousTraitantId },
      data: {
        reference: dto.reference,
        dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : undefined,
        dateFin: dto.dateFin ? new Date(dto.dateFin) : undefined,
        montant: dto.montant,
        description: dto.description,
        statut: dto.statut,
      },
    });
  }

  // ─── ASSURANCES ──────────────────────────────────────────────────────────

  async addAssurance(
    sousTraitantId: number,
    dto: CreateAssuranceDto,
    user: CurrentUserPayload,
  ) {
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

  async removeAssurance(
    sousTraitantId: number,
    assuranceId: number,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    await this.prisma.assuranceSousTraitant.deleteMany({
      where: { id: assuranceId, sousTraitantId },
    });
    return { message: `Assurance #${assuranceId} supprimée.` };
  }

  async updateAssurance(
    sousTraitantId: number,
    assuranceId: number,
    dto: UpdateAssuranceDto,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    return this.prisma.assuranceSousTraitant.update({
      where: { id: assuranceId, sousTraitantId },
      data: {
        type: dto.type,
        compagnie: dto.compagnie,
        numeroPolice: dto.numeroPolice,
        dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : undefined,
        dateExpiration: dto.dateExpiration
          ? new Date(dto.dateExpiration)
          : undefined,
        montantGarantie: dto.montantGarantie,
        alerteEnvoyee: false,
      },
    });
  }

  // ─── PAIEMENTS ────────────────────────────────────────────────────────────

  async addPaiement(
    sousTraitantId: number,
    dto: CreatePaiementDto,
    user: CurrentUserPayload,
  ) {
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

  async updatePaiement(
    sousTraitantId: number,
    paiementId: number,
    dto: UpdatePaiementDto,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    return this.prisma.paiementSousTraitant.update({
      where: { id: paiementId, sousTraitantId },
      data: {
        montant: dto.montant,
        date: dto.date ? new Date(dto.date) : undefined,
        reference: dto.reference,
        statut: dto.statut,
        notes: dto.notes,
      },
    });
  }

  async removePaiement(
    sousTraitantId: number,
    paiementId: number,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    const result = await this.prisma.paiementSousTraitant.deleteMany({
      where: { id: paiementId, sousTraitantId },
    });
    if (!result.count)
      throw new NotFoundException(`Paiement #${paiementId} introuvable.`);
    return { message: `Paiement #${paiementId} supprime.` };
  }

  async addDisponibilite(
    sousTraitantId: number,
    dto: CreateDisponibiliteDto,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    return this.prisma.disponibiliteSousTraitant.create({
      data: {
        sousTraitantId,
        dateDebut: new Date(dto.dateDebut),
        dateFin: new Date(dto.dateFin),
        disponible: dto.disponible ?? true,
        notes: dto.notes,
      },
    });
  }

  async updateDisponibilite(
    sousTraitantId: number,
    disponibiliteId: number,
    dto: UpdateDisponibiliteDto,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    return this.prisma.disponibiliteSousTraitant.update({
      where: { id: disponibiliteId, sousTraitantId },
      data: {
        dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : undefined,
        dateFin: dto.dateFin ? new Date(dto.dateFin) : undefined,
        disponible: dto.disponible,
        notes: dto.notes,
      },
    });
  }

  async removeDisponibilite(
    sousTraitantId: number,
    disponibiliteId: number,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    await this.prisma.disponibiliteSousTraitant.deleteMany({
      where: { id: disponibiliteId, sousTraitantId },
    });
    return { message: `Disponibilite #${disponibiliteId} supprimee.` };
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

  async updateNotation(
    sousTraitantId: number,
    notationId: number,
    dto: UpdateNotationDto,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    return this.prisma.notationSousTraitant.update({
      where: { id: notationId, sousTraitantId },
      data: {
        note: dto.note,
        commentaire: dto.commentaire,
        critere: dto.critere,
      },
    });
  }

  async removeNotation(
    sousTraitantId: number,
    notationId: number,
    user: CurrentUserPayload,
  ) {
    await this.findOne(sousTraitantId, user);
    await this.prisma.notationSousTraitant.deleteMany({
      where: { id: notationId, sousTraitantId },
    });
    return { message: `Notation #${notationId} supprimee.` };
  }

  // ─── ALERTES ASSURANCES (job automatique) ────────────────────────────────

  /** P1 — Détecte les assurances expirant dans les 30 prochains jours. */
  async checkAssurancesExpirantes() {
    const threshold = new Date(
      Date.now() + ALERT_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000,
    );

    const assurancesExpirantes =
      await this.prisma.assuranceSousTraitant.findMany({
        where: {
          dateExpiration: { lte: threshold, gte: new Date() },
          alerteEnvoyee: false,
        },
        include: {
          sousTraitant: {
            select: { id: true, nom: true, email: true, companyId: true },
          },
        },
      });

    let alertCount = 0;

    for (const assurance of assurancesExpirantes) {
      this.logger.warn(
        `[ALERTE ASSURANCE] ${assurance.sousTraitant.nom} — ${assurance.type} expire le ${assurance.dateExpiration.toLocaleDateString('fr-FR')}`,
      );

      // Mark alert as sent to avoid duplicates
      await this.prisma.$transaction(async (transaction) => {
        await transaction.assuranceSousTraitant.update({
          where: { id: assurance.id },
          data: { alerteEnvoyee: true },
        });
        await transaction.auditLog.create({
          data: {
            companyId: assurance.sousTraitant.companyId,
            action: 'NOTIFICATION_SUBCONTRACTOR_INSURANCE_EXPIRY',
            entite: 'AssuranceSousTraitant',
            entiteId: assurance.id,
            nouvelleValeur: {
              audience: 'INTERNAL',
              category: 'INSURANCE_EXPIRY',
              level: 'warning',
              title: 'Assurance sous-traitant bientot expirée',
              message: `L'assurance ${assurance.type} de ${assurance.sousTraitant.nom} expire le ${assurance.dateExpiration.toLocaleDateString('fr-FR')}.`,
              metadata: {
                sousTraitantId: assurance.sousTraitant.id,
                assuranceId: assurance.id,
                dateExpiration: assurance.dateExpiration.toISOString(),
              },
            },
          },
        });
      });

      alertCount++;
    }

    return { alertesEnvoyees: alertCount };
  }
}
