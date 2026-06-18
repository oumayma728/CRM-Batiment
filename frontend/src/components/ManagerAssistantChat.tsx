import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, CornerDownLeft, Loader2, RotateCcw, Sparkles, User, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────
interface RagSnippet {
  sourceType: string;
  title: string;
  excerpt: string;
  score: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  snippets?: RagSnippet[];
  timestamp: number;
  isError?: boolean;
}

const STORAGE_KEY = 'manager-ai-chat-history';
const MAX_STORED = 40;

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_STORED)));
  } catch {}
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Source badge colours ───────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  rag_document: 'bg-violet-100 text-violet-700',
  type_projet:  'bg-sky-100 text-sky-700',
  categorie:    'bg-amber-100 text-amber-700',
  prestation:   'bg-emerald-100 text-emerald-700',
};

function SourceBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    rag_document: 'Doc IA',
    type_projet: 'Service',
    categorie: 'Catégorie',
    prestation: 'Prestation',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', SOURCE_COLORS[type] ?? 'bg-gray-100 text-gray-600')}>
      {labels[type] ?? type}
    </span>
  );
}

// ── Collapsible Sources section ────────────────────────────────────────────────
function Sources({ snippets }: { snippets: RagSnippet[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
        {snippets.length} source{snippets.length > 1 ? 's' : ''} utilisée{snippets.length > 1 ? 's' : ''}
      </button>
      {open && (
        <div className="mt-2 grid gap-2">
          {snippets.map((s, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <SourceBadge type={s.sourceType} />
                <span className="text-[10px] text-slate-400">Score: {s.score.toFixed(2)}</span>
              </div>
              <p className="text-xs font-semibold text-slate-700">{s.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dot typing animation ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, isTyping }: { msg: Message; isTyping?: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3 group', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white shadow-sm',
          isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-sky-500 to-blue-500',
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[78%] min-w-0', isUser && 'items-end flex flex-col')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
              : msg.isError
                ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm',
            (!isUser && !msg.content && !isTyping) && 'hidden'
          )}
        >
          {isTyping && !msg.content ? (
            <div className="py-1"><TypingIndicator /></div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}
        </div>
        {!isUser && msg.snippets && msg.snippets.length > 0 && (
          <div className="pl-1">
            <Sources snippets={msg.snippets} />
          </div>
        )}
        <span className="mt-1 px-1 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ── Suggested questions ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Quels sont nos services disponibles ?',
  'Quels sont les tarifs pour la rénovation ?',
  'Quelles prestations proposons-nous en maçonnerie ?',
  'Quelles sont les conditions de garantie ?',
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function ManagerAssistantChat() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist to localStorage
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  function addMessage(msg: Omit<Message, 'id' | 'timestamp'>) {
    const full: Message = { ...msg, id: uid(), timestamp: Date.now() };
    setMessages((prev) => [...prev, full]);
    return full;
  }

  function updateMessage(id: string, updater: (prev: Message) => Message) {
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }

  async function send(text: string) {
    const query = text.trim();
    if (!query || isStreaming) return;
    setInput('');

    addMessage({ role: 'user', content: query });
    setIsStreaming(true);

    const botMsgId = uid();
    // Pre-insert bot message (empty initially)
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, role: 'assistant', content: '', timestamp: Date.now() },
    ]);

    // 1) Artificial latency to mimic real thinking (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let isStreamActive = true;
    let pendingText = '';
    let renderedText = '';

    // Smooth typewriter effect
    const renderInterval = setInterval(() => {
      if (pendingText.length > 0) {
        // Pop characters based on backlog size to catch up smoothly
        const charsToTake = pendingText.length > 30 ? 3 : 1;
        const chunk = pendingText.substring(0, charsToTake);
        pendingText = pendingText.substring(charsToTake);
        renderedText += chunk;
        updateMessage(botMsgId, (m) => ({ ...m, content: renderedText }));
      } else if (!isStreamActive) {
        clearInterval(renderInterval);
      }
    }, 15);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assistant/admin/rag/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, limit: 5 }),
      });

      if (!response.ok || !response.body) throw new Error('Network response was not ok');

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
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'snippets') {
                updateMessage(botMsgId, (m) => ({ ...m, snippets: data.snippets }));
              } else if (data.type === 'chunk') {
                pendingText += data.text;
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      // Handle case where no content was generated
      setMessages((prev) => {
        const msg = prev.find((m) => m.id === botMsgId);
        if (msg && msg.content.length === 0) {
          const fallback =
            msg.snippets && msg.snippets.length > 0
              ? "Des documents ont été trouvés mais je n'ai pas pu générer une réponse synthétisée."
              : "Je n'ai pas trouvé d'information pertinente dans la base de connaissance pour cette question.";
          return prev.map((m) => (m.id === botMsgId ? { ...m, content: fallback } : m));
        }
        return prev;
      });

    } catch (err) {
      updateMessage(botMsgId, (m) => ({
        ...m,
        content: "Une erreur s'est produite lors de la consultation de la base IA. Veuillez réessayer.",
        isError: true,
      }));
    } finally {
      isStreamActive = false;
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-[520px] bg-slate-50 overflow-hidden">
      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scroll-smooth">
        {isEmpty ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100">
              <Bot size={32} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Comment puis-je vous aider ?</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm">
                Posez une question sur vos services, tarifs, conditions ou procédures. Je consulte votre base de connaissance pour vous répondre.
              </p>
            </div>
            <div className="grid gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700 text-left hover:bg-blue-100 hover:border-blue-200 transition-all font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble 
                key={msg.id} 
                msg={msg} 
                isTyping={isStreaming && index === messages.length - 1 && msg.content === ''}
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-2">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question… (Entrée pour envoyer)"
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none max-h-32 overflow-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CornerDownLeft size={14} />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-slate-400 font-medium">
            Les réponses sont basées sur votre base de connaissance interne BatiFlow.
          </p>
          {!isEmpty && (
            <button
              type="button"
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition-colors"
            >
              <RotateCcw size={12} />
              Effacer chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
