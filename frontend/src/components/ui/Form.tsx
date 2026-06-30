import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type AccentColor = 'blue' | 'orange' | 'green' | 'amber' | 'slate';

interface FormContextValue {
  accent: AccentColor;
}

const FormContext = createContext<FormContextValue>({ accent: 'blue' });

export function FormProvider({ accent, children }: { accent: AccentColor; children: React.ReactNode }) {
  return <FormContext.Provider value={{ accent }}>{children}</FormContext.Provider>;
}

export const accentStyles: Record<AccentColor, {
  text: string;
  bg: string;
  hover: string;
  focus: string;
  border: string;
  lightBg: string;
  gradient: string;
}> = {
  blue: {
    text: 'text-blue-600',
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-700',
    focus: 'focus:border-blue-500 focus:ring-blue-500/30',
    border: 'border-blue-200',
    lightBg: 'bg-blue-50',
    gradient: 'from-blue-600 to-blue-500',
  },
  orange: {
    text: 'text-orange-600',
    bg: 'bg-orange-600',
    hover: 'hover:bg-orange-700',
    focus: 'focus:border-orange-500 focus:ring-orange-500/30',
    border: 'border-orange-200',
    lightBg: 'bg-orange-50',
    gradient: 'from-orange-600 to-orange-500',
  },
  green: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-600',
    hover: 'hover:bg-emerald-700',
    focus: 'focus:border-emerald-500 focus:ring-emerald-500/30',
    border: 'border-emerald-200',
    lightBg: 'bg-emerald-50',
    gradient: 'from-emerald-600 to-emerald-500',
  },
  amber: {
    text: 'text-amber-600',
    bg: 'bg-amber-600',
    hover: 'hover:bg-amber-700',
    focus: 'focus:border-amber-500 focus:ring-amber-500/30',
    border: 'border-amber-200',
    lightBg: 'bg-amber-50',
    gradient: 'from-amber-600 to-amber-500',
  },
  slate: {
    text: 'text-slate-700',
    bg: 'bg-slate-700',
    hover: 'hover:bg-slate-800',
    focus: 'focus:border-slate-500 focus:ring-slate-500/30',
    border: 'border-slate-200',
    lightBg: 'bg-slate-50',
    gradient: 'from-slate-700 to-slate-600',
  },
};

interface BaseInputProps {
  label: string;
  error?: string;
  helperText?: string;
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & BaseInputProps>(
  ({ label, error, helperText, className, required, ...props }, ref) => {
    const { accent } = useContext(FormContext);
    const styles = accentStyles[accent];

    return (
      <div className={className}>
        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>{label} {required && <span className="text-red-500">*</span>}</span>
        </label>
        <div className="relative">
          <input
            ref={ref}
            required={required}
            className={cn(
              "w-full px-4 py-2.5 border rounded-xl text-[14px] transition-all bg-white shadow-sm placeholder:text-slate-400 outline-none",
              error ? "border-red-400 focus:border-red-500 focus:ring-red-500/30" : `border-slate-200 ${styles.focus}`,
              props.disabled && "bg-slate-50 text-slate-500 cursor-not-allowed"
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-[12px] font-medium text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-[12px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & BaseInputProps & { options?: { value: string | number; label: string }[] }>(
  ({ label, error, helperText, className, required, options, children, ...props }, ref) => {
    const { accent } = useContext(FormContext);
    const styles = accentStyles[accent];

    return (
      <div className={className}>
        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>{label} {required && <span className="text-red-500">*</span>}</span>
        </label>
        <select
          ref={ref}
          required={required}
          className={cn(
            "w-full px-4 py-2.5 border rounded-xl text-[14px] transition-all bg-white shadow-sm outline-none appearance-none",
            error ? "border-red-400 focus:border-red-500 focus:ring-red-500/30" : `border-slate-200 ${styles.focus}`,
            props.disabled && "bg-slate-50 text-slate-500 cursor-not-allowed"
          )}
          style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
          {...props}
        >
          {options ? options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>) : children}
        </select>
        {error && <p className="mt-1.5 text-[12px] font-medium text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-[12px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & BaseInputProps>(
  ({ label, error, helperText, className, required, ...props }, ref) => {
    const { accent } = useContext(FormContext);
    const styles = accentStyles[accent];

    return (
      <div className={className}>
        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>{label} {required && <span className="text-red-500">*</span>}</span>
        </label>
        <textarea
          ref={ref}
          required={required}
          className={cn(
            "w-full px-4 py-2.5 border rounded-xl text-[14px] transition-all bg-white shadow-sm placeholder:text-slate-400 outline-none resize-y",
            error ? "border-red-400 focus:border-red-500 focus:ring-red-500/30" : `border-slate-200 ${styles.focus}`,
            props.disabled && "bg-slate-50 text-slate-500 cursor-not-allowed"
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-[12px] font-medium text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-[12px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';

export const SubmitButton = ({ children, isLoading, className, icon: Icon, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; icon?: any }) => {
  const { accent } = useContext(FormContext);
  const styles = accentStyles[accent];

  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={cn(
        "relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-[14px] text-white shadow-md transition-all overflow-hidden group",
        disabled || isLoading ? "bg-slate-400 cursor-not-allowed shadow-none" : `bg-gradient-to-r ${styles.gradient} hover:shadow-lg`,
        className
      )}
      {...props}
    >
      {/* Glossy overlay effect for industry premium touch */}
      <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500 ease-in-out" />
      
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : (Icon && <Icon size={18} />)}
      <span className="relative z-10">{children}</span>
    </button>
  );
};
