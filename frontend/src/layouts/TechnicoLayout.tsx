import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import InternalNotificationsBell from '@/components/InternalNotificationsBell';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PackageCheck,
  PackageSearch,
  Receipt,
  Search,
  Settings,
  Signature,
  Users,
  X,
} from 'lucide-react';

interface TechNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  section?: string;
}

const techNavItems: TechNavItem[] = [
  {
    to: '/technico',
    label: 'Tableau de bord',
    icon: <LayoutDashboard size={17} />,
  },
  {
    to: '/technico/clients',
    label: 'Clients',
    icon: <Users size={17} />,
    section: 'Gestion commerciale',
  },
  {
    to: '/technico/demandes',
    label: 'Demandes',
    icon: <FileText size={17} />,
  },
  {
    to: '/technico/devis',
    label: 'Devis',
    icon: <FileSpreadsheet size={17} />,
  },
  {
    to: '/technico/factures',
    label: 'Factures',
    icon: <Receipt size={17} />,
  },
  {
    to: '/technico/commandes-fournisseur',
    label: 'Commandes fournisseur',
    icon: <PackageCheck size={17} />,
  },
  {
    to: '/technico/sav',
    label: 'SAV',
    icon: <LifeBuoy size={17} />,
  },
  {
    to: '/technico/demo-requests',
    label: 'Demandes de démo',
    icon: <CalendarDays size={17} />,
  },
  {
    to: '/technico/checklist',
    label: 'Checklist devis',
    icon: <CheckSquare size={17} />,
  },
  {
    to: '/technico/assistant-ia',
    label: 'Assistant IA',
    icon: <Bot size={17} />,
  },
  {
    to: '/technico/prestations',
    label: 'Prestations',
    icon: <BookOpen size={17} />,
    section: 'Catalogue & référentiel',
  },
  {
    to: '/technico/materiaux',
    label: 'Matériaux',
    icon: <PackageSearch size={17} />,
  },
  {
    to: '/technico/catalogue',
    label: 'Catalogue expert',
    icon: <Search size={17} />,
  },
  {
    to: '/technico/profil',
    label: 'Mon profil',
    icon: <Signature size={17} />,
    section: 'Compte',
  },
];

const routeLabels: Record<string, string> = {
  technico: 'Technico',
  clients: 'Clients',
  demandes: 'Demandes',
  devis: 'Devis',
  factures: 'Factures',
  'commandes-fournisseur': 'Commandes fournisseur',
  sav: 'SAV',
  'demo-requests': 'Demandes de démo',
  checklist: 'Checklist devis',
  'assistant-ia': 'Assistant IA',
  prestations: 'Prestations',
  materiaux: 'Matériaux',
  catalogue: 'Catalogue expert',
  profil: 'Mon profil',
  signature: 'Signature',
};

export default function TechnicoLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const currentPage =
    [...techNavItems]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) ??
    techNavItems[0];

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);

    if (!parts.length) {
      return [{ label: 'Bâtiflow', to: '/technico' }];
    }

    return parts.map((part, index) => ({
      label: routeLabels[part] ?? formatPathLabel(part),
      to: `/${parts.slice(0, index + 1).join('/')}`,
    }));
  }, [location.pathname]);

  const initials = user
    ? `${user.prenom?.charAt(0) ?? ''}${user.nom?.charAt(0) ?? ''}`.toUpperCase()
    : 'TC';

  const displayName = user ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() : 'Technico';

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
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
              <p className="mt-0.5 text-[11px] text-slate-500">Espace technico</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {techNavItems.map((item, index) => {
            const previousSection = techNavItems
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
                  end={item.to === '/technico'}
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
                {initials || 'TC'}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-950">
                  {displayName || 'Technico'}
                </p>
                <p className="truncate text-[11px] text-slate-500">Technico-commercial</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              title="Déconnexion"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-[244px]">
        <header className="fixed left-0 right-0 top-0 z-[90] border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl lg:left-[244px] lg:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1 text-[12px] text-slate-400">
                  <Link to="/technico" className="transition hover:text-blue-600">
                    Bâtiflow
                  </Link>

                  {breadcrumbs
                    .filter((crumb) => crumb.label !== 'Technico')
                    .map((crumb) => (
                      <span key={crumb.to} className="flex items-center gap-1">
                        <span>/</span>
                        <Link to={crumb.to} className="transition hover:text-blue-600">
                          {crumb.label}
                        </Link>
                      </span>
                    ))}
                </div>

                <h1 className="mt-0.5 truncate text-[18px] font-semibold text-slate-950">
                  {currentPage?.label ?? 'Tableau de bord'}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <InternalNotificationsBell />

              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm transition hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white">
                    {initials || 'TC'}
                  </div>

                  <div className="hidden text-left md:block">
                    <p className="text-[13px] font-semibold leading-none text-slate-800">
                      {displayName || 'Technico'}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      Technico-commercial
                    </p>
                  </div>

                  <ChevronDown
                    size={15}
                    className={cn(
                      'hidden text-slate-400 transition md:block',
                      userMenuOpen && 'rotate-180',
                    )}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.16)]">
                    <div className="border-b border-slate-100 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-sm font-semibold text-white">
                          {initials || 'TC'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {displayName || 'Technico'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/technico/profil');
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <Settings size={17} />
                        Mon profil
                      </button>

                      <div className="my-2 h-px bg-slate-100" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut size={17} />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="min-w-0 overflow-x-hidden p-4 pt-[92px] lg:p-6 lg:pt-[96px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function formatPathLabel(value: string) {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
