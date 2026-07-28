import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Camera,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  section?: string;
}

const navItems: NavItem[] = [
  {
    to: '/sous-traitant',
    label: 'Tableau de bord',
    icon: <LayoutDashboard size={17} />,
  },
  {
    to: '/sous-traitant/chantiers',
    label: 'Mes chantiers',
    icon: <Building2 size={17} />,
    section: 'Suivi opérationnel',
  },
  {
    to: '/sous-traitant/taches',
    label: 'Mes tâches',
    icon: <ListChecks size={17} />,
  },
  {
    to: '/sous-traitant/documents',
    label: 'Documents',
    icon: <FolderOpen size={17} />,
  },
  {
    to: '/sous-traitant/rapports-photos',
    label: 'Rapports & photos',
    icon: <Camera size={17} />,
  },
];

const routeLabels: Record<string, string> = {
  'sous-traitant': 'Sous-traitant',
  chantiers: 'Mes chantiers',
  taches: 'Mes tâches',
  documents: 'Documents',
  'rapports-photos': 'Rapports & photos',
};

export default function SousTraitantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user
    ? `${user.prenom?.charAt(0) ?? ''}${user.nom?.charAt(0) ?? ''}`.toUpperCase()
    : 'ST';
  const displayName = user
    ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim()
    : 'Sous-traitant';

  const currentPage =
    [...navItems]
      .sort((a, b) => b.to.length - a.to.length)
      .find(
        (item) =>
          location.pathname === item.to ||
          location.pathname.startsWith(`${item.to}/`),
      ) ?? navItems[0];

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts.map((part, index) => ({
      label: routeLabels[part] ?? part,
      to: `/${parts.slice(0, index + 1).join('/')}`,
    }));
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#f6f9ff] text-slate-900">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col border-r border-slate-200 bg-white text-slate-600 shadow-[8px_0_30px_rgba(15,23,42,0.04)] transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold leading-tight tracking-tight text-slate-950">
                BÂTIFLOW
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Espace sous-traitant</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="ml-auto rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Fermer la navigation"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item, index) => {
            const previousSection = navItems
              .slice(0, index)
              .reverse()
              .find((previous) => previous.section)?.section;
            const showSection = item.section && item.section !== previousSection;

            return (
              <div key={item.to}>
                {showSection && (
                  <div className="px-3 pb-2 pt-5">
                    <p className="text-[11px] font-medium text-slate-500">{item.section}</p>
                  </div>
                )}
                <NavLink
                  to={item.to}
                  end={item.to === '/sous-traitant'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                    )
                  }
                >
                  <span className="transition group-hover:scale-105">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white">
                {initials || 'ST'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-950">
                  {displayName || 'Sous-traitant'}
                </p>
                <p className="truncate text-[11px] text-slate-500">Sous-traitant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-[244px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
                aria-label="Ouvrir la navigation"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="min-w-0">
                <p className="truncate text-[11px] text-slate-400">
                  {breadcrumbs.map((crumb) => crumb.label).join(' / ')}
                </p>
                <h1 className="truncate text-[17px] font-semibold text-slate-950">
                  {currentPage.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={17} />
              </button>
              <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white">
                  {initials || 'ST'}
                </div>
                <div className="min-w-0">
                  <p className="max-w-[150px] truncate text-[13px] font-semibold text-slate-950">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500">Sous-traitant</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 lg:px-7 lg:py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
