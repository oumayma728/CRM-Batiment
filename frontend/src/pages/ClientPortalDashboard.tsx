import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Hammer,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Receipt,
  Send,
  User,
  Calendar,
  MapPin,
  TrendingUp,
  Clock,
  Download,
  Eye,
  Search,
  Filter,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { authManager } from '@/lib/auth';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

type PortalClient = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  adresseClient?: string | null;
};

type PortalDemande = {
  id: number;
  date: string;
  description: string;
  statut: string;
  devis?: Array<{
    id: number;
    reference: string;
    statut: string;
    totalTTC?: number | null;
  }>;
};

type PortalChantier = {
  id: number;
  reference: string;
  adresse: string;
  description?: string | null;
  statut: string;
  dateDebut?: string | null;
  dateFin?: string | null;
  taches?: Array<{
    id: number;
    libelle: string;
    statut: string;
    avancement: number;
  }>;
  chefChantier?: {
    nom: string;
    prenom: string;
    email: string;
  } | null;
};

type PortalFacture = {
  id: number;
  reference: string;
  referenceDevis?: string | null;
  date: string;
  dateEcheance?: string | null;
  montantTTC: number;
  statut: string;
  devis?: {
    reference: string;
    statut: string;
  };
};

type ClientPortalResponse = {
  client: PortalClient;
  demandes: PortalDemande[];
  chantiers: PortalChantier[];
  factures: PortalFacture[];
  stats: {
    demandes: number;
    chantiers: number;
    factures: number;
    facturesImpayees: number;
  };
};

