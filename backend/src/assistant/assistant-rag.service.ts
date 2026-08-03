import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { cosineSimilarity, semanticBonus } from './semantic-similarity.js';
import { embedText, embedTexts } from './embeddings.js';
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
  tokens: string[];
  priority?: number;
  /**
   * Vecteur de sens (384 nombres) precalcule au remplissage du cache RAG.
   *
   * OPTIONNEL, et c'est VOULU : absent si le modele local n'a pas pu se
   * charger (echec reseau, cache disque vide, kill switch desactive).
   * Le "?" force le compilateur a nous faire traiter ce cas partout ou
   * on l'utilise -> le repli en LEXICAL PUR est verifie par TypeScript,
   * pas seulement espere par le developpeur.
   */
  embedding?: number[];
};

export type RagSnippet = {
  sourceType: 'type_projet' | 'categorie' | 'prestation' | 'rag_document';
  sourceId: number;
  title: string;
  excerpt: string;
  fullText: string;
  score: number;
  lexicalScore?: number;
  semanticScore?: number;
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

@Injectable()
export class AssistantRagService {
  private readonly cacheTtlMs = this.resolveCacheTtlMs();
  private readonly cache = new Map<
    number,
    { expiresAt: number; chunks: KnowledgeChunk[] ; embedding?: number[]; }
  >();

  private readonly stopWords = new Set([
    'alors',
    'au',
    'aucun',
    'aussi',
    'avec',
    'avoir',
    'bien',
    'bonjour',
    'car',
    'cela',
    'ces',
    'chez',
    'comment',
    'dans',
    'des',
    'donc',
    'elle',
    'elles',
    'entre',
    'est',
    'etre',
    'fait',
    'faire',
    'ici',
    'ils',
    'les',
    'leur',
    'mais',
    'meme',
    'merci',
    'mon',
    'notre',
    'nous',
    'par',
    'pas',
    'plus',
    'pour',
    'prix',
    'projet',
    'quel',
    'quelle',
    'quelles',
    'quels',
    'sans',
    'serait',
    'sont',
    'sur',
    'tout',
    'tres',
    'une',
    'vous',
    'vos',
  ]);
  // ============================================================
  // RAG HYBRIDE (phase 2) — reglages du bonus semantique.
  //
  // ARCHITECTURE : socle lexical (calibre sur ~45 questions, seuil 0.4
  // dans assistant.service.ts) + bonus semantique ADDITIF et BORNE.
  // Le score hybride est TOUJOURS >= au score lexical :
  // aucune question qui repondait avant ne peut cesser de repondre.
  // ============================================================

  private readonly logger = new Logger(AssistantRagService.name);

  /** Interrupteur d'urgence : ASSISTANT_RAG_SEMANTIC_ENABLED=false -> lexical pur. */
  private readonly semanticEnabled = this.resolveSemanticEnabled();

  /** Bonus maximal. 0.35 = ordre de grandeur des bonus lexicaux existants. */
  private readonly semanticWeight = this.resolveEnvNumber(
    'ASSISTANT_RAG_SEMANTIC_WEIGHT',
    0.35,
  );

  /** Plancher de bruit du cosinus, mesure sur nos 29 documents reels. */
  private readonly semanticFloor = this.resolveEnvNumber(
    'ASSISTANT_RAG_SEMANTIC_FLOOR',
    0.35,
  );

  /** Similarite minimale pour qu'un document a lexical NUL entre dans le contexte. */
  private readonly semanticRescueMin = this.resolveEnvNumber(
    'ASSISTANT_RAG_SEMANTIC_RESCUE_MIN',
    0.45,
  );

  /**
   * Passe a false definitivement si le modele refuse de se charger.
   * POURQUOI memoriser l'echec ? Sinon on retenterait un chargement
   * (potentiellement un ETIMEDOUT de plusieurs secondes) a CHAQUE message
   * de Lea. On echoue une fois, on log, on n'y revient plus.
   */
  private semanticAvailable = true;

  private resolveSemanticEnabled(): boolean {
    const raw = (process.env.ASSISTANT_RAG_SEMANTIC_ENABLED || 'true')
      .trim()
      .toLowerCase();
    return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
  }

  private resolveEnvNumber(key: string, fallback: number): number {
    const raw = Number(process.env[key]);
    // Number('') === 0 et Number('abc') === NaN : on filtre les deux cas.
    return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : fallback;
  }

  /**
   * Texte a vectoriser pour un document.
   *
   * POURQUOI TRONQUER ? Contre-intuitif mais crucial :
   * all-MiniLM-L6-v2 ne lit que ~256 tokens et fait la MOYENNE des vecteurs.
   * Plus le texte est long, plus le vecteur se rapproche de la "moyenne du
   * francais" -> tous les documents longs finissent par se ressembler.
   * C'est l'explication de nos scores tasses entre 0.33 et 0.63 (evaluation
   * phase 2), et de "Estimation de prix" qui sortait sur des questions
   * sans rapport. Le titre + le debut du contenu portent l'essentiel du sujet.
   */
  private buildEmbeddingText(chunk: KnowledgeChunk): string {
    return `${chunk.title}. ${chunk.text}`.replace(/\s+/g, ' ').trim().slice(0, 600);
  }

  /**
   * Vectorise la question de l'utilisateur.
   * Renvoie null en cas de probleme -> le RAG retombe en LEXICAL PUR.
   * REGLE : une amelioration optionnelle ne doit JAMAIS casser la base.
   */
  private async embedQuerySafely(query: string): Promise<number[] | null> {
    if (!this.semanticEnabled || !this.semanticAvailable) return null;
    try {
      return await embedText(query);
    } catch (error) {
      this.semanticAvailable = false;
      this.logger.warn(
        `RAG semantique indisponible, repli en lexical pur : ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Precalcule les vecteurs des 29 documents, UNE SEULE FOIS par remplissage
   * de cache.
   *
   * POURQUOI ICI et pas dans retrieveContext ?
   * Vectoriser 29 documents coute ~1 seconde. Le faire a chaque message
   * ajouterait 1 s de latence a chaque reponse de Lea. Ici, c'est paye
   * une fois par TTL de cache, et la question (1 seul vecteur, ~30 ms)
   * reste le seul calcul par requete.
   *
   * CONSEQUENCE : la convention n°7 (re-seed RAG -> redemarrage complet du
   * backend) devient encore plus vraie : les vecteurs vivent dans ce cache.
   */
  private async attachEmbeddings(chunks: KnowledgeChunk[]): Promise<void> {
    if (!this.semanticEnabled || !this.semanticAvailable) return;
    if (chunks.length === 0) return;

    const startedAt = Date.now();
    try {
      const vectors = await embedTexts(
        chunks.map((chunk) => this.buildEmbeddingText(chunk)),
      );
      chunks.forEach((chunk, index) => {
        chunk.embedding = vectors[index];
      });
      this.logger.log(
        `RAG semantique : ${chunks.length} documents vectorises en ${Date.now() - startedAt} ms.`,
      );
    } catch (error) {
      this.semanticAvailable = false;
      this.logger.warn(
        `Vectorisation impossible, RAG en lexical pur : ${(error as Error).message}`,
      );
    }
  }
  constructor(private readonly prisma: PrismaService) {}

  async retrieveContext(input: RagRetrievalInput): Promise<RagRetrievalResult> {
    if (!this.isEnabled()) {
      return { snippets: [], context: '' };
    }

    const query = input.query.trim();
    if (!query) {
      return { snippets: [], context: '' };
    }

    const chunks = await this.getKnowledgeChunks(input.companyId);
    if (chunks.length === 0) {
      return { snippets: [], context: '' };
    }

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return { snippets: [], context: '' };
    }
    const limit = Math.min(Math.max(input.limit ?? 4, 1), 8);

    // ============================================================
    // ETAPE 1 — SOCLE LEXICAL (inchange, calibre sur ~45 questions)
    // ============================================================
    const lexicalEntries = chunks.map((chunk) => ({
      chunk,
      lexicalScore: this.computeScore({
        query,
        queryTokens,
        chunk,
        projectType: input.projectType,
        intent: input.intent,
      }),
    }));

    // ============================================================
    // ETAPE 2 — VECTEUR DE LA QUESTION (1 seul calcul par requete)
    // null = mode degrade : on continue en lexical pur, sans erreur.
    // ============================================================
    const queryEmbedding = await this.embedQuerySafely(query);

    // ============================================================
    // ETAPE 3 — SCORE HYBRIDE = LEXICAL + BONUS SEMANTIQUE BORNE
    // Le bonus est TOUJOURS >= 0 : le score ne peut que monter,
    // donc aucune regression possible sur les questions validees.
    // ============================================================
    const scored = lexicalEntries
      .map((entry) => {
        const semanticScore =
          queryEmbedding && entry.chunk.embedding
            ? cosineSimilarity(queryEmbedding, entry.chunk.embedding)
            : 0;

        const bonus = semanticBonus(
          semanticScore,
          this.semanticFloor,
          this.semanticWeight,
        );

        return {
          chunk: entry.chunk,
          lexicalScore: entry.lexicalScore,
          semanticScore,
          score: entry.lexicalScore + bonus,
        };
      })
      // Filtre de pertinence. On garde le comportement historique
      // (au moins un mot en commun) ET on ouvre une porte etroite :
      // un document SANS aucun mot commun peut entrer dans le contexte
      // s'il est semantiquement tres proche (cas "proposition commerciale"
      // -> document "Duree de validite d'un devis", zero mot partage).
      // Le seuil de repechage est HAUT (0.45) pour ne pas laisser passer
      // le bruit de fond du cosinus (~0.35).
      .filter(
        (entry) =>
          entry.lexicalScore > 0 || entry.semanticScore >= this.semanticRescueMin,
      )
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const snippets: RagSnippet[] = scored.map(
      ({ chunk, score, lexicalScore, semanticScore }) => ({
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        title: chunk.title,
        excerpt: this.toExcerpt(chunk.text),
        fullText: chunk.text,
        score: Number(score.toFixed(3)),
        lexicalScore: Number(lexicalScore.toFixed(3)),
        semanticScore: Number(semanticScore.toFixed(3)),
      }),
    );
    const context = snippets.length > 0 ? this.buildContextBlock(snippets) : '';

    return {
      snippets,
      context,
    };
  }

  private isEnabled(): boolean {
    const raw = (process.env.ASSISTANT_RAG_ENABLED || 'true').trim().toLowerCase();
    return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
  }

  private async getKnowledgeChunks(companyId: number): Promise<KnowledgeChunk[]> {
    const now = Date.now();
    const cached = this.cache.get(companyId);
    if (this.cacheTtlMs > 0 && cached && cached.expiresAt > now) {
      return cached.chunks;
    }

    const [types, ragDocuments] = await Promise.all([
      this.prisma.typeProjet.findMany({
      where: {
        companyId,
        actif: true,
      },
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
        where: {
          companyId,
          actif: true,
        },
        orderBy: [
          { priorite: 'desc' },
          { updatedAt: 'desc' },
        ],
        select: {
          id: true,
          titre: true,
          categorie: true,
          contenu: true,
          priorite: true,
        },
      }),
    ]);

    const chunks: KnowledgeChunk[] = [];

    for (const document of ragDocuments) {
      const text = [
        `Document RAG: ${document.titre}`,
        `Categorie: ${document.categorie}`,
        document.contenu,
      ].join('. ');

      chunks.push(this.createChunk({
        sourceType: 'rag_document',
        sourceId: document.id,
        title: `Base IA - ${document.titre}`,
        text,
        priority: document.priorite,
      }));
    }

    for (const type of types) {
      const categories = type.categories.map((entry) => entry.categorie);
      const uniqueCategorieNames = [...new Set(categories.map((cat) => cat.nom))];

      const typeText = [
        `Type de projet: ${type.nom}`,
        type.description ? `Description: ${type.description}` : '',
        uniqueCategorieNames.length > 0
          ? `Categories disponibles: ${uniqueCategorieNames.join(', ')}`
          : 'Aucune categorie disponible',
      ]
        .filter((part) => part.length > 0)
        .join('. ');

      chunks.push(this.createChunk({
        sourceType: 'type_projet',
        sourceId: type.id,
        title: `Service ${type.nom}`,
        text: typeText,
      }));

      for (const categorie of categories) {
        const prestations = categorie.prestations.slice(0, 10);

        const categorieText = [
          `Type de projet: ${type.nom}`,
          `Categorie: ${categorie.nom}`,
          categorie.description ? `Description: ${categorie.description}` : '',
          prestations.length > 0
            ? `Prestations: ${prestations.map((prestation) => prestation.nom).join(', ')}`
            : 'Aucune prestation active',
        ]
          .filter((part) => part.length > 0)
          .join('. ');

        chunks.push(this.createChunk({
          sourceType: 'categorie',
          sourceId: categorie.id,
          title: `Categorie ${categorie.nom} (${type.nom})`,
          text: categorieText,
        }));

        for (const prestation of prestations) {
          const prestationText = [
            `Type de projet: ${type.nom}`,
            `Categorie: ${categorie.nom}`,
            `Prestation: ${prestation.nom}`,
            prestation.description ? `Description: ${prestation.description}` : '',
            `Unite: ${prestation.unite}`,
            `Prix indicatif: ${prestation.prixVenteMin.toFixed(2)} EUR a ${prestation.prixVenteMax.toFixed(2)} EUR`,
          ]
            .filter((part) => part.length > 0)
            .join('. ');

          chunks.push(this.createChunk({
            sourceType: 'prestation',
            sourceId: prestation.id,
            title: `Prestation ${prestation.nom} (${type.nom})`,
            text: prestationText,
          }));
        }
      }
    }
    // Vectorisation des documents AVANT la mise en cache : les vecteurs
    // sont ainsi stockes avec les chunks et reutilises pendant tout le TTL.
    await this.attachEmbeddings(chunks);
    if (this.cacheTtlMs > 0) {
      this.cache.set(companyId, {
        expiresAt: now + this.cacheTtlMs,
        chunks,
      });
    }

    return chunks;
  }

  private resolveCacheTtlMs(): number {
    const raw = Number.parseInt(process.env.ASSISTANT_RAG_CACHE_TTL_MS || '0', 10);
    if (Number.isNaN(raw) || raw < 0) return 0;
    return raw;
  }

  private computeScore(input: {
    query: string;
    queryTokens: string[];
    chunk: KnowledgeChunk;
    projectType?: string;
    intent?: AssistantIntent;
  }): number {
    const chunkTokenSet = new Set(input.chunk.tokens);
    const overlap = input.queryTokens.filter((token) => chunkTokenSet.has(token));

    if (overlap.length === 0) {
      return 0;
    }

    const coverage = overlap.length / input.queryTokens.length;
    const density = overlap.length / Math.max(input.chunk.tokens.length, 1);
    let score = coverage * 0.9 + density * 0.1;

    const normalizedQuery = this.normalize(input.query);
    if (
      normalizedQuery.length > 10 &&
      input.chunk.normalizedText.includes(normalizedQuery)
    ) {
      score += 0.22;
    }

    if (input.projectType) {
      const normalizedProjectType = this.normalize(input.projectType);
      if (normalizedProjectType && input.chunk.normalizedText.includes(normalizedProjectType)) {
        score += 0.2;
      }
    }

    if (input.intent === 'demande_prix' && input.chunk.sourceType === 'prestation') {
      score += 0.15;
    }

    if (input.chunk.sourceType === 'rag_document') {
      score += 0.08 + Math.min(input.chunk.priority ?? 0, 100) * 0.002;
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
    const normalizedText = this.normalize(`${input.title}. ${input.text}`);
    const tokens = this.tokenize(normalizedText);

    return {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      text: input.text,
      normalizedText,
      tokens,
      priority: input.priority,
    };
  }

  private buildContextBlock(snippets: RagSnippet[]): string {
    const lines = snippets.slice(0, 4).map((snippet, index) => {
      return `${index + 1}. ${snippet.title} - ${snippet.excerpt}`;
    });

    return ['Contexte metier local (RAG):', ...lines].join('\n');
  }

  private toExcerpt(text: string): string {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (compact.length <= 180) {
      return compact;
    }
    return `${compact.slice(0, 177)}...`;
  }

  private tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    const tokens = normalized
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .filter((token) => !this.stopWords.has(token));

    return [...new Set(tokens)];
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
