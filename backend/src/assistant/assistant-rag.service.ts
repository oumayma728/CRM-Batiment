import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

type AssistantIntent =
  | 'demande_devis'
  | 'demande_info_service'
  | 'demande_prix'
  | 'information_generale'
  | 'autre';

type KnowledgeChunk = {
  sourceType: 'type_projet' | 'categorie' | 'prestation' | 'rag_document';
  sourceId: number;
  title: string;
  text: string;
  normalizedText: string;
  // BM25: term frequency map for each token in the chunk
  termFrequencies: Map<string, number>;
  docLength: number;
  priority?: number;
};

export type RagSnippet = {
  sourceType: 'type_projet' | 'categorie' | 'prestation' | 'rag_document';
  sourceId: number;
  title: string;
  excerpt: string;
  score: number;
};

type RagRetrievalInput = {
  companyId: number;
  query: string;
  projectType?: string;
  intent?: AssistantIntent;
  limit?: number;
};

type RagRetrievalResult = {
  snippets: RagSnippet[];
  context: string;
};

// BM25 hyperparameters
const BM25_K1 = 1.5;
const BM25_B  = 0.75;

@Injectable()
export class AssistantRagService {
  private readonly logger = new Logger(AssistantRagService.name);
  private readonly cacheTtlMs = this.resolveCacheTtlMs();
  private readonly cache = new Map<
    number,
    { expiresAt: number; chunks: KnowledgeChunk[]; idf: Map<string, number>; avgDocLen: number }
  >();

