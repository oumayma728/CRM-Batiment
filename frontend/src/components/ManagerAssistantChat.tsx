import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CornerDownLeft,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  User,
  ChevronDown,
  MessageSquare,
  Pencil,
  Check,
  X,
  History,
  Eraser,
  ChevronLeft,
  ChevronRight,
  Database,
  AlertTriangle,
} from 'lucide-react';
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

interface ChatSession {
  id: number;
  titre: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ contenu: string; role: string }>;
}

interface DbMessage {
  id: number;
  sessionId: number;
  role: string;
  contenu: string;
  snippets?: RagSnippet[] | null;
  createdAt: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function dbMessageToMessage(m: DbMessage): Message {
  return {
    id: `db-${m.id}`,
    role: m.role as 'user' | 'assistant',
    content: m.contenu,
    snippets: m.snippets ?? undefined,
    timestamp: new Date(m.createdAt).getTime(),
  };
}

// ── Source badge ───────────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  rag_document: 'bg-violet-100 text-violet-700',
  type_projet: 'bg-sky-100 text-sky-700',
  categorie: 'bg-amber-100 text-amber-700',
  prestation: 'bg-emerald-100 text-emerald-700',
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

// ── Collapsible sources section ────────────────────────────────────────────────
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

// ── Typing indicator ───────────────────────────────────────────────────────────
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
      <div className={cn('flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white shadow-sm', isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-indigo-500 to-blue-500')}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={cn('max-w-[78%] min-w-0', isUser && 'items-end flex flex-col')}>
        <div className={cn('rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm', isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm' : msg.isError ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm', (!isUser && !msg.content && !isTyping) && 'hidden')}>
          {isTyping && !msg.content ? (
            <div className="py-1"><TypingIndicator /></div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}
        </div>
        {!isUser && msg.snippets && msg.snippets.length > 0 && (
          <div className="pl-1"><Sources snippets={msg.snippets} /></div>
        )}
        <span className="mt-1 px-1 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ── Suggestions ────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Quels sont nos services disponibles ?',
  'Quels sont les tarifs pour la rénovation ?',
  'Quelles prestations proposons-nous en maçonnerie ?',
  'Quelles sont les conditions de garantie ?',
];

// ── Confirm Delete Dialog ──────────────────────────────────────────────────────
function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session item in sidebar ────────────────────────────────────────────────────
function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.titre);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(session.titre);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }

