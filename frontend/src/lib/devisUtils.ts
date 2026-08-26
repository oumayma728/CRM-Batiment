import type { PlanPiece, DevisLine, PieceSansDevis } from '../types';

export const EXCLUDED_KEYWORDS = [
  "terrasse",
  "jardin",
  "garage",
  "cour",
  "parking",
  "surface couverte",
  "emprise au sol",
  "comptoir",
  "compteur",
];

export function recalculateDevisFromPieces(pieces: PlanPiece[]): {
  lignes_devis_proposees: DevisLine[];
  pieces_sans_devis_possible: PieceSansDevis[];
  surface_totale_m2: number | null;
} {
  const lignes_devis: DevisLine[] = [];
  const pieces_sans_devis: PieceSansDevis[] = [];

  if (!pieces || pieces.length === 0) {
    return {
      lignes_devis_proposees: [],
      pieces_sans_devis_possible: [],
      surface_totale_m2: null,
    };
  }

  for (const p of pieces) {
    const nom = (p.nom || '').trim();
    if (!nom) continue;
    const nomLower = nom.toLowerCase();

    // Vérifier si la pièce est une zone extérieure / à exclure
    const isExcluded = EXCLUDED_KEYWORDS.some((kw) => nomLower.includes(kw));
    if (isExcluded) continue;

    const surf = p.surface_m2;
    if (surf !== null && surf !== undefined && typeof surf === 'number' && surf > 0) {
      lignes_devis.push({
        designation: `Carrelage ${nom}`,
        quantite: Math.round(surf * 100) / 100,
        unite: 'm2',
      });
    } else {
      pieces_sans_devis.push({
        nom,
        raison: 'Surface m² non renseignée sur le plan (saisie manuelle requise)',
      });
    }
  }

  // Calcul de la somme totale des surfaces valides
  const validSurfaces = pieces
    .map((p) => p.surface_m2)
    .filter((s): s is number => typeof s === 'number' && s > 0);
  const totalSum = validSurfaces.reduce((acc, curr) => acc + curr, 0);

  return {
    lignes_devis_proposees: lignes_devis,
    pieces_sans_devis_possible: pieces_sans_devis,
    surface_totale_m2: totalSum > 0 ? Math.round(totalSum * 100) / 100 : null,
  };
}
