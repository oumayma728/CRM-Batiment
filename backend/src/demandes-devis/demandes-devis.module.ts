import { Module } from '@nestjs/common';
import { DemandesDevisService } from './demandes-devis.service.js';
import { DemandesDevisController } from './demandes-devis.controller.js';
// import { DevisModule } from '../devis/devis.module.js'; // TODO: Fix devis module

@Module({
  imports: [
    /* DevisModule */
  ],
  controllers: [DemandesDevisController],
  providers: [DemandesDevisService],
  exports: [DemandesDevisService],
})
export class DemandesDevisModule {}
