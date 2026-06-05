import { Module } from '@nestjs/common';
import { PrestationsService } from './prestations.service.js';
import { PrestationsController } from './prestations.controller.js';

@Module({
  controllers: [PrestationsController],
  providers: [PrestationsService],
  exports: [PrestationsService],
})
export class PrestationsModule {}
