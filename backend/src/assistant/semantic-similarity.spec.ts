import { cosineSimilarity, findMostSimilar, semanticBonus } from './semantic-similarity.js';
describe('cosineSimilarity — proximite de sens entre vecteurs', () => {
  it('retourne 1 pour deux vecteurs identiques', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it('retourne ~1 pour deux vecteurs de meme direction (longueur differente)', () => {
    // [2,4,6] = [1,2,3] x2 : meme direction => meme sens
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 5);
  });

  it('retourne 0 pour deux vecteurs orthogonaux (aucun rapport)', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('retourne -1 pour deux vecteurs opposes', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 5);
  });

  it('retourne 0 pour des vecteurs de tailles differentes', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it('retourne 0 quand un vecteur est nul', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });
});

describe('findMostSimilar — recherche des documents les plus proches', () => {
  const docs = [
    { id: 'a', embedding: [1, 0, 0] },
    { id: 'b', embedding: [0, 1, 0] },
    { id: 'c', embedding: [0.9, 0.1, 0] }, // proche de "a"
  ];
describe('semanticBonus — bonus semantique borne', () => {
  const FLOOR = 0.35;
  const WEIGHT = 0.35;

  it('renvoie 0 sous le plancher de bruit (documents sans rapport)', () => {
    // "planter des tomates" vs "renovation" = 0.379 dans notre demo :
    // proche du bruit, le bonus doit rester negligeable.
    expect(semanticBonus(0.2, FLOOR, WEIGHT)).toBe(0);
    expect(semanticBonus(0.33, FLOOR, WEIGHT)).toBe(0);
  });

  it('renvoie exactement 0 AU plancher (pas de discontinuite)', () => {
    expect(semanticBonus(FLOOR, FLOOR, WEIGHT)).toBe(0);
  });

  it('est strictement croissant au-dessus du plancher', () => {
    const faible = semanticBonus(0.42, FLOOR, WEIGHT);
    const moyen = semanticBonus(0.465, FLOOR, WEIGHT);
    const fort = semanticBonus(0.628, FLOOR, WEIGHT);
    expect(faible).toBeLessThan(moyen);
    expect(moyen).toBeLessThan(fort);
  });

  it('ne depasse JAMAIS le poids maximal', () => {
    expect(semanticBonus(1, FLOOR, WEIGHT)).toBeCloseTo(WEIGHT, 6);
    expect(semanticBonus(2, FLOOR, WEIGHT)).toBeLessThanOrEqual(WEIGHT);
  });

  it('GARANTIE ANTI-REGRESSION : le bonus est toujours >= 0', () => {
    // C'est LA propriete qui protege les ~45 questions validees :
    // scoreLexical + bonus >= scoreLexical, pour toute similarite.
    for (let s = -1; s <= 1; s += 0.05) {
      expect(semanticBonus(s, FLOOR, WEIGHT)).toBeGreaterThanOrEqual(0);
    }
  });

  it('neutralise les valeurs invalides (NaN ne doit pas polluer le tri)', () => {
    expect(semanticBonus(NaN, FLOOR, WEIGHT)).toBe(0);
    expect(semanticBonus(0.9, 1, WEIGHT)).toBe(0); // plancher absurde
  });

  it('reproduit les valeurs attendues sur nos donnees reelles', () => {
    // 0.465 -> 0.35 * (0.115 / 0.65) = 0.0619...
    expect(semanticBonus(0.465, FLOOR, WEIGHT)).toBeCloseTo(0.0619, 3);
    // 0.628 -> 0.35 * (0.278 / 0.65) = 0.1497...
    expect(semanticBonus(0.628, FLOOR, WEIGHT)).toBeCloseTo(0.1497, 3);
  });
});
  it('classe le document le plus proche en premier', () => {
    const result = findMostSimilar([1, 0, 0], docs, 3);
    expect(result[0].document.id).toBe('a'); // identique
    expect(result[1].document.id).toBe('c'); // presque aligne
    expect(result[2].document.id).toBe('b'); // orthogonal
  });

  it('respecte la limite topN', () => {
    const result = findMostSimilar([1, 0, 0], docs, 2);
    expect(result).toHaveLength(2);
  });
});