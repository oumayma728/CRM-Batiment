import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  Building2,
  Calculator,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  HardHat,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  PackageCheck,
  Receipt,
  Settings,
  Sun,
  Users,
  UserPlus,
  UserCog,
  UserCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import InternalNotificationsBell from '@/components/InternalNotificationsBell';
import WorkAssistant from '@/components/WorkAssistant';
import DemoModeBanner from '@/components/DemoModeBanner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface AdminNavItem {
  to: string;
  label: string;
  description: string;
  group: string;
  icon: ReactNode;
  roles?: Role[];
}

const adminNavItems: AdminNavItem[] = [
  {
    to: '/admin',
    label: 'Tableau de bord',
    description: 'Vue generale',
    group: 'Pilotage',
    icon: <LayoutDashboard size={18} />,
  },
  {
    to: '/admin/chantiers',
    label: 'Chantiers',
    description: 'Suivi terrain',
    group: 'Pilotage',
    icon: <HardHat size={18} />,
  },
  {
    to: '/admin/taches-chantier',
    label: 'Taches chantier',
    description: 'Planning equipe',
    group: 'Pilotage',
    icon: <CheckSquare size={18} />,
    roles: ['ADMIN', 'CHEF_CHANTIER'],
  },
  {
    to: '/admin/commandes-fournisseur',
    label: 'Receptions',
    description: 'Materiaux et livraisons',
    group: 'Pilotage',
    icon: <PackageCheck size={18} />,
  },
  {
    to: '/admin/clients',
    label: 'Clients',
    description: 'Fiches clients',
    group: 'Commercial',
    icon: <Users size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/creation-client',
    label: 'Creation client',
    description: 'Compte client',
    group: 'Commercial',
    icon: <UserPlus size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/demandes-devis',
    label: 'Demandes devis',
    description: 'Prospects entrants',
    group: 'Commercial',
    icon: <FileText size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/devis',
    label: 'Devis',
    description: 'Creation & suivi',
    group: 'Commercial',
    icon: <FileSpreadsheet size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/factures',
    label: 'Factures',
    description: 'Emission & paiement',
    group: 'Commercial',
    icon: <Receipt size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/documents',
    label: 'Documents',
    description: 'Gestion documents',
    group: 'Commercial',
    icon: <FileText size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/suivi',
    label: 'Suivi administratif',
    description: 'Suivi dossiers',
    group: 'Commercial',
    icon: <ClipboardList size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/checklist',
    label: 'Checklist devis',
    description: 'Diagnostic guide',
    group: 'Commercial',
    icon: <CheckSquare size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/prestations',
    label: 'Prestations',
    description: 'Catalogue travaux',
    group: 'Referentiel',
    icon: <BookOpen size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/prestations-compositions',
    label: 'Compositions',
    description: 'Materiaux & MO',
    group: 'Referentiel',
    icon: <Layers3 size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/materiaux',
    label: 'Materiaux',
    description: 'Prix d achat',
    group: 'Referentiel',
    icon: <Package size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/services-mo',
    label: 'Services MO',
    description: 'Main d oeuvre',
    group: 'Referentiel',
    icon: <ClipboardList size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/fournisseurs',
    label: 'Fournisseurs',
    description: 'Contacts & tarifs',
    group: 'Referentiel',
    icon: <Building2 size={18} />,
    roles: ['ADMIN', 'ASSISTANTE'],
  },
  {
    to: '/admin/utilisateurs',
    label: 'Utilisateurs',
    description: 'Comptes & roles',
    group: 'Administration',
    icon: <UserCog size={18} />,
    roles: ['ADMIN'],
  },
  {
    to: '/admin/types-projet',
    label: 'Types projet',
    description: 'Categories clients',
    group: 'Administration',
    icon: <Settings size={18} />,
    roles: ['ADMIN'],
  },
  {
    to: '/admin/base-ia',
    label: 'Base IA',
    description: 'Documents RAG',
    group: 'Administration',
    icon: <Bot size={18} />,
    roles: ['ADMIN'],
  },
  {
    to: '/admin/parametres-chiffrage',
    label: 'Chiffrage',
    description: 'Regles de calcul',
    group: 'Administration',
    icon: <Calculator size={18} />,
    roles: ['ADMIN'],
  },
  {
    to: '/admin/profil',
    label: 'Profil',
    description: 'Compte et securite',
    group: 'Compte',
    icon: <UserCircle2 size={18} />,
  },
];

const canSeeItem = (role: Role | undefined, item: AdminNavItem) =>
  !item.roles || (role ? item.roles.includes(role) : false);

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNavItems = adminNavItems.filter((item) => canSeeItem(user?.role, item));
  const currentItem = visibleNavItems.find((item) =>
    item.to === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(item.to),
  );
  const initials =
    user && (`${user.prenom?.charAt(0) ?? ''}${user.nom?.charAt(0) ?? ''}` || 'A');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell flex min-h-screen transition-colors duration-300">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed z-50 flex h-full w-[292px] flex-col bg-[linear-gradient(180deg,#143b68_0%,#185fa5_46%,#2380b8_100%)] text-white shadow-2xl shadow-slate-900/20 transition-transform duration-300 dark:bg-[linear-gradient(180deg,#020617_0%,#0f2746_48%,#123f63_100%)] lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-white/15 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20">
              <Building2 size={23} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                Espace admin
              </p>
              <h1 className="truncate text-lg font-bold">BatiCRM</h1>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Fermer le menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleNavItems.map((item, index) => {
            const previousItem = visibleNavItems[index - 1];
            const showGroup = index === 0 || item.group !== previousItem?.group;

            return (
              <div key={item.to}>
                {showGroup && (
                  <p className="px-3 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100/55 first:pt-0">
                    {item.group}
                  </p>
                )}

                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'group mb-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all',
                      isActive
                        ? 'bg-white/18 text-white shadow-lg shadow-slate-900/10 ring-1 ring-white/15'
                        : 'text-white/78 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                          isActive ? 'bg-white/20 text-cyan-50' : 'bg-white/8 text-cyan-100/70',
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{item.label}</span>
                        <span
                          className={cn(
                            'block truncate text-[11px]',
                            isActive ? 'text-cyan-50/90' : 'text-cyan-100/55',
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                      {isActive && <ChevronRight size={16} className="text-cyan-100/80" />}
                    </>
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/15 px-4 py-4">
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 font-bold text-[#185FA5]">
                {initials || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="truncate text-xs text-cyan-100/70">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/75 transition-colors hover:bg-red-500/25 hover:text-red-100"
                title="Se deconnecter"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen flex-1 lg:ml-[292px]">
        <header className="app-main-header sticky top-0 z-30 backdrop-blur transition-colors duration-300 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-4 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-4 w-full lg:w-auto">
              <button
                onClick={() => setMobileOpen((value) => !value)}
                className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
                aria-label="Ouvrir le menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="min-w-0 flex-1 lg:flex-none">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#185FA5]">
                  Administration
                </p>
                <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                  {currentItem?.label ?? 'BatiCRM'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-end">
              <WorkAssistant />
              <button
                type="button"
                onClick={toggleDarkMode}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title={darkMode ? 'Mode clair' : 'Mode sombre'}
                aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
              >
                {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <InternalNotificationsBell />
              <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#185FA5] text-xs font-bold text-white">
                  {initials || 'A'}
                </div>
                <div className="hidden text-sm md:block">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{user?.prenom}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{user?.role ?? 'ADMIN'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <DemoModeBanner />

        <div className="app-content px-4 py-5 transition-colors duration-300 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
