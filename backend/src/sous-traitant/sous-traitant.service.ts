import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Prisma, TacheStatut } from '../../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSousTraitantRapportDto } from './dto/create-sous-traitant-rapport.dto.js';
import { QuerySousTraitantDto } from './dto/query-sous-traitant.dto.js';
import { UploadSousTraitantPhotoDto } from './dto/upload-sous-traitant-photo.dto.js';
import { UpdateSousTraitantTacheDto } from './dto/update-sous-traitant-tache.dto.js';

@Injectable()
export class SousTraitantService {
  private readonly storageRoot = resolve(process.cwd(), 'storage', 'sous-traitant');

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private assignedTaskWhere(
    currentUser: CurrentUserPayload,
  ): Prisma.TacheWhereInput {
    return {
      chantier: { companyId: currentUser.companyId },
      affectations: { some: { userId: currentUser.userId } },
    };
  }

  private assignedChantierWhere(
    currentUser: CurrentUserPayload,
  ): Prisma.ChantierWhereInput {
    return {
      companyId: currentUser.companyId,
      taches: {
        some: {
          affectations: { some: { userId: currentUser.userId } },
        },
      },
    };
  }

  private async assertAssignedChantier(
    chantierId: number,
    currentUser: CurrentUserPayload,
  ) {
    const chantier = await this.prisma.chantier.findFirst({
      where: {
        id: chantierId,
        ...this.assignedChantierWhere(currentUser),
      },
      select: {
        id: true,
        reference: true,
        adresse: true,
        companyId: true,
      },
    });

    if (!chantier) {
      throw new NotFoundException(
        'Chantier introuvable ou non affecté à ce sous-traitant.',
      );
    }

    return chantier;
  }

  private sanitizeFileName(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'document';
  }

