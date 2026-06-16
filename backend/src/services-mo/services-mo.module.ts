import { Module } from '@nestjs/common';
import { ServicesMoService } from './services-mo.service.js';
import { ServicesMoController } from './services-mo.controller.js';

@Module({
  controllers: [ServicesMoController],
  providers: [ServicesMoService],
  exports: [ServicesMoService],
})
export class ServicesMoModule {}
