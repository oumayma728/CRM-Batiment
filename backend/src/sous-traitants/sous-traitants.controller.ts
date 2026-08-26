import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { SousTraitantsService } from './sous-traitants.service.js';
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

@ApiTags('Sous-Traitants (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('sous-traitants')
export class SousTraitantsController {
  constructor(private readonly service: SousTraitantsService) {}

  // ─── CRUD principal ───────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Créer un sous-traitant' })
  create(
    @Body() dto: CreateSousTraitantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les sous-traitants' })
  findAll(
    @Query() query: QuerySousTraitantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un sous-traitant" })
  @ApiParam({ name: 'id', type: Number })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un sous-traitant' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSousTraitantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un sous-traitant' })
  @ApiParam({ name: 'id', type: Number })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(id, user);
  }

  // ─── Contrats ─────────────────────────────────────────────────────────────

  @Post(':id/contrats')
  @ApiOperation({ summary: 'Ajouter un contrat' })
  @ApiParam({ name: 'id', type: Number })
  addContrat(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateContratDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.addContrat(id, dto, user);
  }

  @Patch(':id/contrats/:contratId')
  updateContrat(
    @Param('id', ParseIntPipe) id: number,
    @Param('contratId', ParseIntPipe) contratId: number,
    @Body() dto: UpdateContratDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateContrat(id, contratId, dto, user);
  }

  @Delete(':id/contrats/:contratId')
  @ApiOperation({ summary: 'Supprimer un contrat' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'contratId', type: Number })
  removeContrat(
    @Param('id', ParseIntPipe) id: number,
    @Param('contratId', ParseIntPipe) contratId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.removeContrat(id, contratId, user);
  }

  // ─── Assurances ───────────────────────────────────────────────────────────

  @Post(':id/assurances')
  @ApiOperation({ summary: 'Ajouter une assurance' })
  @ApiParam({ name: 'id', type: Number })
  addAssurance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAssuranceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.addAssurance(id, dto, user);
  }

  @Patch(':id/assurances/:assuranceId')
  updateAssurance(
    @Param('id', ParseIntPipe) id: number,
    @Param('assuranceId', ParseIntPipe) assuranceId: number,
    @Body() dto: UpdateAssuranceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateAssurance(id, assuranceId, dto, user);
  }

  @Delete(':id/assurances/:assuranceId')
  @ApiOperation({ summary: 'Supprimer une assurance' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'assuranceId', type: Number })
  removeAssurance(
    @Param('id', ParseIntPipe) id: number,
    @Param('assuranceId', ParseIntPipe) assuranceId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.removeAssurance(id, assuranceId, user);
  }

  // ─── Paiements ────────────────────────────────────────────────────────────

  @Post(':id/paiements')
  @ApiOperation({ summary: 'Enregistrer un paiement' })
  @ApiParam({ name: 'id', type: Number })
  addPaiement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaiementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.addPaiement(id, dto, user);
  }

  @Patch(':id/paiements/:paiementId')
  updatePaiement(
    @Param('id', ParseIntPipe) id: number,
    @Param('paiementId', ParseIntPipe) paiementId: number,
    @Body() dto: UpdatePaiementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updatePaiement(id, paiementId, dto, user);
  }

  @Delete(':id/paiements/:paiementId')
  @ApiOperation({ summary: 'Supprimer un paiement' })
  removePaiement(
    @Param('id', ParseIntPipe) id: number,
    @Param('paiementId', ParseIntPipe) paiementId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.removePaiement(id, paiementId, user);
  }

  @Post(':id/disponibilites')
  addDisponibilite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDisponibiliteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.addDisponibilite(id, dto, user);
  }

  @Patch(':id/disponibilites/:disponibiliteId')
  updateDisponibilite(
    @Param('id', ParseIntPipe) id: number,
    @Param('disponibiliteId', ParseIntPipe) disponibiliteId: number,
    @Body() dto: UpdateDisponibiliteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateDisponibilite(id, disponibiliteId, dto, user);
  }

  @Delete(':id/disponibilites/:disponibiliteId')
  removeDisponibilite(
    @Param('id', ParseIntPipe) id: number,
    @Param('disponibiliteId', ParseIntPipe) disponibiliteId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.removeDisponibilite(id, disponibiliteId, user);
  }

  // ─── Notations ────────────────────────────────────────────────────────────

  @Post(':id/notations')
  @ApiOperation({ summary: 'Ajouter une évaluation' })
  @ApiParam({ name: 'id', type: Number })
  addNotation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNotationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.addNotation(id, dto, user);
  }

  @Patch(':id/notations/:notationId')
  updateNotation(
    @Param('id', ParseIntPipe) id: number,
    @Param('notationId', ParseIntPipe) notationId: number,
    @Body() dto: UpdateNotationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateNotation(id, notationId, dto, user);
  }

  @Delete(':id/notations/:notationId')
  removeNotation(
    @Param('id', ParseIntPipe) id: number,
    @Param('notationId', ParseIntPipe) notationId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.removeNotation(id, notationId, user);
  }

  // ─── Job alertes ──────────────────────────────────────────────────────────

  @Post('admin/check-assurances')
  @ApiOperation({
    summary: 'Lancer le job de vérification des assurances expirant bientôt',
  })
  checkAssurances() {
    return this.service.checkAssurancesExpirantes();
  }
}
