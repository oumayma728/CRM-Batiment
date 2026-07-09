import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { CreateClientAccountDto } from './dto/create-client-account.dto.js';
import { CreateClientPortalDemandeDto } from './dto/create-client-portal-demande.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { QueryClientDto } from './dto/query-client.dto.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { LeadSource, Prisma, Role } from '../../generated/prisma/client.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private prisma: PrismaService) {}

  private readonly typeProjetInclude = {
    categories: {
      orderBy: { ordre: 'asc' },
      include: {
        categorie: {
          select: {
            id: true,
            nom: true,
            description: true,
          },
        },
      },
    },
    _count: { select: { categories: true } },
  } as const;

  private buildClientInclude(extra: Record<string, unknown> = {}) {
    return {
      typeProjet: { include: this.typeProjetInclude },
      typeProjetLinks: {
        orderBy: { typeProjetId: 'asc' as const },
        include: {
          typeProjet: { include: this.typeProjetInclude },
        },
      },
      ...extra,
    } as const;
  }

  private normalizeTypeProjetIds(
    dto: Pick<CreateClientDto, 'typeProjetId' | 'typeProjetIds'>,
  ) {
    if (Array.isArray(dto.typeProjetIds)) {
      return [
        ...new Set(
          dto.typeProjetIds.filter((id) => Number.isInteger(id) && id > 0),
        ),
      ];
    }

    if (Number.isInteger(dto.typeProjetId) && (dto.typeProjetId ?? 0) > 0) {
      return [dto.typeProjetId];
    }

    return undefined;
  }

  private async validateTypeProjetIds(
    typeProjetIds: number[] | undefined,
    companyId: number,
  ) {
    if (typeProjetIds === undefined) return undefined;
    if (typeProjetIds.length === 0) return [];

    const projectTypes = await this.prisma.typeProjet.findMany({
      where: {
        id: { in: typeProjetIds },
        companyId,
        actif: true,
      },
      select: { id: true },
    });

    if (projectTypes.length !== typeProjetIds.length) {
      const foundIds = new Set(
        projectTypes.map((projectType) => projectType.id),
      );
      const missingIds = typeProjetIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Types de projet introuvables ou inactifs: ${missingIds.join(', ')}`,
      );
    }

    return typeProjetIds;
  }

  private serializeClient<
    T extends { typeProjet?: unknown; typeProjetLinks?: unknown[] },
  >(client: T) {
    const rawClient = client as Record<string, any>;
    const typeProjetLinks = Array.isArray(rawClient.typeProjetLinks)
      ? rawClient.typeProjetLinks
      : [];
    const primaryTypeProjet = rawClient.typeProjet ?? null;

    const projectsById = new Map<number, any>();

    if (primaryTypeProjet?.id) {
      projectsById.set(primaryTypeProjet.id, primaryTypeProjet);
    }

    for (const link of typeProjetLinks) {
      const project = link?.typeProjet;
      if (project?.id && !projectsById.has(project.id)) {
        projectsById.set(project.id, project);
      }
    }

    const typeProjets = Array.from(projectsById.values());
    const normalizedPrimaryTypeProjet = typeProjets[0] ?? null;

    const { typeProjetLinks: _ignoredTypeProjetLinks, ...rest } = rawClient;

    return {
      ...rest,
      typeProjetId: normalizedPrimaryTypeProjet?.id ?? null,
      typeProjet: normalizedPrimaryTypeProjet,
      typeProjetIds: typeProjets.map((project) => project.id),
      typeProjets,
    };
  }

  /**
   * Créer un nouveau client (rattaché au companyId de l'utilisateur connecté)
   */
  async create(dto: CreateClientDto, currentUser: CurrentUserPayload) {
    const typeProjetIds = await this.validateTypeProjetIds(
      this.normalizeTypeProjetIds(dto),
      currentUser.companyId,
    );

    const client = await this.prisma.client.create({
      data: {
        companyId: currentUser.companyId,
        nom: dto.nom,
        prenom: dto.prenom,
        telephone: dto.telephone,
        email: dto.email,
        adresseClient: dto.adresseClient,
        adresseChantier: dto.adresseChantier,
        source: dto.source,
        notes: dto.notes,
        besoin: dto.besoin,
        typeProjetId: typeProjetIds?.[0],
        typeProjetLinks:
          typeProjetIds && typeProjetIds.length > 0
            ? {
                create: typeProjetIds.map((typeProjetId) => ({ typeProjetId })),
              }
            : undefined,
      },
      include: this.buildClientInclude(),
    });

    return this.serializeClient(client);
  }

  async createClientAccount(
    dto: CreateClientAccountDto,
    currentUser: CurrentUserPayload,
  ) {
    return this.createClientAccountForCompany(
      dto,
      currentUser.companyId,
      `utilisateur #${currentUser.userId}`,
    );
  }

  async createPublicClientAccount(dto: CreateClientAccountDto) {
    const company = await this.prisma.company.findFirst({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Aucune entreprise configuree');
    }

    return this.createClientAccountForCompany(
      dto,
      company.id,
      'inscription publique',
    );
  }

  private async createClientAccountForCompany(
    dto: CreateClientAccountDto,
    companyId: number,
    actorLabel: string,
  ) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe deja');
    }

    const clientPassword = dto.telephone.trim();
    const hashedPassword = await bcrypt.hash(clientPassword, BCRYPT_ROUNDS);

    const result = (await this.createClientAndUserAccount(
      dto,
      companyId,
      normalizedEmail,
      hashedPassword,
    )) as {
      client: Record<string, unknown>;
      user: {
        id: number;
        email: string;
        nom: string;
        prenom: string;
        role: Role;
        telephone: string | null;
        actif: boolean;
        mustChangePassword: boolean;
        companyId: number;
        createdAt: Date;
      };
    };

    this.logger.log(
      `Compte client cree : ${result.user.email} par ${actorLabel}`,
    );

    return {
      message:
        'Client cree avec succes avec le role CLIENT. Le numero de telephone est son mot de passe.',
      ...result,
    };
  }

  private async createClientAndUserAccount(
    dto: CreateClientAccountDto,
    companyId: number,
    normalizedEmail: string,
    hashedPassword: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const client = await tx.client.create({
          data: {
            companyId,
            nom: dto.nom.trim(),
            prenom: dto.prenom.trim(),
            telephone: dto.telephone.trim(),
            email: normalizedEmail,
            adresseClient: dto.adresseClient.trim(),
            source: 'SITE_WEB',
          },
          include: this.buildClientInclude(),
        });

        const user = await tx.user.create({
          data: {
            companyId,
            nom: dto.nom.trim(),
            prenom: dto.prenom.trim(),
            telephone: dto.telephone.trim(),
            email: normalizedEmail,
            role: Role.CLIENT,
            password: hashedPassword,
            mustChangePassword: false,
            actif: true,
          },
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            role: true,
            telephone: true,
            actif: true,
            mustChangePassword: true,
            companyId: true,
            createdAt: true,
          },
        });

        return {
          client: this.serializeClient(client),
          user,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Un utilisateur avec cet email existe deja');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2021', 'P2022'].includes(error.code)
      ) {
        throw new BadRequestException(
          'Base de donnees incomplete. Lancez les migrations Prisma avant de creer un compte client.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2010' &&
        String(error.meta?.message ?? '').includes('InvalidInputValue')
      ) {
        throw new BadRequestException(
          "Base de donnees incomplete: le role CLIENT n'existe pas encore. Appliquez la migration add_client_role.",
        );
      }

      throw error;
    }
  }

  private async getClientForUser(currentUser: CurrentUserPayload) {
    const client = await this.prisma.client.findFirst({
      where: {
        companyId: currentUser.companyId,
        email: { equals: currentUser.email, mode: 'insensitive' },
      },
      include: this.buildClientInclude(),
    });

    if (!client) {
      throw new NotFoundException(
        'Aucune fiche client associee a ce compte utilisateur.',
      );
    }

    return client;
  }

  async getClientPortal(currentUser: CurrentUserPayload) {
    const client = await this.getClientForUser(currentUser);
    const clientId = client.id;
    const companyId = currentUser.companyId;

    const [demandes, devis, chantiers, factures] = await Promise.all([
      this.prisma.demandeDevis.findMany({
        where: { companyId, clientId },
        orderBy: { date: 'desc' },
        take: 8,
        include: {
          devis: {
            select: {
              id: true,
              reference: true,
              statut: true,
              totalTTC: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.devis.findMany({
        where: { companyId, clientId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          reference: true,
          dateCreation: true,
          dateEnvoi: true,
          statut: true,
          totalHT: true,
          totalTTC: true,
          notes: true,
          signatureClientBase64: true,
          signatureClientDate: true,
          createdAt: true,
        },
      }),
      this.prisma.chantier.findMany({
        where: { companyId, clientId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          chefChantier: {
            select: { id: true, nom: true, prenom: true, email: true },
          },
          taches: {
            select: {
              id: true,
              libelle: true,
              statut: true,
              avancement: true,
              dateDebut: true,
              dateFin: true,
            },
            orderBy: { ordre: 'asc' },
          },
          devis: {
            select: {
              id: true,
              reference: true,
              statut: true,
              totalTTC: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.facture.findMany({
        where: {
          devis: {
            is: {
              companyId,
              clientId,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          lignes: {
            orderBy: { ordre: 'asc' },
          },
          devis: {
            select: {
              id: true,
              reference: true,
              statut: true,
            },
          },
        },
      }),
    ]);

    return {
      client: this.serializeClient(client),
      demandes,
      devis,
      chantiers,
      factures,
      stats: {
        demandes: demandes.length,
        devis: devis.length,
        chantiers: chantiers.length,
        factures: factures.length,
        facturesImpayees: factures.filter((facture) => facture.statut !== 'PAYEE')
          .length,
      },
    };
  }

  async createClientPortalDemande(
    dto: CreateClientPortalDemandeDto,
    currentUser: CurrentUserPayload,
  ) {
    const client = await this.getClientForUser(currentUser);

    const demande = await this.prisma.demandeDevis.create({
      data: {
        companyId: currentUser.companyId,
        clientId: client.id,
        createurId: currentUser.userId,
        description: dto.description.trim(),
        source: LeadSource.SITE_WEB,
      },
      include: {
        client: {
          select: { id: true, nom: true, prenom: true, email: true, telephone: true },
        },
        devis: {
          select: {
            id: true,
            reference: true,
            statut: true,
            totalTTC: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      message: 'Votre demande de devis a ete creee avec succes.',
      demande,
    };
  }

  /**
   * Liste des clients avec pagination, recherche et filtre
   * Isolation SaaS : filtre par companyId
   */
  async findAll(query: QueryClientDto, currentUser: CurrentUserPayload) {
    const { page = 1, limit = 20, search, source } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      companyId: currentUser.companyId,
    };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ];
    }

    if (source) {
      where.source = source;
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.buildClientInclude(),
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: data.map((client) => this.serializeClient(client)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Détail d'un client (même companyId uniquement)
   */
  async findOne(id: number, currentUser: CurrentUserPayload) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: this.buildClientInclude({
        demandesDevis: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        devis: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        chantiers: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      }),
    });

    if (!client) {
      throw new NotFoundException(`Client #${id} non trouvé`);
    }

    if (client.companyId !== currentUser.companyId) {
      throw new ForbiddenException('Accès non autorisé à ce client');
    }

    return this.serializeClient(client);
  }

  /**
   * Modifier un client (même companyId uniquement)
   */
  async update(
    id: number,
    dto: UpdateClientDto,
    currentUser: CurrentUserPayload,
  ) {
    await this.findOne(id, currentUser);

    const normalizedTypeProjetIds = this.normalizeTypeProjetIds(dto);
    const typeProjetIds =
      normalizedTypeProjetIds !== undefined
        ? await this.validateTypeProjetIds(
            normalizedTypeProjetIds,
            currentUser.companyId,
          )
        : undefined;

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        telephone: dto.telephone,
        email: dto.email,
        adresseClient: dto.adresseClient,
        adresseChantier: dto.adresseChantier,
        source: dto.source,
        notes: dto.notes,
        besoin: dto.besoin,
        typeProjetId:
          typeProjetIds !== undefined ? (typeProjetIds[0] ?? null) : undefined,
        typeProjetLinks:
          typeProjetIds !== undefined
            ? {
                deleteMany: {},
                ...(typeProjetIds.length > 0
                  ? {
                      create: typeProjetIds.map((typeProjetId) => ({
                        typeProjetId,
                      })),
                    }
                  : {}),
              }
            : undefined,
      },
      include: this.buildClientInclude(),
    });

    return this.serializeClient(client);
  }

  /**
   * Supprimer un client (hard delete — ADMIN uniquement)
   */
  async updateClientProfile(
    dto: Partial<{ nom: string; prenom: string; telephone: string; adresseClient: string }>,
    user: CurrentUserPayload,
  ) {
    const client = await this.prisma.client.findFirst({
      where: {
        companyId: user.companyId,
        email: { equals: user.email, mode: 'insensitive' },
      },
    });

    if (!client) {
      throw new NotFoundException('Client non trouve');
    }

    const updated = await this.prisma.client.update({
      where: { id: client.id },
      data: {
        ...(dto.nom && { nom: dto.nom }),
        ...(dto.prenom && { prenom: dto.prenom }),
        ...(dto.telephone !== undefined && { telephone: dto.telephone }),
        ...(dto.adresseClient !== undefined && { adresseClient: dto.adresseClient }),
      },
      include: this.buildClientInclude(),
    });

    return this.serializeClient(updated);
  }

  async remove(id: number, currentUser: CurrentUserPayload) {
    await this.findOne(id, currentUser);

    return this.prisma.$transaction(async (tx) => {
      const devisRows = await tx.devis.findMany({
        where: {
          clientId: id,
          companyId: currentUser.companyId,
        },
        select: { id: true },
      });
      const devisIds = devisRows.map((devis) => devis.id);

      if (devisIds.length > 0) {
        const commandesRows = await tx.commandeFournisseur.findMany({
          where: { devisId: { in: devisIds } },
          select: { id: true },
        });
        const commandeIds = commandesRows.map((commande) => commande.id);

        if (commandeIds.length > 0) {
          await tx.reception.deleteMany({
            where: { commandeFournisseurId: { in: commandeIds } },
          });
          await tx.ligneCommandeFournisseur.deleteMany({
            where: { commandeFournisseurId: { in: commandeIds } },
          });
        }

        await tx.commandeFournisseur.deleteMany({
          where: { devisId: { in: devisIds } },
        });
        await tx.bonCommande.deleteMany({
          where: { devisId: { in: devisIds } },
        });
        await tx.facture.deleteMany({
          where: { devisId: { in: devisIds } },
        });
        await tx.devis.deleteMany({
          where: { id: { in: devisIds } },
        });
      }

      await tx.demandeDevis.deleteMany({
        where: {
          clientId: id,
          companyId: currentUser.companyId,
        },
      });

      const chantierRows = await tx.chantier.findMany({
        where: {
          clientId: id,
          companyId: currentUser.companyId,
        },
        select: { id: true },
      });
      const chantierIds = chantierRows.map((chantier) => chantier.id);

      if (chantierIds.length > 0) {
        await tx.documentChantier.deleteMany({
          where: { chantierId: { in: chantierIds } },
        });
        await tx.tache.deleteMany({
          where: { chantierId: { in: chantierIds } },
        });
        await tx.chantier.deleteMany({
          where: { id: { in: chantierIds } },
        });
      }

      return tx.client.delete({
        where: { id },
      });
    });
  }
}
