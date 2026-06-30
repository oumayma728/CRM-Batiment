import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { WhatsappService } from './whatsapp.service.js';
import { WhatsappHmacGuard } from './guards/whatsapp-hmac.guard.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../common/interfaces/jwt-payload.interface.js';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('webhook')
  @ApiOperation({ summary: 'Meta webhook verification challenge' })
  verifyWebhook(@Query() query: Record<string, string>, @Res() res: Response) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WhatsappHmacGuard)
  @ApiOperation({ summary: 'Receive incoming WhatsApp messages from Meta' })
  async receiveWebhook(@Body() payload: Record<string, unknown>) {
    await this.whatsappService.processIncomingWebhook(payload);
    return { status: 'ok' };
  }

  @Post('send-message')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECHNICO', 'ASSISTANTE')
  @ApiOperation({ summary: 'Send a WhatsApp text message' })
  sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.whatsappService.sendTextMessage(dto, user.companyId);
  }

  @Post('send-devis/:devisId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECHNICO', 'ASSISTANTE')
  @ApiOperation({ summary: 'Send a devis PDF via WhatsApp' })
  sendDevis(
    @Param('devisId', ParseIntPipe) devisId: number,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.whatsappService.sendDevisViaWhatsApp(devisId, dto.to, user.companyId);
  }

  @Post('send-facture/:factureId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECHNICO', 'ASSISTANTE')
  @ApiOperation({ summary: 'Send a facture PDF via WhatsApp' })
  sendFacture(
    @Param('factureId', ParseIntPipe) factureId: number,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.whatsappService.sendFactureViaWhatsApp(factureId, dto.to, user.companyId);
  }

  @Post('messages/:id/react')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Add a reaction to a message' })
  reactToMessage(
    @Param('id', ParseIntPipe) messageId: number,
    @Body() body: { emoji: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.whatsappService.reactToMessage(messageId, body.emoji, user.companyId);
  }

  @Post('send-media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and send a media file' })
  sendMedia(
    @Body() body: { conversationId: string },
    @UploadedFile() file: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    return this.whatsappService.sendGeneralMedia(parseInt(body.conversationId, 10), file, user.companyId);
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List all WhatsApp conversations' })
  getConversations(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsappService.getConversations(user.companyId);
  }

  @Get('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get messages for a conversation' })
  getMessages(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.whatsappService.getMessages(conversationId, user.companyId);
  }

  @Get('support-tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ASSISTANTE')
  @ApiOperation({ summary: 'List pending support ticket notifications from WhatsApp chatbot' })
  getSupportTickets(@CurrentUser() user: CurrentUserPayload) {
    return this.whatsappService.getPendingSupportTickets(user.companyId);
  }

  @Post('notify-incident')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CHEF_CHANTIER')
  @ApiOperation({ summary: 'Send incident alert to ADMIN/CHEF_CHANTIER team via WhatsApp' })
  notifyIncident(
    @Body() body: { description: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const reporter = user.email || `User #${user.userId}`;
    return this.whatsappService.notifyIncidentToTeam(user.companyId, body.description, reporter);
  }
}