const statusStyle: Record<string, string> = {
  NOUVEAU: 'bg-blue-50 text-blue-700 ring-blue-100',
  EN_COURS: 'bg-amber-50 text-amber-700 ring-amber-100',
  CONVERTI: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  PERDU: 'bg-slate-100 text-slate-600 ring-slate-200',
  VISITE_TECHNIQUE: 'bg-sky-50 text-sky-700 ring-sky-100',
  PREPARATION: 'bg-violet-50 text-violet-700 ring-violet-100',
  EN_REALISATION: 'bg-amber-50 text-amber-700 ring-amber-100',
  TERMINE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  BROUILLON: 'bg-slate-100 text-slate-700 ring-slate-200',
  ENVOYEE: 'bg-blue-50 text-blue-700 ring-blue-100',
  PAYEE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
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

function getChantierProgress(chantier: PortalChantier): number {
  if (!chantier.taches || chantier.taches.length === 0) return 0;
  const total = chantier.taches.reduce((sum, task) => sum + task.avancement, 0);
  return Math.round(total / chantier.taches.length);
}

function StatCard({ icon, label, value, color = 'blue' }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
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
            icon={FileText}
            title={empty}
            description="Commencez par créer une demande de devis."
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

export default function ClientPortalDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'demandes' | 'chantiers' | 'factures'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const portalQuery = useQuery({
    queryKey: ['client-portal'],
    queryFn: async () => {
      const response = await api.get<ClientPortalResponse>('/clients/me/portal');
      return response.data;
    },
  });

  const createDemande = useMutation({
    mutationFn: async () => {
      const response = await api.post('/clients/me/demandes-devis', {
        description: description.trim(),
      });
      return response.data;
    },
    onSuccess: (response) => {
      setDescription('');
      setSuccessMessage(
        response?.message || 'Votre demande de devis a été créée avec succès.',
      );
      queryClient.invalidateQueries({ queryKey: ['client-portal'] });
    },
  });

  const portal = portalQuery.data;
  const clientName = useMemo(() => {
    const client = portal?.client;
    return `${client?.prenom ?? ''} ${client?.nom ?? ''}`.trim() || 'Client';
  }, [portal?.client]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage('');
    createDemande.mutate();
  };

  const handleLogout = () => {
    authManager.logout();
    navigate('/portal/login');
  };

  if (portalQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSkeleton type="card" count={4} />
        </div>
      </div>
    );
  }

  if (portalQuery.error || !portal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <AlertCircle className="mb-3" size={24} />
            {getErrorMessage(
              portalQuery.error,
              "Impossible de charger votre espace client.",
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredDemandes = portal.demandes.filter(d =>
    d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.statut.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChantiers = portal.chantiers.filter(c =>
    c.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.adresse.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.statut.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFactures = portal.factures.filter(f =>
    f.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.statut.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Espace Client
                </p>
                <h1 className="text-xl font-bold text-slate-900">
                  Bonjour {clientName}
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
            { id: 'demandes' as const, label: 'Demandes', icon: FileText },
            { id: 'chantiers' as const, label: 'Chantiers', icon: Hammer },
            { id: 'factures' as const, label: 'Factures', icon: Receipt },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
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
              <StatCard icon={<FileText size={20}
 className="text-white" />} label="Demandes" value={portal.stats.demandes} color="blue" />
              <StatCard icon={<Hammer size={20} className="text-white" />} label="Chantiers" value={portal.stats.chantiers} color="green" />
              <StatCard icon={<Receipt size={20} className="text-white" />} label="Factures" value={portal.stats.factures} color="purple" />
              <StatCard icon={<AlertCircle size={20} className="text-white" />} label="À régler" value={portal.stats.facturesImpayees} color="amber" />
            </section>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Left Column */}
              <div className="space-y-6">
                {/* New Quote Request */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                      <Send size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900">Nouvelle demande de devis</h2>
                      <p className="text-sm text-slate-500">
                        Décrivez votre besoin, notre équipe le traitera.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={6}
                      value={description}
                      onChange={(event) => {
                        setDescription(event.target.value);
                        setSuccessMessage('');
                        createDemande.reset();
                      }}
                      placeholder="Exemple : rénovation salle de bain, peinture, extension, urgence, adresse du chantier..."
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                    />

                    {createDemande.error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {getErrorMessage(
                          createDemande.error,
                          'Impossible de créer la demande.',
                        )}
                      </div>
                    )}

                    {successMessage && (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        <CheckCircle2 size={16} />
                        {successMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={createDemande.isPending}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {createDemande.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ArrowRight size={16} />
                      )}
                      Envoyer la demande
                    </button>
                  </form>
                </div>

                {/* Client Info */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 font-bold text-slate-900">Mes informations</h2>
                  <div className="space-y-3 text-sm text-slate-700">
                    <InfoLine icon={<User size={16} />} value={clientName} />
                    <InfoLine icon={<Mail size={16} />} value={portal.client.email} />
                    <InfoLine icon={<Phone size={16} />} value={portal.client.telephone || '-'} />
                    <InfoLine icon={<MapPin size={16} />} value={portal.client.adresseClient || '-'} />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <Panel title="Mes demandes de devis" empty="Aucune demande de devis pour le moment.">
                  {portal.demandes.slice(0, 3).map((demande) => (
                    <div key={demande.id} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Demande #{demande.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(demande.date)}
                          </p>
                        </div>
                        <StatusBadge status={demande.statut} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-2">
                        {demande.description}
                      </p>
                      {(demande.devis?.length ?? 0) > 0 && (
                        <p className="mt-3 text-xs font-semibold text-blue-700">
                          Devis associé : {demande.devis?.[0]?.reference}
                        </p>
                      )}
                    </div>
                  ))}
                  {portal.demandes.length > 3 && (
                    <button
                      onClick={() => setActiveTab('demandes')}
                      className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Voir toutes les demandes →
                    </button>
                  )}
                </Panel>

                <Panel title="Mes chantiers" empty="Aucun chantier à suivre pour le moment.">
                  {portal.chantiers.slice(0, 3).map((chantier) => {
                    const avgProgress = getChantierProgress(chantier);
                    return (
                      <div key={chantier.id} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {chantier.reference}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {chantier.adresse}
                            </p>
                          </div>
                          <StatusBadge status={chantier.statut} />
                        </div>
                        <div className="mt-4">
                          <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                            <span>Avancement</span>
                            <span>{avgProgress}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
                              style={{ width: `${avgProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {portal.chantiers.length > 3 && (
                    <button
                      onClick={() => setActiveTab('chantiers')}
                      className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Voir tous les chantiers →
                    </button>
                  )}
                </Panel>
              </div>
            </div>
          </div>
        )}

        {/* Demandes Tab */}
        {activeTab === 'demandes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Mes demandes de devis</h2>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher une demande..."
                onClear={() => setSearchQuery('')}
              />
            </div>
            <Panel title="" empty="Aucune demande de devis trouvée.">
              {filteredDemandes.map((demande) => (
                <div key={demande.id} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Demande #{demande.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(demande.date)}
                      </p>
                    </div>
                    <StatusBadge status={demande.statut} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {demande.description}
                  </p>
                  {(demande.devis?.length ?? 0) > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-700">
                        Devis associé : {demande.devis?.[0]?.reference}
                      </span>
                      <button className="text-xs text-blue-600 hover:text-blue-700">
                        Voir le devis
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </Panel>
          </div>
        )}

        {/* Chantiers Tab */}
        {activeTab === 'chantiers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Mes chantiers</h2>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher un chantier..."
                onClear={() => setSearchQuery('')}
              />
            </div>
            <Panel title="" empty="Aucun chantier trouvé.">
              {filteredChantiers.map((chantier) => {
                const avgProgress = getChantierProgress(chantier);
                return (
                  <div key={chantier.id} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {chantier.reference}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {chantier.adresse}
                        </p>
                        {chantier.chefChantier && (
                          <p className="mt-2 text-xs text-slate-600">
                            Chef de chantier : {chantier.chefChantier.prenom} {chantier.chefChantier.nom}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={chantier.statut} />
                    </div>
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                        <span>Avancement global</span>
                        <span>{avgProgress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
                          style={{ width: `${avgProgress}%` }}
                        />
                      </div>
                    </div>
                    {(chantier.taches?.length ?? 0) > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-700">Tâches en cours :</p>
                        {chantier.taches?.slice(0, 3).map((task) => (
                          <div key={task.id} className="flex items-center justify-between gap-2 text-xs text-slate-600">
                            <span>{task.libelle}</span>
                            <span className="font-semibold">{task.avancement}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </Panel>
          </div>
        )}

        {/* Factures Tab */}
        {activeTab === 'factures' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Mes factures</h2>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher une facture..."
                onClear={() => setSearchQuery('')}
              />
            </div>
            <Panel title="" empty="Aucune facture trouvée.">
              {filteredFactures.map((facture) => (
                <div key={facture.id} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {facture.reference}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Devis {facture.referenceDevis || facture.devis?.reference || '-'}
                      </p>
                    </div>
                    <StatusBadge status={facture.statut} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Date</p>
                      <p className="font-semibold text-slate-800">{formatDate(facture.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Échéance</p>
                      <p className="font-semibold text-slate-800">{formatDate(facture.dateEcheance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Montant</p>
                      <p className="font-bold text-slate-900">{formatMoney(facture.montantTTC)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                      <Eye size={14} />
                      Voir
                    </button>
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                      <Download size={14} />
                      Télécharger
                    </button>
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
