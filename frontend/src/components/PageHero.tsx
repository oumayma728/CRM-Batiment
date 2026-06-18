import type { ReactNode } from 'react';

interface PageHeroProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Optional accent color variant */
  accent?: 'indigo' | 'emerald' | 'orange' | 'amber' | 'slate' | 'teal' | 'blue';
}

const accentMap = {
  indigo: {
    bg: 'from-indigo-50 via-white to-slate-50',
    ring: 'ring-indigo-100',
    iconBg: 'bg-indigo-600',
    text: 'text-indigo-600',
  },
  emerald: {
    bg: 'from-emerald-50 via-white to-slate-50',
    ring: 'ring-emerald-100',
    iconBg: 'bg-emerald-600',
    text: 'text-emerald-600',
  },
  orange: {
    bg: 'from-orange-50 via-white to-slate-50',
    ring: 'ring-orange-100',
    iconBg: 'bg-orange-500',
    text: 'text-orange-500',
  },
  amber: {
    bg: 'from-amber-50 via-white to-slate-50',
    ring: 'ring-amber-100',
    iconBg: 'bg-amber-500',
    text: 'text-amber-500',
  },
  teal: {
    bg: 'from-teal-50 via-white to-slate-50',
    ring: 'ring-teal-100',
    iconBg: 'bg-teal-600',
    text: 'text-teal-600',
  },
  slate: {
    bg: 'from-slate-50 via-white to-slate-50',
    ring: 'ring-slate-200',
    iconBg: 'bg-slate-700',
    text: 'text-slate-700',
  },
  blue: {
    bg: 'from-blue-50 via-white to-slate-50',
    ring: 'ring-blue-100',
    iconBg: 'bg-blue-600',
    text: 'text-blue-600',
  },
};

export default function PageHero({ icon, title, subtitle, actions, accent = 'indigo' }: PageHeroProps) {
  const a = accentMap[accent];
  return (
    <div className={`bg-gradient-to-r ${a.bg} rounded-2xl px-6 py-5 ring-1 ${a.ring} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 ${a.iconBg} rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
