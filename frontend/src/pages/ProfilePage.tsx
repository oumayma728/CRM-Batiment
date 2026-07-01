import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import api from '@/lib/api';
import { authManager } from '@/lib/auth';

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

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
        response?.message || 'Votre demande de devis a ete creee avec succes.',
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

  if (portalQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-lg bg-white px-5 py-4 text-slate-700 shadow-sm ring-1 ring-slate-200">
          <Loader2 className="animate-spin text-blue-600" size={20} />
          Chargement de votre espace client...
        </div>
      </div>
    );
  }

  if (portalQuery.error || !portal) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-red-700">
          <AlertCircle className="mb-3" size={22} />
          {getErrorMessage(
            portalQuery.error,
            "Impossible de charger votre espace client.",
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              Espace client
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Bonjour {clientName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Creez une demande de devis et suivez vos chantiers et factures.
            </p>
          </div>
          <button
            type="button"
            onClick={() => authManager.logout()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <LogOut size={16} />
            Deconnexion
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<FileText size={20} />} label="Demandes" value={portal.stats.demandes} />
          <StatCard icon={<Hammer size={20} />} label="Chantiers" value={portal.stats.chantiers} />
          <StatCard icon={<Receipt size={20} />} label="Factures" value={portal.stats.factures} />
          <StatCard icon={<AlertCircle size={20} />} label="A regler" value={portal.stats.facturesImpayees} />
        </section>

        <main className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                  <Send size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-950">Nouvelle demande de devis</h2>
                  <p className="text-sm text-slate-500">
                    Decrivez votre besoin, notre equipe le traitera.
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
                  placeholder="Exemple : renovation salle de bain, peinture, extension, urgence, adresse du chantier..."
                  className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />

                {createDemande.error && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {getErrorMessage(
                      createDemande.error,
                      'Impossible de creer la demande.',
                    )}
                  </p>
                )}

                {successMessage && (
                  <p className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 size={16} />
                    {successMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={createDemande.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-slate-950">Mes informations</h2>
              <div className="space-y-3 text-sm text-slate-700">
                <InfoLine icon={<User size={16} />} value={clientName} />
                <InfoLine icon={<Mail size={16} />} value={portal.client.email} />
                <InfoLine icon={<Phone size={16} />} value={portal.client.telephone || '-'} />
                <InfoLine icon={<Building2 size={16} />} value={portal.client.adresseClient || '-'} />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <Panel title="Mes demandes de devis" empty="Aucune demande de devis pour le moment.">
              {portal.demandes.map((demande) => (
                <div key={demande.id} className="rounded-lg border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
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
                    <p className="mt-3 text-xs font-semibold text-blue-700">
                      Devis associe : {demande.devis?.[0]?.reference}
                    </p>
                  )}
                </div>
              ))}
            </Panel>

            <Panel title="Mes chantiers" empty="Aucun chantier a suivre pour le moment.">
              {portal.chantiers.map((chantier) => {
                const avgProgress = getChantierProgress(chantier);
                return (
                  <div key={chantier.id} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
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
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${avgProgress}%` }}
                        />
                      </div>
                    </div>
                    {(chantier.taches?.length ?? 0) > 0 && (
                      <div className="mt-4 space-y-2">
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

            <Panel title="Mes factures" empty="Aucune facture disponible pour le moment.">
              {portal.factures.map((facture) => (
                <div key={facture.id} className="rounded-lg border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
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
                      <p className="text-xs text-slate-500">Echeance</p>
                      <p className="font-semibold text-slate-800">{formatDate(facture.dateEcheance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Montant</p>
                      <p className="font-bold text-slate-950">{formatMoney(facture.montantTTC)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Panel>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700">{icon}</div>
        <p className="text-2xl font-bold text-slate-950">{value}</p>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

function Panel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-950">{title}</h2>
      {children.length > 0 ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
          {empty}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClass(status)}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function InfoLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function getChantierProgress(chantier: PortalChantier) {
  const tasks = chantier.taches ?? [];
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((sum, task) => sum + Number(task.avancement ?? 0), 0);
  return Math.round(total / tasks.length);
}
