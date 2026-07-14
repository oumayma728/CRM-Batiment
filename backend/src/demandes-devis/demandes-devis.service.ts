import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DevisService } from '../devis/devis.service.js';
import { CreateDemandeDevisDto } from './dto/create-demande-devis.dto.js';
import { UpdateDemandeDevisDto } from './dto/update-demande-devis.dto.js';
import { QueryDemandeDevisDto } from './dto/query-demande-devis.dto.js';
import { UpdateStatutDto } from './dto/update-statut.dto.js';
import type { DemandeStatut } from '../../generated/prisma/client.js';

/** Transitions de statut autorisées */
const TRANSITIONS_AUTORISEES: Record<string, string[]> = {
  NOUVEAU: ['EN_COURS', 'PERDU'],
  EN_COURS: ['CONVERTI', 'PERDU'],
  // Support legacy rows that still have QUALIFIE in database.
  QUALIFIE: ['CONVERTI', 'PERDU'],
  CONVERTI: [],
  PERDU: [],
};

@Injectable()
export class DemandesDevisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devisService: DevisService,
  ) {}

  /* ───────── CREATE ───────── */
  async create(
    dto: CreateDemandeDevisDto,
    createurId: number,
    companyId: number,
  ) {
    // Vérifier que le client appartient à la même entreprise
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, companyId },
    });
    if (!client) {
      throw new NotFoundException(
        `Client #${dto.clientId} introuvable dans votre entreprise`,
      );
    }

    return this.prisma.demandeDevis.create({
      data: {
        companyId,
        clientId: dto.clientId,
        createurId,
        description: dto.description,
        source: dto.source,
        besoinStructure: dto.besoinStructure ?? undefined,
      },
      include: {
        client: true,
        createur: { select: { id: true, nom: true, prenom: true } },
      },
    });
  }

  /* ───────── FIND ALL (paginated) ───────── */
  async findAll(query: QueryDemandeDevisDto, companyId: number) {
    const { page = 1, limit = 20, statut, clientId, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (statut) where.statut = statut;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.demandeDevis.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          client: {
            select: { id: true, nom: true, prenom: true, telephone: true },
          },
          createur: { select: { id: true, nom: true, prenom: true } },
        },
      }),
      this.prisma.demandeDevis.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* ───────── FIND ONE ───────── */
  async findOne(id: number, companyId: number) {
    const demande = await this.prisma.demandeDevis.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        createur: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
        devis: true,
      },
    });
    if (!demande) {
      throw new NotFoundException(`Demande de devis #${id} introuvable`);
    }
    return demande;
  }

  /* ───────── UPDATE ───────── */
  async update(id: number, dto: UpdateDemandeDevisDto, companyId: number) {
    const demande = await this.findOne(id, companyId);

    // Empêcher la modification si déjà convertie
    if (demande.statut === 'CONVERTI') {
      throw new ForbiddenException(
        'Impossible de modifier une demande déjà convertie en devis',
      );
    }

    return this.prisma.demandeDevis.update({
      where: { id },
      data: {
        description: dto.description,
        besoinStructure: dto.besoinStructure ?? undefined,
      },
      include: { client: true },
    });
  }

  /* ───────── UPDATE STATUT (workflow) ───────── */
  async updateStatut(
    id: number,
    dto: UpdateStatutDto,
    userId: number,
    companyId: number,
  ) {
    const demande = await this.findOne(id, companyId);

    const currentStatut = demande.statut;
    const newStatut = dto.statut;

    const allowed = TRANSITIONS_AUTORISEES[currentStatut] ?? [];
    if (!allowed.includes(newStatut)) {
      throw new BadRequestException(
        `Transition ${currentStatut} → ${newStatut} non autorisée. ` +
          `Transitions possibles : ${allowed.length ? allowed.join(', ') : 'aucune (statut final)'}`,
      );
    }

    const updated = await this.prisma.demandeDevis.update({
      where: { id },
      data: { statut: newStatut },
      include: { client: true },
    });

    // Si CONVERTI → créer automatiquement un devis en BROUILLON
    if (updated.statut === 'CONVERTI') {
      const devis = await this.devisService.create(
        {
          clientId: demande.clientId,
          demandeDevisId: demande.id,
          notes: `Généré depuis la demande #${demande.id} — ${demande.description}`,
        },
        userId,
        companyId,
      );
      return { ...updated, devisCree: devis };
    }

    return updated;
  }

  /* ───────── DELETE ───────── */
  async remove(id: number, companyId: number) {
    await this.findOne(id, companyId);
    return this.prisma.demandeDevis.delete({ where: { id } });
  }

  /**
   * P0.1 : Transformation d'une demande en devis éditable.
   * Copie les données client et initialise le devis en statut BROUILLON.
   */
  async convertToDevis(id: number, userId: number, companyId: number) {
    const demande = await this.findOne(id, companyId);

    // 1. Protection contre les doublons (P0.6)
    if (demande.statut === 'CONVERTI') {
      throw new BadRequestException('Cette demande a déjà été convertie en devis.');
    }

    // 2. Création du Devis en statut BROUILLON via le DevisService
    const newDevis = await this.devisService.create(
      {
        clientId: demande.clientId,
        demandeDevisId: demande.id,
        notes: `Devis généré depuis la demande #${demande.id}.\nDescription initiale : ${demande.description}`,
      },
      userId,
      companyId,
    );

    // 3. Mise à jour automatique du statut de la demande d'origine
    await this.prisma.demandeDevis.update({
      where: { id },
      data: { statut: 'CONVERTI' },
    });

    return newDevis;
  }
}
