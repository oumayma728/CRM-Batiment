import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DemoRequestStatut, Prisma, Role } from '../../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePublicDemoRequestDto } from './dto/create-demo-request.dto.js';
import { QueryDemoRequestDto } from './dto/query-demo-request.dto.js';
import { UpdateDemoRequestDto } from './dto/update-demo-request.dto.js';

const commercialRoles = [Role.ADMIN, Role.ASSISTANTE, Role.TECHNICO] as const;

const demoRequestInclude = {
  company: {
    select: {
      id: true,
      nom: true,
      email: true,
      telephone: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
    },
  },
} satisfies Prisma.DemoRequestInclude;

@Injectable()
export class DemoRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private ensureCommercialUser(currentUser: CurrentUserPayload) {
    if (!commercialRoles.includes(currentUser.role as (typeof commercialRoles)[number])) {
      throw new ForbiddenException('Acces reserve au back-office commercial.');
    }
  }

  private normalizeText(value?: string) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private async resolvePublicCompanyId(companyId?: number) {
    if (companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: companyId },
        select: { id: true },
      });

      if (company) return company.id;
    }

    const defaultCompany = await this.prisma.company.findFirst({
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    return defaultCompany?.id ?? null;
  }

  private async assertAssignedUser(companyId: number, userId?: number | null) {
    if (!userId) return;

    const assignedUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        actif: true,
        role: { in: [...commercialRoles] },
      },
      select: { id: true },
    });

    if (!assignedUser) {
      throw new NotFoundException('Utilisateur commercial introuvable ou non autorise.');
    }
  }

  private buildWhere(companyId: number, query: QueryDemoRequestDto): Prisma.DemoRequestWhereInput {
    const search = this.normalizeText(query.search);

    return {
      companyId,
      ...(query.statut ? { statut: query.statut } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(search
        ? {
            OR: [
              { nom: { contains: search, mode: 'insensitive' } },
              { prenom: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { telephone: { contains: search, mode: 'insensitive' } },
              { entreprise: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async createPublic(dto: CreatePublicDemoRequestDto) {
    const companyId = await this.resolvePublicCompanyId(dto.companyId);

    const request = await this.prisma.demoRequest.create({
      data: {
        companyId,
        nom: dto.nom.trim(),
        prenom: this.normalizeText(dto.prenom),
        email: dto.email.trim().toLowerCase(),
        telephone: this.normalizeText(dto.telephone),
        entreprise: this.normalizeText(dto.entreprise),
        message: this.normalizeText(dto.message),
        statut: DemoRequestStatut.PENDING,
        source: 'PUBLIC_FORM',
      },
      include: demoRequestInclude,
    });

    if (companyId) {
      await this.auditService.createLog({
        companyId,
        userId: null,
        action: 'DEMO_REQUEST_CREATED',
        entite: 'DemoRequest',
        entiteId: request.id,
        nouvelleValeur: {
          nom: request.nom,
          prenom: request.prenom ?? undefined,
          email: request.email,
          entreprise: request.entreprise ?? undefined,
          statut: request.statut,
          source: request.source,
        },
      });
    }

    return {
      message: 'Votre demande de démo a été envoyée avec succès.',
      data: request,
    };
  }

  async findAll(query: QueryDemoRequestDto, currentUser: CurrentUserPayload) {
    this.ensureCommercialUser(currentUser);

    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;
    const where = this.buildWhere(currentUser.companyId, query);

    const [data, total] = await Promise.all([
      this.prisma.demoRequest.findMany({
        where,
        include: demoRequestInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.demoRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  async getSummary(currentUser: CurrentUserPayload) {
    this.ensureCommercialUser(currentUser);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const [total, pending, contacted, scheduled, done, canceled, scheduledSoon] =
      await Promise.all([
        this.prisma.demoRequest.count({ where: { companyId: currentUser.companyId } }),
        this.prisma.demoRequest.count({
          where: { companyId: currentUser.companyId, statut: DemoRequestStatut.PENDING },
        }),
        this.prisma.demoRequest.count({
          where: { companyId: currentUser.companyId, statut: DemoRequestStatut.CONTACTED },
        }),
        this.prisma.demoRequest.count({
          where: { companyId: currentUser.companyId, statut: DemoRequestStatut.SCHEDULED },
        }),
        this.prisma.demoRequest.count({
          where: { companyId: currentUser.companyId, statut: DemoRequestStatut.DONE },
        }),
        this.prisma.demoRequest.count({
          where: { companyId: currentUser.companyId, statut: DemoRequestStatut.CANCELED },
        }),
        this.prisma.demoRequest.count({
          where: {
            companyId: currentUser.companyId,
            statut: DemoRequestStatut.SCHEDULED,
            dateDemo: { gte: now, lte: tomorrow },
          },
        }),
      ]);

    return { total, pending, contacted, scheduled, done, canceled, scheduledSoon };
  }

  async findOne(id: number, currentUser: CurrentUserPayload) {
    this.ensureCommercialUser(currentUser);

    const request = await this.prisma.demoRequest.findFirst({
      where: { id, companyId: currentUser.companyId },
      include: demoRequestInclude,
    });

    if (!request) {
      throw new NotFoundException('Demande de démo introuvable.');
    }

    return request;
  }

  async update(id: number, dto: UpdateDemoRequestDto, currentUser: CurrentUserPayload) {
    this.ensureCommercialUser(currentUser);

    const existing = await this.prisma.demoRequest.findFirst({
      where: { id, companyId: currentUser.companyId },
    });

    if (!existing) {
      throw new NotFoundException('Demande de démo introuvable.');
    }

    await this.assertAssignedUser(currentUser.companyId, dto.assignedToId ?? undefined);

    const nextStatut = dto.statut ?? existing.statut;

    const updated = await this.prisma.demoRequest.update({
      where: { id },
      data: {
        statut: nextStatut,
        assignedToId: dto.assignedToId,
        dateContact: this.toDate(dto.dateContact),
        dateDemo: this.toDate(dto.dateDemo),
        notes: dto.notes,
        email: dto.email?.trim().toLowerCase(),
        telephone: this.normalizeText(dto.telephone),
      },
      include: demoRequestInclude,
    });

    await this.auditService.createLog({
      companyId: currentUser.companyId,
      userId: currentUser.userId,
      action: 'DEMO_REQUEST_UPDATED',
      entite: 'DemoRequest',
      entiteId: updated.id,
      ancienneValeur: {
        statut: existing.statut,
        assignedToId: existing.assignedToId,
        dateDemo: existing.dateDemo?.toISOString(),
      },
      nouvelleValeur: {
        statut: updated.statut,
        assignedToId: updated.assignedToId ?? undefined,
        dateDemo: updated.dateDemo?.toISOString(),
        nom: updated.nom,
        prenom: updated.prenom ?? undefined,
        email: updated.email,
        entreprise: updated.entreprise ?? undefined,
      },
    });

    return updated;
  }
}
