import { cosineSimilarity, findMostSimilar } from './semantic-similarity';

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