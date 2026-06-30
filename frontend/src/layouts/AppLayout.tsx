import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  User,
  ClipboardList,
  FileSignature,
  FileCheck,
  MessageSquare,
  ShoppingCart,
  ListTree,
  Package,
  Hammer,
  Truck,
  HardHat,
  CheckSquare,
  ShieldCheck,
  Tags,
  Settings2,
  Menu,
  X,
  Search,
  LogOut,
  BrainCircuit,
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
  { to: '/admin/clients', label: 'Clients', icon: <User size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE'], section: 'Clients & Devis' },
  { to: '/admin/demandes-devis', label: 'Demandes', icon: <ClipboardList size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE'] },
  { to: '/admin/devis', label: 'Devis', icon: <FileSignature size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE'] },
  { to: '/admin/factures', label: 'Mes factures', icon: <FileCheck size={19} />, roles: ['ADMIN', 'ASSISTANTE'] },
  { to: '/admin/messagerie-whatsapp', label: 'WhatsApp', icon: <MessageSquare size={19} />, roles: ['ADMIN', 'ASSISTANTE'] },
  { to: '/admin/commandes-fournisseur', label: 'Commandes', icon: <ShoppingCart size={19} />, roles: ['ADMIN', 'ASSISTANTE', 'CHEF_CHANTIER'], section: 'Clients & Devis' },
  // Module 2: Bibliothèque de prix
  { to: '/admin/prestations', label: 'Prestations', icon: <ListTree size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'], section: 'Bibliothèque Prix' },
  { to: '/admin/prestations-compositions', label: 'Compositions', icon: <FileSignature size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'] },
  { to: '/admin/materiaux', label: 'Matériaux', icon: <Package size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'] },
  { to: '/admin/services-mo', label: 'Main d\'œuvre', icon: <Hammer size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'] },
  // Module 3: Fournisseurs
  { to: '/admin/fournisseurs', label: 'Fournisseurs', icon: <Truck size={19} />, roles: ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER'], section: 'Fournisseurs' },
  { to: '/admin/chantiers', label: 'Chantiers', icon: <HardHat size={19} />, roles: ['ADMIN', 'ASSISTANTE', 'CHEF_CHANTIER'], section: 'Chantiers' },
  { to: '/admin/taches-chantier', label: 'Tâches chantier', icon: <CheckSquare size={19} />, roles: ['ADMIN', 'CHEF_CHANTIER'], section: 'Chantiers' },
  // Administration
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: <ShieldCheck size={19} />, roles: ['ADMIN'], section: 'Administration' },
  { to: '/admin/types-projet', label: 'Types de projet', icon: <Tags size={19} />, roles: ['ADMIN'] },
  { to: '/admin/base-ia', label: 'Connaissances & IA', icon: <BrainCircuit size={19} />, roles: ['ADMIN'] },
  { to: '/admin/parametres-chiffrage', label: 'Paramètres', icon: <Settings2 size={19} />, roles: ['ADMIN'] },
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
  const [profileOpen, setProfileOpen] = useState(false);

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
        'w-[232px] bg-slate-800 border-r border-slate-700 text-slate-300 flex flex-col fixed h-full z-50 transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Brand */}
        <div className="px-5 py-6 border-b border-slate-700">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <HardHat className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-slate-100 font-extrabold text-xl leading-tight tracking-tight">BÂTIFLOW</h2>
              <p className="text-[12px] text-slate-400 font-medium">Gestion Bâtiment Pro</p>
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
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/[0.05] hover:text-white',
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
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Search bar */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2 w-72 group focus-within:ring-2 focus-within:ring-slate-900/20 focus-within:border-slate-900 border border-slate-200 transition-all">
              <Search size={16} className="text-slate-400 group-focus-within:text-slate-600" />
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
              <Settings2 size={18} />
            </button>

            <div className="w-px h-7 bg-gray-200 mx-1" />

            {/* User info dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 rounded-lg transition-colors text-left"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {initials}
                </div>
                <div className="hidden md:block">
                  <p className="text-[13px] font-semibold text-slate-800 leading-none">{user?.prenom} {user?.nom}</p>
                  <span className={cn('text-[10px] font-bold uppercase mt-0.5 inline-block px-1.5 py-0.5 rounded', roleHeaderStyles[user?.role ?? 'ADMIN'])}>
                    {roleInfo.label}
                  </span>
                </div>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </>
              )}
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

