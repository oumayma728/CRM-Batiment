import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormProvider, accentStyles } from './Form';
import type { AccentColor } from './Form';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ElementType;
  accent?: AccentColor;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  accent = 'blue',
  children,
  className,
  maxWidth = '2xl'
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const styles = accentStyles[accent];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop with Glassmorphism */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={cn(
        "relative w-full max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
        maxWidthClasses[maxWidth],
        className
      )}>
        {/* Subtle Industry Blueprint Background Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#0f172a 1px, transparent 1px)`,
            backgroundSize: `24px 24px`
          }}
        />

        {/* Header */}
        <div className={cn("relative flex items-center justify-between px-6 py-4 border-b border-slate-100", styles.lightBg)}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm border", styles.border, styles.text)}>
                <Icon size={20} />
              </div>
            )}
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/50 text-slate-500 hover:bg-white hover:text-slate-800 transition-colors shadow-sm border border-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="relative flex-1 overflow-y-auto custom-scrollbar">
          <FormProvider accent={accent}>
            {children}
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
