import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Calendar,
  CheckSquare,
  ClipboardList,
  HardHat,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type {
  Chantier,
  ChantierAutoStatut,
  ChantierTasksResponse,
  PaginatedResponse,
  TacheAssignmentOptions,
  TacheChantier,
  TaskAssigneeType,
} from '@/types';

interface TaskFormState {
  libelle: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  assigneeType: TaskAssigneeType;
  sousTraitantId: string;
  equipeId: string;
}

const emptyForm: TaskFormState = {
  libelle: '',
  description: '',
  dateDebut: '',
  dateFin: '',
  assigneeType: 'AUCUNE',
  sousTraitantId: '',
  equipeId: '',
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function statusBadgeClass(status: ChantierAutoStatut) {
  if (status === 'CLOTURE') return 'bg-emerald-100 text-emerald-700';
  if (status === 'EN_RETARD') return 'bg-rose-100 text-rose-700';
  if (status === 'EN_COURS') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

const chantierAutoLabel: Record<ChantierAutoStatut, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  EN_RETARD: 'En retard',
  CLOTURE: 'Cloture',
};

const taskStatusLabel: Record<TacheChantier['statut'], string> = {
  A_FAIRE: 'Not do',
  EN_COURS: 'En cours',
  BLOQUEE: 'Bloquee',
  TERMINEE: 'Do',
};

function toEditForm(task: TacheChantier): TaskFormState {
  const type = task.affectation?.type ?? 'AUCUNE';
  return {
    libelle: task.libelle,
    description: task.description ?? '',
    dateDebut: task.dateDebut ? task.dateDebut.slice(0, 10) : '',
    dateFin: task.dateFin ? task.dateFin.slice(0, 10) : '',
    assigneeType: type,
    sousTraitantId:
      type === 'SOUS_TRAITANT' ? String(task.affectation?.user?.id ?? '') : '',
    equipeId: type === 'EQUIPE_INTERNE' ? String(task.affectation?.equipe?.id ?? '') : '',
  };
}

export default function TasksChantierPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedChantierId, setSelectedChantierId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TacheChantier | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);

  const chantiersQuery = useQuery({
    queryKey: ['task-page-chantiers', search],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: 1, limit: 200 };
      if (search.trim()) params.search = search.trim();
      const res = await api.get<PaginatedResponse<Chantier>>('/chantiers', { params });
      return res.data;
    },
  });

  const assignmentOptionsQuery = useQuery({
    queryKey: ['task-assignment-options'],
    queryFn: async () => {
      const res = await api.get<TacheAssignmentOptions>('/chantiers/assignation-options');
      return res.data;
    },
  });

  const chantierList = chantiersQuery.data?.data ?? [];
  const activeChantierId = useMemo(() => {
    if (!chantierList.length) return null;
    if (selectedChantierId && chantierList.some((c) => c.id === selectedChantierId)) {
      return selectedChantierId;
    }
    return chantierList[0].id;
  }, [chantierList, selectedChantierId]);

  const activeChantier = chantierList.find((c) => c.id === activeChantierId) ?? null;

  const tasksQuery = useQuery({
    queryKey: ['chantier-taches', activeChantierId],
    queryFn: async () => {
      const res = await api.get<ChantierTasksResponse>(`/chantiers/${activeChantierId}/taches`);
      return res.data;
    },
    enabled: !!activeChantierId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: TaskFormState) => {
      if (!activeChantierId) throw new Error('Aucun chantier selectionne.');
      const body: Record<string, unknown> = {
        libelle: payload.libelle,
        description: payload.description || undefined,
        dateDebut: payload.dateDebut || undefined,
        dateFin: payload.dateFin || undefined,
        assigneeType: payload.assigneeType,
      };
      if (payload.assigneeType === 'SOUS_TRAITANT' && payload.sousTraitantId) {
        body.sousTraitantId = Number(payload.sousTraitantId);
      }
      if (payload.assigneeType === 'EQUIPE_INTERNE' && payload.equipeId) {
        body.equipeId = Number(payload.equipeId);
      }
      const res = await api.post(`/chantiers/${activeChantierId}/taches`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantier-taches'] });
      queryClient.invalidateQueries({ queryKey: ['task-page-chantiers'] });
      setShowModal(false);
      setEditingTask(null);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: TaskFormState) => {
      if (!activeChantierId || !editingTask) throw new Error('Edition impossible.');
      const body: Record<string, unknown> = {
        libelle: payload.libelle,
        description: payload.description || undefined,
        dateDebut: payload.dateDebut || undefined,
        dateFin: payload.dateFin || undefined,
        assigneeType: payload.assigneeType,
      };
      if (payload.assigneeType === 'SOUS_TRAITANT' && payload.sousTraitantId) {
        body.sousTraitantId = Number(payload.sousTraitantId);
      }
      if (payload.assigneeType === 'EQUIPE_INTERNE' && payload.equipeId) {
        body.equipeId = Number(payload.equipeId);
      }
      const res = await api.patch(
        `/chantiers/${activeChantierId}/taches/${editingTask.id}`,
        body,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantier-taches'] });
      queryClient.invalidateQueries({ queryKey: ['task-page-chantiers'] });
      setShowModal(false);
      setEditingTask(null);
      setForm(emptyForm);
    },
  });

  const toggleDoneMutation = useMutation({
    mutationFn: async ({ taskId, done }: { taskId: number; done: boolean }) => {
      if (!activeChantierId) throw new Error('Aucun chantier selectionne.');
      const res = await api.patch(`/chantiers/${activeChantierId}/taches/${taskId}`, { done });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantier-taches'] });
      queryClient.invalidateQueries({ queryKey: ['task-page-chantiers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      if (!activeChantierId) throw new Error('Aucun chantier selectionne.');
      const res = await api.delete(`/chantiers/${activeChantierId}/taches/${taskId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantier-taches'] });
      queryClient.invalidateQueries({ queryKey: ['task-page-chantiers'] });
    },
  });

  const submitMutation = editingTask ? updateMutation : createMutation;
  const taskList = tasksQuery.data?.tasks ?? [];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.libelle.trim()) return;
    submitMutation.mutate({
      ...form,
      libelle: form.libelle.trim(),
      description: form.description.trim(),
    });
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (task: TacheChantier) => {
    setEditingTask(task);
    setForm(toEditForm(task));
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_25%),linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef2ff_100%)] p-4 shadow-sm ring-1 ring-stone-200">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
          Gestion taches chantier
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">
          Taches par chantier et affectation
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Admin et chef de chantier peuvent ajouter, modifier, supprimer et cocher les taches
          (do / not do).
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-stone-200">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Chantiers</h2>
              <p className="text-xs text-slate-500">
                {chantiersQuery.data?.meta.total ?? 0} chantier(s)
              </p>
            </div>
            {chantiersQuery.isLoading ? (
              <Loader2 size={17} className="animate-spin text-sky-700" />
            ) : null}
          </div>

          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher client ou reference chantier"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-10 py-1.5 text-sm outline-none focus:border-sky-400 focus:bg-white"
            />
          </div>

          <div className="space-y-2.5">
            {(chantiersQuery.data?.data ?? []).map((chantier) => (
              <button
                key={chantier.id}
                onClick={() => setSelectedChantierId(chantier.id)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-all',
                  activeChantierId === chantier.id
                    ? 'border-sky-300 bg-sky-50/60'
                    : 'border-stone-200 bg-white hover:bg-stone-50',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{chantier.reference}</p>
                    <p className="text-xs text-slate-500">
                      {chantier.client?.prenom} {chantier.client?.nom}
                    </p>
                  </div>
                  {chantier.statutAuto ? (
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        statusBadgeClass(chantier.statutAuto),
                      )}
                    >
                      {chantierAutoLabel[chantier.statutAuto]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{chantier.adresse}</p>
                {chantier.resumeTaches ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {chantier.resumeTaches.done}/{chantier.resumeTaches.total} do -{' '}
                    {chantier.resumeTaches.overdue} retard
                  </p>
                ) : null}
              </button>
            ))}

            {!chantiersQuery.isLoading && (chantiersQuery.data?.data ?? []).length === 0 ? (
              <div className="rounded-xl bg-stone-50 px-4 py-8 text-center text-sm text-slate-500">
                Aucun chantier trouve.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-stone-200">
          {!activeChantier ? (
            <div className="rounded-xl bg-stone-50 px-4 py-8 text-center text-sm text-slate-500">
              Selectionnez un chantier.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <HardHat size={18} className="text-sky-700" />
                    <h2 className="text-lg font-bold text-slate-900">{activeChantier.reference}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Client: {activeChantier.client?.prenom} {activeChantier.client?.nom}
                  </p>
                  <p className="text-xs text-slate-500">{activeChantier.adresse}</p>
                </div>
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  <Plus size={16} /> Ajouter tache
                </button>
              </div>

              {tasksQuery.isLoading ? (
                <div className="rounded-xl bg-stone-50 px-4 py-8 text-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Chargement des taches...
                  </span>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <article className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total</p>
                      <p className="text-lg font-bold text-slate-900">
                        {tasksQuery.data?.resumeTaches.total ?? 0}
                      </p>
                    </article>
                    <article className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200">
                      <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Do</p>
                      <p className="text-lg font-bold text-emerald-800">
                        {tasksQuery.data?.resumeTaches.done ?? 0}
                      </p>
                    </article>
                    <article className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
                      <p className="text-xs uppercase tracking-[0.14em] text-amber-700">Not do</p>
                      <p className="text-lg font-bold text-amber-800">
                        {tasksQuery.data?.resumeTaches.pending ?? 0}
                      </p>
                    </article>
                    <article className="rounded-xl bg-rose-50 px-3 py-2.5 ring-1 ring-rose-200">
                      <p className="text-xs uppercase tracking-[0.14em] text-rose-700">Retard</p>
                      <p className="text-lg font-bold text-rose-800">
                        {tasksQuery.data?.resumeTaches.overdue ?? 0}
                      </p>
                    </article>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        statusBadgeClass(
                          tasksQuery.data?.chantierStatutAuto ?? activeChantier.statutAuto ?? 'EN_ATTENTE',
                        ),
                      )}
                    >
                      Statut chantier:{' '}
                      {
                        chantierAutoLabel[
                          tasksQuery.data?.chantierStatutAuto ??
                            activeChantier.statutAuto ??
                            'EN_ATTENTE'
                        ]
                      }
                    </span>
                  </div>

                  {taskList.length === 0 ? (
                    <div className="rounded-xl bg-stone-50 px-4 py-8 text-center text-sm text-slate-500">
                      Aucune tache pour ce chantier.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {taskList.map((task) => (
                        <div key={task.id} className="rounded-xl border border-stone-200 bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-[260px] flex-1 items-start gap-3">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={(event) =>
                                  toggleDoneMutation.mutate({
                                    taskId: task.id,
                                    done: event.target.checked,
                                  })
                                }
                                className="mt-1 h-4 w-4 rounded border-stone-300 text-sky-700 focus:ring-sky-500"
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{task.libelle}</p>
                                <p className="mt-1 text-xs text-slate-600">
                                  {task.description || 'Sans description'}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <Calendar size={12} />
                                    Debut: {task.dateDebut ? formatDate(task.dateDebut) : '-'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <Calendar size={12} />
                                    Fin: {task.dateFin ? formatDate(task.dateFin) : '-'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <ClipboardList size={12} />
                                    {task.affectation?.type === 'SOUS_TRAITANT'
                                      ? `Sous-traitant: ${task.affectation.user?.prenom ?? ''} ${task.affectation.user?.nom ?? ''}`.trim()
                                      : task.affectation?.type === 'EQUIPE_INTERNE'
                                      ? `Equipe: ${task.affectation.equipe?.nom ?? '-'}`
                                      : 'Non affectee'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                  task.done
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700',
                                )}
                              >
                                {taskStatusLabel[task.statut]}
                              </span>
                              <button
                                onClick={() => openEdit(task)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-slate-600 hover:bg-stone-50"
                                title="Modifier"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Supprimer la tache "${task.libelle}" ?`)) {
                                    deleteMutation.mutate(task.id);
                                  }
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                                title="Supprimer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingTask ? 'Modifier tache' : 'Nouvelle tache'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTask(null);
                  setForm(emptyForm);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-slate-500 hover:bg-stone-50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Libelle tache
                  </span>
                  <input
                    required
                    value={form.libelle}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, libelle: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Affectation
                  </span>
                  <select
                    value={form.assigneeType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        assigneeType: event.target.value as TaskAssigneeType,
                        sousTraitantId: '',
                        equipeId: '',
                      }))
                    }
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                  >
                    <option value="AUCUNE">Non affectee</option>
                    <option value="SOUS_TRAITANT">Sous-traitant</option>
                    <option value="EQUIPE_INTERNE">Equipe interne</option>
                  </select>
                </label>
              </div>

              {form.assigneeType === 'SOUS_TRAITANT' ? (
                <label className="space-y-1 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Choisir sous-traitant
                  </span>
                  <select
                    required
                    value={form.sousTraitantId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sousTraitantId: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                  >
                    <option value="">Selectionner</option>
                    {(assignmentOptionsQuery.data?.sousTraitants ?? []).map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.prenom} {st.nom}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {form.assigneeType === 'EQUIPE_INTERNE' ? (
                <label className="space-y-1 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Choisir equipe interne
                  </span>
                  <select
                    required
                    value={form.equipeId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        equipeId: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                  >
                    <option value="">Selectionner</option>
                    {(assignmentOptionsQuery.data?.equipesInternes ?? []).map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nom}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="space-y-1 block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Description
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Date debut
                  </span>
                  <input
                    type="date"
                    value={form.dateDebut}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dateDebut: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Date fin
                  </span>
                  <input
                    type="date"
                    value={form.dateFin}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dateFin: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                  />
                </label>
              </div>

              {submitMutation.error ? (
                <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {getApiErrorMessage(
                    submitMutation.error,
                    'Impossible d enregistrer cette tache.',
                  )}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTask(null);
                    setForm(emptyForm);
                  }}
                  className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-stone-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckSquare size={16} />
                  )}
                  {editingTask ? 'Mettre a jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {tasksQuery.error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getApiErrorMessage(tasksQuery.error, 'Impossible de charger les taches du chantier.')}
        </section>
      ) : null}
    </div>
  );
}
