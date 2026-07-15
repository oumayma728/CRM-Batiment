import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Truck,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Receipt,
  Calendar,
  MapPin,
  TrendingUp,
  Clock,
  Download,
  Eye,
  Search,
  Package,
  CheckSquare,
  X,
  Building2
} from 'lucide-react';
import api from '@/lib/api';
import { authManager } from '@/lib/auth';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

type SousTraitantInfo = {
  id: number;
  raisonSociale: string;
  nom: string;
  email: string;
  telephone?: string | null;
  adresse?: string | null;
  siret?: string | null;
};

type CommandeFournisseur = {
  id: number;
  reference: string;
  dateCommande: string;
  dateLivraisonPrev?: string | null;
  statut: string;
  totalHT: number;
  totalTTC: number;
  chantier?: {
    reference: string;
    adresse: string;
  } | null;
  lignes: Array<{
    id: number;
    description: string;
    quantite: number;
    unite: string;
    prixUnitaire: number;
    totalHT: number;
  }>;
  notes?: string | null;
};

type SousTraitantPortalResponse = {
  sousTraitant: SousTraitantInfo;
  commandes: CommandeFournisseur[];
  stats: {
    commandes: number;
    enAttente: number;
    acceptees: number;
    terminees: number;
    chiffreAffaires: number;
  };
};

const statusStyle: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700 ring-amber-100',
  ACCEPTEE: 'bg-blue-50 text-blue-700 ring-blue-100',
  EN_COURS: 'bg-violet-50 text-violet-700 ring-violet-100',
  LIVREE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  ANNULEE: 'bg-red-50 text-red-700 ring-red-100',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value));
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value ?? 0));
}

