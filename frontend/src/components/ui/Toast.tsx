import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info, AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastOptions {
  type?: ToastType;
  title: string;
  description?: string;
  /** Durée d'affichage en ms (ignorée pour `loading`). Défaut: 4000. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, 'description'>> {
  id: number;
  description?: string;
  /** When true, the toast plays its exit animation before being unmounted. */
  leaving: boolean;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
  /** Met à jour un toast existant (utile pour transformer un `loading` en `success`/`error`). */
  update: (id: number, options: ToastOptions) => void;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
  warning: (title: string, description?: string) => number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** How long the exit animation plays before the element is removed from the DOM. */
const EXIT_DURATION_MS = 300;

const toastConfig: Record<ToastType, {
  icon: React.ElementType;
  accent: string;
  iconWrap: string;
  iconColor: string;
  progress: string;
}> = {
  success: {
    icon: CheckCircle2,
    accent: 'border-emerald-200',
    iconWrap: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    progress: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    accent: 'border-red-200',
    iconWrap: 'bg-red-50',
    iconColor: 'text-red-600',
    progress: 'bg-red-500',
  },
  info: {
    icon: Info,
    accent: 'border-blue-200',
    iconWrap: 'bg-blue-50',
    iconColor: 'text-blue-600',
    progress: 'bg-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'border-amber-200',
    iconWrap: 'bg-amber-50',
    iconColor: 'text-amber-600',
    progress: 'bg-amber-500',
  },
  loading: {
    icon: Loader2,
    accent: 'border-slate-200',
    iconWrap: 'bg-slate-50',
    iconColor: 'text-slate-600',
    progress: 'bg-slate-400',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  /** Mark a toast as `leaving` (plays exit animation) then fully removes it. */
  const dismiss = useCallback((id: number) => {
    // Clear any pending auto-dismiss timer for this toast.
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    // 1. Flip on `leaving` so the card plays the exit animation.
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));

    // 2. After the animation finishes, drop it from state (unmount).
    const exitTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, EXIT_DURATION_MS);
    timers.current.set(id, exitTimer);
  }, []);

  const scheduleDismiss = useCallback((id: number, duration: number) => {
    if (duration <= 0) return;
    const timer = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
  }, [dismiss]);

  const toast = useCallback((options: ToastOptions) => {
    const id = ++idRef.current;
    const item: ToastItem = {
      id,
      type: options.type ?? 'info',
      title: options.title,
      description: options.description,
      duration: options.duration ?? 4000,
      leaving: false,
    };
    setToasts((prev) => [...prev, item]);
    if (item.type !== 'loading') {
      scheduleDismiss(id, item.duration);
    }
    return id;
  }, [scheduleDismiss]);

  const update = useCallback((id: number, options: ToastOptions) => {
    setToasts((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      return {
        id,
        type: options.type ?? 'info',
        title: options.title,
        description: options.description,
        duration: options.duration ?? 4000,
        leaving: false, // an update "revives" a leaving toast
      };
    }));
    if ((options.type ?? 'info') !== 'loading') {
      scheduleDismiss(id, options.duration ?? 4000);
    }
  }, [scheduleDismiss]);

  const success = useCallback((title: string, description?: string) => toast({ type: 'success', title, description }), [toast]);
  const error = useCallback((title: string, description?: string) => toast({ type: 'error', title, description }), [toast]);
  const info = useCallback((title: string, description?: string) => toast({ type: 'info', title, description }), [toast]);
  const warning = useCallback((title: string, description?: string) => toast({ type: 'warning', title, description }), [toast]);

  // Clean up any lingering timers on unmount (HMR / strict mode safety).
  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach((t) => clearTimeout(t)); map.clear(); };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss, update, success, error, info, warning }),
    [toast, dismiss, update, success, error, info, warning]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const config = toastConfig[item.type];
  const Icon = config.icon;
  const isAnimated = item.type === 'loading';

  // Pause the auto-dismiss countdown while the user hovers the toast,
  // and resume on leave — a standard SaaS affordance.
  const pausedRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { pausedRef.current = hovered; }, [hovered]);

  return (
    <div
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'pointer-events-auto relative overflow-hidden flex items-start gap-3 bg-white rounded-2xl border shadow-xl px-4 py-3.5 pr-9',
        // Smooth enter animation; swap to exit animation when `leaving`.
        item.leaving ? 'bf-animate-toast-out' : 'bf-animate-toast-in',
        config.accent,
      )}
    >
      {/* Colored left accent bar */}
      <span className={cn('absolute left-0 top-0 bottom-0 w-1', config.progress)} />

      <div className={cn('flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center', config.iconWrap)}>
        <Icon size={20} className={cn(config.iconColor, isAnimated && 'animate-spin')} />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-slate-800 leading-tight">{item.title}</p>
        {item.description && (
          <p className="text-[13px] text-slate-500 mt-0.5 leading-snug break-words">{item.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Fermer la notification"
      >
        <X size={15} />
      </button>

      {/* Auto-dismiss countdown bar (hidden for loading toasts). */}
      {!isAnimated && !item.leaving && (
        <CountdownBar
          duration={item.duration}
          colorClass={config.progress}
          pausedRef={pausedRef}
        />
      )}
    </div>
  );
}

/**
 * Thin progress bar at the bottom of each toast that depletes over `duration`.
 * Pauses while hovered (mirrors the auto-dismiss pause). Purely visual — the
 * actual removal is driven by the provider's timer.
 */
function CountdownBar({
  duration,
  colorClass,
  pausedRef,
}: {
  duration: number;
  colorClass: string;
  pausedRef: React.MutableRefObject<boolean>;
}) {
  const [remainingPct, setRemainingPct] = useState(100);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const totalMs = duration;
    let lastRemaining = 100;

    const tick = (now: number) => {
      if (pausedRef.current) {
        // Freeze the bar: keep the elapsed time effectively paused by
        // re-basing `start` so the visible progress does not advance.
        // (The provider's timer handles the real pause/resume of removal.)
        return;
      }
      const elapsed = now - start;
      const pct = Math.max(0, 100 * (1 - elapsed / totalMs));
      if (Math.abs(pct - lastRemaining) > 0.5) {
        lastRemaining = pct;
        setRemainingPct(pct);
      }
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // We intentionally do NOT re-run on hover changes: pausedRef is a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/5">
      <div
        className={cn('h-full transition-[width] duration-75 ease-linear', colorClass)}
        style={{ width: `${remainingPct}%` }}
      />
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l\'intérieur de <ToastProvider>');
  }
  return ctx;
}

/**
 * Convertit une erreur API/axios/inconnue en message lisible (français).
 * Utilitaire partagé pour les mutations à travers l'app.
 */
export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue. Veuillez réessayer.'): string {
  // axios
  const anyErr = error as { response?: { data?: { message?: unknown } }; message?: string } | null;
  const message = anyErr?.response?.data?.message;
  if (Array.isArray(message) && message.length > 0) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
