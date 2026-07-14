import { Module } from '@nestjs/common';
import { SousTraitantsService } from './sous-traitants.service.js';
import { SousTraitantsController } from './sous-traitants.controller.js';

@Module({
  controllers: [SousTraitantsController],
  providers: [SousTraitantsService],
  exports: [SousTraitantsService],
})
export class SousTraitantsModule {}