function badgeClass(status: string) {
  return statusStyle[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function StatCard({ icon, label, value, color = 'amber' }: { icon: React.ReactNode; label: string; value: number | string; color?: string }) {
  const colorClasses = {
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-2xl p-4 sm:p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium opacity-90">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{value}</p>
        </div>
        <div className="p-2 sm:p-3 bg-white/20 rounded-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 text-slate-400">{icon}</div>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasContent = childArray.some(child => child !== null && child !== undefined);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">
        {!hasContent ? (
          <EmptyState
            icon={Package}
            title={empty}
            description="Aucune commande disponible pour le moment."
          />
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClass(status)}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function SousTraitantPortalDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'commandes' | 'documents'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const portalQuery = useQuery({
    queryKey: ['sous-traitant-portal'],
    queryFn: async () => {
      const response = await api.get<SousTraitantPortalResponse>('/sous-traitants/me/portal');
      return response.data;
    },
  });

  const acceptCommandeMutation = useMutation({
    mutationFn: async (commandeId: number) => {
      const response = await api.post(`/sous-traitants/me/commandes/${commandeId}/accepter`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sous-traitant-portal'] });
    },
  });

  const portal = portalQuery.data;
  const companyName = useMemo(() => {
    const st = portal?.sousTraitant;
    return st?.raisonSociale || st?.nom || 'Sous-traitant';
  }, [portal?.sousTraitant]);

  const handleLogout = () => {
    authManager.logout();
    navigate('/sous-traitant/login');
  };

  const handleAcceptCommande = (commandeId: number) => {
    if (confirm('Êtes-vous sûr de vouloir accepter cette commande ?')) {
      acceptCommandeMutation.mutate(commandeId);
    }
  };

  if (portalQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSkeleton type="card" count={4} />
        </div>
      </div>
    );
  }

  if (portalQuery.error || !portal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <AlertCircle className="mb-3" size={24} />
            {getErrorMessage(
              portalQuery.error,
              "Impossible de charger votre espace sous-traitant.",
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredCommandes = portal.commandes.filter(c =>
    c.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.statut.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.chantier?.adresse || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 text-white">
                <Truck size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
                  Espace Sous-Traitant
                </p>
                <h1 className="text-xl font-bold text-slate-900">
                  {companyName}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'overview' as const, label: 'Vue d\'ensemble', icon: TrendingUp },
            { id: 'commandes' as const, label: 'Commandes', icon: Package },
            { id: 'documents' as const, label: 'Documents', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard icon={<Package size={20} className="text-white" />} label="Commandes" value={portal.stats.commandes} color="amber" />
              <StatCard icon={<Clock size={20} className="text-white" />} label="En attente" value={portal.stats.enAttente} color="blue" />
              <StatCard icon={<CheckSquare size={20} className="text-white" />} label="Acceptées" value={portal.stats.acceptees} color="green" />
              <StatCard icon={<TrendingUp size={20} className="text-white" />} label="CA Total" value={formatMoney(portal.stats.chiffreAffaires)} color="purple" />
            </section>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Company Info */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 font-bold text-slate-900">Informations entreprise</h2>
                  <div className="space-y-3 text-sm text-slate-700">
                    <InfoLine icon={<Building2 size={16} />} value={portal.sousTraitant.raisonSociale || portal.sousTraitant.nom} />
                    <InfoLine icon={<Mail size={16} />} value={portal.sousTraitant.email} />
                    <InfoLine icon={<Phone size={16} />} value={portal.sousTraitant.telephone || '-'} />
                    <InfoLine icon={<MapPin size={16} />} value={portal.sousTraitant.adresse || '-'} />
                    {portal.sousTraitant.siret && (
                      <InfoLine icon={<FileText size={16} />} value={`SIRET: ${portal.sousTraitant.siret}`} />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <Panel title="Commandes récentes" empty="Aucune commande récente.">
                  {portal.commandes.slice(0, 3).map((commande) => (
                    <div key={commande.id} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {commande.reference}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {commande.chantier?.adresse || 'Adresse non spécifiée'}
                          </p>
                        </div>
                        <StatusBadge status={commande.statut} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          {formatDate(commande.dateCommande)}
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {formatMoney(commande.totalTTC)}
                        </p>
                      </div>
                      {commande.statut === 'EN_ATTENTE' && (
                        <button
                          onClick={() => handleAcceptCommande(commande.id)}
                          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-amber-700 hover:to-orange-700 transition"
                        >
                          <CheckSquare size={14} />
                          Accepter la commande
                        </button>
                      )}
                    </div>
                  ))}
                  {portal.commandes.length > 3 && (
                    <button
                      onClick={() => setActiveTab('commandes')}
                      className="w-full text-center text-sm font-medium text-amber-600 hover:text-amber-700"
                    >
                      Voir toutes les commandes →
                    </button>
                  )}
                </Panel>
              </div>
            </div>
          </div>
        )}

        {/* Commandes Tab */}
        {activeTab === 'commandes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Mes commandes</h2>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher une commande..."
                onClear={() => setSearchQuery('')}
              />
            </div>
            <Panel title="" empty="Aucune commande trouvée.">
              {filteredCommandes.map((commande) => (
                <div key={commande.id} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {commande.reference}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {commande.chantier?.adresse || 'Adresse non spécifiée'}
                      </p>
                      {commande.dateLivraisonPrev && (
                        <p className="mt-1 text-xs text-slate-500">
                          Livraison prévue : {formatDate(commande.dateLivraisonPrev)}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={commande.statut} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Date commande</p>
                      <p className="font-semibold text-slate-800">{formatDate(commande.dateCommande)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Lignes</p>
                      <p className="font-semibold text-slate-800">{commande.lignes.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Total TTC</p>
                      <p className="font-bold text-slate-900">{formatMoney(commande.totalTTC)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                      <Eye size={14} />
                      Détails
                    </button>
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                      <Download size={14} />
                      PDF
                    </button>
                    {commande.statut === 'EN_ATTENTE' && (
                      <button
                        onClick={() => handleAcceptCommande(commande.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-amber-700 hover:to-orange-700 transition"
                      >
                        <CheckSquare size={14} />
                        Accepter
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Mes documents</h2>
            <EmptyState
              icon={FileText}
              title="Gestion des documents"
              description="Cette fonctionnalité sera bientôt disponible."
            />
          </div>
        )}
      </div>
    </div>
  );
}
