import { Module } from '@nestjs/common';
import { ChantiersController } from './chantiers.controller.js';
import { ChantiersService } from './chantiers.service.js';

@Module({
  controllers: [ChantiersController],
  providers: [ChantiersService],
  exports: [ChantiersService],
})
export class ChantiersModule {}
