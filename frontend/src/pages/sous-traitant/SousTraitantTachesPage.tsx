import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  PaginatedResponse,
  SousTraitantTask,
  SousTraitantTaskStatus,
} from './types';

const statusOptions: Array<{ value: SousTraitantTaskStatus | ''; label: string }> = [
  { value: '', label: 'Toutes' },
  { value: 'A_FAIRE', label: 'À faire' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'BLOQUEE', label: 'Bloquée' },
  { value: 'TERMINEE', label: 'Terminée' },
];

const statusStyles: Record<SousTraitantTaskStatus, string> = {
  A_FAIRE: 'bg-slate-100 text-slate-700',
  EN_COURS: 'bg-blue-50 text-blue-700',
  BLOQUEE: 'bg-red-50 text-red-700',
  TERMINEE: 'bg-emerald-50 text-emerald-700',
};

const statusLabels: Record<SousTraitantTaskStatus, string> = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  BLOQUEE: 'Bloquée',
  TERMINEE: 'Terminée',
};

function formatDate(value?: string | null) {
  if (!value) return 'Non définie';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export default function SousTraitantTachesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SousTraitantTaskStatus | ''>('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<SousTraitantTask | null>(null);
  const [formStatus, setFormStatus] = useState<SousTraitantTaskStatus>('A_FAIRE');
  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['sous-traitant-taches', page, search, status],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<SousTraitantTask>>(
        '/sous-traitant/taches',
        {
          params: {
            page,
            limit: 12,
            search: search.trim() || undefined,
            statut: status || undefined,
          },
        },
      );
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await api.patch(`/sous-traitant/taches/${editing.id}`, {
        statut: formStatus,
        avancement: progress,
        commentaire: comment,
      });
    },
    onSuccess: async () => {
      setEditing(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sous-traitant-taches'] }),
        queryClient.invalidateQueries({ queryKey: ['sous-traitant-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['sous-traitant-chantiers'] }),
      ]);
    },
  });

  const meta = data?.meta ?? { total: 0, page: 1, limit: 12, totalPages: 1 };
  const overdueIds = useMemo(() => {
    const now = Date.now();
    return new Set(
      (data?.data ?? [])
        .filter(
          (task) =>
            task.statut !== 'TERMINEE' &&
            task.dateFin &&
            new Date(task.dateFin).getTime() < now,
        )
        .map((task) => task.id),
    );
  }, [data?.data]);

  function openEdit(task: SousTraitantTask) {
    setEditing(task);
    setFormStatus(task.statut);
    setProgress(Math.round(task.avancement));
    setComment(task.commentaire ?? '');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">Mes tâches</h2>
        <p className="mt-1 text-sm text-slate-500">
          Consultez vos affectations et mettez à jour leur avancement.
        </p>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher une tâche, un chantier ou un client..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => {
                  setStatus(option.value);
                  setPage(1);
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-semibold transition',
                  status === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          Impossible de charger vos tâches.
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-56 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={26} />
        </div>
      ) : !data?.data.length ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white text-center shadow-sm">
          <CheckCircle2 size={32} className="text-slate-300" />
          <h3 className="mt-4 font-semibold text-slate-800">Aucune tâche trouvée</h3>
          <p className="mt-1 text-sm text-slate-400">
            Modifiez les filtres ou attendez une nouvelle affectation.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.data.map((task) => {
            const clientName = `${task.chantier.client.prenom ?? ''} ${task.chantier.client.nom}`.trim();
            return (
              <article
                key={task.id}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{task.libelle}</h3>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          statusStyles[task.statut],
                        )}
                      >
                        {statusLabels[task.statut]}
                      </span>
                      {overdueIds.has(task.id) && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                          En retard
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-blue-600">
                      {task.chantier.reference} · {clientName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(task)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Mettre à jour la tâche"
                    title="Mettre à jour"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>

                {task.description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{task.description}</p>
                )}

                <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <MapPin size={14} /> {task.chantier.adresse}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays size={14} /> Échéance : {formatDate(task.dateFin)}
                  </p>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Avancement</span>
                    <span>{Math.round(task.avancement)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.min(100, Math.max(0, task.avancement))}%` }}
                    />
                  </div>
                </div>

                {task.commentaire && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                    {task.commentaire}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-slate-600">
            Page {page} / {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              updateMutation.mutate();
            }}
            className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Mise à jour
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">
                  {editing.libelle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Statut</label>
                <select
                  value={formStatus}
                  onChange={(event) => {
                    const nextStatus = event.target.value as SousTraitantTaskStatus;
                    setFormStatus(nextStatus);
                    if (nextStatus === 'TERMINEE') setProgress(100);
                    if (nextStatus === 'A_FAIRE') setProgress(0);
                  }}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {statusOptions
                    .filter((option) => option.value)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Avancement</label>
                  <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setProgress(next);
                    if (next === 100) setFormStatus('TERMINEE');
                    else if (next > 0 && formStatus === 'A_FAIRE') setFormStatus('EN_COURS');
                  }}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Commentaire</label>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  placeholder="Ajoutez une note sur l’intervention..."
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {updateMutation.error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  Impossible de mettre à jour la tâche.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {updateMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
