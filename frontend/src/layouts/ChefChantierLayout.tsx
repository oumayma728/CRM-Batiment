import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckSquare,
  ClipboardCheck,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Radio,
  Sun,
  UserCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import InternalNotificationsBell from '@/components/InternalNotificationsBell';
import WorkAssistant from '@/components/WorkAssistant';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn } from '@/lib/utils';

const navItems = [
  {
    to: '/admin',
    label: 'Tableau de bord',
    description: 'Priorites du jour',
    icon: <LayoutDashboard size={18} />,
  },
  {
    to: '/admin/chantiers',
    label: 'Chantiers',
    description: 'Sites et statuts',
    icon: <HardHat size={18} />,
  },
  {
    to: '/admin/taches-chantier',
    label: 'Taches chantier',
    description: 'Planning equipe',
    icon: <CheckSquare size={18} />,
  },
  {
    to: '/admin/commandes-fournisseur',
    label: 'Receptions',
    description: 'Materiaux et livraisons',
    icon: <ClipboardCheck size={18} />,
  },
  {
    to: '/admin/profil',
    label: 'Profil',
    description: 'Compte et securite',
    icon: <UserCircle2 size={18} />,
  },
];

export default function ChefChantierLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user
    ? `${user.prenom?.charAt(0) ?? ''}${user.nom?.charAt(0) ?? ''}` || 'C'
    : 'C';

  const currentItem = navItems.find((item) =>
    item.to === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(item.to),
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell flex min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed z-50 flex h-full w-[296px] flex-col overflow-hidden text-slate-100 transition-transform duration-300 lg:translate-x-0',
          'bg-[linear-gradient(180deg,#0f3b74_0%,#1557a6_54%,#1d74d8_100%)] shadow-2xl shadow-blue-950/25',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_20%_0%,rgba(96,165,250,0.42),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(16,185,129,0.18),transparent_28%)]" />

        <div className="relative border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-700 shadow-lg shadow-blue-950/20">
              <HardHat size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                Espace terrain
              </p>
              <h1 className="text-lg font-bold text-white">Chef de chantier</h1>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto rounded-lg p-1 text-slate-200/80 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
              <Radio size={14} />
              Poste operationnel
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-200">
              Suivi chantiers, taches terrain et receptions fournisseurs.
            </p>
          </div>
        </div>

        <nav className="relative flex-1 space-y-1.5 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white text-slate-950 shadow-lg shadow-slate-950/15'
                    : 'text-slate-200/82 hover:bg-white/10 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-sky-100 group-hover:bg-white/15',
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                    <span
                      className={cn(
                        'mt-0.5 block truncate text-xs font-normal',
                        isActive ? 'text-slate-500' : 'text-slate-300/70',
                      )}
                    >
                      {item.description}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative border-t border-white/10 px-4 py-4">
          <div className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 font-bold text-blue-800">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="truncate text-xs text-amber-100/80">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-red-500/25"
                title="Se deconnecter"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-[296px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/86 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/86">
          <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen((value) => !value)}
                className="rounded-lg p-2 text-slate-600 hover:bg-amber-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Espace terrain
                </p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {currentItem?.label ?? 'Espace chef de chantier'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <WorkAssistant />
              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title={darkMode ? 'Mode clair' : 'Mode sombre'}
                aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
              >
                {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <div className="relative">
                <Bell size={14} className="pointer-events-none absolute -right-1 -top-1 z-10 rounded-full bg-amber-400 p-0.5 text-slate-950" />
                <InternalNotificationsBell />
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-5 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
