// ============================================================
// EMBEDDINGS — transforme un texte en vecteur de sens (384 dimensions).
// Utilise un modele local (all-MiniLM-L6-v2) qui tourne DANS Node.js :
// zero API, zero cle, zero reseau apres le premier telechargement.
// Le modele est charge UNE fois (paresseusement) puis reutilise.
// ============================================================

// Import dynamique : @xenova/transformers est un module ESM,
// on le charge a la demande pour rester compatible avec la stack.
let extractorPromise: Promise<unknown> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    // Le modele se telecharge (~25 Mo) au tout premier appel, puis est mis en cache.
    extractorPromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'),
    );
  }
  return extractorPromise;
}

/**
 * Transforme un texte en vecteur de 384 nombres capturant son sens.
 * pooling: 'mean' = moyenne des tokens (un vecteur par phrase, pas par mot).
 * normalize: true = vecteur de longueur 1 (ideal pour la similarite cosinus).
 */
export async function embedText(text: string): Promise<number[]> {
  const extractor = (await getExtractor()) as (
    text: string,
    options: { pooling: string; normalize: boolean },
  ) => Promise<{ data: Float32Array }>;

  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Version optimisee pour plusieurs textes (l'indexation des documents).
 * Charge le modele une seule fois pour tout le lot.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}