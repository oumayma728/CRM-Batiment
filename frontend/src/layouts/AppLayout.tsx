import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSpreadsheet,
  List,
  Box,
  Wrench,
  Truck,
  Shield,
  LogOut,
  Search,
  Building2,
  Settings,
  Menu,
  X,
  FolderKanban,
  PackageCheck,
  HardHat,
  CheckSquare,
  Receipt,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';
import { useState } from 'react';
import InternalNotificationsBell from '@/components/InternalNotificationsBell';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  badge?: string;
  section?: string;
}

const navItems: NavItem[] = [
  { to: '/admin', label: 'Tableau de bord', icon: <LayoutDashboard size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER', 'SOUS_TRAITANT'] },
  // Module 1: Clients & Devis
  { to: '/admin/clients', label: 'Clients', icon: <Users size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE'], section: 'Clients & Devis' },
  { to: '/admin/demandes-devis', label: 'Demandes', icon: <FileText size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE'] },
  { to: '/admin/devis', label: 'Devis', icon: <FileSpreadsheet size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE'] },
  { to: '/admin/factures', label: 'Mes factures', icon: <Receipt size={19} />, roles: ['ADMIN', 'ASSISTANTE'] },
  { to: '/admin/commandes-fournisseur', label: 'Commandes fournisseur', icon: <PackageCheck size={19} />, roles: ['ADMIN', 'ASSISTANTE', 'CHEF_CHANTIER'], section: 'Clients & Devis' },
  // Module 2: Bibliothèque de prix
  { to: '/admin/prestations', label: 'Prestations', icon: <List size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'], section: 'Bibliothèque Prix' },
  { to: '/admin/prestations-compositions', label: 'Prestations et leurs compositions', icon: <FileSpreadsheet size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'] },
  { to: '/admin/materiaux', label: 'Matériaux', icon: <Box size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'] },
  { to: '/admin/services-mo', label: 'Main d\'œuvre', icon: <Wrench size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'] },
  // Module 3: Fournisseurs
  { to: '/admin/fournisseurs', label: 'Fournisseurs', icon: <Truck size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'], section: 'Fournisseurs' },
  { to: '/admin/chantiers', label: 'Chantiers', icon: <HardHat size={19} />, roles: ['ADMIN', 'ASSISTANTE', 'CHEF_CHANTIER'], section: 'Chantiers' },
  { to: '/admin/taches-chantier', label: 'Taches chantier', icon: <CheckSquare size={19} />, roles: ['ADMIN', 'CHEF_CHANTIER'], section: 'Chantiers' },
  // Administration
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: <Shield size={19} />, roles: ['ADMIN'], section: 'Administration' },
  { to: '/admin/types-projet', label: 'Types de projet', icon: <FolderKanban size={19} />, roles: ['ADMIN'] },
  { to: '/admin/base-ia', label: 'Base IA / RAG', icon: <Database size={19} />, roles: ['ADMIN'] },
  { to: '/admin/parametres-chiffrage', label: 'Paramètres chiffrage', icon: <Settings size={19} />, roles: ['ADMIN'] },
];

const roleBadgeStyles: Record<Role, { bg: string; text: string; label: string }> = {
  ADMIN: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Administrateur' },
  TECHNICO: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Technico-Commercial' },
  ASSISTANTE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Assistante' },
  CHEF_CHANTIER: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Chef de chantier' },
  SOUS_TRAITANT: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Sous-traitant' },
};

const roleHeaderStyles: Record<Role, string> = {
  ADMIN: 'bg-red-50 text-red-700 border-red-200',
  TECHNICO: 'bg-blue-50 text-blue-700 border-blue-200',
  ASSISTANTE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CHEF_CHANTIER: 'bg-orange-50 text-orange-700 border-orange-200',
  SOUS_TRAITANT: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));
  const initials = user ? (user.prenom?.charAt(0) ?? '') + (user.nom?.charAt(0) ?? '') : 'U';
  const roleInfo = roleBadgeStyles[user?.role ?? 'ADMIN'];

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-surface-alt">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={cn(
        'w-[232px] sidebar-gradient text-gray-400 flex flex-col fixed h-full z-50 transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 batiflow-gradient rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-[17px] leading-tight tracking-tight">BÂTIFLOW</h2>
              <p className="text-[11px] text-gray-500 font-medium">Gestion Bâtiment Pro</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {visibleItems.map((item, index) => {
            const prevItems = visibleItems.slice(0, index);
            const prevSection = [...prevItems].reverse().find((i) => i.section)?.section;
            const showSection = item.section && item.section !== prevSection;

            return (
              <div key={item.to}>
                {showSection && (
                  <div className="flex items-center gap-2 px-3 pt-5 pb-2">
                    <p className="text-[10px] font-bold text-gray-500/80 uppercase tracking-[0.12em]">
                      {item.section}
                    </p>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                )}
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-[13.5px] font-medium',
                      isActive
                        ? 'bg-primary-600/20 text-white shadow-sm'
                        : 'hover:bg-white/[0.05] hover:text-gray-200',
                    )
                  }
                >
                  <span className="opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>

      </aside>

      {/* MAIN */}
      <main className="min-w-0 flex-1 overflow-x-hidden lg:ml-[232px]">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Search bar */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-100/80 rounded-xl px-4 py-2 w-72 group focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:bg-white focus-within:border-gray-200 transition-all">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
              />
              <kbd className="hidden md:inline text-[10px] text-gray-400 bg-gray-200/80 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <InternalNotificationsBell />

            {/* Settings */}
            <button className="w-9 h-9 rounded-xl bg-gray-100/80 flex items-center justify-center text-gray-500 hover:bg-gray-200/80 hover:text-gray-700 transition-colors">
              <Settings size={18} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-50 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              title="Se deconnecter"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Deconnexion</span>
            </button>

            <div className="w-px h-7 bg-gray-200" />

            {/* User info */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 batiflow-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {initials}
              </div>
              <div className="hidden md:block">
                <p className="text-[13px] font-semibold text-gray-800 leading-none">{user?.prenom} {user?.nom}</p>
                <span className={cn('text-[10px] font-bold uppercase mt-0.5 inline-block px-1.5 py-0.5 rounded', roleHeaderStyles[user?.role ?? 'ADMIN'])}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="min-w-0 overflow-x-hidden p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