  // ── Stop words: only true functional words, NOT domain vocabulary ──────────
  // Removed: prix, projet, plus — these ARE relevant in BTP context
  private readonly stopWords = new Set([
    'alors', 'au', 'aucun', 'aussi', 'avec', 'avoir',
    'bien', 'bonjour', 'car', 'cela', 'ces', 'chez',
    'comment', 'dans', 'des', 'donc', 'elle', 'elles',
    'entre', 'est', 'etre', 'fait', 'faire', 'ici', 'ils',
    'les', 'leur', 'mais', 'meme', 'merci', 'mon',
    'notre', 'nous', 'par', 'pas', 'pour', 'quel',
    'quelle', 'quelles', 'quels', 'sans', 'serait',
    'sont', 'sur', 'tout', 'tres', 'une', 'vous', 'vos',
    'qui', 'que', 'quoi', 'dont', 'avec', 'cette', 'cet',
    'aux', 'del', 'ses', 'mes',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  /** Call this after any RAG document mutation to force cache refresh */
  invalidateCache(companyId: number): void {
    this.cache.delete(companyId);
  }

  async retrieveContext(input: RagRetrievalInput): Promise<RagRetrievalResult> {
    if (!this.isEnabled()) {
      return { snippets: [], context: '' };
    }

    const query = input.query.trim();
    if (!query) {
      return { snippets: [], context: '' };
    }

    const { chunks, idf, avgDocLen } = await this.getKnowledgeChunks(input.companyId);
    if (chunks.length === 0) {
      return { snippets: [], context: '' };
    }

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return { snippets: [], context: '' };
    }

    const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);

    const scored = chunks
      .map((chunk) => ({
        chunk,
        score: this.computeBm25Score({
          queryTokens,
          chunk,
          idf,
          avgDocLen,
          query,
          projectType: input.projectType,
          intent: input.intent,
        }),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const snippets: RagSnippet[] = scored.map(({ chunk, score }) => ({
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      title: chunk.title,
      excerpt: this.toExcerpt(chunk.text, 300),
      score: Number(score.toFixed(3)),
    }));

    const context = snippets.length > 0 ? this.buildContextBlock(snippets, chunks) : '';

    return { snippets, context };
  }

  private isEnabled(): boolean {
    const raw = (process.env.ASSISTANT_RAG_ENABLED || 'true').trim().toLowerCase();
    return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
  }

  private async getKnowledgeChunks(
    companyId: number,
  ): Promise<{ chunks: KnowledgeChunk[]; idf: Map<string, number>; avgDocLen: number }> {
    const now = Date.now();
    const cached = this.cache.get(companyId);
    if (this.cacheTtlMs > 0 && cached && cached.expiresAt > now) {
      return { chunks: cached.chunks, idf: cached.idf, avgDocLen: cached.avgDocLen };
    }

    const [types, ragDocuments] = await Promise.all([
      this.prisma.typeProjet.findMany({
        where: { companyId, actif: true },
        orderBy: { nom: 'asc' },
        select: {
          id: true,
          nom: true,
          description: true,
          categories: {
            select: {
              categorie: {
                select: {
                  id: true,
                  nom: true,
                  description: true,
                  prestations: {
                    where: { actif: true },
                    orderBy: { nom: 'asc' },
                    select: {
                      id: true,
                      nom: true,
                      description: true,
                      unite: true,
                      prixVenteMin: true,
                      prixVenteMax: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.ragDocument.findMany({
        where: { companyId, actif: true },
        orderBy: [{ priorite: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true, titre: true, categorie: true, contenu: true, priorite: true },
      }),
    ]);

    const rawChunks: Array<{ sourceType: KnowledgeChunk['sourceType']; sourceId: number; title: string; text: string; priority?: number }> = [];

    for (const doc of ragDocuments) {
      rawChunks.push({
        sourceType: 'rag_document',
        sourceId: doc.id,
        title: doc.titre,
        text: [
          `Titre: ${doc.titre}`,
          `Categorie: ${doc.categorie}`,
          `Priorité: ${doc.priorite}`,
          `Statut: Actif`,
          `Contenu:`,
          doc.contenu,
        ].join('\n'),
        priority: doc.priorite,
      });
    }

    for (const type of types) {
      const categories = type.categories.map((entry) => entry.categorie);
      const uniqueCatNames = [...new Set(categories.map((cat) => cat.nom))];

      rawChunks.push({
        sourceType: 'type_projet',
        sourceId: type.id,
        title: `Service: ${type.nom}`,
        text: [
          `Type de projet: ${type.nom}`,
          type.description ? `Description: ${type.description}` : '',
          uniqueCatNames.length > 0
            ? `Categories disponibles: ${uniqueCatNames.join(', ')}`
            : 'Aucune categorie disponible',
        ].filter(Boolean).join('\n'),
      });

      for (const cat of categories) {
        const prestations = cat.prestations.slice(0, 15);

        rawChunks.push({
          sourceType: 'categorie',
          sourceId: cat.id,
          title: `Categorie: ${cat.nom} (${type.nom})`,
          text: [
            `Type de projet: ${type.nom}`,
            `Categorie: ${cat.nom}`,
            cat.description ? `Description: ${cat.description}` : '',
            prestations.length > 0
              ? `Prestations disponibles: ${prestations.map((p) => p.nom).join(', ')}`
              : 'Aucune prestation active',
          ].filter(Boolean).join('\n'),
        });

        for (const p of prestations) {
          rawChunks.push({
            sourceType: 'prestation',
            sourceId: p.id,
            title: `Prestation: ${p.nom} (${type.nom})`,
            text: [
              `Type de projet: ${type.nom}`,
              `Categorie: ${cat.nom}`,
              `Prestation: ${p.nom}`,
              p.description ? `Description: ${p.description}` : '',
              `Unite: ${p.unite}`,
              `Prix: de ${p.prixVenteMin.toFixed(2)} EUR a ${p.prixVenteMax.toFixed(2)} EUR`,
            ].filter(Boolean).join('\n'),
          });
        }
      }
    }

    // Build chunks with TF data
    const chunks: KnowledgeChunk[] = rawChunks.map((raw) => this.createChunk(raw));

    // ── Compute IDF (Inverse Document Frequency) across all chunks ──────────
    const dfMap = new Map<string, number>();
    for (const chunk of chunks) {
      for (const token of chunk.termFrequencies.keys()) {
        dfMap.set(token, (dfMap.get(token) ?? 0) + 1);
      }
    }

    const N = chunks.length;
    const idf = new Map<string, number>();
    for (const [token, df] of dfMap.entries()) {
      idf.set(token, Math.log((N - df + 0.5) / (df + 0.5) + 1));
    }

    const avgDocLen = chunks.reduce((acc, c) => acc + c.docLength, 0) / Math.max(N, 1);

    if (this.cacheTtlMs > 0) {
      this.cache.set(companyId, { expiresAt: now + this.cacheTtlMs, chunks, idf, avgDocLen });
    }

    return { chunks, idf, avgDocLen };
  }

  private resolveCacheTtlMs(): number {
    // Default to 5 minutes so fresh DB mutations are picked up promptly
    const raw = Number.parseInt(process.env.ASSISTANT_RAG_CACHE_TTL_MS || '300000', 10);
    if (Number.isNaN(raw) || raw < 0) return 300000;
    return raw;
  }

  /**
   * BM25 scoring with domain boosts:
   * - rag_document priority boost (configurable)
   * - intent == demande_prix  →  prestation chunks boosted
   * - projectType match       →  relevant chunks boosted
   */
  private computeBm25Score(input: {
    queryTokens: string[];
    chunk: KnowledgeChunk;
    idf: Map<string, number>;
    avgDocLen: number;
    query: string;
    projectType?: string;
    intent?: AssistantIntent;
  }): number {
    const { queryTokens, chunk, idf, avgDocLen } = input;
    const D = chunk.docLength;

    // ── Core BM25 ──────────────────────────────────────────────────────────
    let bm25 = 0;
    for (const token of queryTokens) {
      const tf = chunk.termFrequencies.get(token) ?? 0;
      if (tf === 0) continue;
      const idfVal = idf.get(token) ?? 0;
      const tfNorm = (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * (D / avgDocLen)));
      bm25 += idfVal * tfNorm;
    }

    if (bm25 === 0) return 0;

    // Normalize to [0, 1] range loosely (BM25 is unbounded)
    let score = bm25 / (bm25 + 5);

    // ── Exact phrase match bonus ───────────────────────────────────────────
    const normalizedQuery = this.normalize(input.query);
    if (normalizedQuery.length > 6 && chunk.normalizedText.includes(normalizedQuery)) {
      score += 0.25;
    }

    // ── Partial phrase match (bigrams) ─────────────────────────────────────
    if (queryTokens.length >= 2) {
      let bigrams = 0;
      for (let i = 0; i < queryTokens.length - 1; i++) {
        const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
        if (chunk.normalizedText.includes(bigram)) bigrams++;
      }
      if (bigrams > 0) score += 0.08 * (bigrams / (queryTokens.length - 1));
    }

    // ── Domain boosts ──────────────────────────────────────────────────────
    if (input.projectType) {
      const npType = this.normalize(input.projectType);
      if (npType && chunk.normalizedText.includes(npType)) score += 0.18;
    }

    if (input.intent === 'demande_prix' && chunk.sourceType === 'prestation') {
      score += 0.15;
    }

    if (input.intent === 'demande_info_service') {
      if (chunk.sourceType === 'type_projet' || chunk.sourceType === 'categorie') score += 0.10;
    }

    if (chunk.sourceType === 'rag_document') {
      // RAG docs are hand-crafted knowledge — always give a baseline boost
      score += 0.10 + Math.min(chunk.priority ?? 0, 100) * 0.002;
    }

    return score;
  }

  private createChunk(input: {
    sourceType: KnowledgeChunk['sourceType'];
    sourceId: number;
    title: string;
    text: string;
    priority?: number;
  }): KnowledgeChunk {
    const normalizedText = this.normalize(`${input.title} ${input.text}`);
    const rawTokens = normalizedText.split(' ').filter((t) => t.length >= 2 && !this.stopWords.has(t));

    // Count term frequencies
    const termFrequencies = new Map<string, number>();
    for (const token of rawTokens) {
      termFrequencies.set(token, (termFrequencies.get(token) ?? 0) + 1);
    }

    return {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      text: input.text,
      normalizedText,
      termFrequencies,
      docLength: rawTokens.length,
      priority: input.priority,
    };
  }

  private buildContextBlock(snippets: RagSnippet[], _chunks: KnowledgeChunk[]): string {
    // Rich context: include more text to give the LLM sufficient information
    const lines = snippets.map((s, i) => {
      return `[${i + 1}] ${s.title}\n${s.excerpt}`;
    });

    return [
      'CONTEXTE METIER BTP (base de connaissance interne):',
      '---',
      ...lines,
      '---',
    ].join('\n');
  }

  private toExcerpt(text: string, maxLen = 300): string {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (compact.length <= maxLen) return compact;
    return `${compact.slice(0, maxLen - 3)}...`;
  }

  private tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    return [...new Set(
      normalized
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !this.stopWords.has(t)),
    )];
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }
}
