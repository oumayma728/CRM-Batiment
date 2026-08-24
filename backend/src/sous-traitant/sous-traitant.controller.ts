import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { CreateSousTraitantRapportDto } from './dto/create-sous-traitant-rapport.dto.js';
import { QuerySousTraitantDto } from './dto/query-sous-traitant.dto.js';
import { UpdateSousTraitantTacheDto } from './dto/update-sous-traitant-tache.dto.js';
import { UploadSousTraitantPhotoDto } from './dto/upload-sous-traitant-photo.dto.js';
import { SousTraitantService } from './sous-traitant.service.js';

@ApiTags('Espace sous-traitant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SOUS_TRAITANT)
@Controller('sous-traitant')
export class SousTraitantController {
  constructor(private readonly service: SousTraitantService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord du sous-traitant connecté' })
  @ApiResponse({ status: 200, description: 'Résumé opérationnel retourné.' })
  getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getDashboard(user);
  }

  @Get('chantiers')
  @ApiOperation({ summary: 'Lister les chantiers affectés au sous-traitant' })
  findChantiers(
    @Query() query: QuerySousTraitantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findChantiers(query, user);
  }

  @Get('taches')
  @ApiOperation({ summary: 'Lister les tâches affectées au sous-traitant' })
  findTasks(
    @Query() query: QuerySousTraitantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findTasks(query, user);
  }

  @Patch('taches/:id')
  @ApiOperation({ summary: 'Mettre à jour une tâche affectée' })
  updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSousTraitantTacheDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updateTask(id, dto, user);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Lister les documents des chantiers affectés' })
  findDocuments(
    @Query() query: QuerySousTraitantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.findDocuments(query, user);
  }

  @Post('rapports')
  @ApiOperation({ summary: 'Déposer un compte rendu ou rapport d’intervention' })
  createReport(
    @Body() dto: CreateSousTraitantRapportDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.createReport(dto, user);
  }

  @Post('photos')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['chantierId', 'file'],
      properties: {
        chantierId: { type: 'integer', example: 12 },
        titre: { type: 'string', example: 'Pose du carrelage terminée' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Déposer une photographie de chantier' })
  uploadPhoto(
    @Body() dto: UploadSousTraitantPhotoDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.uploadPhoto(dto, file, user);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Télécharger un document local autorisé' })
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const file = await this.service.getDocumentDownload(id, user);
    const safeName = file.name.replace(/["\r\n]/g, '_');

    return new StreamableFile(file.stream, {
      type: file.contentType,
      disposition: `attachment; filename="${safeName}"`,
    });
  }
}
