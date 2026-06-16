import { Module } from '@nestjs/common';
import { MateriauxService } from './materiaux.service.js';
import { MateriauxController } from './materiaux.controller.js';

@Module({
  controllers: [MateriauxController],
  providers: [MateriauxService],
  exports: [MateriauxService],
})
export class MateriauxModule {}
