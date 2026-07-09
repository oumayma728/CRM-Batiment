import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  FileSpreadsheet,
  Receipt,
  Users,
  UserPlus,
  ClipboardList,
  BookOpen,
  Building2,
  LogOut,
  Moon,
  Sun,
  X,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { cn } from '@/lib/utils';

interface AssistanteNavItem {
  to: string;
  label: string;
  description: string;
  group: string;
  icon: ReactNode;
}

const assistanteNavItems: AssistanteNavItem[] = [
  {
    to: '/assistante',
    label: 'Tableau de bord',
    description: 'Vue d\'ensemble',
    group: 'Accueil',
    icon: <LayoutDashboard size={18} />,
  },
  {
    to: '/assistante/clients',
    label: 'Clients',
    description: 'Fiches clients',
    group: 'Commercial',
    icon: <Users size={18} />,
  },
  {
    to: '/assistante/creation-client',
    label: 'Création client',
    description: 'Nouveau compte',
    group: 'Commercial',
    icon: <UserPlus size={18} />,
  },
  {
    to: '/assistante/demandes-devis',
    label: 'Demandes de devis',
    description: 'Prospects entrants',
    group: 'Commercial',
    icon: <FileText size={18} />,
  },
  {
    to: '/assistante/devis',
    label: 'Devis',
    description: 'Suivi administratif',
    group: 'Commercial',
    icon: <FileSpreadsheet size={18} />,
  },
  {
    to: '/assistante/factures',
    label: 'Factures',
    description: 'Consultation',
    group: 'Commercial',
    icon: <Receipt size={18} />,
  },
  {
    to: '/assistante/fournisseurs',
    label: 'Fournisseurs',
    description: 'Gestion fournisseurs',
    group: 'Commercial',
    icon: <Building2 size={18} />,
  },
  {
    to: '/assistante/documents',
    label: 'Documents',
    description: 'Préparation & gestion',
    group: 'Documents',
    icon: <BookOpen size={18} />,
  },
  {
    to: '/assistante/suivi',
    label: 'Suivi administratif',
    description: 'Suivi des dossiers',
    group: 'Documents',
    icon: <ClipboardList size={18} />,
  },
];

const groupedNavItems = assistanteNavItems.reduce<Record<string, AssistanteNavItem[]>>(
  (acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  },
  {}
);

export default function AssistanteLayout() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-gray-900', darkMode && 'dark')}>
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
          'fixed left-0 top-0 z-50 h-screen w-72 bg-gradient-to-b from-blue-600 to-purple-700 dark:from-blue-900 dark:to-purple-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <h1 className="font-bold text-base sm:text-lg">Assistante</h1>
                <p className="text-xs text-blue-100">Espace administratif</p>
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
                <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-blue-100">
                  {group}
                </h3>
                <div className="space-y-1">
                  {items.map((item) => {
                    const isActive = location.pathname === item.to || 
                                   (item.to !== '/assistante' && location.pathname.startsWith(item.to));
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
                            : 'text-blue-100 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {item.icon}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-blue-100/70">{item.description}</p>
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
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Users size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-blue-100">Assistante Administrative</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                <span className="text-sm">{darkMode ? 'Clair' : 'Sombre'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen">
        {/* Page content */}
        <main className="p-4 lg:p-6 lg:ml-72">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
