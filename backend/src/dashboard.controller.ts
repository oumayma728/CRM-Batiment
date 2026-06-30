import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { Roles } from './common/decorators/roles.decorator.js';
import { CurrentUser } from './common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from './common/interfaces/jwt-payload.interface.js';
import { Role } from '../generated/prisma/client.js';
import { PrismaService } from './prisma/prisma.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @Roles(Role.ADMIN, Role.ASSISTANTE, Role.CHEF_CHANTIER)
  @ApiOperation({ summary: 'Statistiques du tableau de bord' })
  async getStats(@CurrentUser() user: CurrentUserPayload) {
    const companyId = user.companyId;

    const [
      totalClients,
      totalDemandes,
      totalDevis,
      devisAcceptesStat,
      chantierStats,
      recentActivity,
    ] = await Promise.all([
      // Total clients
      this.prisma.client.count({ where: { companyId } }),

      // Total demandes
      this.prisma.demandeDevis.count({ where: { companyId } }),

      // Total devis
      this.prisma.devis.count({ where: { companyId } }),

      // CA + devis acceptés/signés
      this.prisma.devis.aggregate({
        where: {
          companyId,
          statut: { in: ['ACCEPTE', 'SIGNE'] },
        },
        _sum: { totalTTC: true },
        _count: true,
      }),

      // Chantiers actifs
      this.prisma.chantier.groupBy({
        by: ['statut'],
        where: { companyId },
        _count: true,
      }),

      // Recent activity: last 5 events across clients, devis, demandes
      this.prisma.devis.findMany({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reference: true,
          statut: true,
          updatedAt: true,
          client: { select: { nom: true, prenom: true } },
        },
      }),
    ]);

    const chantierMap = Object.fromEntries(
      chantierStats.map((s) => [s.statut, s._count]),
    );

    return {
      totalClients,
      totalDemandes,
      totalDevis,
      devisAcceptes: devisAcceptesStat._count,
      chiffreAffaires: devisAcceptesStat._sum.totalTTC ?? 0,
      chantiers: {
        total: chantierStats.reduce((acc, s) => acc + s._count, 0),
        enCours: (chantierMap['EN_COURS'] ?? 0) + (chantierMap['PLANIFIE'] ?? 0),
        termines: chantierMap['TERMINE'] ?? 0,
      },
      recentDevis: recentActivity,
    };
  }
}
