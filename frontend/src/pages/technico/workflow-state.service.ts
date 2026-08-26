import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DevisStatut, ChantierStatut } from '../../generated/prisma/client.js';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gère le changement de statut d'un devis et déclenche les automatisations associées.
   * C'est ici que l'automatisation P0.2 est pilotée.
   */
  async handleDevisStatusChange(devisId: number, newStatut: DevisStatut, companyId: number) {
    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId, companyId },
      include: { client: true },
    });

    if (!devis) {
      throw new BadRequestException('Devis introuvable');
    }

    // Validation des transitions (P0.5 - State Machine)
    // On pourrait ajouter ici une vérification stricte des transitions autorisées.

    // Mise à jour du statut du devis
    const updatedDevis = await this.prisma.devis.update({
      where: { id: devisId },
      data: { statut: newStatut },
    });

    // P0.2 Automatique : Si le devis passe à SIGNE -> Créer le Chantier
    if (newStatut === DevisStatut.SIGNE) {
      await this.createChantierFromDevis(devisId, companyId);
    }

    return updatedDevis;
  }

  /**
   * Logique de création du chantier à partir d'un devis (P0.2)
   */
  private async createChantierFromDevis(devisId: number, companyId: number) {
    // 1. Protection contre les doublons (P0.6) : Ne pas recréer si un chantier existe déjà
    const existingChantier = await this.prisma.chantier.findFirst({
      where: { devis: { some: { id: devisId } } }
    });

    if (existingChantier) {
      this.logger.warn(`Un chantier existe déjà pour le devis #${devisId} (${existingChantier.reference})`);
      return existingChantier;
    }

    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId },
      include: { client: true }
    });

    // 2. Création du chantier avec les informations du devis
    const chantier = await this.prisma.chantier.create({
      data: {
        companyId: companyId,
        clientId: devis.clientId,
        reference: `CH-${devis.reference}`, // Référence basée sur le devis
        adresse: devis.client.adresseChantier || devis.client.adresseClient || 'Adresse à préciser',
        description: devis.notes || `Chantier généré suite à la signature du devis ${devis.reference}`,
        statut: ChantierStatut.PLANIFIE, // Statut initial demandé dans le CDC
      },
    });

    // 3. Liaison bidirectionnelle : Mise à jour du devis avec l'ID du chantier créé
    await this.prisma.devis.update({
      where: { id: devisId },
      data: { chantierId: chantier.id },
    });

    this.logger.log(`P0.2 : Chantier ${chantier.reference} créé avec succès pour devis #${devisId}`);
    return chantier;
  }
}