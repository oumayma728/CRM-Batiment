import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Building2,
  Loader2,
  MessageCircle,
  MinusCircle,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
  BarChart3,
  FileText,
  HardHat,
  Users,
  Search,
  Zap,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import './ChatbotWidget.css';

/* ============================================================
   TYPES
   ============================================================ */

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: Date;
  projectTypes?: Array<{
    id: number;
    nom: string;
    description: string | null;
  }>;
  checklist?: string[];
  structuredWorkflow?: {
    status: string;
    project_type: string;
    categories: Array<{ id: number; nom: string; description: string | null }>;
    sous_categories: Array<{ id: number; nom: string; description: string | null }>;
    prestations: Array<{
      id: number;
      nom: string;
      description: string | null;
      prixVenteMin: number;
      prixVenteMax: number;
      options: Array<{
        id: number;
        nom: string;
        obligatoire: boolean;
        choix: Array<{ id: number; nom: string; impactPrix: number }>;
      }>;
    }>;
  };
}

interface AssistantApiResult {
  intent: string;
  project_type: string;
  is_known_project: boolean;
  missing_fields: string[];
  project_types?: Array<{
    id: number;
    nom: string;
    description: string | null;
  }>;
  collected_data: {
    nom: string;
    telephone: string;
    email: string;
    description: string;
  };
  response_message: string;
  checklist?: string[];
  structured_workflow?: ChatMessage['structuredWorkflow'];
}

interface QuickSuggestion {
  label: string;
  message: string;
  icon: React.ReactNode;
  actionPath?: string;
}

/* ============================================================
   SUGGESTIONS BY ROLE (Internal Mode)
   ============================================================ */

const publicSuggestions: QuickSuggestion[] = [
  { label: 'Demander un devis', message: 'Je souhaite demander un devis pour des travaux', icon: <FileText size={12} /> },
  { label: 'Services disponibles', message: 'Quels sont les services disponibles ?', icon: <Search size={12} /> },
  { label: 'Tarifs', message: 'Je voudrais connaitre les tarifs', icon: <BarChart3 size={12} /> },
];

const internalSuggestionsByRole: Record<string, QuickSuggestion[]> = {
  ADMIN: [
    { label: 'Résumé activité', message: 'Donne-moi un résumé de l\'activité de l\'entreprise', icon: <BarChart3 size={12} /> },
    { label: 'Créer un devis', message: 'Je veux créer un nouveau devis pour un client', icon: <FileText size={12} /> },
    { label: 'Gérer utilisateurs', message: 'Comment gérer les utilisateurs et leurs rôles ?', icon: <Shield size={12} /> },
    { label: 'Voir les chantiers', message: 'Montre-moi l\'état de mes chantiers en cours', icon: <HardHat size={12} /> },
  ],
  TECHNICO: [
    { label: 'Mes devis', message: 'Ouvre mes devis', icon: <FileText size={12} />, actionPath: '/technico/devis' },
    { label: 'Nouveau client', message: 'Ouvre mes clients pour ajouter un client', icon: <Users size={12} />, actionPath: '/technico/clients' },
    { label: 'Creer devis', message: 'Ouvre la checklist pour creer un devis', icon: <Zap size={12} />, actionPath: '/technico/checklist' },
    { label: 'Catalogue prix', message: 'Ouvre le catalogue des prestations', icon: <Search size={12} />, actionPath: '/technico/catalogue' },
    { label: 'Factures', message: 'Ouvre mes factures', icon: <BarChart3 size={12} />, actionPath: '/technico/factures' },
    { label: 'Prospects IA', message: 'Ouvre les prospects de l assistant IA', icon: <Bot size={12} />, actionPath: '/technico/assistant-ia' },
  ],
  ASSISTANTE: [
    { label: 'Demandes en cours', message: 'Quelles sont les demandes de devis en cours ?', icon: <FileText size={12} /> },
    { label: 'Clients récents', message: 'Montre-moi les derniers clients ajoutés', icon: <Users size={12} /> },
    { label: 'Factures', message: 'Y a-t-il des factures en attente ?', icon: <BarChart3 size={12} /> },
    { label: 'Aide navigation', message: 'Comment accéder au module fournisseurs ?', icon: <Search size={12} /> },
  ],
  CHEF_CHANTIER: [
    { label: 'Mes chantiers', message: 'Quels sont mes chantiers en cours ?', icon: <HardHat size={12} /> },
    { label: 'Tâches à faire', message: 'Quelles sont mes tâches prioritaires ?', icon: <Sparkles size={12} /> },
    { label: 'Réceptions', message: 'Y a-t-il des réceptions prévues ?', icon: <Building2 size={12} /> },
  ],
  SOUS_TRAITANT: [
    { label: 'Mes commandes', message: 'Quelles sont mes commandes en cours ?', icon: <FileText size={12} /> },
    { label: 'Aide', message: 'Comment fonctionne le portail fournisseur ?', icon: <Search size={12} /> },
  ],
};