  async getDashboard(currentUser: CurrentUserPayload) {
    const taskWhere = this.assignedTaskWhere(currentUser);
    const now = new Date();

    const [
      totalTaches,
      aFaire,
      enCours,
      bloquees,
      terminees,
      enRetard,
      totalChantiers,
      recentTasks,
    ] = await Promise.all([
      this.prisma.tache.count({ where: taskWhere }),
      this.prisma.tache.count({
        where: { ...taskWhere, statut: TacheStatut.A_FAIRE },
      }),
      this.prisma.tache.count({
        where: { ...taskWhere, statut: TacheStatut.EN_COURS },
      }),
      this.prisma.tache.count({
        where: { ...taskWhere, statut: TacheStatut.BLOQUEE },
      }),
      this.prisma.tache.count({
        where: { ...taskWhere, statut: TacheStatut.TERMINEE },
      }),
      this.prisma.tache.count({
        where: {
          ...taskWhere,
          statut: { not: TacheStatut.TERMINEE },
          dateFin: { lt: now },
        },
      }),
      this.prisma.chantier.count({
        where: this.assignedChantierWhere(currentUser),
      }),
      this.prisma.tache.findMany({
        where: taskWhere,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          libelle: true,
          description: true,
          statut: true,
          avancement: true,
          commentaire: true,
          dateDebut: true,
          dateFin: true,
          updatedAt: true,
          chantier: {
            select: {
              id: true,
              reference: true,
              adresse: true,
              statut: true,
              client: {
                select: { id: true, nom: true, prenom: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      summary: {
        totalTaches,
        aFaire,
        enCours,
        bloquees,
        terminees,
        enRetard,
        totalChantiers,
      },
      recentTasks,
    };
  }

  async findChantiers(
    query: QuerySousTraitantDto,
    currentUser: CurrentUserPayload,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.ChantierWhereInput = {
      ...this.assignedChantierWhere(currentUser),
    };

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { adresse: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          client: {
            is: {
              OR: [
                { nom: { contains: search, mode: 'insensitive' } },
                { prenom: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.chantier.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reference: true,
          adresse: true,
          description: true,
          statut: true,
          dateDebut: true,
          dateFin: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
            },
          },
          taches: {
            where: {
              affectations: { some: { userId: currentUser.userId } },
            },
            orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              libelle: true,
              statut: true,
              avancement: true,
              dateDebut: true,
              dateFin: true,
            },
          },
          documents: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              nom: true,
              type: true,
              url: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.chantier.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findTasks(
    query: QuerySousTraitantDto,
    currentUser: CurrentUserPayload,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.TacheWhereInput = {
      ...this.assignedTaskWhere(currentUser),
      ...(query.statut ? { statut: query.statut } : {}),
    };

    if (search) {
      where.OR = [
        { libelle: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { commentaire: { contains: search, mode: 'insensitive' } },
        {
          chantier: {
            is: {
              OR: [
                { reference: { contains: search, mode: 'insensitive' } },
                { adresse: { contains: search, mode: 'insensitive' } },
                {
                  client: {
                    is: {
                      OR: [
                        { nom: { contains: search, mode: 'insensitive' } },
                        { prenom: { contains: search, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.tache.findMany({
        where,
        orderBy: [{ dateFin: 'asc' }, { ordre: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          libelle: true,
          description: true,
          statut: true,
          avancement: true,
          commentaire: true,
          dateDebut: true,
          dateFin: true,
          createdAt: true,
          updatedAt: true,
          chantier: {
            select: {
              id: true,
              reference: true,
              adresse: true,
              statut: true,
              client: {
                select: { id: true, nom: true, prenom: true },
              },
            },
          },
        },
      }),
      this.prisma.tache.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async updateTask(
    taskId: number,
    dto: UpdateSousTraitantTacheDto,
    currentUser: CurrentUserPayload,
  ) {
    const existing = await this.prisma.tache.findFirst({
      where: {
        id: taskId,
        ...this.assignedTaskWhere(currentUser),
      },
      select: { id: true, statut: true, avancement: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `Tâche #${taskId} introuvable ou non affectée à ce sous-traitant.`,
      );
    }

    const data: Prisma.TacheUpdateInput = {};

    if (dto.commentaire !== undefined) {
      data.commentaire = dto.commentaire.trim() || null;
    }

    if (dto.statut !== undefined) {
      data.statut = dto.statut;
    }

    if (dto.avancement !== undefined) {
      data.avancement = dto.avancement;
    }

    if (dto.statut === TacheStatut.TERMINEE || dto.avancement === 100) {
      data.statut = TacheStatut.TERMINEE;
      data.avancement = 100;
    } else if (
      dto.statut === undefined &&
      dto.avancement !== undefined &&
      dto.avancement > 0
    ) {
      data.statut = TacheStatut.EN_COURS;
    } else if (dto.statut === TacheStatut.A_FAIRE) {
      data.avancement = 0;
    }

    return this.prisma.tache.update({
      where: { id: taskId },
      data,
      select: {
        id: true,
        libelle: true,
        description: true,
        statut: true,
        avancement: true,
        commentaire: true,
        dateDebut: true,
        dateFin: true,
        updatedAt: true,
        chantier: {
          select: {
            id: true,
            reference: true,
            adresse: true,
            client: {
              select: { id: true, nom: true, prenom: true },
            },
          },
        },
      },
    });
  }

  async findDocuments(
    query: QuerySousTraitantDto,
    currentUser: CurrentUserPayload,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.DocumentChantierWhereInput = {
      chantier: {
        companyId: currentUser.companyId,
        taches: {
          some: {
            affectations: { some: { userId: currentUser.userId } },
          },
        },
      },
    };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        {
          chantier: {
            is: {
              OR: [
                { reference: { contains: search, mode: 'insensitive' } },
                { adresse: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.documentChantier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          nom: true,
          type: true,
          url: true,
          createdAt: true,
          chantier: {
            select: {
              id: true,
              reference: true,
              adresse: true,
              client: {
                select: { id: true, nom: true, prenom: true },
              },
            },
          },
        },
      }),
      this.prisma.documentChantier.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createReport(
    dto: CreateSousTraitantRapportDto,
    currentUser: CurrentUserPayload,
  ) {
    const chantier = await this.assertAssignedChantier(dto.chantierId, currentUser);
    await mkdir(this.storageRoot, { recursive: true });

    const baseName = this.sanitizeFileName(dto.titre);
    const storedName = `${Date.now()}_${currentUser.userId}_${baseName}.md`;
    const absolutePath = resolve(this.storageRoot, storedName);
    const content = [
      `# ${dto.titre.trim()}`,
      '',
      `- Chantier : ${chantier.reference}`,
      `- Adresse : ${chantier.adresse}`,
      `- Date : ${new Date().toLocaleString('fr-FR')}`,
      `- Auteur (ID) : ${currentUser.userId}`,
      '',
      '## Compte rendu',
      '',
      dto.contenu.trim(),
      '',
    ].join('\n');

    await writeFile(absolutePath, content, 'utf8');

    return this.createStoredDocument({
      chantierId: chantier.id,
      currentUser,
      nom: `${dto.titre.trim()}.md`,
      type: 'RAPPORT',
      storedName,
    });
  }

  async uploadPhoto(
    dto: UploadSousTraitantPhotoDto,
    file: Express.Multer.File | undefined,
    currentUser: CurrentUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('Une photographie est obligatoire.');
    }

    const allowedMimeTypes: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = allowedMimeTypes[file.mimetype];

    if (!extension) {
      throw new BadRequestException('Formats autorisés : JPG, PNG et WEBP.');
    }

    const chantier = await this.assertAssignedChantier(dto.chantierId, currentUser);
    await mkdir(this.storageRoot, { recursive: true });

    const title = dto.titre?.trim() || file.originalname.replace(extname(file.originalname), '');
    const baseName = this.sanitizeFileName(title);
    const storedName = `${Date.now()}_${currentUser.userId}_${baseName}${extension}`;
    const absolutePath = resolve(this.storageRoot, storedName);
    await writeFile(absolutePath, file.buffer);

    return this.createStoredDocument({
      chantierId: chantier.id,
      currentUser,
      nom: `${title}${extension}`,
      type: 'PHOTO',
      storedName,
    });
  }

  async getDocumentDownload(
    documentId: number,
    currentUser: CurrentUserPayload,
  ) {
    const document = await this.prisma.documentChantier.findFirst({
      where: {
        id: documentId,
        chantier: {
          companyId: currentUser.companyId,
          taches: {
            some: {
              affectations: { some: { userId: currentUser.userId } },
            },
          },
        },
      },
      select: { id: true, nom: true, type: true, url: true },
    });

    if (!document) {
      throw new NotFoundException('Document introuvable ou non autorisé.');
    }

    if (!document.url.startsWith('storage/sous-traitant/')) {
      throw new BadRequestException(
        'Ce document utilise une URL externe et doit être ouvert depuis sa fiche.',
      );
    }

    const absolutePath = resolve(process.cwd(), document.url);
    const expectedPrefix = `${this.storageRoot}${sep}`;
    if (!absolutePath.startsWith(expectedPrefix)) {
      throw new BadRequestException('Chemin de document invalide.');
    }

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException('Le fichier physique est introuvable.');
    }

    const extension = extname(document.nom).toLowerCase();
    const contentType =
      extension === '.jpg' || extension === '.jpeg'
        ? 'image/jpeg'
        : extension === '.png'
          ? 'image/png'
          : extension === '.webp'
            ? 'image/webp'
            : extension === '.md'
              ? 'text/markdown; charset=utf-8'
              : 'application/octet-stream';

    return {
      stream: createReadStream(absolutePath),
      name: document.nom,
      contentType,
    };
  }

  private async createStoredDocument(input: {
    chantierId: number;
    currentUser: CurrentUserPayload;
    nom: string;
    type: 'RAPPORT' | 'PHOTO';
    storedName: string;
  }) {
    const document = await this.prisma.documentChantier.create({
      data: {
        chantierId: input.chantierId,
        nom: input.nom,
        type: input.type,
        url: `storage/sous-traitant/${input.storedName}`,
      },
      select: {
        id: true,
        nom: true,
        type: true,
        url: true,
        createdAt: true,
        chantier: {
          select: {
            id: true,
            reference: true,
            adresse: true,
            client: { select: { id: true, nom: true, prenom: true } },
          },
        },
      },
    });

    await this.auditService.createLog({
      companyId: input.currentUser.companyId,
      userId: input.currentUser.userId,
      action: 'SOUS_TRAITANT_DOCUMENT_CREATED',
      entite: 'DocumentChantier',
      entiteId: document.id,
      nouvelleValeur: {
        chantierId: input.chantierId,
        chantierReference: document.chantier.reference,
        nom: document.nom,
        type: document.type,
      },
    });

    await this.notificationsService.createInternalNotification({
      companyId: input.currentUser.companyId,
      userId: input.currentUser.userId,
      action: 'NOTIFICATION_SOUS_TRAITANT_DOCUMENT',
      entite: 'DocumentChantier',
      entiteId: document.id,
      category: 'CHANTIER_DOCUMENT',
      level: 'info',
      title: input.type === 'PHOTO' ? 'Nouvelle photo chantier' : 'Nouveau rapport chantier',
      message: `${document.nom} a été ajouté au chantier ${document.chantier.reference}.`,
      metadata: {
        chantierId: document.chantier.id,
        chantierReference: document.chantier.reference,
        documentType: document.type,
      },
    });

    this.notificationsService.emitCompanyEvent(
      input.currentUser.companyId,
      'sous-traitant:documents-changed',
      {
        reason: 'SOUS_TRAITANT_DOCUMENT_CREATED',
        entity: 'DocumentChantier',
        entityId: document.id,
        actorId: input.currentUser.userId,
      },
    );

    return document;
  }

}
