import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { DemandesDevisService } from './demandes-devis.service.js';
import { CreateDemandeDevisDto } from './dto/create-demande-devis.dto.js';
import { UpdateDemandeDevisDto } from './dto/update-demande-devis.dto.js';
import { QueryDemandeDevisDto } from './dto/query-demande-devis.dto.js';
import { UpdateStatutDto } from './dto/update-statut.dto.js';

@ApiTags('Demandes de Devis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('demandes-devis')
export class DemandesDevisController {
  constructor(private readonly service: DemandesDevisService) {}

  /* ───────── POST / ───────── */
  @Post()
  @Roles('ADMIN', 'TECHNICO', 'ASSISTANTE')
  @ApiOperation({ summary: 'Créer une demande de devis' })
  create(
    @Body() dto: CreateDemandeDevisDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(dto, user.userId, user.companyId);
  }

  /* ───────── GET / ───────── */
  @Get()
  @ApiOperation({
    summary: 'Lister les demandes de devis (pagination, filtres)',
  })
  findAll(
    @Query() query: QueryDemandeDevisDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findAll(query, user.companyId);
  }

  /* ───────── GET /:id ───────── */
  @Get(':id')
  @ApiOperation({ summary: "Détail d'une demande de devis" })
  @ApiParam({ name: 'id', type: Number })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findOne(id, user.companyId);
  }

  /* ───────── PATCH /:id ───────── */
  @Patch(':id')
  @Roles('ADMIN', 'TECHNICO', 'ASSISTANTE')
  @ApiOperation({ summary: 'Modifier une demande de devis' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDemandeDevisDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user.companyId);
  }

  /* ───────── PATCH /:id/statut ───────── */
  @Patch(':id/statut')
  @Roles('ADMIN', 'TECHNICO')
  @ApiOperation({
    summary:
      'Changer le statut (workflow : NOUVEAU → EN_COURS → CONVERTI / PERDU)',
  })
  @ApiParam({ name: 'id', type: Number })
  updateStatut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatutDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateStatut(id, dto, user.userId, user.companyId);
  }

  /* ───────── DELETE /:id ───────── */
  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer une demande de devis (ADMIN)' })
  @ApiParam({ name: 'id', type: Number })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(id, user.companyId);
  }
}
