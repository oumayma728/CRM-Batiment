import { Injectable, Logger } from '@nestjs/common';

type AssistantLlmInput = {
  language: 'fr' | 'ar';
  userMessage: string;
  fallbackMessage: string;
  intent:
  | 'demande_devis'
  | 'demande_info_service'
  | 'demande_prix'
  | 'information_generale'
  | 'autre';
  projectType: string;
  knownProject: boolean;
  suggestedType: string | null;
  missingFields: string[];
  collectedData: {
    nom: string;
    telephone: string;
    email: string;
    description: string;
  };
  availableProjectTypes: string[];
};

export type ExtractedFields = {
  nom: string;
  telephone: string;
  email: string;
  description: string;
  projectType: string;
  intent:
  | 'demande_devis'
  | 'demande_info_service'
  | 'demande_prix'
  | 'information_generale'
  | 'autre';
  isUrgent: boolean;
  motsCles: string[];
};

type LlmProvider = 'none' | 'huggingface' | 'mistral' | 'both' | 'gemini' | 'openrouter';

@Injectable()
export class AssistantLlmService {
  private readonly logger = new Logger(AssistantLlmService.name);
  private readonly defaultWordLimit = 70;
  private readonly defaultMaxChars = 360;

  async extractFieldsWithAI(
    userMessage: string,
    availableProjectTypes: string[],
  ): Promise<ExtractedFields | null> {
    const provider = this.getProvider();
    if (provider === 'none') return null;

    const providers = this.getProviderOrder(provider);

    for (const currentProvider of providers) {
      try {
        let result: ExtractedFields | null = null;
        if (currentProvider === 'openrouter') {
          result = await this.extractFieldsWithOpenRouter(userMessage, availableProjectTypes);
        } else if (currentProvider === 'gemini') {
          result = await this.extractFieldsWithGemini(userMessage, availableProjectTypes);
        } else if (currentProvider === 'mistral') {
          result = await this.extractFieldsWithMistral(userMessage, availableProjectTypes);
        } else {
          result = await this.extractFieldsWithHuggingFace(userMessage, availableProjectTypes);
        }

        if (result) return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.warn(
          `Field extraction failed with ${currentProvider}: ${message}`,
        );
      }
    }

    return null;
  }

