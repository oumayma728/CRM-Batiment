import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileClock,
  Filter,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  WalletCards,
} from 'lucide-react';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface AuditLog {
  id: number;
  action: string;
  entite: string;
  entiteId: number;
  ancienneValeur?: JsonValue;
  nouvelleValeur?: JsonValue;
  createdAt: string;
  user?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    role: string;
  } | null;
}

interface AuditSummary {
  total: number;
  priceChanges: number;
  signatures: number;
  deletes: number;
  activeUsers: number;
  lastActionAt: string | null;
}

interface AuditResponse {
  data: AuditLog[];
  summary?: AuditSummary;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const actionOptions = [
  { value: '', label: 'Toutes les actions' },
  { value: 'CREATE', label: 'Création' },
  { value: 'UPDATE', label: 'Modification' },
  { value: 'DELETE', label: 'Suppression' },
  { value: 'SIGNATURE', label: 'Signature' },
  { value: 'MODIFICATION_PRIX', label: 'Modification de prix' },
  { value: 'NOTIFICATION', label: 'Notification' },
];

const entityOptions = [
  { value: '', label: 'Toutes les entités' },
  { value: 'Client', label: 'Client' },
  { value: 'Devis', label: 'Devis' },
  { value: 'Facture', label: 'Facture' },
  { value: 'Chantier', label: 'Chantier' },
  { value: 'Commande', label: 'Commande fournisseur' },
  { value: 'Prestation', label: 'Prestation' },
  { value: 'Materiau', label: 'Matériau' },
  { value: 'DemoRequest', label: 'Demande de démo' },
  { value: 'ServiceMo', label: 'Main d’œuvre' },
  { value: 'Utilisateur', label: 'Utilisateur' },
];

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entite, setEntite] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<AuditResponse>({
    queryKey: ['audit-logs', page, search, entite, action, startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/audit-logs', {
        params: {
          page,
          limit: 12,
          search: search || undefined,
          entite: entite || undefined,
          action: action || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      return response.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const logs = data?.data ?? [];
  const summary = useMemo(() => buildSummary(data), [data]);
  const hasFilters = Boolean(search || entite || action || startDate || endDate);

  const resetFilters = () => {
    setPage(1);
    setSearch('');
    setEntite('');
    setAction('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="relative px-5 py-5 lg:px-6">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100/50 blur-3xl" />
          <div className="absolute bottom-0 left-20 h-32 w-32 rounded-full bg-violet-100/60 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
                <ShieldCheck size={13} />
                Audit & stabilisation P0
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 lg:text-3xl">
                Historique des modifications
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Suivez les signatures, changements de prix, suppressions et actions sensibles pour sécuriser le pilotage de BÂTIFLOW.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>
      </section>

      {isError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger l’historique d’audit : {getApiErrorMessage(error)}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Actions enregistrées"
          value={summary.total}
          helper="Historique complet"
          icon={<FileClock size={17} />}
          tone="blue"
        />
        <SummaryCard
          label="Signatures"
          value={summary.signatures}
          helper="Devis signés / acceptés"
          icon={<CheckCircle2 size={17} />}
          tone="emerald"
        />
        <SummaryCard
          label="Prix modifiés"
          value={summary.priceChanges}
          helper="Actions sensibles"
          icon={<WalletCards size={17} />}
          tone="amber"
        />
        <SummaryCard
          label="Suppressions"
          value={summary.deletes}
          helper="À contrôler"
          icon={<AlertTriangle size={17} />}
          tone="red"
        />
        <SummaryCard
          label="Utilisateurs actifs"
          value={summary.activeUsers}
          helper="Sur cette recherche"
          icon={<UserRound size={17} />}
          tone="violet"
        />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Filtres d’audit</h2>
              <p className="text-xs text-slate-500">Rechercher une action, une entité ou un utilisateur.</p>
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_0.8fr]">
          <FieldShell icon={<Search size={15} />}>
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Rechercher action, utilisateur, entité..."
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </FieldShell>

          <FieldShell icon={<Filter size={15} />}>
            <select
              value={action}
              onChange={(event) => {
                setPage(1);
                setAction(event.target.value);
              }}
              className="w-full bg-transparent text-sm text-slate-800 outline-none"
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>

          <FieldShell icon={<Activity size={15} />}>
            <select
              value={entite}
              onChange={(event) => {
                setPage(1);
                setEntite(event.target.value);
              }}
              className="w-full bg-transparent text-sm text-slate-800 outline-none"
            >
              {entityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldShell>

          <FieldShell icon={<Clock3 size={15} />}>
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setPage(1);
                setStartDate(event.target.value);
              }}
              className="w-full bg-transparent text-sm text-slate-800 outline-none"
            />
          </FieldShell>

          <FieldShell icon={<Clock3 size={15} />}>
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setPage(1);
                setEndDate(event.target.value);
              }}
              className="w-full bg-transparent text-sm text-slate-800 outline-none"
            />
          </FieldShell>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Timeline récente</h2>
              <p className="text-xs text-slate-500">Dernières actions sensibles.</p>
            </div>
            <History size={18} className="text-slate-400" />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonLine key={index} />
              ))
            ) : logs.length > 0 ? (
              logs.slice(0, 6).map((log) => (
                <TimelineItem key={log.id} log={log} />
              ))
            ) : (
              <EmptyState text="Aucune action récente avec ces filtres." />
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Journal détaillé</h2>
              <p className="text-xs text-slate-500">
                {data?.meta.total ?? 0} action(s) trouvée(s)
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Page {data?.meta.page ?? page} / {data?.meta.totalPages ?? 1}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entité</th>
                  <th className="px-4 py-3">Changement</th>
                  <th className="px-4 py-3">Détails</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      Chargement de l’historique...
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">{formatShortDate(log.createdAt)}</div>
                        <div className="text-xs text-slate-400">{formatTime(log.createdAt)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <UserCell log={log} />
                      </td>

                      <td className="px-4 py-3">
                        <ActionBadge action={log.action} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{log.entite}</div>
                        <div className="text-xs text-slate-400">#{log.entiteId}</div>
                      </td>

                      <td className="px-4 py-3">
                        <ChangePreview log={log} />
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye size={14} />
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      Aucun historique trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Précédent
            </button>

            <span className="text-xs text-slate-500">
              {data?.meta.total ?? 0} résultat(s)
            </span>

            <button
              type="button"
              disabled={!data || page >= data.meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {selectedLog && (
        <AuditDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

function buildSummary(data?: AuditResponse): AuditSummary {
  if (data?.summary) {
    return data.summary;
  }

  const logs = data?.data ?? [];
  const activeUsers = new Set(logs.map((log) => log.user?.email).filter(Boolean));

  return {
    total: data?.meta.total ?? 0,
    signatures: logs.filter((log) => isSignatureAction(log.action)).length,
    priceChanges: logs.filter((log) => isPriceAction(log.action)).length,
    deletes: logs.filter((log) => log.action.toUpperCase().includes('DELETE')).length,
    activeUsers: activeUsers.size,
    lastActionAt: logs[0]?.createdAt ?? null,
  };
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'red' | 'violet';
}) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-700',
  }[tone];

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.045)]">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function FieldShell({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-400 transition-within:border-blue-300">
      {icon}
      {children}
    </div>
  );
}

