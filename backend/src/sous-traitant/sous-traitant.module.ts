import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SousTraitantController } from './sous-traitant.controller.js';
import { SousTraitantService } from './sous-traitant.service.js';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [SousTraitantController],
  providers: [SousTraitantService],
})
export class SousTraitantModule {}
