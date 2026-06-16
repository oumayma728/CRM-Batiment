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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { ChantiersService } from './chantiers.service.js';
import { CreateChantierDto } from './dto/create-chantier.dto.js';
import { CreateTacheDto } from './dto/create-tache.dto.js';
import { QueryChantierDto } from './dto/query-chantier.dto.js';
import { UpdateChantierDto } from './dto/update-chantier.dto.js';
import { UpdateTacheDto } from './dto/update-tache.dto.js';

@ApiTags('Chantiers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ASSISTANTE, Role.CHEF_CHANTIER)
@Controller('chantiers')
export class ChantiersController {
  constructor(private readonly service: ChantiersService) {}

  @Post('sync-from-devis')
  @ApiOperation({
    summary:
      'Generer les chantiers manquants depuis les devis deja acceptes/signes',
  })
  @ApiResponse({ status: 201, description: 'Synchronisation terminee.' })
  syncFromDevis(@CurrentUser() user: CurrentUserPayload) {
    return this.service.syncFromAcceptedDevis(user);
  }

  @Post('refresh-descriptions-from-devis')
  @ApiOperation({
    summary:
      'Regenerer les descriptions des chantiers existants relies a un devis',
  })
  @ApiResponse({ status: 201, description: 'Descriptions regenerees.' })
  refreshDescriptionsFromDevis(@CurrentUser() user: CurrentUserPayload) {
    return this.service.refreshDescriptionsFromLinkedDevis(user);
  }

  @Post()
  @ApiOperation({ summary: 'Creer un chantier' })
  @ApiResponse({ status: 201, description: 'Chantier cree.' })
  create(
    @Body() dto: CreateChantierDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les chantiers (pagination + recherche)' })
  @ApiResponse({ status: 200, description: 'Liste paginee retournee.' })
  findAll(
    @Query() query: QueryChantierDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findAll(query, user);
  }

  @Get('assignation-options')
  @Roles(Role.ADMIN, Role.CHEF_CHANTIER)
  @ApiOperation({
    summary:
      'Lister sous-traitants et equipes internes pour affectation des taches',
  })
  @ApiResponse({
    status: 200,
    description: 'Options d affectation retournees.',
  })
  getTaskAssignmentOptions(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getTaskAssignmentOptions(user);
  }

  @Get(':id/taches')
  @Roles(Role.ADMIN, Role.CHEF_CHANTIER)
  @ApiOperation({ summary: 'Lister les taches d un chantier' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Liste des taches retournee.' })
  listTasks(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.listTasks(id, user);
  }

  @Post(':id/taches')
  @Roles(Role.ADMIN, Role.CHEF_CHANTIER)
  @ApiOperation({ summary: 'Creer une tache pour un chantier' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Tache creee.' })
  createTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTacheDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.createTask(id, dto, user);
  }

  @Patch(':id/taches/:tacheId')
  @Roles(Role.ADMIN, Role.CHEF_CHANTIER)
  @ApiOperation({ summary: 'Modifier une tache de chantier' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'tacheId', type: Number })
  updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Param('tacheId', ParseIntPipe) tacheId: number,
    @Body() dto: UpdateTacheDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateTask(id, tacheId, dto, user);
  }

  @Delete(':id/taches/:tacheId')
  @Roles(Role.ADMIN, Role.CHEF_CHANTIER)
  @ApiOperation({ summary: 'Supprimer une tache de chantier' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'tacheId', type: Number })
  removeTask(
    @Param('id', ParseIntPipe) id: number,
    @Param('tacheId', ParseIntPipe) tacheId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.removeTask(id, tacheId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail d un chantier' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Chantier retourne.' })
  @ApiResponse({ status: 404, description: 'Chantier introuvable.' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un chantier' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChantierDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un chantier' })
  @ApiParam({ name: 'id', type: Number })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.remove(id, user);
  }
}
