import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type {
  DemoRequest,
  DemoRequestsSummary,
  DemoRequestStatut,
  PaginatedResponse,
  User,
} from '@/types';

const statuts: { value: DemoRequestStatut | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'CONTACTED', label: 'Contactée' },
  { value: 'SCHEDULED', label: 'Planifiée' },
  { value: 'DONE', label: 'Terminée' },
  { value: 'CANCELED', label: 'Annulée' },
];

const statusLabels: Record<DemoRequestStatut, string> = {
  PENDING: 'En attente',
  CONTACTED: 'Contactée',
  SCHEDULED: 'Planifiée',
  DONE: 'Terminée',
  CANCELED: 'Annulée',
};

const statusStyles: Record<DemoRequestStatut, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  CONTACTED: 'border-sky-200 bg-sky-50 text-sky-700',
  SCHEDULED: 'border-blue-200 bg-blue-50 text-blue-700',
  DONE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CANCELED: 'border-slate-200 bg-slate-50 text-slate-600',
};

const inputClass =
  'rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

type Assignee = Pick<User, 'id' | 'nom' | 'prenom' | 'email' | 'role'>;
type DemoUpdatePayload = {
  statut?: DemoRequestStatut;
  assignedToId?: number | null;
  dateContact?: string | null;
  dateDemo?: string | null;
  notes?: string;
  email?: string;
  telephone?: string;
};

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
  }
  return 'La mise à jour a échoué. Vérifiez les informations saisies.';
}

