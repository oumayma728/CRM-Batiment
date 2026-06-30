import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssistantService } from './assistant.service.js';
import { AssistantRagService } from './assistant-rag.service.js';
import { AssistantLlmService } from './assistant-llm.service.js';
import { RagChatService } from './rag-chat.service.js';
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
    private readonly ragChatService: RagChatService,
  ) {}

  // ── Prospects ──────────────────────────────────────────────────────────────

  @Get('prospects')
  @Roles(Role.ADMIN, Role.ASSISTANTE, Role.TECHNICO)
  @ApiOperation({ summary: 'Liste des prospects chatbot' })
  getProspects(@CurrentUser() user: CurrentUserPayload) {
    return this.assistantService.getProspects(user.companyId);
  }

  @Get('projets-futurs')
  @Roles(Role.ADMIN, Role.ASSISTANTE, Role.TECHNICO)
  @ApiOperation({ summary: 'Liste des projets futurs détectés' })
  getFutureProjects(@CurrentUser() user: CurrentUserPayload) {
    return this.assistantService.getFutureProjects(user.companyId);
  }

  // ── RAG Chat Sessions (historique persistant) ──────────────────────────────

  @Get('rag/sessions')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lister les sessions de chat RAG de l\'utilisateur' })
  getSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.ragChatService.getSessions(user.companyId, user.userId);
  }

  @Post('rag/sessions')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Créer une nouvelle session de chat RAG' })
  createSession(
    @Body() body: { titre?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ragChatService.createSession(user.userId, user.companyId, body?.titre);
  }

  @Get('rag/sessions/:sessionId/messages')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Récupérer les messages d\'une session RAG' })
  getMessages(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ragChatService.getMessages(sessionId, user.companyId);
  }

  @Patch('rag/sessions/:sessionId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Renommer une session de chat RAG' })
  renameSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: { titre: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ragChatService.renameSession(sessionId, user.companyId, body.titre);
  }

  @Delete('rag/sessions/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer tout l\'historique RAG de l\'utilisateur' })
  deleteAllSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.ragChatService.deleteAllSessions(user.companyId, user.userId);
  }

  @Delete('rag/sessions/:sessionId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer une session de chat RAG' })
  deleteSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ragChatService.deleteSession(sessionId, user.companyId);
  }

  // ── RAG Test (existing) ────────────────────────────────────────────────────

  @Post('rag/test')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tester la base de connaissance RAG' })
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

  // ── RAG Stream (session-aware) ─────────────────────────────────────────────

  @Post('rag/stream')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Réponse RAG en streaming SSE avec persistance optionnelle en session' })
  async streamRag(
    @Body() body: { query: string; limit?: number; sessionId?: number },
    @Res() res: Response,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const query = body.query?.trim() || '';

    const result = await this.assistantRagService.retrieveContext({
      companyId: user.companyId,
      query,
      limit: body.limit ?? 5,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Persist user message + auto-title on first message
    if (body.sessionId && query) {
      try {
        const existing = await this.ragChatService.getMessages(body.sessionId, user.companyId);
        await this.ragChatService.addMessage(body.sessionId, 'user', query);
        if (existing.length === 0) {
          const autoTitle = this.ragChatService.autoTitle(query);
          await this.ragChatService.renameSession(body.sessionId, user.companyId, autoTitle);
        }
      } catch {
        // Non-blocking
      }
    }

    // Stream snippets event
    res.write(`data: ${JSON.stringify({ type: 'snippets', snippetsFound: result.snippets.length, snippets: result.snippets })}\n\n`);

    let fullResponse = '';

    // Always generate an answer so the LLM can handle greetings or gracefully say "I don't know"
    const generator = this.assistantLlmService.generateRagAnswerStream(query, result.context);
    for await (const chunk of generator) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
    }

    // Fallback if LLM fails completely
    if (!fullResponse) {
      fullResponse = result.snippets.length > 0
        ? "Des documents ont été trouvés mais je n'ai pas pu générer une réponse synthétisée."
        : "Je n'ai pas trouvé d'information pertinente dans la base de connaissances pour cette question.";
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: fullResponse })}\n\n`);
    }

    // Persist assistant response to DB
    if (body.sessionId && fullResponse) {
      try {
        await this.ragChatService.addMessage(
          body.sessionId,
          'assistant',
          fullResponse,
          result.snippets as any,
        );
      } catch {
        // Non-blocking
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }

  // ── Prospect management ────────────────────────────────────────────────────

  @Post('prospects/:prospectId/qualify')
  @Roles(Role.ADMIN, Role.ASSISTANTE, Role.TECHNICO)
  @ApiOperation({ summary: 'Qualifier un prospect chatbot' })
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
  @ApiOperation({ summary: 'Supprimer un prospect chatbot' })
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
