import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { TacheStatut } from '../../generated/prisma/client.js';

@Injectable()
export class SousTraitantService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get list of worksites assigned to the current subcontractor
   * A worksite is "assigned" if the subcontractor has tasks assigned to them on that worksite
   */
  async getChantiersAssignes(user: CurrentUserPayload) {
    const chantiers = await this.prisma.chantier.findMany({
      where: {
        companyId: user.companyId,
        taches: {
          some: {
            affectations: {
              some: {
                userId: user.userId,
              },
            },
          },
        },
      },
      include: {
        client: true,
        chefChantier: true,
        taches: {
          where: {
            affectations: {
              some: {
                userId: user.userId,
              },
            },
          },
          include: {
            affectations: true,
          },
        },
        documents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Enrich with task counts and metrics
    return chantiers.map((chantier) => ({
      ...chantier,
      metrics: {
        totalTaches: chantier.taches.length,
        tachesTerminees: chantier.taches.filter(
          (t) => t.statut === 'TERMINEE',
        ).length,
        tachesEnCours: chantier.taches.filter(
          (t) => t.statut === 'EN_COURS',
        ).length,
        tachesAFaire: chantier.taches.filter(
          (t) => t.statut === 'A_FAIRE',
        ).length,
        tachesBloquees: chantier.taches.filter(
          (t) => t.statut === 'BLOQUEE',
        ).length,
      },
    }));
  }

  /**
   * Get tasks assigned to the current subcontractor
   */
  async getTachesAssignees(
    user: CurrentUserPayload,
    options?: {
      statut?: TacheStatut;
      chantierId?: number;
    },
  ) {
    const taches = await this.prisma.tache.findMany({
      where: {
        chantier: {
          companyId: user.companyId,
        },
        affectations: {
          some: {
            userId: user.userId,
          },
        },
        ...(options?.statut && { statut: options.statut }),
        ...(options?.chantierId && { chantierId: options.chantierId }),
      },
      include: {
        chantier: {
          include: {
            client: true,
            chefChantier: true,
          },
        },
        affectations: {
          include: {
            user: true,
            equipe: true,
          },
        },
      },
      orderBy: {
        dateDebut: 'asc',
      },
    });

    return taches.map((tache) => ({
      ...tache,
      isOverdue:
        tache.dateFin && new Date(tache.dateFin) < new Date() && tache.statut !== 'TERMINEE',
    }));
  }

  /**
   * Get details of a specific worksite assigned to the subcontractor
   */
  async getChantiersDetail(chantierId: number, user: CurrentUserPayload) {
    const chantier = await this.prisma.chantier.findFirst({
      where: {
        id: chantierId,
        companyId: user.companyId,
        taches: {
          some: {
            affectations: {
              some: {
                userId: user.userId,
              },
            },
          },
        },
      },
      include: {
        client: true,
        chefChantier: true,
        taches: {
          where: {
            affectations: {
              some: {
                userId: user.userId,
              },
            },
          },
          include: {
            affectations: {
              include: {
                user: true,
                equipe: true,
              },
            },
          },
        },
        documents: true,
        devis: true,
      },
    });

    if (!chantier) {
      throw new BadRequestException('Chantier non trouve ou non assigne.');
    }

    return {
      ...chantier,
      metrics: {
        totalTaches: chantier.taches.length,
        tachesTerminees: chantier.taches.filter(
          (t) => t.statut === 'TERMINEE',
        ).length,
        tachesEnCours: chantier.taches.filter(
          (t) => t.statut === 'EN_COURS',
        ).length,
        tachesAFaire: chantier.taches.filter(
          (t) => t.statut === 'A_FAIRE',
        ).length,
        tachesBloquees: chantier.taches.filter(
          (t) => t.statut === 'BLOQUEE',
        ).length,
      },
    };
  }

  /**
   * Get documents for a worksite (if subcontractor has access)
   */
  async getDocumentsChantier(chantierId: number, user: CurrentUserPayload) {
    // Verify access: user must have tasks assigned on this chantier
    const hasAccess = await this.prisma.tache.findFirst({
      where: {
        chantierId,
        chantier: {
          companyId: user.companyId,
        },
        affectations: {
          some: {
            userId: user.userId,
          },
        },
      },
    });

    if (!hasAccess) {
      throw new BadRequestException('Acces refuse a ce chantier.');
    }

    return this.prisma.documentChantier.findMany({
      where: {
        chantierId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update task status and progress
   */
  async updateTacheProgress(
    tacheId: number,
    user: CurrentUserPayload,
    data: {
      statut?: TacheStatut;
      avancement?: number;
      commentaire?: string;
    },
  ) {
    // Verify user has this task assigned
    const affectation = await this.prisma.affectationTache.findFirst({
      where: {
        tacheId,
        userId: user.userId,
      },
      include: {
        tache: {
          include: {
            chantier: true,
          },
        },
      },
    });

    if (!affectation) {
      throw new BadRequestException('Tache non assignee.');
    }

    // Validate avancement is between 0 and 100
    if (data.avancement !== undefined) {
      if (data.avancement < 0 || data.avancement > 100) {
        throw new BadRequestException('Avancement doit etre entre 0 et 100.');
      }
    }

    // If statut is TERMINEE, set avancement to 100
    if (data.statut === 'TERMINEE') {
      data.avancement = 100;
    }

    return this.prisma.tache.update({
      where: { id: tacheId },
      data,
      include: {
        chantier: true,
        affectations: {
          include: {
            user: true,
            equipe: true,
          },
        },
      },
    });
  }

  /**
   * Get dashboard summary for the subcontractor
   */
  async getDashboard(user: CurrentUserPayload) {
    const [chantiersTotal, tachesAFaire, tachesEnCours, tachesTerminees, tachesBloquees] = await Promise.all([
      this.prisma.chantier.count({
        where: {
          companyId: user.companyId,
          taches: {
            some: {
              affectations: {
                some: {
                  userId: user.userId,
                },
              },
            },
          },
        },
      }),
      this.prisma.tache.count({
        where: {
          chantier: {
            companyId: user.companyId,
          },
          statut: 'A_FAIRE',
          affectations: {
            some: {
              userId: user.userId,
            },
          },
        },
      }),
      this.prisma.tache.count({
        where: {
          chantier: {
            companyId: user.companyId,
          },
          statut: 'EN_COURS',
          affectations: {
            some: {
              userId: user.userId,
            },
          },
        },
      }),
      this.prisma.tache.count({
        where: {
          chantier: {
            companyId: user.companyId,
          },
          statut: 'TERMINEE',
          affectations: {
            some: {
              userId: user.userId,
            },
          },
        },
      }),
      this.prisma.tache.count({
        where: {
          chantier: {
            companyId: user.companyId,
          },
          statut: 'BLOQUEE',
          affectations: {
            some: {
              userId: user.userId,
            },
          },
        },
      }),
    ]);

    return {
      chantiersAssignes: chantiersTotal,
      taches: {
        aFaire: tachesAFaire,
        enCours: tachesEnCours,
        terminees: tachesTerminees,
        bloquees: tachesBloquees,
        total: tachesAFaire + tachesEnCours + tachesTerminees + tachesBloquees,
      },
    };
  }
}
