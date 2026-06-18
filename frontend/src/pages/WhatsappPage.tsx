import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, MoreVertical, Paperclip, Smile, Mic, Send, Check, CheckCheck,
  FileText, Image as ImageIcon, Bot, AlertTriangle, ArrowLeft, X,
  Phone, Video, Download, Reply, Forward, Trash2, Star, Pin,
  Camera, FileImage, Film, Music, MapPin, Contact, ChevronDown,
  Loader2, StopCircle, File,
} from 'lucide-react';
import { whatsappApi, type WhatsappMessage } from '@/lib/whatsapp.api';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '@/lib/api';

// ─── Emoji data ────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  { label: '😀', name: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'] },
  { label: '👍', name: 'Gestes', emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃'] },
  { label: '❤️', name: 'Cœurs', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','⛎'] },
  { label: '🎉', name: 'Fête', emojis: ['🎉','🎊','🎈','🎁','🎀','🎂','🎃','🎄','🎆','🎇','🧨','✨','🎋','🎍','🎎','🎏','🎐','🎑','🎠','🎡','🎢','💫','🌟','⭐','🌈','☀️','🌤','⛅','🌥','☁️','🌦','🌧','⛈','🌩','🌨','❄️','☃️','⛄','🌬','🌪','🌫','🌊','🌀','🌁'] },
  { label: '🏠', name: 'Bâtiment', emojis: ['🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','♨️','🎠','🎡','🎢','🎪','🛖','🏗️','🧱','🪵','🛠️','🔧','🪛','🔨','⛏️'] },
];

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatMsgDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return 'Hier';
  return format(d, 'dd MMMM yyyy', { locale: fr });
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#25D366','#128C7E','#075E54','#34B7F1','#ECE5DD','#dcf8c6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ['#1e8a4a','#0d7a6b','#1a6f9e','#7b3fa4','#c0392b','#d35400','#16a085','#8e44ad'][Math.abs(hash) % 8];
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const color = getAvatarColor(name);
  const initials = getInitials(name);
  return (
    <div
      style={{ width: size, height: size, minWidth: size, backgroundColor: color }}
      className="rounded-full flex items-center justify-center text-white font-semibold select-none"
    >
      <span style={{ fontSize: size * 0.38 }}>{initials}</span>
    </div>
  );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = search
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(search))
    : EMOJI_CATEGORIES[activeTab].emojis;

  return (
    <div
      ref={ref}
      className="absolute bottom-16 left-0 z-50 w-[340px] sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
    >
      {/* Search */}
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5">
          <Search size={14} className="text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Rechercher un emoji"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none flex-1 text-slate-700"
          />
        </div>
      </div>
      {/* Tabs */}
      {!search && (
        <div className="flex border-b border-slate-100">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveTab(i)}
              title={cat.name}
              className={`flex-1 py-2 text-lg transition-all ${activeTab === i ? 'border-b-2 border-[#25D366]' : 'opacity-60 hover:opacity-100'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
      {/* Grid */}
      <div className="grid grid-cols-8 gap-0.5 p-3 max-h-[220px] overflow-y-auto">
        {filtered.map(e => (
          <button
            key={e}
            onClick={() => { onSelect(e); onClose(); }}
            className="text-xl p-1 rounded-lg hover:bg-slate-100 transition-colors aspect-square flex items-center justify-center"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function AttachMenu({ onClose, onFile }: { onClose: () => void; onFile: (type: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { icon: FileImage, label: 'Photos & Vidéos', color: '#7c4dff', type: 'image/*,video/*' },
    { icon: Camera, label: 'Photo', color: '#f50057', type: 'image/*' },
    { icon: File, label: 'Document', color: '#00897b', type: 'application/pdf,application/msword,.docx,.xlsx,.xls' },
    { icon: Music, label: 'Audio', color: '#e65100', type: 'audio/*' },
    { icon: MapPin, label: 'Localisation', color: '#1976d2', type: 'location' },
    { icon: Contact, label: 'Contact', color: '#388e3c', type: 'contact' },
  ];

  return (
    <div
      ref={ref}
      className="absolute bottom-16 left-8 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 grid grid-cols-3 gap-3 w-[220px]"
      style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
    >
      {items.map(({ icon: Icon, label, color, type }) => (
        <button
          key={label}
          onClick={() => { onFile(type); onClose(); }}
          className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
            <Icon size={18} className="text-white" />
          </div>
          <span className="text-[10px] text-slate-600 text-center leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}

function MessageContextMenu({
  x, y, isOutbound, onClose, onReply, onDelete, onStar,
}: {
  x: number; y: number; isOutbound: boolean;
  onClose: () => void; onReply: () => void; onDelete: () => void; onStar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const menuItems = [
    { icon: Reply, label: 'Répondre', action: onReply },
    { icon: Forward, label: 'Transférer', action: onClose },
    { icon: Star, label: 'Mettre en favori', action: onStar },
    { icon: Download, label: 'Télécharger', action: onClose },
    ...(isOutbound ? [{ icon: Trash2, label: 'Supprimer', action: onDelete, danger: true }] : []),
  ];

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: y, left: x, zIndex: 1000 }}
      className="bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden w-48"
    >
      {menuItems.map(({ icon: Icon, label, action, danger }) => (
        <button
          key={label}
          onClick={() => { action(); onClose(); }}
          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${danger ? 'text-red-500' : 'text-slate-700'}`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}

function MessageBubble({
  msg, showDate, prevMsg,
  onReaction, onContextMenu, replyMsg,
}: {
  msg: WhatsappMessage & { reactions?: Record<string, string[]>; starred?: boolean };
  showDate: boolean;
  prevMsg?: WhatsappMessage | null;
  onReaction: (msgId: number, emoji: string) => void;
  onContextMenu: (e: React.MouseEvent, msg: WhatsappMessage) => void;
  replyMsg?: WhatsappMessage | null;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const isOutbound = msg.direction === 'OUTBOUND';
  const isBot = isOutbound && msg.content?.startsWith('🤖');
  const showTail = !prevMsg || prevMsg.direction !== msg.direction;

  return (
    <>
      {showDate && (
        <div className="flex justify-center my-3">
          <span className="bg-white/80 backdrop-blur text-[#667781] text-xs px-3 py-1 rounded-full shadow-sm">
            {formatMsgDate(msg.sentAt)}
          </span>
        </div>
      )}
      <div
        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group relative mb-0.5`}
        onContextMenu={e => onContextMenu(e, msg)}
      >
        {/* Quick reaction bar (hover) */}
        <div
          className={`absolute ${isOutbound ? 'right-full mr-1' : 'left-full ml-1'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-0.5 bg-white rounded-full shadow-lg border border-slate-100 px-1.5 py-1`}
        >
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onReaction(msg.id, emoji)}
              className="text-base hover:scale-125 transition-transform leading-none p-0.5"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={e => { e.stopPropagation(); onContextMenu(e as any, msg); }}
            className="text-slate-400 hover:text-slate-600 ml-0.5 px-0.5"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Bubble */}
        <div
          className={`max-w-[70%] sm:max-w-[65%] relative ${isOutbound ? 'items-end' : 'items-start'} flex flex-col`}
          style={{ marginBottom: msg.reactions && Object.keys(msg.reactions).length > 0 ? 12 : 0 }}
        >
          {/* Reply preview */}
          {replyMsg && (
            <div className={`w-full mb-1 rounded-lg overflow-hidden border-l-4 ${isOutbound ? 'border-[#25D366] bg-[#c5f0b4]' : 'border-[#25D366] bg-slate-100'} px-3 py-1.5`}>
              <p className="text-[11px] font-semibold text-[#25D366]">
                {replyMsg.direction === 'INBOUND' ? 'Client' : 'Vous'}
              </p>
              <p className="text-xs text-slate-600 truncate">{replyMsg.content}</p>
            </div>
          )}

          <div
            className={`px-2.5 py-1.5 shadow-sm text-[14.2px] leading-relaxed break-words relative select-text cursor-pointer rounded-lg ${
              isBot
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-100/80'
                : isOutbound
                  ? `bg-[#d9fdd3] text-[#111b21] ${showTail ? 'rounded-tr-none' : ''}`
                  : `bg-white text-[#111b21] ${showTail ? 'rounded-tl-none' : ''}`
            }`}
            style={{ minWidth: 80 }}
          >
            {/* Tail */}
            {showTail && (
              isOutbound ? (
                <svg className="absolute -right-[8px] top-0" width="9" height="13" viewBox="0 0 9 13" fill="none">
                  <path d="M0 0H9L0 13V0Z" fill="#d9fdd3" />
                </svg>
              ) : (
                <svg className="absolute -left-[8px] top-0" width="9" height="13" viewBox="0 0 9 13" fill="none">
                  <path d="M9 0H0L9 13V0Z" fill="white" />
                </svg>
              )
            )}

            {/* Bot label */}
            {isBot && (
              <div className="flex items-center gap-1 mb-1 text-[11px] font-bold text-indigo-600 border-b border-indigo-100/60 pb-1">
                <Bot size={11} /> BâtiFlow IA
              </div>
            )}

            {/* Content */}
            {msg.type === 'TEXT' && (
              <div className="whitespace-pre-wrap pb-3">
                {isBot ? msg.content?.replace(/^🤖 /, '') : msg.content}
              </div>
            )}
            {msg.type === 'DOCUMENT' && (
              <div className="flex items-center gap-3 p-2.5 bg-black/5 rounded-xl mb-3 border border-black/5 cursor-pointer hover:bg-black/10 transition-colors min-w-[180px]">
                <div className="bg-red-500 text-white p-2.5 rounded-xl flex-shrink-0">
                  <FileText size={22} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm line-clamp-1">{msg.filename || 'Document'}</span>
                  <span className="text-xs text-[#667781] mt-0.5">PDF • Appuyer pour ouvrir</span>
                </div>
                <Download size={16} className="text-[#667781] flex-shrink-0 ml-auto" />
              </div>
            )}
            {msg.type === 'IMAGE' && (
              <div className="w-full min-w-[180px] h-44 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl mb-3 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:opacity-90 transition">
                <ImageIcon size={30} className="mb-1.5" />
                <span className="text-xs">Photo</span>
              </div>
            )}
            {msg.type === 'AUDIO' && (
              <div className="flex items-center gap-3 px-2 py-1.5 mb-3 min-w-[200px]">
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                  <Mic size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-[#25D366] rounded-full" />
                  </div>
                </div>
                <span className="text-xs text-[#667781] tabular-nums">0:24</span>
              </div>
            )}

            {/* Timestamp + ticks */}
            <div className="float-right -mb-1 ml-3 mt-0.5 flex items-center gap-0.5 h-[16px]">
              {msg.starred && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
              <span className="text-[10.5px] text-[#667781] leading-none">{format(new Date(msg.sentAt), 'HH:mm')}</span>
              {isOutbound && (
                <span className="leading-none">
                  {(msg.status === 'PENDING' || msg.status === 'SENT') && <Check size={14} className="text-[#667781]" />}
                  {msg.status === 'DELIVERED' && <CheckCheck size={15} className="text-[#667781]" />}
                  {msg.status === 'READ' && <CheckCheck size={15} className="text-[#53bdeb]" />}
                  {msg.status === 'FAILED' && <X size={13} className="text-red-400" />}
                </span>
              )}
            </div>
          </div>

          {/* Reaction pills */}
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div
              className={`flex gap-0.5 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}
              style={{ position: 'absolute', bottom: -18, [isOutbound ? 'right' : 'left']: 4 }}
            >
              {Object.entries(msg.reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(msg.id, emoji)}
                  className="bg-white rounded-full shadow-md border border-slate-100 px-1.5 py-0.5 text-xs flex items-center gap-0.5 hover:bg-slate-50 transition-colors"
                >
                  <span>{emoji}</span>
                  {users.length > 1 && <span className="text-[10px] text-slate-500">{users.length}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WhatsappPage() {
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: WhatsappMessage } | null>(null);
  const [replyTo, setReplyTo] = useState<WhatsappMessage | null>(null);
  const [reactions, setReactions] = useState<Record<number, Record<string, string[]>>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [starredMsgs, setStarredMsgs] = useState<Set<number>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversationsQuery = useQuery({
    queryKey: ['whatsapp-conversations'],
    queryFn: whatsappApi.getConversations,
    refetchInterval: 5000,
  });

  const messagesQuery = useQuery({
    queryKey: ['whatsapp-messages', selectedConvId],
    enabled: selectedConvId !== null,
    queryFn: () => whatsappApi.getMessages(selectedConvId as number),
    refetchInterval: 3000,
  });

  const supportTicketsQuery = useQuery({
    queryKey: ['whatsapp-support-tickets'],
    queryFn: () => api.get('/whatsapp/support-tickets').then(r => r.data),
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const conv = conversationsQuery.data?.find(c => c.id === selectedConvId);
      if (!conv || !text.trim()) return;
      return whatsappApi.sendMessage(conv.whatsappNumber, text.trim());
    },
    onSuccess: () => {
      setMessageText('');
      setReplyTo(null);
      if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({ msgId, emoji }: { msgId: number; emoji: string }) => whatsappApi.reactToMessage(msgId, emoji),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedConvId] }),
  });

  const mediaMutation = useMutation({
    mutationFn: (file: File) => {
      if (!selectedConvId) throw new Error('No conversation selected');
      return whatsappApi.sendMedia(selectedConvId, file);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedConvId] }),
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data]);

  // Typing indicator simulation
  useEffect(() => {
    if (!selectedConvId) return;
    setIsTyping(false);
    const timer = setTimeout(() => {
      if (Math.random() > 0.7) { setIsTyping(true); setTimeout(() => setIsTyping(false), 3000); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [selectedConvId]);

  // Auto-resize textarea
  const handleTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; }
  };

  const handleSend = useCallback(() => {
    if (messageText.trim()) sendMutation.mutate(messageText);
  }, [messageText, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleReaction = (msgId: number, emoji: string) => {
    reactMutation.mutate({ msgId, emoji });
    
    // Optimistic UI update
    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      if (msgReactions[emoji]) {
        if (msgReactions[emoji].includes('me')) {
          const filtered = msgReactions[emoji].filter(u => u !== 'me');
          if (filtered.length === 0) delete msgReactions[emoji];
          else msgReactions[emoji] = filtered;
        } else {
          msgReactions[emoji] = [...msgReactions[emoji], 'me'];
        }
      } else {
        msgReactions[emoji] = ['me'];
      }
      return { ...prev, [msgId]: msgReactions };
    });
  };

  const handleContextMenu = (e: React.MouseEvent, msg: WhatsappMessage) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenu({ x, y, msg });
  };

  const handleFileType = (acceptType: string) => {
    if (acceptType === 'location' || acceptType === 'contact') return;
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    mediaMutation.mutate(file);
    e.target.value = '';
    setShowAttach(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setRecordSeconds(0);
    } else {
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    }
  };

  const selectedConv = conversationsQuery.data?.find(c => c.id === selectedConvId);
  const ticketCount = (supportTicketsQuery.data as any[])?.length ?? 0;

  const filteredConversations = conversationsQuery.data?.filter(c => {
    const name = c.client ? `${c.client.nom} ${c.client.prenom || ''}` : c.displayName || c.whatsappNumber;
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || c.whatsappNumber.includes(searchQuery);
  });

  const convName = (c: typeof selectedConv) =>
    c?.client ? `${c.client.nom} ${c.client.prenom || ''}`.trim() : c?.displayName || c?.whatsappNumber || 'Client';

  // Group messages by date
  const msgs = messagesQuery.data || [];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 5.5rem)' }}>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

      {/* Support ticket alert */}
      {ticketCount > 0 && (
        <div className="flex items-center gap-3 bg-red-500 text-white px-4 py-2 text-sm font-medium z-20 rounded-t-xl flex-shrink-0">
          <AlertTriangle size={16} />
          <span className="flex-1">{ticketCount} demande{ticketCount > 1 ? 's' : ''} de support urgente{ticketCount > 1 ? 's' : ''} en attente</span>
          <button className="opacity-80 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      {/* WhatsApp Shell */}
      <div
        className={`flex flex-1 overflow-hidden border border-slate-200 shadow-xl ${ticketCount > 0 ? 'rounded-b-xl' : 'rounded-xl'}`}
        style={{ background: '#111b21' }}
      >
        {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
        <div
          className={`flex flex-col bg-white border-r border-slate-200 flex-shrink-0
            ${selectedConvId ? 'hidden md:flex' : 'flex w-full'} md:w-[340px] lg:w-[380px]`}
        >
          {/* Sidebar Header */}
          <div className="h-[60px] bg-[#f0f2f5] flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#dfe5e7] overflow-hidden flex items-center justify-center">
                <span className="text-lg font-bold text-[#54656f]">B</span>
              </div>
              <span className="font-semibold text-[#111b21] text-base">BâtiFlow</span>
            </div>
            <div className="flex items-center gap-4 text-[#54656f]">
              <button title="Nouvelle discussion" className="hover:text-[#111b21] transition-colors p-1">
                <Bot size={20} />
              </button>
              <button title="Menu" className="hover:text-[#111b21] transition-colors p-1">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-full px-4 py-2">
              <Search size={16} className="text-[#8696a0]" />
              <input
                type="text"
                placeholder="Rechercher ou démarrer une discussion"
                className="bg-transparent outline-none flex-1 text-sm text-[#111b21] placeholder:text-[#8696a0]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversationsQuery.isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin text-[#25D366]" size={24} />
              </div>
            ) : filteredConversations?.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm mt-8">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                Aucune discussion trouvée
              </div>
            ) : (
              filteredConversations?.map(conv => {
                const name = convName(conv);
                const isActive = selectedConvId === conv.id;
                const lastDate = new Date(conv.lastMessageAt);
                const dateLabel = isToday(lastDate) ? format(lastDate, 'HH:mm') : isYesterday(lastDate) ? 'Hier' : format(lastDate, 'dd/MM/yy');
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full flex items-center px-3 py-3 gap-3 transition-colors text-left ${isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'}`}
                  >
                    <Avatar name={name} size={48} />
                    <div className="flex-1 min-w-0 border-b border-slate-100 pb-3 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#111b21] text-[15px] truncate">{name}</span>
                        <span className="text-[11px] text-[#667781] flex-shrink-0 ml-2">{dateLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#667781] truncate">{conv.whatsappNumber}</span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-[#25D366] flex-shrink-0 ml-1" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT CHAT AREA ───────────────────────────────── */}
        <div
          className={`flex-1 flex flex-col relative overflow-hidden ${selectedConvId ? 'flex' : 'hidden md:flex'}`}
          style={{ background: '#efeae2' }}
        >
          {/* WhatsApp dot pattern background (CSS-only, no external URL) */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.6,
            }}
          />

          {selectedConvId ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center px-4 py-2.5 bg-[#f0f2f5] border-b border-slate-200 z-10 flex-shrink-0" style={{ minHeight: 60 }}>
                <button onClick={() => setSelectedConvId(null)} className="md:hidden mr-2 text-[#54656f] hover:text-[#111b21]">
                  <ArrowLeft size={22} />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={convName(selectedConv)} size={42} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-[#111b21] text-[15px] leading-tight truncate">{convName(selectedConv)}</span>
                    <span className="text-xs text-[#667781] leading-tight">
                      {isTyping ? (
                        <span className="text-[#25D366] font-medium">en train d'écrire...</span>
                      ) : (
                        selectedConv?.whatsappNumber
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[#54656f] ml-2">
                  <button title="Appel vidéo" className="hover:text-[#111b21] transition-colors hidden sm:block p-1">
                    <Video size={20} />
                  </button>
                  <button title="Appel audio" className="hover:text-[#111b21] transition-colors hidden sm:block p-1">
                    <Phone size={20} />
                  </button>
                  <button title="Rechercher" className="hover:text-[#111b21] transition-colors p-1">
                    <Search size={20} />
                  </button>
                  <div className="flex items-center gap-1 bg-white text-indigo-600 border border-indigo-200 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm hidden sm:flex">
                    <Bot size={12} /> IA active
                  </div>
                  <button className="hover:text-[#111b21] transition-colors p-1">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-[6%] py-4 z-10 flex flex-col gap-0.5">
                {messagesQuery.isLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="bg-white/80 backdrop-blur px-5 py-2.5 rounded-full shadow-sm flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 size={16} className="animate-spin" /> Chargement des messages...
                    </div>
                  </div>
                ) : msgs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <div className="bg-white/60 backdrop-blur rounded-2xl px-6 py-5 shadow-sm">
                      <p className="text-[#667781] text-sm">Aucun message. Envoyez le premier message !</p>
                    </div>
                  </div>
                ) : (
                  msgs.map((msg, i) => {
                    const prev = i > 0 ? msgs[i - 1] : null;
                    const showDate = !prev || !isSameDay(new Date(msg.sentAt), new Date(prev.sentAt));
                    return (
                      <MessageBubble
                        key={msg.id}
                        msg={{ ...msg, reactions: reactions[msg.id], starred: starredMsgs.has(msg.id) }}
                        showDate={showDate}
                        prevMsg={prev}
                        onReaction={handleReaction}
                        onContextMenu={handleContextMenu}
                        replyMsg={replyTo?.id === msg.id ? undefined : undefined}
                      />
                    );
                  })
                )}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </div>

              {/* Reply preview bar */}
              {replyTo && (
                <div className="z-10 flex-shrink-0 flex items-center gap-3 bg-[#f0f2f5] border-t border-slate-200 px-4 py-2">
                  <div className="flex-1 bg-white rounded-lg px-3 py-2 border-l-4 border-[#25D366]">
                    <p className="text-xs font-semibold text-[#25D366]">{replyTo.direction === 'INBOUND' ? 'Client' : 'Vous'}</p>
                    <p className="text-sm text-slate-600 truncate">{replyTo.content}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-[#54656f] hover:text-red-500 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Chat Footer */}
              <div className="z-10 flex-shrink-0 bg-[#f0f2f5] px-3 py-2.5 flex items-end gap-2 border-t border-slate-200">
                {/* Emoji picker */}
                <div className="relative">
                  <button
                    onClick={() => { setShowEmoji(v => !v); setShowAttach(false); }}
                    className={`p-2 rounded-full transition-colors ${showEmoji ? 'text-[#25D366]' : 'text-[#54656f] hover:text-[#111b21]'}`}
                    title="Emojis"
                  >
                    <Smile size={24} />
                  </button>
                  {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
                </div>

                {/* Attach menu */}
                <div className="relative">
                  <button
                    onClick={() => { setShowAttach(v => !v); setShowEmoji(false); }}
                    className={`p-2 rounded-full transition-colors ${showAttach ? 'text-[#25D366]' : 'text-[#54656f] hover:text-[#111b21]'}`}
                    title="Joindre"
                  >
                    <Paperclip size={24} />
                  </button>
                  {showAttach && <AttachMenu onClose={() => setShowAttach(false)} onFile={handleFileType} />}
                </div>

                {/* Text input */}
                <div className="flex-1 bg-white rounded-2xl px-4 py-2.5 shadow-sm flex items-end gap-2 min-h-[44px]">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={messageText}
                    onChange={handleTextInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Taper un message"
                    className="flex-1 bg-transparent outline-none text-[15px] text-[#111b21] placeholder:text-[#8696a0] resize-none max-h-[120px] leading-relaxed"
                    style={{ minHeight: 24 }}
                  />
                </div>

                {/* Send / Mic */}
                {isRecording ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-2 rounded-full text-sm font-medium">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      {String(Math.floor(recordSeconds / 60)).padStart(2,'0')}:{String(recordSeconds % 60).padStart(2,'0')}
                    </div>
                    <button
                      onClick={toggleRecording}
                      className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-lg"
                    >
                      <StopCircle size={22} />
                    </button>
                  </div>
                ) : messageText.trim() ? (
                  <button
                    onClick={handleSend}
                    disabled={sendMutation.isPending}
                    className="w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#22c35e] text-white flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-70 flex-shrink-0"
                  >
                    {sendMutation.isPending
                      ? <Loader2 size={20} className="animate-spin" />
                      : <Send size={20} className="ml-0.5" />}
                  </button>
                ) : (
                  <button
                    onClick={toggleRecording}
                    className="w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#22c35e] text-white flex items-center justify-center transition-all shadow-lg active:scale-95 flex-shrink-0"
                    title="Enregistrer un audio"
                  >
                    <Mic size={20} />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center z-10">
              <div className="text-center flex flex-col items-center max-w-sm px-6">
                <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-6 shadow-inner">
                  <svg viewBox="0 0 212 212" className="w-20 h-20" fill="#25D366">
                    <path d="M106 0C47.4 0 0 47.4 0 106c0 18.7 4.9 36.2 13.4 51.4L0 212l55.7-14.6C70.7 206.1 88 211 106 211c58.6 0 106-47.4 106-106S164.6 0 106 0zm0 192c-16.2 0-31.5-4.4-44.7-12l-3.1-1.9-33 8.7 8.4-32.4-2-3.2C22.4 138.2 18 122.6 18 106 18 57.4 57.4 18 106 18s88 39.4 88 88-39.4 86-88 86z"/>
                    <path d="M155.7 129.4c-2.5-1.3-14.8-7.3-17.1-8.1-2.3-.8-4-1.3-5.7 1.3-1.7 2.5-6.5 8.1-8 9.8-1.5 1.7-2.9 1.9-5.4.6-2.5-1.3-10.5-3.9-20-12.4-7.4-6.6-12.4-14.8-13.8-17.2-1.5-2.5-.2-3.8 1.1-5.1 1.1-1.1 2.5-2.9 3.8-4.4 1.3-1.5 1.7-2.5 2.5-4.2.8-1.7.4-3.1-.2-4.4-.6-1.3-5.7-13.8-7.9-18.9-2-5-4.1-4.3-5.6-4.4-1.5-.1-3.1-.1-4.8-.1-1.7 0-4.4.6-6.7 3.1-2.3 2.5-8.8 8.6-8.8 20.9s9 24.2 10.3 25.9c1.3 1.7 17.7 27 42.9 37.9 6 2.6 10.7 4.1 14.3 5.3 6 1.9 11.5 1.6 15.8.9 4.8-.7 14.8-6 16.9-11.9 2.1-5.8 2.1-10.8 1.5-11.9-.6-1.1-2.3-1.7-4.8-2.9z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-light text-[#41525d] mb-3">BâtiFlow WhatsApp</h2>
                <p className="text-sm text-[#667781] leading-relaxed">
                  Envoyez et recevez des messages, devis et factures. Utilisez le moteur IA pour répondre automatiquement à vos clients.
                </p>
                <div className="mt-6 flex items-center gap-2 text-[11px] text-[#8696a0] font-medium border border-[#e9edef] bg-white/60 backdrop-blur px-4 py-2 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                  Moteur IA connecté · OpenRouter / Nemotron
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isOutbound={contextMenu.msg.direction === 'OUTBOUND'}
          onClose={() => setContextMenu(null)}
          onReply={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }}
          onDelete={() => setContextMenu(null)}
          onStar={() => {
            setStarredMsgs(prev => {
              const next = new Set(prev);
              next.has(contextMenu.msg.id) ? next.delete(contextMenu.msg.id) : next.add(contextMenu.msg.id);
              return next;
            });
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