  function commitEdit() {
    if (draft.trim() && draft.trim() !== session.titre) {
      onRename(draft.trim());
    }
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(session.titre);
    setEditing(false);
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDeleteDialog
          title="Supprimer la conversation ?"
          description={`La conversation "${session.titre}" sera définitivement supprimée. Cette action est irréversible.`}
          onConfirm={() => { setConfirmDelete(false); onDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      <div
        onClick={!editing ? onSelect : undefined}
        className={cn(
          'group relative flex items-start gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150',
          isActive
            ? 'bg-white/15 text-white shadow-sm'
            : 'hover:bg-white/10 text-slate-300 hover:text-white',
        )}
      >
        <MessageSquare size={14} className="mt-0.5 flex-shrink-0 opacity-70" />

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                className="flex-1 min-w-0 bg-white/10 text-white text-xs rounded-md px-2 py-1 outline-none border border-white/30 focus:border-white/60"
                autoFocus
              />
              <button onClick={commitEdit} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                <Check size={13} />
              </button>
              <button onClick={cancelEdit} className="text-slate-400 hover:text-white transition-colors">
                <X size={13} />
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium leading-tight truncate">{session.titre}</p>
              <p className="text-[10px] opacity-50 mt-0.5">{formatRelativeDate(session.updatedAt)}</p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={startEdit}
              className="p-1 rounded-md hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
              title="Renommer"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="p-1 rounded-md hover:bg-red-500/30 transition-colors text-slate-300 hover:text-red-400"
              title="Supprimer"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function ChatSidebar({
  sessions,
  activeSessionId,
  isLoading,
  collapsed,
  onToggleCollapse,
  onSelect,
  onNew,
  onDelete,
  onDeleteAll,
  onRename,
}: {
  sessions: ChatSession[];
  activeSessionId: number | null;
  isLoading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  onDeleteAll: () => void;
  onRename: (id: number, titre: string) => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      {confirmClear && (
        <ConfirmDeleteDialog
          title="Effacer tout l'historique ?"
          description="Toutes vos conversations seront définitivement supprimées. Cette action est irréversible."
          onConfirm={() => { setConfirmClear(false); onDeleteAll(); }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
      <div className={cn(
        'flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-white/10 transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-12' : 'w-64',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <History size={15} className="text-indigo-400" />
              <span className="text-xs font-semibold text-white tracking-wide">Historique</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className={cn(
              'p-1.5 rounded-lg hover:bg-white/15 transition-colors text-slate-400 hover:text-white',
              collapsed && 'mx-auto',
            )}
            title={collapsed ? 'Agrandir' : 'Réduire'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* New conversation button */}
            <div className="px-3 pt-3 pb-2">
              <button
                onClick={onNew}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm hover:shadow-indigo-500/20 hover:shadow-md"
              >
                <Plus size={14} />
                Nouvelle conversation
              </button>
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-slate-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-500">
                  <MessageSquare size={24} className="opacity-40" />
                  <p className="text-[11px] text-center">Aucune conversation<br />pour l'instant</p>
                </div>
              ) : (
                sessions.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    isActive={s.id === activeSessionId}
                    onSelect={() => onSelect(s.id)}
                    onDelete={() => onDelete(s.id)}
                    onRename={(titre) => onRename(s.id, titre)}
                  />
                ))
              )}
            </div>

            {/* Clear all */}
            {sessions.length > 0 && (
              <div className="px-3 py-3 border-t border-white/10">
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Eraser size={12} />
                  Effacer tout l'historique
                </button>
              </div>
            )}
          </>
        )}

        {/* Collapsed: icon buttons */}
        {collapsed && (
          <div className="flex flex-col items-center gap-2 px-1 pt-2">
            <button
              onClick={onNew}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
              title="Nouvelle conversation"
            >
              <Plus size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ManagerAssistantChat({ onSwitchToDocuments }: { onSwitchToDocuments?: () => void }) {
  const queryClient = useQueryClient();

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);

  // Use refs to always have up-to-date values inside async callbacks
  const isStreamingRef = useRef(false);
  const activeSessionIdRef = useRef<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep refs in sync
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

  // ── Sessions query ─────────────────────────────────────────────────────────
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<ChatSession[]>({
    queryKey: ['rag-chat-sessions'],
    queryFn: async () => {
      const res = await api.get('/assistant/admin/rag/sessions');
      return res.data ?? [];
    },
  });

  // ── Load messages when session changes ────────────────────────────────────
  const { data: dbMessages, isLoading: messagesLoading } = useQuery<DbMessage[]>({
    queryKey: ['rag-chat-messages', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return [];
      const res = await api.get(`/assistant/admin/rag/sessions/${activeSessionId}/messages`);
      return res.data ?? [];
    },
    enabled: !!activeSessionId,
  });

  useEffect(() => {
    // Clear messages when no session is active
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    // CRITICAL: isStreamingRef.current is set synchronously at the top of send()
    // before any React renders/effects fire. This guard prevents React Query
    // background fetches from overwriting optimistic messages mid-stream.
    if (isStreamingRef.current) return;
    if (dbMessages) {
      setMessages(dbMessages.map(dbMessageToMessage));
    } else {
      // Instantly clear UI if we switched to a session that hasn't loaded yet
      setMessages([]);
    }
  }, [dbMessages, activeSessionId]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/assistant/admin/rag/sessions', {});
      return res.data as ChatSession;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['rag-chat-sessions'] });
      setActiveSessionId(session.id);
      setMessages([]);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/assistant/admin/rag/sessions/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['rag-chat-sessions'] });
      if (activeSessionIdRef.current === deletedId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete('/assistant/admin/rag/sessions/all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-chat-sessions'] });
      setActiveSessionId(null);
      setMessages([]);
    },
  });

  const renameSessionMutation = useMutation({
    mutationFn: ({ id, titre }: { id: number; titre: string }) =>
      api.patch(`/assistant/admin/rag/sessions/${id}`, { titre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-chat-sessions'] });
    },
  });

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send a message ─────────────────────────────────────────────────────────
  // NOTE: Uses refs instead of closured state to avoid stale closure bugs.
  async function send(text: string) {
    const query = text.trim();
    if (!query || isStreamingRef.current) return;

    setInput('');
    setIsStreaming(true);
    isStreamingRef.current = true;

    // Ensure we have an active session — create one if needed
    let sessionId = activeSessionIdRef.current;
    if (!sessionId) {
      try {
        const res = await api.post('/assistant/admin/rag/sessions', {});
        const newSession = res.data as ChatSession;
        sessionId = newSession.id;
        setActiveSessionId(newSession.id);
        activeSessionIdRef.current = newSession.id;
        queryClient.invalidateQueries({ queryKey: ['rag-chat-sessions'] });
      } catch {
        setIsStreaming(false);
        isStreamingRef.current = false;
        return;
      }
    }

    // Append user message to UI immediately
    const userMsgId = uid();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: query, timestamp: Date.now() },
    ]);

    // Placeholder for assistant response
    const botMsgId = uid();
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, role: 'assistant', content: '', timestamp: Date.now() },
    ]);

    let accumulatedText = '';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assistant/admin/rag/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, limit: 5, sessionId }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

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
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'snippets') {
              setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, snippets: data.snippets } : m)),
              );
            } else if (data.type === 'chunk') {
              accumulatedText += data.text;
              const snapshot = accumulatedText;
              setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, content: snapshot } : m)),
              );
            } else if (data.type === 'done') {
              queryClient.invalidateQueries({ queryKey: ['rag-chat-sessions'] });
              queryClient.invalidateQueries({ queryKey: ['rag-chat-messages', sessionId] });
            }
          } catch {
            // Ignore partial / malformed JSON lines
          }
        }
      }

      // Fallback when the LLM returned nothing
      if (!accumulatedText) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                ...m,
                content: m.snippets && m.snippets.length > 0
                  ? "Des documents ont été trouvés mais je n'ai pas pu générer une réponse synthétisée."
                  : "Je n'ai pas trouvé d'information pertinente dans la base de connaissance pour cette question.",
              }
              : m,
          ),
        );
      }
    } catch (err) {
      console.error('[RAG stream error]', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
              ...m,
              content: "Une erreur s'est produite lors de la consultation de la base IA. Veuillez réessayer.",
              isError: true,
            }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Read directly from the DOM value to avoid stale closure
      const currentInput = inputRef.current?.value ?? input;
      send(currentInput);
    }
  }

  function handleSelectSession(id: number) {
    if (id === activeSessionId) return;
    setActiveSessionId(id);
    setMessages([]);
  }

  function handleNewConversation() {
    createSessionMutation.mutate();
  }

  const isEmpty = messages.length === 0 && !messagesLoading;

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      {/* ── Sidebar ── */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isLoading={sessionsLoading}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onSelect={handleSelectSession}
        onNew={handleNewConversation}
        onDelete={(id) => deleteSessionMutation.mutate(id)}
        onDeleteAll={() => deleteAllMutation.mutate()}
        onRename={(id, titre) => renameSessionMutation.mutate({ id, titre })}
      />

      {/* ── Confirm delete active session (from header button) ── */}
      {confirmDeleteSession && activeSessionId && (
        <ConfirmDeleteDialog
          title="Supprimer cette conversation ?"
          description={`La conversation "${sessions.find((s) => s.id === activeSessionId)?.titre ?? ''}" sera définitivement supprimée.`}
          onConfirm={() => {
            setConfirmDeleteSession(false);
            deleteSessionMutation.mutate(activeSessionId);
          }}
          onCancel={() => setConfirmDeleteSession(false)}
        />
      )}

      {/* ── Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0 bg-slate-50">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-sm">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {activeSessionId
                ? (sessions.find((s) => s.id === activeSessionId)?.titre ?? 'Assistant IA')
                : 'Assistant IA BâtiFlow'}
            </p>
            <p className="text-[10px] text-slate-400">Propulsé par votre base de connaissance interne</p>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToDocuments && (
              <button
                onClick={onSwitchToDocuments}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-colors border border-slate-200"
              >
                <Database size={14} />
                <span className="hidden sm:inline">Base de connaissance</span>
              </button>
            )}

            {activeSessionId && (
              <button
                onClick={() => setConfirmDeleteSession(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Supprimer cette conversation"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 scroll-smooth">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : isEmpty ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100">
                <Bot size={32} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Comment puis-je vous aider ?</h3>
                <p className="mt-1 text-sm text-slate-500 max-w-sm">
                  {activeSessionId
                    ? 'Cette conversation est vide. Posez votre première question.'
                    : "Démarrez une nouvelle conversation ou sélectionnez-en une dans l'historique."}
                </p>
              </div>
              <div className="grid gap-2 w-full max-w-sm">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={isStreaming}
                    className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700 text-left hover:bg-indigo-100 hover:border-indigo-200 transition-all font-medium disabled:opacity-50"
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

        {/* Input bar */}
        <div className="border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-2">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question… (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none max-h-32 overflow-auto disabled:opacity-60"
              style={{ lineHeight: '1.5' }}
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] text-slate-400 font-medium">
              Les réponses sont basées sur votre base de connaissance interne BâtiFlow.
            </p>
            <span className="text-[10px] text-slate-300">
              {sessions.length} conversation{sessions.length > 1 ? 's' : ''} sauvegardée{sessions.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
