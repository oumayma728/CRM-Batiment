// Evaluation : le RAG semantique retrouve-t-il le bon document
// pour des questions formulees AUTREMENT que les mots-cles ?
import 'dotenv/config';
import pg from 'pg';
import { embedText } from './embeddings.js';
import { cosineSimilarity } from './semantic-similarity.js';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });

  // 1) Charger les 28 documents RAG depuis la base
  const { rows: docs } = await pool.query(
    'SELECT id, titre, contenu FROM rag_documents WHERE actif = true',
  );
  console.log(`${docs.length} documents charges. Vectorisation...\n`);

  // 2) Vectoriser chaque document (titre + contenu, tronque pour la vitesse)
  const indexed: Array<{ titre: string; embedding: number[] }> = [];
  for (const doc of docs) {
    const text = `${doc.titre}. ${doc.contenu}`.slice(0, 500);
    indexed.push({ titre: doc.titre, embedding: await embedText(text) });
  }
  console.log('Vectorisation terminee.\n');

  // 3) Des questions formulees DIFFEREMMENT des mots-cles du seed
  const questions = [
    'quel est le tarif pour refaire ma maison',
    'ca coute cher de renover une cuisine',
    'je veux connaitre le delai de validite d une proposition commerciale',
    'comment on mesure la surface d une piece',
    'est-ce que je peux parler a quelqu un de votre equipe',
  ];

  // 4) Pour chaque question : trouver le doc le plus proche
  for (const q of questions) {
    const qVec = await embedText(q);
    const ranked = indexed
      .map((d) => ({ titre: d.titre, score: cosineSimilarity(qVec, d.embedding) }))
      .sort((a, b) => b.score - a.score);

    console.log(`❓ "${q}"`);
    console.log(`   1. ${ranked[0].titre} (${ranked[0].score.toFixed(3)})`);
    console.log(`   2. ${ranked[1].titre} (${ranked[1].score.toFixed(3)})`);
    console.log('');
  }

  await pool.end();
}

main().catch(console.error);