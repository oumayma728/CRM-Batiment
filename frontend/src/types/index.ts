export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

export type DocumentStatut = 'en_attente' | 'valide' | 'rejete';
export type DocumentType = 'facture' | 'plan';

export interface PlanPiece {
  nom: string;
  niveau?: string | null;
  categorie?: string | null;
  cotes?: string[];
  cotes_originales?: string[];
  longueur_m?: number | null;
  largeur_m?: number | null;
  surface_m2?: number | null;
  source_surface?: 'imprimee' | 'calculee' | null;
  methode_calcul?: string | null;
  confiance?: number;
}

export interface DevisLine {
  designation: string;
  quantite: number;
  unite: string;
}

export interface PieceSansDevis {
  nom: string;
  raison: string;
}

export interface DocumentItem {
  id: number;
  nom_fichier: string;
  type_document: DocumentType;
  date_facture: string | null;
  numero_facture: string | null;
  nom_fournisseur: string | null;
  montant_ht: number | null;
  montant_tva: number | null;
  montant_ttc: number | null;
  produits: string[];
  pieces?: PlanPiece[];
  surface_totale_m2?: number | null;
  lignes_devis_proposees?: DevisLine[];
  pieces_sans_devis_possible?: PieceSansDevis[];
  technologie: string;
  temps_traitement_s: number;
  statut: DocumentStatut;
  motif_rejet: string | null;
  erreur: string | null;
  date_traitement: string;
  date_validation: string | null;
}

export interface FactureExtractionResult {
  id?: number;
  date_facture: string | null;
  numero_facture: string | null;
  nom_fournisseur: string | null;
  montant_ht: number | null;
  montant_tva: number | null;
  montant_ttc: number | null;
  produits: string[];
  technologie_utilisee: string;
  temps_traitement_s: number;
  erreur: string | null;
  avertissement_doublon?: string | null;
}

export interface PlanResponse {
  id?: number;
  pieces: PlanPiece[];
  surface_totale_m2: number | null;
  lignes_devis_proposees?: DevisLine[];
  pieces_sans_devis_possible?: PieceSansDevis[];
  technologie_utilisee: string;
  temps_traitement_s: number;
  erreur: string | null;
  avertissement_doublon?: string | null;
}

export interface ExtractedFieldCard {
  id: string;
  label: string;
  value: string | number | string[] | PlanPiece[] | DevisLine[] | PieceSansDevis[] | null;
  type: 'text' | 'number' | 'date' | 'list' | 'pieces' | 'devis_lines' | 'pieces_sans_devis';
  position: BoundingBox;
  confidence?: number; // 0.0-1.0, score de confiance IA pour ce champ
}

export interface DocumentFilterState {
  typeDocument: DocumentType;
  search: string;
  statut: string; // 'all' | 'en_attente' | 'valide' | 'rejete'
  dateDebut: string;
  dateFin: string;
  montantMin: string;
  montantMax: string;
  montantType: 'ttc' | 'ht';
}

export interface TableSortState {
  column: keyof DocumentItem;
  direction: 'asc' | 'desc';
}
