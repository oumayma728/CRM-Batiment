import { embedText } from './embeddings.js';
import { cosineSimilarity } from './semantic-similarity.js';

async function main() {
  console.log('Chargement du modele (premier run = telechargement ~25 Mo)...\n');

  // Deux phrases de MEME SENS mais MOTS DIFFERENTS (le defi du lexical !)
  const q1 = 'combien coute une renovation';
  const q2 = 'quel est le tarif pour refaire ma maison';
  // Une phrase SANS RAPPORT
  const q3 = 'comment planter des tomates';

  const [v1, v2, v3] = await Promise.all([
    embedText(q1),
    embedText(q2),
    embedText(q3),
  ]);

  console.log(`Dimensions du vecteur : ${v1.length}\n`);
  console.log(`"${q1}"`);
  console.log(`  vs "${q2}"`);
  console.log(`  => similarite : ${cosineSimilarity(v1, v2).toFixed(3)} (attendu : ELEVE, meme sens)\n`);
  console.log(`"${q1}"`);
  console.log(`  vs "${q3}"`);
  console.log(`  => similarite : ${cosineSimilarity(v1, v3).toFixed(3)} (attendu : FAIBLE, sans rapport)\n`);
}

main().catch(console.error);