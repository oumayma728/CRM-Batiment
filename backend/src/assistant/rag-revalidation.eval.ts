// ============================================================
// RE-VALIDATION RAG — Lexical seul vs Hybride (sous-tache 3, cahier des charges)
//
// OBJECTIF : prouver, sur ~45 questions reformulees, que le score HYBRIDE
// (lexical + bonus semantique) :
//   - ne REGRESSE JAMAIS par rapport au lexical seul (garantie mathematique) ;
//   - GAGNE sur les reformulations (retrouve des docs que le lexical rate).
//
// METHODE : pour chaque question, on calcule le doc en tete dans 2 passes :
//   AVANT = lexical seul
//   APRES = lexical + semanticBonus (exactement la fonction du vrai code)
// puis on compare au document ATTENDU (expectedDocId).
//
// NOTE HONNETE : le lexical de ce script est une APPROXIMATION (comptage de
// mots communs), pas le computeScore prive du service. Suffisant pour la
// comparaison relative (lexical seul vs lexical+bonus sur les memes bases),
// mais les valeurs absolues ne sont pas celles de la prod. A signaler a Oumayma.
//
// Lancement : node --loader ts-node/esm src/assistant/rag-revalidation.eval.ts
// ============================================================

import 'dotenv/config';
import pg from 'pg';
import { cosineSimilarity, semanticBonus } from './semantic-similarity.js';
import { embedText, embedTexts } from './embeddings.js';
import { VALIDATION_QUESTIONS } from './rag-questions.data.js';

// Memes reglages que le vrai moteur (assistant-rag.service.ts).
const SEMANTIC_FLOOR = 0.35;
const SEMANTIC_WEIGHT = 0.35;

type IndexedDoc = {
  id: number;
  titre: string;
  contenu: string;
  tokens: Set<string>;
  embedding: number[];
};

// --- Nettoyage identique a l'esprit de normalizeForMatch (minuscules, sans accents) ---
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Tokens "utiles" : mots de 3+ lettres (on ignore le bruit court) ---
function tokenize(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(' ')
      .filter((w) => w.length >= 3),
  );
}

// --- Lexical simplifie : proportion de mots de la question presents dans le doc ---
function lexicalScore(questionTokens: Set<string>, docTokens: Set<string>): number {
  if (questionTokens.size === 0) return 0;
  let common = 0;
  for (const t of questionTokens) {
    if (docTokens.has(t)) common++;
  }
  return common / questionTokens.size;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });

  // ===== 1) INDEXATION : charger + vectoriser les 29 docs (une fois) =====
  console.log('Chargement des documents RAG actifs...');
  const { rows } = await pool.query(
    'SELECT id, titre, contenu FROM rag_documents WHERE actif = true ORDER BY id;',
  );
  console.log(`${rows.length} documents charges. Vectorisation en cours...`);

  const embeddings = await embedTexts(
    rows.map((d) => `${d.titre}. ${d.contenu}`.slice(0, 600)),
  );

  const docs: IndexedDoc[] = rows.map((d, i) => ({
    id: d.id,
    titre: d.titre,
    contenu: d.contenu,
    tokens: tokenize(`${d.titre} ${d.contenu}`),
    embedding: embeddings[i],
  }));
  console.log('Vectorisation terminee.\n');

  // ===== 2) POUR CHAQUE QUESTION : 2 passes =====
  let identiques = 0;
  let gains = 0;
  let regressions = 0;
  const regressionDetails: string[] = [];

  console.log(
    '═'.repeat(100) + '\n' +
      'RE-VALIDATION RAG — Lexical seul vs Hybride\n' +
      '═'.repeat(100),
  );

  for (const q of VALIDATION_QUESTIONS) {
    const qTokens = tokenize(q.question);
    const qEmbedding = await embedText(q.question);

    // Passe AVANT : lexical seul
    // Passe APRES : lexical + semanticBonus
    let bestLexical = { id: -1, score: -1 };
    let bestHybride = { id: -1, score: -1 };

    for (const doc of docs) {
      const lex = lexicalScore(qTokens, doc.tokens);
      const sim = cosineSimilarity(qEmbedding, doc.embedding);
      const hybride = lex + semanticBonus(sim, SEMANTIC_FLOOR, SEMANTIC_WEIGHT);

      if (lex > bestLexical.score) bestLexical = { id: doc.id, score: lex };
      if (hybride > bestHybride.score) bestHybride = { id: doc.id, score: hybride };
    }

    const lexOk = bestLexical.id === q.expectedDocId;
    const hybOk = bestHybride.id === q.expectedDocId;

    // Verdict
    let verdict: string;
    if (lexOk && hybOk) {
      verdict = '=';
      identiques++;
    } else if (!lexOk && hybOk) {
      verdict = 'GAIN ⬆';
      gains++;
    } else if (lexOk && !hybOk) {
      verdict = 'REGRESSION ⬇';
      regressions++;
      regressionDetails.push(
        `  "${q.question}" — attendu #${q.expectedDocId}, hybride a pris #${bestHybride.id}`,
      );
    } else {
      // ni l'un ni l'autre correct : les deux se trompent, pas une regression DE l'hybride
      verdict = 'x (les 2 KO)';
      identiques++; // pas une regression : l'hybride ne fait pas pire
    }

    const titreOf = (id: number) =>
      docs.find((d) => d.id === id)?.titre.slice(0, 28) ?? '(aucun)';

    console.log(
      `[${q.theme.padEnd(9)}] ${q.question.slice(0, 42).padEnd(42)} │ ` +
        `LEX: ${(lexOk ? '✓ ' : '✗ ') + titreOf(bestLexical.id)}`.padEnd(38) +
        ` │ HYB: ${(hybOk ? '✓ ' : '✗ ') + titreOf(bestHybride.id)}`.padEnd(38) +
        ` │ ${verdict}`,
    );
  }

  // ===== 3) BILAN =====
  const total = VALIDATION_QUESTIONS.length;
  const nonRegression = (((total - regressions) / total) * 100).toFixed(1);

  console.log('\n' + '═'.repeat(100));
  console.log('BILAN');
  console.log(`  Total questions        : ${total}`);
  console.log(`  Identiques / neutres   : ${identiques}`);
  console.log(`  Gains (hybride mieux)  : ${gains}`);
  console.log(`  REGRESSIONS            : ${regressions}   ${regressions === 0 ? '✅ (garantie respectee)' : '🔴 A INVESTIGUER'}`);
  console.log(`  Taux de non-regression : ${nonRegression} %`);
  console.log('═'.repeat(100));

  if (regressions > 0) {
    console.log('\nDETAIL DES REGRESSIONS :');
    regressionDetails.forEach((d) => console.log(d));
  }

  await pool.end();
}

main().catch((e) => {
  console.error('Erreur:', e);
  process.exit(1);
});