/* ============================================================
   HELPERS
   ============================================================ */

function generateMsgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const err = error as { response?: { data?: { message?: string | string[] } } };
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

const technicoLocalActions = [
  {
    path: '/technico',
    label: 'Tableau de bord technico',
    keywords: ['dashboard', 'tableau', 'accueil', 'statistique', 'stats'],
  },
  {
    path: '/technico/clients',
    label: 'Mes clients',
    keywords: ['client', 'clients', 'prospect', 'contact', 'ajouter client', 'nouveau client'],
  },
  {
    path: '/technico/demandes',
    label: 'Demandes devis',
    keywords: ['demande', 'demandes', 'message client', 'messages client', 'devis recu'],
  },
  {
    path: '/technico/devis',
    label: 'Mes devis',
    keywords: ['devis', 'offre', 'signature devis', 'mes devis'],
  },
  {
    path: '/technico/checklist',
    label: 'Checklist devis',
    keywords: ['creer devis', 'generer devis', 'checklist', 'diagnostic', 'nouveau devis'],
  },
  {
    path: '/technico/factures',
    label: 'Mes factures',
    keywords: ['facture', 'factures', 'impaye', 'impayee', 'paiement'],
  },
  {
    path: '/technico/commandes-fournisseur',
    label: 'Commandes fournisseur',
    keywords: ['commande', 'commandes', 'fournisseur', 'reception', 'achat'],
  },
  {
    path: '/technico/assistant-ia',
    label: 'Assistant IA prospects',
    keywords: ['assistant ia', 'prospect ia', 'chatbot', 'prospects chatbot'],
  },
  {
    path: '/technico/prestations',
    label: 'Prestations',
    keywords: ['prestation', 'prestations', 'catalogue prestation'],
  },
  {
    path: '/technico/catalogue',
    label: 'Catalogue expert',
    keywords: ['catalogue', 'prix', 'materiaux', 'prestations prix'],
  },
  {
    path: '/technico/profil',
    label: 'Mon profil',
    keywords: ['profil', 'signature', 'mot de passe', 'compte'],
  },
];

