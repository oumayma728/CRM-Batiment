import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsappPdfService } from './whatsapp-pdf.service.js';
import { AssistantService } from '../assistant/assistant.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { WhatsappMessageDirection, WhatsappMessageType, WhatsappMessageStatus } from '../../generated/prisma/client.js';

// ── Intent classification ────────────────────────────────────────────────────
type ChatIntent = 'STATUT_CHANTIER' | 'DEVIS_DEMANDE' | 'SUPPORT_TICKET' | 'FALLBACK';

function classifyIntent(text: string): ChatIntent {
  const lower = text.toLowerCase();
  if (/\b(statut|avancement|chantier|travaux|progression|où en|ou en)\b/.test(lower))
    return 'STATUT_CHANTIER';
  if (/\b(devis|offre|estimation|prix|tarif|chiffrage)\b/.test(lower))
    return 'DEVIS_DEMANDE';
  if (/\b(problème|probleme|urgent|urgence|panne|incident|aide|help|bug|anomalie|réclamation|reclamation)\b/.test(lower))
    return 'SUPPORT_TICKET';
  return 'FALLBACK';
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly metaApiVersion = 'v25.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappPdfService: WhatsappPdfService,
    private readonly assistantService: AssistantService,
  ) {}

  private get metaBaseUrl() {
    return `https://graph.facebook.com/${this.metaApiVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;
  }

  /** True when Meta credentials are not configured — enables full demo mode */
  private get isDevMode(): boolean {
    return !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  // ── Phone matching ──────────────────────────────────────────────────────────
  async findClientByPhone(phone: string, companyId: number) {
    const normalized = phone.replace(/\D/g, '');
    return this.prisma.client.findFirst({
      where: {
        companyId,
        OR: [
          { telephone: { contains: normalized.slice(-8) } },
          { telephone: normalized },
          { telephone: `+${normalized}` },
        ],
      },
      include: {
        devis: {
          where: { statut: { in: ['ACCEPTE', 'SIGNE', 'ENVOYE'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { chantier: { select: { reference: true, statut: true } } },
        },
      },
    });
  }

  // ── Conversation management ─────────────────────────────────────────────────
  private async findOrCreateConversation(whatsappNumber: string, displayName: string, companyId: number) {
    let conv = await this.prisma.whatsappConversation.findUnique({
      where: { companyId_whatsappNumber: { companyId, whatsappNumber } },
    });

    if (!conv) {
      const client = await this.findClientByPhone(whatsappNumber, companyId);
      conv = await this.prisma.whatsappConversation.create({
        data: { companyId, whatsappNumber, displayName, clientId: client?.id },
      });
    } else if (!conv.clientId) {
      const client = await this.findClientByPhone(whatsappNumber, companyId);
      if (client) {
        conv = await this.prisma.whatsappConversation.update({
          where: { id: conv.id },
          data: { clientId: client.id },
        });
      }
    }
    return conv;
  }

  // ── Inbound webhook processor ───────────────────────────────────────────────
  async processIncomingWebhook(payload: Record<string, unknown>) {
    const entry = (payload.entry as any[])?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const company = await this.prisma.company.findFirst();
    if (!company) return;
    const companyId = company.id;

    // Handle delivery status updates
    const statuses = value?.statuses as any[];
    if (statuses?.length) {
      for (const statusObj of statuses) {
        const waMessageId = statusObj.id;
        const statusStr = statusObj.status;
        let newStatus: WhatsappMessageStatus = WhatsappMessageStatus.PENDING;
        if (statusStr === 'sent') newStatus = WhatsappMessageStatus.SENT;
        else if (statusStr === 'delivered') newStatus = WhatsappMessageStatus.DELIVERED;
        else if (statusStr === 'read') newStatus = WhatsappMessageStatus.READ;
        else if (statusStr === 'failed') newStatus = WhatsappMessageStatus.FAILED;

        await this.prisma.whatsappMessage.updateMany({
          where: { waMessageId },
          data: { status: newStatus },
        });
      }
    }

    // Handle inbound messages
    const messages = value?.messages as any[];
    if (!messages?.length) return;

    for (const message of messages) {
      const from = message.from as string;
      const type = message.type as string;
      const waMessageId = message.id as string;
      const timestamp = new Date(parseInt(message.timestamp, 10) * 1000);
      const profileName = value?.contacts?.[0]?.profile?.name || from;

      const conv = await this.findOrCreateConversation(from, profileName, companyId);

      // Deduplicate
      const existingMsg = await this.prisma.whatsappMessage.findUnique({ where: { waMessageId } });
      if (existingMsg) continue;

      let content: string | null = null;
      let msgType: WhatsappMessageType = WhatsappMessageType.TEXT;
      let mediaId: string | null = null;
      let mimeType: string | null = null;
      let filename: string | null = null;

      if (type === 'text') {
        content = message.text?.body;
      } else if (type === 'image') {
        msgType = WhatsappMessageType.IMAGE;
        mediaId = message.image?.id;
        mimeType = message.image?.mime_type;
      } else if (type === 'document') {
        msgType = WhatsappMessageType.DOCUMENT;
        mediaId = message.document?.id;
        mimeType = message.document?.mime_type;
        filename = message.document?.filename;
      } else if (type === 'audio') {
        msgType = WhatsappMessageType.AUDIO;
        mediaId = message.audio?.id;
      } else if (type === 'video') {
        msgType = WhatsappMessageType.VIDEO;
        mediaId = message.video?.id;
      }

      await this.prisma.whatsappMessage.create({
        data: {
          conversationId: conv.id,
          waMessageId,
          direction: WhatsappMessageDirection.INBOUND,
          type: msgType,
          content,
          mediaId,
          mimeType,
          filename,
          status: WhatsappMessageStatus.DELIVERED,
          sentAt: timestamp,
        },
      });

      await this.prisma.whatsappConversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date() },
      });

      // 🤖 Trigger chatbot only for text messages
      if (type === 'text' && content) {
        await this.handleInboundChatbot(from, content, conv.id, conv.clientId, companyId).catch(
          (err) => this.logger.warn('Chatbot error (non-blocking):', err),
        );
      }
    }
  }

  // ── AI Chatbot Engine ───────────────────────────────────────────────────────
  private async handleInboundChatbot(
    from: string,
    text: string,
    conversationId: number,
    clientId: number | null,
    companyId: number,
  ) {
    const intent = classifyIntent(text);
    let reply: string;

    switch (intent) {
      case 'STATUT_CHANTIER': {
        if (clientId) {
          const devis = await this.prisma.devis.findFirst({
            where: {
              clientId,
              companyId,
              chantierId: { not: null },
              statut: { in: ['ACCEPTE', 'SIGNE'] },
            },
            include: {
              chantier: { select: { reference: true, statut: true, adresse: true } },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (devis?.chantier) {
            const statutLabel: Record<string, string> = {
              DEVIS_VALIDE: 'Devis validé, travaux en préparation',
              COMMANDES_GENEREES: 'Matériaux commandés, démarrage imminent',
              EN_COURS: 'Travaux en cours',
              TERMINE: 'Travaux terminés ✅',
              EN_PAUSE: 'En pause temporaire',
            };
            const label = statutLabel[devis.chantier.statut] ?? devis.chantier.statut;
            reply = `🏗️ *Chantier ${devis.chantier.reference}*\n📍 ${devis.chantier.adresse ?? ''}\n📊 Statut: ${label}\n\nPour plus d'informations, contactez-nous au bureau.`;
          } else {
            reply = `Bonjour ! Nous n'avons pas encore de chantier actif associé à votre numéro. Notre équipe vous recontactera rapidement. 📞`;
          }
        } else {
          reply = `Bonjour ! Nous n'avons pas encore de dossier associé à ce numéro. Un conseiller vous recontactera très prochainement. 📞`;
        }
        break;
      }

      case 'DEVIS_DEMANDE': {
        if (clientId) {
          const lastDevis = await this.prisma.devis.findFirst({
            where: { clientId, companyId },
            orderBy: { createdAt: 'desc' },
          });
          if (lastDevis) {
            reply = `📄 Votre dernier devis est le *${lastDevis.reference}* (statut: ${lastDevis.statut}).\n\nSouhaitez-vous le recevoir par WhatsApp ? Répondez *OUI* et notre équipe vous l'envoie dans les plus brefs délais.`;
          } else {
            reply = `Bonjour ! Pour obtenir un devis, veuillez nous décrire vos travaux et nous vous préparerons une offre personnalisée. 📋`;
          }
        } else {
          reply = `Bonjour ! Pour obtenir un devis gratuit, décrivez-nous votre projet et un technicien vous rappellera sous 24h. 📋`;
        }
        break;
      }

      case 'SUPPORT_TICKET': {
        // Log a support request as an internal CRM notification
        await this.prisma.auditLog.create({
          data: {
            companyId,
            action: 'NOTIFICATION_WHATSAPP_SUPPORT_TICKET',
            entite: 'WhatsappConversation',
            entiteId: conversationId,
            nouvelleValeur: {
              audience: 'INTERNAL',
              category: 'SUPPORT_TICKET',
              level: 'warning',
              title: '🚨 Demande support WhatsApp',
              message: `Client (${from}) signale un incident: "${text.slice(0, 120)}"`,
              metadata: { from, conversationId, clientId },
            },
          },
        });

        // Notify all ADMIN users via WhatsApp
        const admins = await this.prisma.user.findMany({
          where: { companyId, role: 'ADMIN', actif: true, telephone: { not: null } },
          select: { telephone: true, prenom: true },
        });
        for (const admin of admins) {
          if (admin.telephone) {
            await this.sendRawTextMessage(
              admin.telephone,
              `🚨 *Incident WhatsApp*\nClient ${from} signale: "${text.slice(0, 100)}"\n👉 Accédez à la messagerie CRM pour répondre.`,
            ).catch(() => {});
          }
        }

        reply = `🙏 Votre demande a bien été prise en compte. Un agent de notre équipe vous recontactera dans les plus brefs délais.\n\nHeure de signalement: ${new Date().toLocaleTimeString('fr-FR')}`;
        break;
      }

      default: {
        reply = `Bonjour ! 👋 Merci de nous contacter.\n\nPour nous aider rapidement, vous pouvez:\n• Écrire *statut* pour l'avancement de vos travaux\n• Écrire *devis* pour vos offres\n• Écrire *urgent* pour signaler un problème\n\nUn conseiller est disponible du lun. au ven. de 8h à 18h.`;
        break;
      }
    }

    await this.sendBotReply(from, reply, conversationId, companyId);
  }

  private async sendBotReply(to: string, text: string, conversationId: number, _companyId: number) {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      this.logger.log(`[BOT REPLY to ${to}]: ${text}`);
    } else {
      await this.sendRawTextMessage(to, text).catch((err) =>
        this.logger.error('Failed to send bot reply:', err),
      );
    }

    await this.prisma.whatsappMessage.create({
      data: {
        conversationId,
        direction: WhatsappMessageDirection.OUTBOUND,
        type: WhatsappMessageType.TEXT,
        content: `🤖 ${text}`,
        status: WhatsappMessageStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
  }

  // ── Raw text sender (no DB persistence) ────────────────────────────────────
  private async sendRawTextMessage(to: string, body: string) {
    const response = await fetch(`${this.metaBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Meta API error: ${JSON.stringify(error)}`);
    }
    return response.json();
  }

  async sendTextMessage(dto: SendMessageDto, companyId: number) {
    if (!dto.message) throw new BadRequestException('Message is empty');

    let waMessageId = `dev-msg-${Date.now()}`;

    if (!this.isDevMode) {
      const resData = await this.sendRawTextMessage(dto.to, dto.message);
      waMessageId = resData.messages?.[0]?.id;
    } else {
      this.logger.log(`[DEV MODE] Sending WhatsApp text to ${dto.to}: ${dto.message}`);
    }

    const conv = await this.findOrCreateConversation(dto.to, dto.to, companyId);
    await this.prisma.whatsappMessage.create({
      data: {
        conversationId: conv.id,
        waMessageId,
        direction: WhatsappMessageDirection.OUTBOUND,
        type: WhatsappMessageType.TEXT,
        content: dto.message,
        status: WhatsappMessageStatus.SENT,
      },
    });

    await this.prisma.whatsappConversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    });

    return { status: 'ok', waMessageId, dev: this.isDevMode };
  }

  // ── Team notification: WhatsApp to a specific user ─────────────────────────
  async notifyUserViaWhatsApp(userId: number, message: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telephone: true, prenom: true, nom: true, companyId: true },
    });

    if (!user?.telephone) {
      this.logger.warn(`User #${userId} has no phone number — WhatsApp notification skipped.`);
      return;
    }

    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      this.logger.log(`[DEV] WA notification to ${user.prenom}: ${message}`);
      return;
    }

    await this.sendRawTextMessage(user.telephone, message).catch((err) =>
      this.logger.error(`Failed to notify user #${userId} via WhatsApp:`, err),
    );
  }

  // ── Task assignment notification ───────────────────────────────────────────
  async notifyTaskAssignment(userId: number, taskLabel: string, chantierReference: string) {
    const msg = `👷 *Nouvelle tâche assignée*\n📋 Tâche: ${taskLabel}\n🏗️ Chantier: ${chantierReference}\n\nConnectez-vous au CRM pour voir les détails.`;
    await this.notifyUserViaWhatsApp(userId, msg);
  }

  // ── Incident alert to team ─────────────────────────────────────────────────
  async notifyIncidentToTeam(companyId: number, incidentDescription: string, reportedBy: string) {
    const admins = await this.prisma.user.findMany({
      where: { companyId, role: { in: ['ADMIN', 'CHEF_CHANTIER'] }, actif: true, telephone: { not: null } },
      select: { id: true },
    });

    const msg = `🚨 *Incident signalé*\nPar: ${reportedBy}\nDescription: ${incidentDescription}\n\nVérifiez le CRM pour les détails.`;
    await Promise.allSettled(admins.map((a) => this.notifyUserViaWhatsApp(a.id, msg)));
  }

  // ── Media upload ─────────────────────────────────────────────────────────
  private async uploadMedia(pdfBuffer: Buffer, filename: string): Promise<string> {
    // DEV MODE: skip real upload when Meta credentials are missing
    if (this.isDevMode) {
      this.logger.log(`[DEV] Skipping Meta media upload for "${filename}" — no credentials configured.`);
      return `dev-media-id-${Date.now()}`;
    }

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'application/pdf');
    formData.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), filename);

    const uploadResponse = await fetch(`${this.metaBaseUrl}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      this.logger.error('Meta Media API error:', error);
      throw new BadRequestException('Impossible d uploader le document vers WhatsApp.');
    }

    const { id: mediaId } = await uploadResponse.json() as { id: string };
    return mediaId;
  }

  private async sendDocumentMessage(to: string, mediaId: string, filename: string, caption: string): Promise<string | null> {
    // DEV MODE: skip real send when Meta credentials are missing
    if (this.isDevMode) {
      this.logger.log(`[DEV] Skipping Meta document send to ${to} — "${filename}" — no credentials configured.`);
      return `dev-wa-msg-id-${Date.now()}`;
    }

    const response = await fetch(`${this.metaBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: { id: mediaId, filename, caption },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Meta API error:', error);
      throw new BadRequestException('Erreur lors de l envoi du document WhatsApp.');
    }

    const resData = await response.json();
    return resData.messages?.[0]?.id;
  }

  // ── Send Devis PDF ────────────────────────────────────────────────────────
  async sendDevisViaWhatsApp(devisId: number, to: string, companyId: number) {
    const devis = await this.prisma.devis.findUnique({ where: { id: devisId, companyId } });
    if (!devis) throw new BadRequestException('Devis introuvable');

    // Generate PDF (always — validates the devis data)
    const pdfBuffer = await this.whatsappPdfService.generateDevisPdfBuffer(devisId, companyId);
    const filename = `Devis_${devis.reference}.pdf`;

    // Upload + send (skipped in dev mode, returns fake IDs)
    const mediaId = await this.uploadMedia(pdfBuffer, filename);
    const waMessageId = await this.sendDocumentMessage(
      to,
      mediaId,
      filename,
      `Voici votre devis ${devis.reference}. N'hésitez pas à nous contacter pour toute question. 📋`,
    );

    // Always persist to DB so the CRM chat shows the sent document
    const conv = await this.findOrCreateConversation(to, to, companyId);
    await this.prisma.whatsappMessage.create({
      data: {
        conversationId: conv.id,
        waMessageId,
        direction: WhatsappMessageDirection.OUTBOUND,
        type: WhatsappMessageType.DOCUMENT,
        filename,
        mediaId,
        devisId: devis.id,
        status: WhatsappMessageStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.prisma.whatsappConversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    });

    if (this.isDevMode) {
      return { status: 'ok', waMessageId, dev: true, message: 'Mode démo — PDF généré et enregistré en CRM (pas envoyé à Meta).' };
    }
    return { status: 'ok', waMessageId };
  }

  // ── Send Facture PDF ─────────────────────────────────────────────────────
  async sendFactureViaWhatsApp(factureId: number, to: string, companyId: number) {
    const facture = await this.prisma.facture.findUnique({ where: { id: factureId } });
    if (!facture) throw new BadRequestException('Facture introuvable');

    // Generate PDF (always — validates the facture data)
    const pdfBuffer = await this.whatsappPdfService.generateFacturePdfBuffer(factureId, companyId);
    const filename = `Facture_${facture.reference}.pdf`;

    // Upload + send (skipped in dev mode, returns fake IDs)
    const mediaId = await this.uploadMedia(pdfBuffer, filename);
    const waMessageId = await this.sendDocumentMessage(
      to,
      mediaId,
      filename,
      `Voici votre facture ${facture.reference}. Merci pour votre confiance. 🙏`,
    );

    // Always persist to DB so the CRM chat shows the sent document
    const conv = await this.findOrCreateConversation(to, to, companyId);
    await this.prisma.whatsappMessage.create({
      data: {
        conversationId: conv.id,
        waMessageId,
        direction: WhatsappMessageDirection.OUTBOUND,
        type: WhatsappMessageType.DOCUMENT,
        filename,
        mediaId,
        factureId: facture.id,
        status: WhatsappMessageStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.prisma.whatsappConversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    });

    if (this.isDevMode) {
      return { status: 'ok', waMessageId, dev: true, message: 'Mode démo — PDF généré et enregistré en CRM (pas envoyé à Meta).' };
    }
    return { status: 'ok', waMessageId };
  }

  // ── Reactions & General Media Upload ─────────────────────────────────────
  async reactToMessage(messageId: number, emoji: string, companyId: number) {
    const msg = await this.prisma.whatsappMessage.findFirst({
      where: { id: messageId, conversation: { companyId } },
      include: { conversation: true },
    });
    if (!msg || !msg.waMessageId) throw new BadRequestException('Message introuvable ou non synchronisé avec Meta');

    // Mettre à jour la DB
    const currentReactions: Record<string, string[]> = (msg.reactions as Record<string, string[]>) || {};
    if (!currentReactions[emoji]) currentReactions[emoji] = [];
    if (!currentReactions[emoji].includes('me')) currentReactions[emoji].push('me');

    await this.prisma.whatsappMessage.update({
      where: { id: msg.id },
      data: { reactions: currentReactions },
    });

    if (this.isDevMode) return { status: 'ok', dev: true };

    // Envoyer à Meta
    const response = await fetch(`${this.metaBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.conversation.whatsappNumber,
        type: 'reaction',
        reaction: {
          message_id: msg.waMessageId,
          emoji: emoji,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`Erreur Meta Reaction: ${err}`);
      throw new BadRequestException('Erreur lors de l\'envoi de la réaction');
    }

    return { status: 'ok' };
  }

  async sendGeneralMedia(conversationId: number, file: any, companyId: number) {
    const conv = await this.prisma.whatsappConversation.findFirst({
      where: { id: conversationId, companyId },
    });
    if (!conv) throw new BadRequestException('Conversation introuvable');

    let mediaId = `dev_media_${Date.now()}`;
    let waMessageId = `dev_wa_${Date.now()}`;

    if (!this.isDevMode) {
      // 1. Upload to Meta
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', blob, file.originalname);
      formData.append('type', file.mimetype.startsWith('image') ? 'image' : 'document');
      formData.append('messaging_product', 'whatsapp');

      const uploadRes = await fetch(`${this.metaBaseUrl}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
        body: formData,
      });

      if (!uploadRes.ok) throw new BadRequestException('Erreur upload Meta');
      const uploadData = (await uploadRes.json()) as any;
      mediaId = uploadData.id;

      // 2. Send Message
      const isImage = file.mimetype.startsWith('image');
      const msgType = isImage ? 'image' : 'document';
      const msgBody: any = { id: mediaId };
      if (!isImage) msgBody.filename = file.originalname;

      const sendRes = await fetch(`${this.metaBaseUrl}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: conv.whatsappNumber,
          type: msgType,
          [msgType]: msgBody,
        }),
      });

      if (!sendRes.ok) throw new BadRequestException('Erreur envoi Meta');
      const sendData = (await sendRes.json()) as any;
      waMessageId = sendData.messages[0].id;
    }

    // 3. Save to DB
    const msgTypeEnum = file.mimetype.startsWith('image') ? WhatsappMessageType.IMAGE :
                        file.mimetype.startsWith('video') ? WhatsappMessageType.VIDEO :
                        file.mimetype.startsWith('audio') ? WhatsappMessageType.AUDIO :
                        WhatsappMessageType.DOCUMENT;

    const newMessage = await this.prisma.whatsappMessage.create({
      data: {
        conversationId: conv.id,
        waMessageId,
        direction: WhatsappMessageDirection.OUTBOUND,
        type: msgTypeEnum,
        filename: file.originalname,
        mimeType: file.mimetype,
        mediaId,
        status: WhatsappMessageStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.prisma.whatsappConversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    });

    return newMessage;
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  async getConversations(companyId: number) {
    return this.prisma.whatsappConversation.findMany({
      where: { companyId },
      include: { client: { select: { nom: true, prenom: true } } },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getMessages(conversationId: number, companyId: number) {
    const conv = await this.prisma.whatsappConversation.findFirst({
      where: { id: conversationId, companyId },
    });
    if (!conv) throw new BadRequestException('Conversation introuvable');

    return this.prisma.whatsappMessage.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
    });
  }

  async getPendingSupportTickets(companyId: number) {
    return this.prisma.auditLog.findMany({
      where: { companyId, action: 'NOTIFICATION_WHATSAPP_SUPPORT_TICKET' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
