import React from 'react';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  /** Label du bouton de confirmation. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Icône affichée dans l'en-tête ( défaut: Trash2 ). */
  icon?: React.ElementType;
  /** État de chargement (désactive les boutons + spinner). */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Boîte de dialogue de confirmation "danger" partagée.
 * Style rouge cohérent utilisé pour TOUTE suppression dans l'app.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  icon: Icon = Trash2,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bf-animate-fade-in">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden bf-animate-zoom-in">
        {/* Subtle danger pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#dc2626 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        {/* Header — red danger */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm border border-red-200 text-red-600">
              <Icon size={20} />
            </div>
            <h2 className="text-lg font-bold text-red-700 tracking-tight">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/50 text-slate-500 hover:bg-white hover:text-slate-800 transition-colors shadow-sm border border-slate-200 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="relative p-6">
          <div className="flex gap-3 mb-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div className="text-sm text-slate-600 leading-relaxed pt-1">{message}</div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'flex-1 px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2',
                'bg-red-600 hover:bg-red-700 disabled:opacity-60',
              )}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
