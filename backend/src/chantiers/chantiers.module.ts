import { Module } from '@nestjs/common';
import { ChantiersController } from './chantiers.controller.js';
import { ChantiersService } from './chantiers.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ChantiersController],
  providers: [ChantiersService],
  exports: [ChantiersService],
})
export class ChantiersModule {}
