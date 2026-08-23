import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HardHat,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import InternalNotificationsBell from '@/components/InternalNotificationsBell';
import AccountUserMenu from '@/components/AccountUserMenu';
import { cn } from '@/lib/utils';

interface SousTraitantNavItem {
  to: string;
  label: string;
  description: string;
  group: string;
  icon: ReactNode;
}

const sousTraitantNavItems: SousTraitantNavItem[] = [
  {
    to: '/sous-traitant',
    label: 'Tableau de bord',
    description: "Vue d'ensemble",
    group: 'Accueil',
    icon: <LayoutDashboard size={18} />,
  },
  {
    to: '/sous-traitant/chantiers',
    label: 'Mes chantiers',
    description: 'Chantiers attribués',
    group: 'Missions',
    icon: <HardHat size={18} />,
  },
  {
    to: '/sous-traitant/taches',
    label: 'Mes tâches',
    description: 'Tâches affectées',
    group: 'Missions',
    icon: <CheckSquare size={18} />,
  },
  {
    to: '/sous-traitant/documents',
    label: 'Documents',
    description: 'Documents nécessaires',
    group: 'Ressources',
    icon: <FileText size={18} />,
  },
  {
    to: '/sous-traitant/rapports-photos',
    label: 'Rapports & photos',
    description: 'Comptes rendus et photos',
    group: 'Ressources',
    icon: <FileText size={18} />,
  },
];

const groupedNavItems = sousTraitantNavItems.reduce<Record<string, SousTraitantNavItem[]>>(
  (acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  },
  {}
);

export default function SousTraitantLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f6f9ff] text-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-72 bg-gradient-to-b from-teal-600 to-cyan-700 text-white transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <HardHat size={24} />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-lg">Sous-traitant</h1>
                <p className="text-xs text-teal-100">Espace partenaire</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {Object.entries(groupedNavItems).map(([group, items]) => (
              <div key={group}>
                <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-teal-100">
                  {group}
                </h3>
                <div className="space-y-1">
                  {items.map((item) => {
                    const isActive = location.pathname === item.to || 
                                   (item.to !== '/sous-traitant' && location.pathname.startsWith(item.to));
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            setSidebarOpen(false);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                          isActive
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'text-teal-100 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {item.icon}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-teal-100/70">{item.description}</p>
                        </div>
                        {isActive && <ChevronRight size={16} />}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-white/10">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                  {`${user?.prenom?.charAt(0) ?? ''}${user?.nom?.charAt(0) ?? ''}`.toUpperCase() || 'ST'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {user?.prenom} {user?.nom}
                  </p>
                  <p className="truncate text-xs text-teal-100">Sous-traitant</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/75 transition hover:bg-red-500/25 hover:text-red-100"
                  title="Se déconnecter"
                  aria-label="Se déconnecter"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen flex-1 lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((value) => !value)}
                className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
                aria-label="Ouvrir la navigation"
              >
                {sidebarOpen ? <X size={20} /> : <HardHat size={20} />}
              </button>
              <div className="min-w-0">
                <p className="truncate text-[11px] text-slate-400">BÂTIFLOW / Sous-traitant</p>
                <h1 className="truncate text-[17px] font-semibold text-slate-950">
                  {sousTraitantNavItems.find((item) =>
                    item.to === '/sous-traitant'
                      ? location.pathname === '/sous-traitant'
                      : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                  )?.label ?? (location.pathname === '/sous-traitant/parametres' ? 'Paramètres' : 'Sous-traitant')}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <InternalNotificationsBell />
              <AccountUserMenu
                displayName={`${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Sous-traitant'}
                initials={`${user?.prenom?.charAt(0) ?? ''}${user?.nom?.charAt(0) ?? ''}`.toUpperCase() || 'ST'}
                roleLabel="Sous-traitant"
                settingsPath="/sous-traitant/parametres"
              />
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
