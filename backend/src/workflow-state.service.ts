import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';
import { 
  DevisStatut, 
  ChantierStatut, 
  FactureType, 
  CommandeFournisseurStatut,
  Prisma
} from '../generated/prisma/client.js';

/**
 * Définition des transitions autorisées pour les Devis
 */
const DEVIS_TRANSITIONS: Record<DevisStatut, DevisStatut[]> = {
  BROUILLON: ['ENVOYE', 'ANNULE'],
  ENVOYE: ['ACCEPTE', 'REFUSE', 'ANNULE'],
  ACCEPTE: ['SIGNE', 'ANNULE'],
  SIGNE: [], // Statut final, nécessite une révision pour changer
  REFUSE: ['REVISE', 'ANNULE'],
  REVISE: ['RENVOYE', 'ANNULE'],
  RENVOYE: ['ACCEPTE', 'REFUSE', 'ANNULE'],
  ANNULE: [],
};

/**
 * Définition simplifiée des transitions pour les Chantiers
 */
const CHANTIER_TRANSITIONS: Record<ChantierStatut, ChantierStatut[]> = {
  VISITE_TECHNIQUE: ['DEVIS_EN_PREPARATION'],
  DEVIS_EN_PREPARATION: ['DEVIS_ENVOYE'],
  DEVIS_ENVOYE: ['NEGOCIATION_EN_COURS', 'DEVIS_VALIDE'],
  NEGOCIATION_EN_COURS: ['DEVIS_VALIDE', 'DEVIS_EN_PREPARATION'],
  DEVIS_VALIDE: ['COMMANDES_GENEREES', 'PLANIFIE'],
  COMMANDES_GENEREES: ['MATERIAUX_EN_LIVRAISON', 'PLANIFIE'],
  MATERIAUX_EN_LIVRAISON: ['MATERIAUX_RECEPTIONNES', 'PLANIFIE'],
  MATERIAUX_RECEPTIONNES: ['PLANIFIE'],
  PLANIFIE: ['DEMARRE'],
  DEMARRE: ['EN_COURS', 'TERMINE'],
  EN_COURS: ['TERMINE', 'CLOTURE'],
  TERMINE: ['CLOTURE'],
  CLOTURE: [],
};

@Injectable()
export class WorkflowStateService {
  private readonly logger = new Logger(WorkflowStateService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Valide si une transition de statut pour un Devis est autorisée
   */
  async validateDevisTransition(devisId: number, nextStatut: DevisStatut, companyId: number) {
    const devis = await this.prisma.devis.findFirst({
      where: { id: devisId, companyId },
      include: { _count: { select: { lignes: true } } }
    });

    if (!devis) throw new BadRequestException('Devis introuvable');

    const current = devis.statut;
    const allowed = DEVIS_TRANSITIONS[current] || [];

    if (!allowed.includes(nextStatut)) {
      throw new BadRequestException(
        `Transition de ${current} vers ${nextStatut} non autorisée.`
      );
    }

    // P0.6 : Impossible de signer/accepter un devis sans lignes
    if ((nextStatut === 'ACCEPTE' || nextStatut === 'SIGNE') && devis._count.lignes === 0) {
      throw new BadRequestException('Impossible de valider un devis ne contenant aucune ligne.');
    }

    return devis;
  }

  /**
   * P0.6 : Validation Métier - Empêcher la suppression d'un matériau utilisé dans un devis signé
   */
  async canDeleteMaterial(materiauId: number, companyId: number) {
    const usage = await this.prisma.ligneDevis.findFirst({
      where: { 
        materiauId, 
        devis: { statut: 'SIGNE', companyId } 
      }
    });

    if (usage) {
      throw new ForbiddenException('Impossible de supprimer ce matériau car il est utilisé dans un devis déjà signé.');
    }
  }

  /**
   * Gère le changement de statut d'un devis et déclenche les automatisations associées.
   * C'est ici que l'automatisation P0.2 et P0.3 est pilotée.
   */
  async handleDevisStatusChange(devisId: number, newStatut: DevisStatut, companyId: number) {
    // Validation de la transition et des règles métier (lignes, etc.)
    const devis = await this.validateDevisTransition(devisId, newStatut, companyId);

    // Mise à jour du statut du devis
    const updatedDevis = await this.prisma.devis.update({
      where: { id: devisId },
      data: { statut: newStatut },
    });

    // P0.2 Automatique : Si le devis passe à SIGNE -> Créer le Chantier
    if (newStatut === DevisStatut.SIGNE) {
      await this.createChantierFromDevis(devisId, companyId);
      // P0.3 Automatique : Créer la facture d'acompte (30%)
      await this.createFactureAcompteFromDevis(devisId, companyId);
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
      where: { id: devisId, companyId },
      include: { client: true }
    });

    if (!devis) throw new BadRequestException('Devis introuvable pour la création du chantier');

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

  /**
   * Logique de création de la facture d'acompte (P0.3)
   */
  private async createFactureAcompteFromDevis(devisId: number, companyId: number, percentage = 30) {
    // 1. Protection contre les doublons (P0.6)
    const existingAcompte = await this.prisma.facture.findFirst({
      where: { devisId, typeFacture: FactureType.ACOMPTE }
    });

    if (existingAcompte) {
      this.logger.warn(`P0.3 : Une facture d'acompte existe déjà pour le devis #${devisId}.`);
      return existingAcompte;
    }

    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId, companyId },
      include: { client: true }
    });

    if (!devis) throw new BadRequestException('Devis introuvable pour la facturation');

    // 2. Calcul des montants (30% de chaque composante)
    const ratio = percentage / 100; // Default to 30%
    const montantHT = Math.round(devis.totalHT * ratio * 100) / 100;
    const montantTVA = Math.round(devis.totalTVA * ratio * 100) / 100;
    const montantTTC = Math.round(devis.totalTTC * ratio * 100) / 100;

    // 3. Génération de la référence (simplifiée pour l'exemple)
    const year = new Date().getFullYear();
    const count = await this.prisma.facture.count({ where: { reference: { startsWith: `FAC-${year}` } } });
    const factureReference = `FAC-${year}-${String(count + 1).padStart(4, '0')}`;

    const facture = await this.prisma.facture.create({
      data: {
        devisId,
        reference: factureReference,
        typeFacture: FactureType.ACOMPTE,
        acomptePercent: percentage,
        acompteMontant: montantTTC,
        montantHT,
        montantTVA,
        montantTTC,
        statut: 'BROUILLON',
        referenceDevis: devis.reference,
        tauxTVA: devis.tauxTVA,
        nomClient: devis.client.nom,
        prenomClient: devis.client.prenom,
        emailClient: devis.client.email,
        telephoneClient: devis.client.telephone,
        adresseClient: devis.client.adresseChantier || devis.client.adresseClient,
        lignes: {
          create: {
            description: `Acompte de ${percentage}% sur devis ${devis.reference}`,
            quantite: 1,
            unite: 'FORFAIT',
            prixUnitaireHT: montantHT,
            tauxTVA: devis.tauxTVA,
            montantHT, montantTVA, montantTTC
          }
        }
      },
    });

    this.logger.log(`P0.3 : Facture d'acompte ${facture.reference} générée pour devis #${devisId}.`);
    return facture;
  }
}