function TimelineItem({ log }: { log: AuditLog }) {
  return (
    <div className="relative flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${actionDotClass(log.action)}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-900">
            {humanizeAction(log.action)}
          </p>
          <span className="shrink-0 text-[11px] text-slate-400">
            {formatTime(log.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {log.entite} #{log.entiteId} · {actorName(log)}
        </p>
      </div>
    </div>
  );
}

function UserCell({ log }: { log: AuditLog }) {
  if (!log.user) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
          <ShieldCheck size={14} />
        </div>
        <span>Système</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-semibold text-white">
        {`${log.user.prenom?.[0] ?? ''}${log.user.nom?.[0] ?? ''}`.toUpperCase() || 'U'}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">
          {log.user.prenom} {log.user.nom}
        </p>
        <p className="truncate text-xs text-slate-400">{log.user.role}</p>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${actionBadgeClass(action)}`}>
      {humanizeAction(action)}
    </span>
  );
}

function ChangePreview({ log }: { log: AuditLog }) {
  const oldText = compactJson(log.ancienneValeur);
  const newText = compactJson(log.nouvelleValeur);

  if (!oldText && !newText) {
    return <span className="text-xs text-slate-400">Aucun détail</span>;
  }

  if (!oldText) {
    return <p className="line-clamp-2 max-w-[260px] text-xs text-slate-600">{newText}</p>;
  }

  return (
    <div className="max-w-[280px] text-xs">
      <p className="line-clamp-1 text-slate-400">Avant : {oldText}</p>
      <p className="line-clamp-1 text-slate-700">Après : {newText}</p>
    </div>
  );
}

function AuditDetailsModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Détails de l’action</h3>
            <p className="mt-1 text-sm text-slate-500">
              {humanizeAction(log.action)} · {log.entite} #{log.entiteId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <JsonPanel title="Ancienne valeur" value={log.ancienneValeur} />
          <JsonPanel title="Nouvelle valeur" value={log.nouvelleValeur} />
        </div>
      </div>
    </div>
  );
}

function JsonPanel({ title, value }: { title: string; value?: JsonValue }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-800">{title}</p>
      <pre className="max-h-[360px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
        {value ? JSON.stringify(value, null, 2) : 'Aucune donnée'}
      </pre>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function SkeletonLine() {
  return <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />;
}

function humanizeAction(action: string) {
  const upper = action.toUpperCase();

  if (upper === 'DEMO_REQUEST_CREATED') return 'Création demande de démo';
  if (upper === 'DEMO_REQUEST_UPDATED') return 'Modification demande de démo';
  if (upper === 'STOCK_MOVEMENT_CREATED') return 'Mouvement de stock';
  if (upper === 'STOCK_THRESHOLD_UPDATED') return 'Modification seuil de stock';
  if (isSignatureAction(upper)) return 'Signature devis';
  if (isPriceAction(upper)) return 'Modification prix';
  if (upper.includes('CREATE')) return 'Création';
  if (upper.includes('UPDATE')) return 'Modification';
  if (upper.includes('DELETE')) return 'Suppression';
  if (upper.includes('NOTIFICATION')) return 'Notification';

  return action.replaceAll('_', ' ').toLowerCase().replace(/^./, (char) => char.toUpperCase());
}

function isSignatureAction(action: string) {
  const upper = action.toUpperCase();
  return upper.includes('SIGNATURE') || upper.includes('SIGNE') || upper.includes('ACCEPTE') || upper.includes('REFUSE');
}

function isPriceAction(action: string) {
  const upper = action.toUpperCase();
  return upper.includes('PRIX') || upper.includes('PRICE') || upper.includes('TARIF');
}

function actionBadgeClass(action: string) {
  const upper = action.toUpperCase();

  if (isSignatureAction(upper)) return 'bg-emerald-50 text-emerald-700';
  if (isPriceAction(upper)) return 'bg-amber-50 text-amber-700';
  if (upper.includes('DELETE')) return 'bg-red-50 text-red-700';
  if (upper.includes('CREATE')) return 'bg-blue-50 text-blue-700';
  if (upper.includes('NOTIFICATION')) return 'bg-violet-50 text-violet-700';

  return 'bg-slate-100 text-slate-700';
}

function actionDotClass(action: string) {
  const upper = action.toUpperCase();

  if (isSignatureAction(upper)) return 'bg-emerald-500';
  if (isPriceAction(upper)) return 'bg-amber-500';
  if (upper.includes('DELETE')) return 'bg-red-500';
  if (upper.includes('NOTIFICATION')) return 'bg-violet-500';

  return 'bg-blue-500';
}

function actorName(log: AuditLog) {
  if (!log.user) return 'Système';
  return `${log.user.prenom} ${log.user.nom}`.trim() || log.user.email;
}

function compactJson(value?: JsonValue) {
  if (!value) return '';

  if (typeof value !== 'object') {
    return String(value);
  }

  const entries = Object.entries(value).slice(0, 3);

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`)
    .join(' · ');
}

function getApiErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data
  ) {
    const message = error.response.data.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }

  return 'vérifiez le terminal du backend.';
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
