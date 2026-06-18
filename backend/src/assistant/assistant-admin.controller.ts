import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssistantService } from './assistant.service.js';
import { AssistantRagService } from './assistant-rag.service.js';
import { AssistantLlmService } from './assistant-llm.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';
import { Role } from '../../generated/prisma/client.js';
import { QualifyProspectDto } from './dto/qualify-prospect.dto.js';

@ApiTags('Assistant IA Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assistant/admin')
export class AssistantAdminController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly assistantRagService: AssistantRagService,
    private readonly assistantLlmService: AssistantLlmService,
  ) {}

  @Get('prospects')
  @Roles(Role.ADMIN, Role.ASSISTANTE, Role.TECHNICO)
  @ApiOperation({
    summary: 'Liste des prospects chatbot',
    description:
      'Retourne la liste des prospects enregistres automatiquement via l assistant IA.',
  })
  getProspects(@CurrentUser() user: CurrentUserPayload) {
    return this.assistantService.getProspects(user.companyId);
  }

  @Get('projets-futurs')
  @Roles(Role.ADMIN, Role.ASSISTANTE, Role.TECHNICO)
  @ApiOperation({
    summary: 'Liste des projets futurs detectes',
    description:
      'Retourne les besoins non classes, avec categorie proche suggeree et frequence de demande.',
  })
  getFutureProjects(@CurrentUser() user: CurrentUserPayload) {
    return this.assistantService.getFutureProjects(user.companyId);
  }

  @Post('rag/test')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Tester la base de connaissance RAG',
    description:
      'Envoie une requete de test a la base IA et retourne les snippets recuperes ainsi que le score de pertinence.',
  })
  async testRag(
    @Body() body: { query: string; limit?: number },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.assistantRagService.retrieveContext({
      companyId: user.companyId,
      query: body.query?.trim() || '',
      limit: body.limit ?? 5,
    });

    let aiResponse = null;
    if (result.snippets.length > 0) {
      aiResponse = await this.assistantLlmService.generateRagAnswer(
        body.query?.trim() || '',
        result.context,
      );
    }

    return {
      query: body.query,
      snippetsFound: result.snippets.length,
      snippets: result.snippets,
      contextBlock: result.context,
      aiResponse,
    };
  }

  @Post('rag/stream')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Tester la base RAG en streaming',
    description: 'Retourne un flux SSE (Server-Sent Events) contenant les snippets puis la reponse IA mot par mot.',
  })
  async streamRag(
    @Body() body: { query: string; limit?: number },
    @Res() res: Response,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.assistantRagService.retrieveContext({
      companyId: user.companyId,
      query: body.query?.trim() || '',
      limit: body.limit ?? 5,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send snippets first
    res.write(`data: ${JSON.stringify({ type: 'snippets', snippetsFound: result.snippets.length, snippets: result.snippets })}\n\n`);

    if (result.snippets.length > 0) {
      const generator = this.assistantLlmService.generateRagAnswerStream(
        body.query?.trim() || '',
        result.context,
      );

      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }

  @Post('prospects/:prospectId/qualify')
  @Roles(Role.ADMIN, Role.ASSISTANTE, Role.TECHNICO)
  @ApiOperation({
    summary: 'Qualifier un prospect chatbot',
    description:
      'Convertit un prospect chatbot en demande de devis operationnelle, et peut creer un devis brouillon.',
  })
  qualifyProspect(
    @Param('prospectId', ParseIntPipe) prospectId: number,
    @Body() dto: QualifyProspectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.assistantService.qualifyProspect({
      prospectId,
      companyId: user.companyId,
      actorUserId: user.userId,
      description: dto.description,
      createDevisDraft: dto.createDevisDraft,
    });
  }

  @Delete('prospects/:prospectId')
  @Roles(Role.ADMIN, Role.ASSISTANTE, Role.TECHNICO)
  @ApiOperation({
    summary: 'Supprimer un prospect chatbot',
    description:
      'Supprime un prospect issu du chatbot ainsi que ses donnees reliees (demandes/devis).',
  })
  removeProspect(
    @Param('prospectId', ParseIntPipe) prospectId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.assistantService.removeProspect({
      prospectId,
      currentUser: user,
    });
  }
}


