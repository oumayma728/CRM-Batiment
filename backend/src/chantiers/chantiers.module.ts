import { Module } from '@nestjs/common';
import { ChantiersController } from './chantiers.controller.js';
import { ChantiersService } from './chantiers.service.js';
import { WhatsappModule } from '../whatsapp/whatsapp.module.js';

@Module({
  imports: [WhatsappModule],
  controllers: [ChantiersController],
  providers: [ChantiersService],
  exports: [ChantiersService],
})
export class ChantiersModule {}