  private async extractFieldsWithOpenRouter(
    userMessage: string,
    availableProjectTypes: string[],
  ): Promise<ExtractedFields | null> {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.OPENROUTER_MODEL?.trim() || 'nvidia/llama-3.1-nemotron-70b-instruct';
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.0,
          messages: [
            {
              role: 'system',
              content: `Tu es un extracteur CRM batiment. Reponds uniquement avec un JSON valide:\n{"nom":"","telephone":"","email":"","description":"","project_type":"","intent":"autre","is_urgent":false,"mots_cles":[]}\n\nRegles:\n- intent parmi demande_devis | demande_info_service | demande_prix | information_generale | autre\n- nom sans chiffres\n- telephone en chiffres\n- project_type priorite a cette liste: ${availableProjectTypes.join(' | ')}\n- si absent, laisser champ vide\n- mots_cles: 3 a 6 termes`,
            },
            { role: 'user', content: userMessage },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== 'string') return null;
      return this.parseExtractedJson(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async extractFieldsWithGemini(
    userMessage: string,
    availableProjectTypes: string[],
  ): Promise<ExtractedFields | null> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: `Tu es un extracteur CRM batiment. Reponds uniquement avec un JSON valide:\n{"nom":"","telephone":"","email":"","description":"","project_type":"","intent":"autre","is_urgent":false,"mots_cles":[]}\n\nRegles:\n- intent parmi demande_devis | demande_info_service | demande_prix | information_generale | autre\n- nom sans chiffres\n- telephone en chiffres\n- project_type priorite a cette liste: ${availableProjectTypes.join(' | ')}\n- si absent, laisser champ vide\n- mots_cles: 3 a 6 termes`
              }]
            },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
              temperature: 0.0,
              responseMimeType: 'application/json'
            }
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) return null;

      const data = (await response.json()) as any;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (typeof content !== 'string') return null;
      return this.parseExtractedJson(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async extractFieldsWithMistral(
    userMessage: string,
    availableProjectTypes: string[],
  ): Promise<ExtractedFields | null> {
    const apiKey = process.env.MISTRAL_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.MISTRAL_MODEL?.trim() || 'mistral-small-latest';
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.0,
          max_tokens: 180,
          messages: [
            {
              role: 'system',
              content: `Tu es un extracteur CRM batiment. Reponds uniquement avec un JSON valide:\n{"nom":"","telephone":"","email":"","description":"","project_type":"","intent":"autre","is_urgent":false,"mots_cles":[]}\n\nRegles:\n- intent parmi demande_devis | demande_info_service | demande_prix | information_generale | autre\n- nom sans chiffres\n- telephone en chiffres\n- project_type priorite a cette liste: ${availableProjectTypes.join(' | ')}\n- si absent, laisser champ vide\n- mots_cles: 3 a 6 termes`,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = (await response.json()) as Record<string, unknown>;
      const choices = Array.isArray(data.choices)
        ? (data.choices as Array<Record<string, unknown>>)
        : [];
      const content = (choices[0]?.message as Record<string, unknown>)?.content;

      if (typeof content !== 'string') return null;
      return this.parseExtractedJson(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async extractFieldsWithHuggingFace(
    userMessage: string,
    availableProjectTypes: string[],
  ): Promise<ExtractedFields | null> {
    const token = process.env.HUGGINGFACE_API_KEY?.trim();
    if (!token) return null;

    const model =
      process.env.HUGGINGFACE_MODEL?.trim() ||
      'mistralai/Mistral-7B-Instruct-v0.3';
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        'https://router.huggingface.co/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.0,
            max_tokens: 180,
            messages: [
              {
                role: 'system',
                content: `Extracteur CRM. Reponds uniquement en JSON:\n{"nom":"","telephone":"","email":"","description":"","project_type":"","intent":"autre","is_urgent":false,"mots_cles":[]}\nType projet: ${availableProjectTypes.join(' | ')}`,
              },
              { role: 'user', content: userMessage },
            ],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) return null;

      const data = (await response.json()) as Record<string, unknown>;
      const choices = Array.isArray(data.choices)
        ? (data.choices as Array<Record<string, unknown>>)
        : [];
      const content = (choices[0]?.message as Record<string, unknown>)?.content;

      if (typeof content !== 'string') return null;
      return this.parseExtractedJson(content);
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseExtractedJson(raw: string): ExtractedFields | null {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      const rawIntent =
        typeof parsed.intent === 'string' ? parsed.intent.trim() : '';
      const intent:
        | 'demande_devis'
        | 'demande_info_service'
        | 'demande_prix'
        | 'information_generale'
        | 'autre' =
        rawIntent === 'demande_devis' ||
          rawIntent === 'demande_info_service' ||
          rawIntent === 'demande_prix' ||
          rawIntent === 'information_generale'
          ? rawIntent
          : 'autre';

      const keywordsRaw = Array.isArray(parsed.mots_cles)
        ? parsed.mots_cles
        : Array.isArray(parsed.motsCles)
          ? parsed.motsCles
          : [];

      const motsCles = keywordsRaw
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 1)
        .slice(0, 6);

      return {
        nom: typeof parsed.nom === 'string' ? parsed.nom.trim() : '',
        telephone:
          typeof parsed.telephone === 'string' ? parsed.telephone.trim() : '',
        email:
          typeof parsed.email === 'string'
            ? parsed.email.trim().toLowerCase()
            : '',
        description:
          typeof parsed.description === 'string'
            ? parsed.description.trim()
            : '',
        projectType:
          typeof parsed.project_type === 'string'
            ? parsed.project_type.trim()
            : typeof parsed.projectType === 'string'
              ? parsed.projectType.trim()
              : '',
        intent,
        isUrgent: Boolean(parsed.is_urgent),
        motsCles,
      };
    } catch {
      this.logger.warn('Failed to parse extracted fields JSON');
      return null;
    }
  }

  async generateReply(input: AssistantLlmInput): Promise<string | null> {
    const provider = this.getProvider();
    if (provider === 'none') return null;

    const providers = this.getProviderOrder(provider);

    for (const currentProvider of providers) {
      try {
        let reply: string | null = null;
        if (currentProvider === 'openrouter') {
          reply = await this.generateWithOpenRouter(input);
        } else if (currentProvider === 'gemini') {
          reply = await this.generateWithGemini(input);
        } else if (currentProvider === 'huggingface') {
          reply = await this.generateWithHuggingFace(input);
        } else {
          reply = await this.generateWithMistral(input);
        }

        if (reply) return reply;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'unknown-llm-error';
        this.logger.warn(
          `LLM provider ${currentProvider} failed, trying fallback: ${message}`,
        );
      }
    }

    return null;
  }

  async generateRagAnswer(query: string, context: string): Promise<string | null> {
    const provider = this.getProvider();
    if (provider === 'none') return null;

    const providers = this.getProviderOrder(provider);

    for (const currentProvider of providers) {
      try {
        let reply: string | null = null;
        if (currentProvider === 'openrouter') {
          reply = await this.generateRagWithOpenRouter(query, context);
        } else if (currentProvider === 'gemini') {
          reply = await this.generateRagWithGemini(query, context);
        } else if (currentProvider === 'huggingface') {
          reply = await this.generateRagWithHuggingFace(query, context);
        } else {
          reply = await this.generateRagWithMistral(query, context);
        }

        if (reply) return reply;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown-llm-error';
        this.logger.warn(`RAG LLM provider ${currentProvider} failed: ${message}`);
      }
    }

    return null;
  }

  async *generateRagAnswerStream(query: string, context: string): AsyncGenerator<string, void, unknown> {
    const provider = this.getProvider();
    if (provider === 'none') return;

    // For simplicity, we implement streaming primarily for OpenRouter.
    // If another provider is default, fallback to non-streaming response.
    const providers = this.getProviderOrder(provider);
    const primary = providers[0];

    if (primary === 'openrouter') {
      try {
        yield* this.generateRagWithOpenRouterStream(query, context);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown-llm-error';
        this.logger.warn(`RAG LLM stream failed: ${message}`);
      }
    }

    // Fallback to non-streaming if provider is not OpenRouter or if it failed
    const reply = await this.generateRagAnswer(query, context);
    if (reply) {
      yield reply;
    }
  }

  private getProvider(): LlmProvider {
    const raw = (process.env.ASSISTANT_LLM_PROVIDER || 'none')
      .trim()
      .toLowerCase();

    if (raw === 'openrouter') return 'openrouter';
    if (raw === 'gemini') return 'gemini';
    if (raw === 'hf' || raw === 'huggingface') return 'huggingface';
    if (raw === 'mistral') return 'mistral';
    if (
      raw === 'both' ||
      raw === 'all' ||
      raw === 'mistral+huggingface' ||
      raw === 'huggingface+mistral'
    ) {
      return 'both';
    }

    return 'none';
  }

  private getProviderOrder(
    provider: Exclude<LlmProvider, 'none'>,
  ): Array<'huggingface' | 'mistral' | 'gemini' | 'openrouter'> {
    if (provider === 'huggingface' || provider === 'mistral' || provider === 'gemini' || provider === 'openrouter') {
      return [provider];
    }

    const primary = (process.env.ASSISTANT_LLM_PRIMARY || 'mistral')
      .trim()
      .toLowerCase();

    if (primary === 'openrouter') return ['openrouter', 'gemini', 'mistral', 'huggingface'];
    if (primary === 'mistral') return ['mistral', 'huggingface'];
    return ['huggingface', 'mistral'];
  }

  private async generateWithOpenRouter(
    input: AssistantLlmInput,
  ): Promise<string | null> {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.OPENROUTER_MODEL?.trim() || 'nvidia/llama-3.1-nemotron-70b-instruct';
    const timeoutMs = this.getTimeoutMs();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          messages: [
            {
              role: 'system',
              content: 'You are a CRM construction assistant. Keep the exact same business decision as fallback, answer in plain spoken language, and keep sentences short and human.',
            },
            { role: 'user', content: this.buildPrompt(input) },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      return typeof content === 'string'
        ? this.cleanGeneratedText(content)
        : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateWithGemini(
    input: AssistantLlmInput,
  ): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    const timeoutMs = this.getTimeoutMs();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: 'You are a CRM construction assistant. Keep the exact same business decision as fallback, answer in plain spoken language, and keep sentences short and human.'
              }]
            },
            contents: [{ parts: [{ text: this.buildPrompt(input) }] }],
            generationConfig: { temperature: 0.15 }
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) return null;

      const data = (await response.json()) as any;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return typeof content === 'string'
        ? this.cleanGeneratedText(content)
        : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateWithHuggingFace(
    input: AssistantLlmInput,
  ): Promise<string | null> {
    const token = process.env.HUGGINGFACE_API_KEY?.trim();
    if (!token) return null;

    const model =
      process.env.HUGGINGFACE_MODEL?.trim() ||
      'mistralai/Mistral-7B-Instruct-v0.3';
    const timeoutMs = this.getTimeoutMs();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        'https://router.huggingface.co/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.15,
            max_tokens: 220,
            messages: [
              {
                role: 'system',
                content:
                  'You are a CRM construction assistant. Keep the exact same business decision as fallback, answer in plain spoken language, and keep sentences short and human.',
              },
              { role: 'user', content: this.buildPrompt(input) },
            ],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) return null;

      const data = (await response.json()) as Record<string, unknown>;
      const choices = Array.isArray(data.choices)
        ? (data.choices as Array<Record<string, unknown>>)
        : [];
      const content = (choices[0]?.message as Record<string, unknown>)?.content;

      return typeof content === 'string'
        ? this.cleanGeneratedText(content)
        : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateWithMistral(
    input: AssistantLlmInput,
  ): Promise<string | null> {
    const apiKey = process.env.MISTRAL_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.MISTRAL_MODEL?.trim() || 'mistral-small-latest';
    const timeoutMs = this.getTimeoutMs();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          max_tokens: 220,
          messages: [
            {
              role: 'system',
              content:
                'You are a CRM construction assistant. Keep the exact same business decision as fallback, answer in plain spoken language, and keep sentences short and human.',
            },
            { role: 'user', content: this.buildPrompt(input) },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const data = (await response.json()) as Record<string, unknown>;
      const choices = Array.isArray(data.choices)
        ? (data.choices as Array<Record<string, unknown>>)
        : [];
      const content = (choices[0]?.message as Record<string, unknown>)?.content;

      return typeof content === 'string'
        ? this.cleanGeneratedText(content)
        : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPrompt(input: AssistantLlmInput): string {
    const wordLimit = this.getWordLimit();
    const languageInstruction =
      input.language === 'ar'
        ? 'Answer in Arabic only. Use simple and respectful everyday Arabic.'
        : 'Answer in French only. Use simple and respectful everyday French.';

    const context = {
      intent: input.intent,
      project_type: input.projectType,
      is_known_project: input.knownProject,
      suggested_type: input.suggestedType,
      missing_fields: input.missingFields,
      collected_data: input.collectedData,
      available_project_types: input.availableProjectTypes,
      fallback_response: input.fallbackMessage,
      user_message: input.userMessage,
    };

    return [
      'Rewrite the fallback CRM response in a natural and human tone.',
      'Keep exactly the same business intent and next required action.',
      'Do not invent unavailable services or missing data.',
      'Use short and clear sentences.',
      'Use at most one question in the reply.',
      'Avoid technical jargon and avoid long paragraphs.',
      languageInstruction,
      `Limit to at most ${wordLimit} words.`,
      `Context JSON: ${JSON.stringify(context)}`,
      'Final answer only:',
    ].join('\n');
  }

  private cleanGeneratedText(text: string): string | null {
    const cleaned = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/^\s*(assistant|reponse|réponse)\s*[:：-]?\s*/i, '')
      .replace(/^\s*(final answer|answer)\s*[:：-]?\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return null;

    return cleaned.slice(0, this.getMaxChars());
  }

  private getWordLimit(): number {
    const raw = Number.parseInt(process.env.ASSISTANT_LLM_WORD_LIMIT || '', 10);
    if (Number.isNaN(raw) || raw < 25 || raw > 200)
      return this.defaultWordLimit;
    return raw;
  }

  private getMaxChars(): number {
    const raw = Number.parseInt(process.env.ASSISTANT_LLM_MAX_CHARS || '', 10);
    if (Number.isNaN(raw) || raw < 120 || raw > 1200)
      return this.defaultMaxChars;
    return raw;
  }

  private async generateRagWithOpenRouter(query: string, context: string): Promise<string | null> {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.OPENROUTER_MODEL?.trim() || 'nvidia/llama-3.1-nemotron-70b-instruct';
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          messages: [
            { role: 'system', content: `Tu es l'assistant IA de BâtiFlow. Réponds à la question de l'utilisateur uniquement en te basant sur le contexte suivant:\n\n${context}\n\nSi le contexte ne contient pas la réponse, dis simplement que tu n'as pas l'information dans la base de connaissance.` },
            { role: 'user', content: query },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;
      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      return typeof content === 'string' ? this.cleanGeneratedText(content) : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async *generateRagWithOpenRouterStream(query: string, context: string): AsyncGenerator<string, void, unknown> {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) return;

    const model = process.env.OPENROUTER_MODEL?.trim() || 'nvidia/llama-3.1-nemotron-70b-instruct';
    // Use a much longer timeout for the stream (120 seconds) because generating the full response can take time.
    const timeoutMs = 120000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          stream: true,
          messages: [
            {
              role: 'system',
              content: `Tu es l'assistant IA de BâtiFlow (logiciel CRM pour le bâtiment).
              Règles :
              1. Si l'utilisateur dit bonjour ou fait une salutation, réponds poliment et propose ton aide.
              2. Pour les autres questions, réponds UNIQUEMENT en te basant sur le contexte suivant:\n\n${context}\n\n
              3. Si le contexte ne contient pas la réponse, dis simplement que tu n'as pas l'information dans la base de connaissance.`,
            },
            { role: 'user', content: query },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === 'data: [DONE]') return;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              const chunk = data.choices?.[0]?.delta?.content;
              if (chunk) {
                yield chunk;
              }
            } catch (e) {
              // Ignore invalid JSON chunks
            }
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateRagWithGemini(query: string, context: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: `Tu es l'assistant IA de BâtiFlow. Réponds à la question de l'utilisateur uniquement en te basant sur le contexte suivant:\n\n${context}\n\nSi le contexte ne contient pas la réponse, dis simplement que tu n'as pas l'information dans la base de connaissance.` }]
            },
            contents: [{ parts: [{ text: query }] }],
            generationConfig: { temperature: 0.1 }
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) return null;
      const data = await response.json() as any;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof content === 'string' ? this.cleanGeneratedText(content) : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateRagWithHuggingFace(query: string, context: string): Promise<string | null> {
    const token = process.env.HUGGINGFACE_API_KEY?.trim();
    if (!token) return null;

    const model = process.env.HUGGINGFACE_MODEL?.trim() || 'mistralai/Mistral-7B-Instruct-v0.3';
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 300,
          messages: [
            { role: 'system', content: `Tu es l'assistant IA de BâtiFlow. Réponds à la question de l'utilisateur uniquement en te basant sur le contexte suivant:\n\n${context}\n\nSi le contexte ne contient pas la réponse, dis que tu n'as pas l'information.` },
            { role: 'user', content: query },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;
      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      return typeof content === 'string' ? this.cleanGeneratedText(content) : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateRagWithMistral(query: string, context: string): Promise<string | null> {
    const apiKey = process.env.MISTRAL_API_KEY?.trim();
    if (!apiKey) return null;

    const model = process.env.MISTRAL_MODEL?.trim() || 'mistral-small-latest';
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 300,
          messages: [
            { role: 'system', content: `Tu es l'assistant IA de BâtiFlow. Réponds à la question de l'utilisateur uniquement en te basant sur le contexte suivant:\n\n${context}\n\nSi le contexte ne contient pas la réponse, dis que tu n'as pas l'information.` },
            { role: 'user', content: query },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) return null;
      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      return typeof content === 'string' ? this.cleanGeneratedText(content) : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getTimeoutMs(): number {
    const raw = Number.parseInt(process.env.ASSISTANT_LLM_TIMEOUT_MS || '', 10);
    if (Number.isNaN(raw) || raw < 1000 || raw > 120000) return 60000;
    return raw;
  }
}
