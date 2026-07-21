// ============================================================
// SIMILARITE SEMANTIQUE — briques de base du RAG vectoriel.
// Un "embedding" est un vecteur (liste de nombres) qui capture
// le SENS d'un texte. Deux textes de sens proche ont des vecteurs
// proches. On mesure cette proximite par la similarite cosinus.
// ============================================================

/**
 * Similarite cosinus entre deux vecteurs.
 * Retourne un score dans [-1, 1] :
 *   1  = sens identique (memes vecteurs)
 *   0  = aucun rapport (vecteurs orthogonaux)
 *  -1  = sens oppose
 * C'est le cosinus de l'angle entre les deux vecteurs :
 * on ignore leur longueur, on ne regarde que leur DIRECTION (= le sens).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0; // vecteurs incompatibles : aucun rapport mesurable
  }

  let dotProduct = 0; // produit scalaire (a . b)
  let normA = 0; // longueur de a au carre
  let normB = 0; // longueur de b au carre

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0; // un vecteur nul : pas de direction, pas de sens
  }

  return dotProduct / denominator;
}

/**
 * Cherche, parmi une liste de documents vectorises, les N plus proches
 * d'un vecteur de requete. Retourne les documents avec leur score,
 * tries du plus pertinent au moins pertinent.
 */
export function findMostSimilar<T extends { embedding: number[] }>(
  queryVector: number[],
  documents: T[],
  topN = 3,
): Array<{ document: T; score: number }> {
  return documents
    .map((document) => ({
      document,
      score: cosineSimilarity(queryVector, document.embedding),
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, topN);
}