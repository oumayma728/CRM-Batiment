import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '../../generated/prisma/client.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';

type NotificationLevel = 'info' | 'success' | 'warning';
type NotificationCategory =
  | 'SUPPLIER_STATUS'
  | 'RECEPTION_PARTIELLE'
  | 'RECEPTION_COMPLETE';

interface CreateInternalNotificationPayload {
  companyId: number;
  userId?: number;
  entite: string;
  entiteId: number;
  action: string;
  category: NotificationCategory;
  level: NotificationLevel;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonObject;
  ancienneValeur?: Prisma.InputJsonObject;
}

const allowedInternalRoles = [
  Role.ADMIN,
  Role.ASSISTANTE,
  Role.CHEF_CHANTIER,
  Role.TECHNICO,
] as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureInternalUser(currentUser: CurrentUserPayload) {
    if (
      !allowedInternalRoles.includes(
        currentUser.role as (typeof allowedInternalRoles)[number],
      )
    ) {
      throw new ForbiddenException('Acces reserve aux notifications internes.');
    }
  }

  async createInternalNotification(payload: CreateInternalNotificationPayload) {
    return this.prisma.auditLog.create({
      data: {
        companyId: payload.companyId,
        userId: payload.userId,
        action: payload.action,
        entite: payload.entite,
        entiteId: payload.entiteId,
        ancienneValeur: payload.ancienneValeur,
        nouvelleValeur: {
          audience: 'INTERNAL',
          category: payload.category,
          level: payload.level,
          title: payload.title,
          message: payload.message,
          metadata: payload.metadata ?? {},
        } as Prisma.InputJsonObject,
      },
    });
  }

  async listInternalNotifications(currentUser: CurrentUserPayload, limit = 8) {
    this.ensureInternalUser(currentUser);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        companyId: currentUser.companyId,
        action: {
          in: [
            'NOTIFICATION_SUPPLIER_STATUS_UPDATED',
            'NOTIFICATION_RECEPTION_PARTIELLE',
            'NOTIFICATION_RECEPTION_COMPLETE',
            'NOTIFICATION_ASSISTANT_URGENT_DEVIS',
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const items = logs.map((log) => {
      const payload =
        log.nouvelleValeur && typeof log.nouvelleValeur === 'object'
          ? (log.nouvelleValeur as Prisma.JsonObject)
          : {};

      const metadata =
        payload.metadata && typeof payload.metadata === 'object'
          ? (payload.metadata as Prisma.JsonObject)
          : {};

      return {
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        entite: log.entite,
        entiteId: log.entiteId,
        title:
          typeof payload.title === 'string'
            ? payload.title
            : 'Notification interne',
        message:
          typeof payload.message === 'string'
            ? payload.message
            : 'Mise a jour interne',
        category:
          typeof payload.category === 'string'
            ? payload.category
            : 'SUPPLIER_STATUS',
        level: typeof payload.level === 'string' ? payload.level : 'info',
        metadata,
        actor: log.user
          ? {
              id: log.user.id,
              nom: log.user.nom,
              prenom: log.user.prenom,
              email: log.user.email,
              role: log.user.role,
            }
          : null,
      };
    });

    return {
      items,
      summary: {
        total: items.length,
        supplierUpdates: items.filter(
          (item) => item.category === 'SUPPLIER_STATUS',
        ).length,
        receptionsPartielles: items.filter(
          (item) => item.category === 'RECEPTION_PARTIELLE',
        ).length,
        receptionsCompletes: items.filter(
          (item) => item.category === 'RECEPTION_COMPLETE',
        ).length,
        urgentesAssistant: items.filter(
          (item) => item.action === 'NOTIFICATION_ASSISTANT_URGENT_DEVIS',
        ).length,
      },
    };
  }
}
