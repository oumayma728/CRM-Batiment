import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import { DevisService } from './devis.service.js';
import { DevisController } from './devis.controller.js';
import { DevisPublicController } from './devis-public.controller.js';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [DevisController, DevisPublicController],
  providers: [DevisService],
  exports: [DevisService],
})
export class DevisModule {}
