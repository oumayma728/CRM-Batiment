import { Check, ChevronDown, ChevronUp, Clipboard, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  SESSION_KEY,
  demoCredentials,
  getDemoUser,
  isDemoSession,
} from '@/lib/demoMode';

const COLLAPSED_KEY = 'baticrm_demo_banner_collapsed';

export default function DemoModeBanner() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
  const [copied, setCopied] = useState(false);
  const user = getDemoUser();
  const credentials = useMemo(
    () => demoCredentials.find((item) => item.role === user.role) ?? demoCredentials[0],
    [user.role],
  );

  if (!isDemoSession()) {
    return null;
  }

  const toggleCollapsed = () => {
    const nextValue = !collapsed;
    setCollapsed(nextValue);
    localStorage.setItem(COLLAPSED_KEY, String(nextValue));
  };

  const copyCredentials = async () => {
    if (!credentials) return;

    await navigator.clipboard.writeText(
      `Email: ${credentials.email}\nMot de passe: ${credentials.password}`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const leaveDemo = () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('auth-change'));
    window.location.href = '/login';
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-sm text-amber-950 shadow-sm transition-colors dark:border-amber-400/20 dark:bg-slate-950/95 dark:text-amber-100">
      <div className="flex flex-col gap-2 px-4 py-2 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
              <ShieldCheck size={17} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong>Mode demo securise</strong>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                  {credentials?.label ?? user.role}
                </span>
              </div>
              {!collapsed && (
                <p className="text-xs text-amber-800 dark:text-amber-200/80">
                  Donnees fictives, lecture seule, aucune modification n'est envoyee au backend.
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={copyCredentials}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-slate-900 dark:text-amber-100 dark:hover:bg-slate-800"
              title="Copier les identifiants demo"
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copie' : 'Copier'}</span>
            </button>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-slate-900 dark:text-amber-100 dark:hover:bg-slate-800"
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
              aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-slate-900 dark:text-amber-100 dark:hover:bg-slate-800"
              title={collapsed ? 'Afficher les details' : 'Reduire'}
              aria-label={collapsed ? 'Afficher les details du mode demo' : 'Reduire la banniere demo'}
            >
              {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-10">
            <span className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 dark:border-amber-400/20 dark:bg-slate-900 dark:text-amber-100">
              {credentials?.email}
            </span>
            <span className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 dark:border-amber-400/20 dark:bg-slate-900 dark:text-amber-100">
              Mot de passe: {credentials?.password}
            </span>
            <button
              type="button"
              onClick={leaveDemo}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-amber-900 px-2.5 text-xs font-semibold text-white transition hover:bg-amber-800 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200"
            >
              <LogOut size={14} />
              Quitter demo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