function normalizeCommand(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function ChatbotWidget() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /* ---------- State ---------- */
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---------- Derived ---------- */
  const isInternal = isAuthenticated && !!user;
  const mode = isInternal ? 'internal' : 'public';
  const isBusy = isStarting || isSending;
  const canSend = !!sessionId && input.trim().length > 0 && !isBusy;

  const suggestions = isInternal
    ? internalSuggestionsByRole[user?.role ?? 'ADMIN'] ?? publicSuggestions
    : publicSuggestions;

  const userInitials = user
    ? `${user.prenom?.charAt(0) ?? ''}${user.nom?.charAt(0) ?? ''}`.toUpperCase() || 'U'
    : 'V';
  const isTechnicoScope = isInternal && user?.role === 'TECHNICO' && location.pathname.startsWith('/technico');

  /* ---------- Auto-scroll ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  /* ---------- Focus input when panel opens ---------- */
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen, isMinimized]);

  /* ---------- API Calls ---------- */
  async function initSession(forceRestart = false) {
    if (sessionId && !forceRestart) return;

    setError('');
    setIsStarting(true);

    try {
      const res = await api.post('/assistant/session/start', {
        companyId: 1,
      });

      setSessionId(res.data.session_id as number);
      setShowSuggestions(true);

      const welcomeContent = isInternal
        ? `Bonjour ${user?.prenom ?? ''} 👋\nJe suis votre assistant BatiCRM. Je peux vous aider à naviguer, obtenir des informations ou effectuer des actions rapides.\n\nQue puis-je faire pour vous ?`
        : (res.data.response_message as string) ||
          'Bonjour ! 👋 Je suis l\'assistant BatiCRM. Comment puis-je vous aider ?';

      setMessages([
        {
          id: generateMsgId(),
          role: 'ASSISTANT',
          content: welcomeContent,
          timestamp: new Date(),
        },
      ]);
      setInput('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de démarrer le chatbot.'));
    } finally {
      setIsStarting(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    setIsSending(true);
    setShowSuggestions(false);

    const userMsg: ChatMessage = {
      id: generateMsgId(),
      role: 'USER',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (tryHandleLocalAction(userMessage)) {
      setIsSending(false);
      return;
    }

    try {
      const res = await api.post<AssistantApiResult>(
        `/assistant/session/${sessionId}/message`,
        {
          companyId: 1,
          message: userMessage,
        },
      );

      const assistantMsg: ChatMessage = {
        id: generateMsgId(),
        role: 'ASSISTANT',
        content: res.data.response_message,
        timestamp: new Date(),
        projectTypes: res.data.project_types,
        checklist: res.data.checklist,
        structuredWorkflow: res.data.structured_workflow,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Echec d\'envoi. Veuillez réessayer.'));
    } finally {
      setIsSending(false);
    }
  }

  function handleSuggestionClick(suggestion: QuickSuggestion) {
    if (suggestion.actionPath) {
      setShowSuggestions(false);
      runLocalNavigation(suggestion.actionPath, suggestion.label, suggestion.message);
      return;
    }

    setInput(suggestion.message);
    setShowSuggestions(false);

    // Auto-send the suggestion
    if (sessionId && !isBusy) {
      setInput('');
      setError('');
      setIsSending(true);

      const userMsg: ChatMessage = {
        id: generateMsgId(),
        role: 'USER',
        content: suggestion.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      api
        .post<AssistantApiResult>(
          `/assistant/session/${sessionId}/message`,
          {
            companyId: 1,
            message: suggestion.message,
          },
        )
        .then((res) => {
          const assistantMsg: ChatMessage = {
            id: generateMsgId(),
            role: 'ASSISTANT',
            content: res.data.response_message,
            timestamp: new Date(),
            projectTypes: res.data.project_types,
            checklist: res.data.checklist,
            structuredWorkflow: res.data.structured_workflow,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        })
        .catch((err) => {
          setError(getApiErrorMessage(err, 'Echec d\'envoi.'));
        })
        .finally(() => {
          setIsSending(false);
        });
    }
  }

  function handleWorkflowChoice(choiceLabel: string) {
    if (!sessionId || isBusy) return;

    setInput('');
    setError('');
    setIsSending(true);
    setShowSuggestions(false);

    const userMsg: ChatMessage = {
      id: generateMsgId(),
      role: 'USER',
      content: choiceLabel,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    api
      .post<AssistantApiResult>(
        `/assistant/session/${sessionId}/message`,
        {
          companyId: 1,
          message: choiceLabel,
        },
      )
      .then((res) => {
        const assistantMsg: ChatMessage = {
          id: generateMsgId(),
          role: 'ASSISTANT',
          content: res.data.response_message,
          timestamp: new Date(),
          projectTypes: res.data.project_types,
          checklist: res.data.checklist,
          structuredWorkflow: res.data.structured_workflow,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Echec d\'envoi.'));
      })
      .finally(() => {
        setIsSending(false);
      });
  }

  function runLocalNavigation(path: string, label: string, userContent?: string) {
    const userMsg: ChatMessage | null = userContent
      ? {
          id: generateMsgId(),
          role: 'USER',
          content: userContent,
          timestamp: new Date(),
        }
      : null;

    const assistantMsg: ChatMessage = {
      id: generateMsgId(),
      role: 'ASSISTANT',
      content: `J'ouvre "${label}". Vous pouvez continuer votre tache depuis cette page.`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, ...(userMsg ? [userMsg] : []), assistantMsg]);
    navigate(path);
  }

  function tryHandleLocalAction(command: string) {
    if (!isTechnicoScope) return false;

    const cleanCommand = normalizeCommand(command);
    const wantsAction = [
      'ouvrir',
      'aller',
      'afficher',
      'voir',
      'lancer',
      'creer',
      'generer',
      'ajouter',
    ].some((verb) => cleanCommand.includes(verb));

    const action = technicoLocalActions.find((item) =>
      item.keywords.some((keyword) => cleanCommand.includes(normalizeCommand(keyword))),
    );

    if (!action || !wantsAction) return false;

    const assistantMsg: ChatMessage = {
      id: generateMsgId(),
      role: 'ASSISTANT',
      content: `C'est fait, j'ouvre "${action.label}".`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    navigate(action.path);
    return true;
  }

  async function handleOpen() {
    setIsOpen(true);
    setIsMinimized(false);
    await initSession(false);
  }

  async function handleReset() {
    await initSession(true);
  }

  function handleClose() {
    setIsOpen(false);
    setIsMinimized(false);
  }

  /* ---------- Render ---------- */
  return (
    <>
      {/* ===== Floating Action Button ===== */}
      {!isOpen && (
        <button
          type="button"
          className="chatbot-fab"
          onClick={() => void handleOpen()}
          id="chatbot-open-btn"
        >
          <span className="chatbot-fab-icon-wrap">
            <span className="chatbot-fab-ping" />
            <MessageCircle size={17} />
          </span>
          <span className="chatbot-fab-label">
            <span className="chatbot-fab-label-sub">
              {isInternal ? 'Assistant IA' : 'Besoin d\'aide ?'}
            </span>
            <span>
              {isInternal ? 'Aide & Actions' : 'Démarrer le chat'}
            </span>
          </span>
        </button>
      )}

      {/* ===== Chat Panel ===== */}
      {isOpen && !isMinimized && (
        <div className="chatbot-panel" id="chatbot-panel">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-header-avatar">
                <Bot size={18} />
              </div>
              <div className="chatbot-header-info">
                <h3>
                  Assistant BatiCRM
                </h3>
                <div className="chatbot-header-status">
                  <span className="chatbot-status-dot" />
                  <span>En ligne</span>
                  <span style={{ margin: '0 0.25rem' }}>•</span>
                  <span className={`chatbot-mode-badge chatbot-mode-badge--${mode}`}>
                    {isInternal ? '🔒 Interne' : '🌐 Public'}
                  </span>
                </div>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-header-btn"
                onClick={() => void handleReset()}
                title="Nouvelle conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                className="chatbot-header-btn"
                onClick={() => setIsMinimized(true)}
                title="Réduire"
              >
                <MinusCircle size={15} />
              </button>
              <button
                type="button"
                className="chatbot-header-btn"
                onClick={handleClose}
                title="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.length === 0 && !isStarting && (
              <div className="chatbot-welcome">
                <div className="chatbot-welcome-icon">
                  <Sparkles size={24} />
                </div>
                <h4>
                  {isInternal
                    ? `Bienvenue, ${user?.prenom ?? 'utilisateur'} !`
                    : 'Bienvenue sur BatiCRM'}
                </h4>
                <p>
                  {isInternal
                    ? 'Votre assistant IA est prêt à vous aider dans vos tâches quotidiennes.'
                    : 'Notre assistant IA va vous guider pour votre projet de construction.'}
                </p>
              </div>
            )}

            {isStarting && messages.length === 0 && (
              <div className="chatbot-typing">
                <div className="chatbot-msg-avatar chatbot-msg-avatar--bot">
                  <Bot size={13} />
                </div>
                <div className="chatbot-typing-dots">
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" />
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-msg chatbot-msg--${msg.role === 'USER' ? 'user' : 'assistant'}`}
              >
                <div
                  className={`chatbot-msg-avatar ${
                    msg.role === 'USER'
                      ? 'chatbot-msg-avatar--user'
                      : 'chatbot-msg-avatar--bot'
                  }`}
                >
                  {msg.role === 'USER' ? (
                    isInternal ? userInitials : <User size={13} />
                  ) : (
                    <Bot size={13} />
                  )}
                </div>
                <div>
                  <div className="chatbot-msg-bubble">
                    {msg.content}

                    {/* Project Types */}
                    {msg.projectTypes && msg.projectTypes.length > 0 && (
                      <div className="chatbot-project-types">
                        {msg.projectTypes.map((pt) => (
                          <div key={pt.id} className="chatbot-project-type-item">
                            <span className="chatbot-project-type-icon">
                              <Building2 size={11} />
                            </span>
                            <div>
                              <div className="chatbot-project-type-name">{pt.nom}</div>
                              {pt.description && (
                                <div className="chatbot-project-type-desc">{pt.description}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.structuredWorkflow && (
                      <div className="chatbot-workflow">
                        {msg.structuredWorkflow.categories.length > 0 && (
                          <div className="chatbot-workflow-block">
                            <div className="chatbot-workflow-title">Categories</div>
                            <div className="chatbot-choice-list">
                              {msg.structuredWorkflow.categories.slice(0, 8).map((item) => (
                                <button
                                  key={`cat-${item.id}`}
                                  type="button"
                                  className="chatbot-choice-btn"
                                  onClick={() => handleWorkflowChoice(item.nom)}
                                  disabled={isBusy}
                                >
                                  {item.nom}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {msg.structuredWorkflow.sous_categories.length > 0 && (
                          <div className="chatbot-workflow-block">
                            <div className="chatbot-workflow-title">Sous-categories</div>
                            <div className="chatbot-choice-list">
                              {msg.structuredWorkflow.sous_categories.slice(0, 8).map((item) => (
                                <button
                                  key={`sub-${item.id}`}
                                  type="button"
                                  className="chatbot-choice-btn"
                                  onClick={() => handleWorkflowChoice(item.nom)}
                                  disabled={isBusy}
                                >
                                  {item.nom}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                  <div className="chatbot-msg-time">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isSending && (
              <div className="chatbot-typing">
                <div className="chatbot-msg-avatar chatbot-msg-avatar--bot">
                  <Bot size={13} />
                </div>
                <div className="chatbot-typing-dots">
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" />
                  <span className="chatbot-typing-dot" />
                </div>
              </div>
            )}

            {/* Error */}
            {error && <div className="chatbot-error">{error}</div>}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {showSuggestions && messages.length > 0 && !isBusy && (
            <div className="chatbot-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="chatbot-suggestion-btn"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form className="chatbot-input-area" onSubmit={(e) => void sendMessage(e)}>
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder={
                isInternal
                  ? 'Posez une question ou demandez une action...'
                  : 'Décrivez votre projet...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isBusy || !sessionId}
              id="chatbot-input-field"
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!canSend}
              title="Envoyer"
              id="chatbot-send-btn"
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        </div>
      )}

      {/* ===== Minimized State ===== */}
      {isOpen && isMinimized && (
        <button
          type="button"
          className="chatbot-fab"
          onClick={() => setIsMinimized(false)}
          id="chatbot-restore-btn"
        >
          <span className="chatbot-fab-icon-wrap">
            <Bot size={17} />
          </span>
          <span className="chatbot-fab-label">
            <span className="chatbot-fab-label-sub">
              {messages.length > 1
                ? `${messages.length - 1} message${messages.length > 2 ? 's' : ''}`
                : 'En attente'}
            </span>
            <span>Ouvrir le chat</span>
          </span>
        </button>
      )}
    </>
  );
}
