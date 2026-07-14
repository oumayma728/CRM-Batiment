import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DevisStatut, ChantierStatut } from '../../generated/prisma/client.js';

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gère le changement de statut d'un devis et déclenche les automatisations
   */
  async handleDevisStatusChange(devisId: number, newStatut: DevisStatut, companyId: number) {
    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId, companyId },
      include: { client: true },
    });

    if (!devis) {
      throw new BadRequestException('Devis introuvable');
    }

    // Mise à jour du statut du devis
    const updatedDevis = await this.prisma.devis.update({
      where: { id: devisId },
      data: { statut: newStatut },
    });

    // P0.2 Automatique : Si le devis passe à SIGNE -> Créer Chantier
    if (newStatut === DevisStatut.SIGNE) {
      await this.createChantierFromDevis(devisId, companyId);
    }

    return updatedDevis;
  }

  /**
   * Logique de création du chantier à partir d'un devis
   */
  private async createChantierFromDevis(devisId: number, companyId: number) {
    // Vérifier si un chantier n'existe pas déjà pour ce devis
    const existingChantier = await this.prisma.chantier.findFirst({
      where: { devis: { some: { id: devisId } } }
    });

    if (existingChantier) {
      this.logger.warn(`Un chantier existe déjà pour le devis #${devisId}`);
      return existingChantier;
    }

    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId },
      include: { client: true }
    });

    // Création du chantier avec les infos du devis
    const chantier = await this.prisma.chantier.create({
      data: {
        companyId: companyId,
        clientId: devis.clientId,
        reference: `CH-${devis.reference}`,
        adresse: devis.client.adresseChantier || devis.client.adresseClient || 'Adresse à préciser',
        description: devis.notes || `Chantier issu du devis signé ${devis.reference}`,
        statut: ChantierStatut.PLANIFIE, // Statut initial demandé
      },
    });

    // Lier le devis au nouveau chantier
    await this.prisma.devis.update({
      where: { id: devisId },
      data: { chantierId: chantier.id },
    });

    this.logger.log(`Chantier créé automatiquement : ${chantier.reference} pour devis #${devisId}`);
    return chantier;
  }
}