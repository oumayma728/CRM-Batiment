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
 * Convertit une similarite cosinus BRUTE en BONUS additif borne.
 *
 * POURQUOI un plancher (floor) ?
 * Le cosinus n'a PAS de zero naturel. Deux textes francais sans aucun
 * rapport ("planter des tomates" vs "renovation") sortent quand meme a
 * ~0.38 : c'est le PLANCHER DE BRUIT (anisotropie des embeddings).
 * Sans le retrancher, on ajouterait le meme bonus a TOUS les documents,
 * ce qui n'apporte zero information et pollue le filtre de pertinence.
 *
 * POURQUOI borner par weight ?
 * Le modele se trompe 2 fois sur 5 en francais (evaluation phase 2).
 * Un signal non fiable n'a pas le droit de renverser le socle lexical.
 *
 * PROPRIETE GARANTIE : le retour est toujours >= 0.
 * Donc scoreLexical + bonus >= scoreLexical : aucune question qui
 * fonctionnait avant ne peut cesser de fonctionner.
 *
 * @param similarity cosinus brut, typiquement 0.33 -> 0.63 chez nous
 * @param floor       plancher de bruit sous lequel le bonus est nul
 * @param weight      bonus maximal theorique (atteint si similarity = 1)
 */
export function semanticBonus(
  similarity: number,
  floor: number,
  weight: number,
): number {
  // Garde-fou : un NaN se propagerait dans tout le classement.
  // Garde-fou : un NaN se propagerait dans tout le classement.
  if (!Number.isFinite(similarity)) return 0;

  // ============================================================
  // BORNE HAUTE — la ligne qui rend la promesse "bonus <= weight" VRAIE.
  //
  // POURQUOI clamper alors qu'un cosinus est mathematiquement dans [-1, 1] ?
  //  1) ARRONDI FLOTTANT : cosineSimilarity(v, v) peut retourner
  //     1.0000000000000002 (numerateur et denominateur calcules par des
  //     suites d'operations differentes, chacune arrondie).
  //  2) EVOLUTION : si on remplace un jour le cosinus par une autre metrique
  //     (produit scalaire brut, autre modele), l'intervalle d'entree change
  //     et le semantique se mettrait a dominer le lexical EN SILENCE.
  //  3) TYPAGE : la signature declare `number`, pas "cosinus". Le compilateur
  //     autorise donc explicitement 2 -> la fonction doit s'en defendre.
  //
  // REGLE : un invariant ecrit en commentaire est un voeu ;
  //         un invariant applique par le code est une garantie.
  // Bug reel detecte par le test de propriete "ne depasse jamais le poids
  // maximal" : sans ce clamp, semanticBonus(2, 0.35, 0.35) rendait 0.888.
  // ============================================================
  const bounded = Math.min(similarity, 1);

  if (bounded <= floor) return 0;

  const span = 1 - floor;
  if (span <= 0) return 0; // configuration absurde (floor >= 1) : on neutralise

  return weight * ((bounded - floor) / span);
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