export default function DemoRequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState<DemoRequestStatut | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 30,
      search: search.trim() || undefined,
      statut: statut === 'ALL' ? undefined : statut,
    }),
    [search, statut],
  );

  const requestsQuery = useQuery({
    queryKey: ['demo-requests', queryParams],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<DemoRequest>>('/demo-requests', {
        params: queryParams,
      });
      return response.data;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['demo-requests-summary'],
    queryFn: async () => {
      const response = await api.get<DemoRequestsSummary>('/demo-requests/summary');
      return response.data;
    },
  });

  const assigneesQuery = useQuery({
    queryKey: ['demo-request-assignees'],
    queryFn: async () => {
      const response = await api.get<Assignee[]>('/demo-requests/assignees');
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: DemoUpdatePayload }) => {
      const response = await api.patch<DemoRequest>(`/demo-requests/${id}`, payload);
      return response.data;
    },
    onMutate: () => setFeedback(null),
    onSuccess: (updated) => {
      setSelectedId(updated.id);
      setFeedback('Mise à jour enregistrée.');
      queryClient.invalidateQueries({ queryKey: ['demo-requests'] });
      queryClient.invalidateQueries({ queryKey: ['demo-requests-summary'] });
      queryClient.invalidateQueries({ queryKey: ['internal-notifications'] });
    },
    onError: (error) => setFeedback(getErrorMessage(error)),
  });

  const requests = requestsQuery.data?.data ?? [];
  const selected = requests.find((item) => item.id === selectedId) ?? requests[0];
  const summary = summaryQuery.data;
  const assignees = assigneesQuery.data ?? [];

  const updateSelected = (payload: DemoUpdatePayload) => {
    if (!selected) return;
    updateMutation.mutate({ id: selected.id, payload });
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-blue-100 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.07)]">
        <div className="grid gap-6 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <span className="inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
              Mode Démo complet
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Demandes de démo
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Réception publique, affectation commerciale, planification et suivi jusqu’à la clôture.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            <MetricCard label="Total" value={summary?.total ?? 0} icon={<Mail size={18} />} />
            <MetricCard label="En attente" value={summary?.pending ?? 0} icon={<Clock3 size={18} />} tone="warning" />
            <MetricCard label="Planifiées" value={summary?.scheduled ?? 0} icon={<CalendarClock size={18} />} tone="info" />
            <MetricCard label="Terminées" value={summary?.done ?? 0} icon={<CheckCircle2 size={18} />} tone="success" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Back-office commercial</h2>
              <p className="mt-1 text-sm text-slate-500">Recherche, filtres et suivi des statuts.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                requestsQuery.refetch();
                summaryQuery.refetch();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} className={cn(requestsQuery.isFetching && 'animate-spin')} />
              Actualiser
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par nom, email, entreprise..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <select
              value={statut}
              onChange={(event) => setStatut(event.target.value as DemoRequestStatut | 'ALL')}
              className={inputClass}
            >
              {statuts.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.2fr_1fr_150px_130px] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Prospect</span><span>Contact</span><span>Statut</span><span>Date</span>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {requestsQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-slate-500">
                  <Loader2 size={17} className="animate-spin" /> Chargement des demandes...
                </div>
              ) : requests.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-slate-500">Aucune demande de démo trouvée.</div>
              ) : (
                requests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => { setSelectedId(request.id); setFeedback(null); }}
                    className={cn(
                      'grid w-full gap-3 px-4 py-4 text-left text-sm transition hover:bg-blue-50/50 md:grid-cols-[1.2fr_1fr_150px_130px] md:gap-4',
                      selected?.id === request.id && 'bg-blue-50',
                    )}
                  >
                    <div>
                      <p className="font-semibold text-slate-950">{request.prenom ? `${request.prenom} ` : ''}{request.nom}</p>
                      <p className="mt-1 text-xs text-slate-500">{request.entreprise || 'Entreprise non précisée'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-slate-700">{request.email}</p>
                      <p className="mt-1 text-xs text-slate-500">{request.telephone || 'Téléphone non précisé'}</p>
                    </div>
                    <div><StatusBadge statut={request.statut} /></div>
                    <div className="text-xs text-slate-500">{formatDate(request.createdAt)}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {selected ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Détail demande</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">{selected.prenom ? `${selected.prenom} ` : ''}{selected.nom}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selected.entreprise || 'Sans entreprise'}</p>
                </div>
                <StatusBadge statut={selected.statut} />
              </div>

              <div className="grid gap-3 text-sm">
                <InfoLine icon={<Mail size={16} />} label="Email" value={selected.email} />
                <InfoLine icon={<Phone size={16} />} label="Téléphone" value={selected.telephone || 'Non précisé'} />
                <InfoLine icon={<UserCheck size={16} />} label="Premier contact" value={selected.dateContact ? formatDate(selected.dateContact) : 'Non effectué'} />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assignée à</label>
                <select
                  value={selected.assignedToId ?? ''}
                  onChange={(event) => updateSelected({ assignedToId: event.target.value ? Number(event.target.value) : null })}
                  className={cn(inputClass, 'mt-2 w-full')}
                >
                  <option value="">Non assignée</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>{assignee.prenom} {assignee.nom} — {assignee.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date de démo</label>
                <div className="mt-2 flex w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    type="datetime-local"
                    key={`${selected.id}-${selected.dateDemo ?? 'none'}`}
                    defaultValue={selected.dateDemo ? selected.dateDemo.slice(0, 16) : ''}
                    onBlur={(event) => updateSelected({ dateDemo: event.target.value ? new Date(event.target.value).toISOString() : null })}
                    className="block w-full min-w-0 border-0 bg-transparent p-0 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Statut</label>
                <select
                  value={selected.statut}
                  onChange={(event) => updateSelected({ statut: event.target.value as DemoRequestStatut })}
                  className={cn(inputClass, 'mt-2 w-full')}
                >
                  {statuts.filter((item) => item.value !== 'ALL').map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Pour planifier : affectez un commercial, renseignez la date, puis choisissez « Planifiée ».
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes internes</label>
                <textarea
                  key={`${selected.id}-${selected.updatedAt}`}
                  defaultValue={selected.notes ?? ''}
                  onBlur={(event) => updateSelected({ notes: event.target.value })}
                  placeholder="Ajouter une note commerciale..."
                  className={cn(inputClass, 'mt-2 min-h-[120px] w-full resize-none')}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Message prospect</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selected.message || 'Aucun message renseigné.'}</p>
              </div>

              {feedback ? (
                <div className={cn(
                  'flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium',
                  updateMutation.isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
                )}>
                  {updateMutation.isError ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
                  <span>{feedback}</span>
                </div>
              ) : null}

              {updateMutation.isPending ? (
                <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  <Loader2 size={16} className="animate-spin" /> Mise à jour en cours...
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center text-sm text-slate-500">
              <XCircle size={28} className="text-slate-300" />
              <p className="mt-3">Sélectionnez une demande pour voir le détail.</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon, tone = 'default' }: { label: string; value: number; icon: ReactNode; tone?: 'default' | 'warning' | 'info' | 'success' }) {
  const toneClass = {
    default: 'bg-white text-blue-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
    success: 'bg-emerald-50 text-emerald-600',
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', toneClass)}>{icon}</div>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function StatusBadge({ statut }: { statut: DemoRequestStatut }) {
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', statusStyles[statut])}>{statusLabels[statut]}</span>;
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="mt-0.5 text-blue-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
