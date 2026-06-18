import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';
import { WhatsappPdfService } from './whatsapp-pdf.service.js';
import { AssistantModule } from '../assistant/assistant.module.js';

@Module({
  imports: [AssistantModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappPdfService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
