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
  Edit3,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select, Input, TextArea, SubmitButton } from '@/components/ui/Form';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, getErrorMessage } from '@/components/ui/Toast';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import PageHero from '@/components/PageHero';
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
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedChantierId, setSelectedChantierId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TacheChantier | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<TacheChantier | null>(null);

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
      toast.success('Tâche créée', 'La tâche a été ajoutée avec succès.');
    },
    onError: (error) => {
      toast.error('Échec de la création', getErrorMessage(error, 'Erreur lors de la création.'));
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
      toast.success('Tâche mise à jour avec succès');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Erreur lors de la mise à jour de la tâche'));
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
      setDeleteTarget(null);
      toast.success('Tâche supprimée avec succès');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Erreur lors de la suppression de la tâche'));
    },
  });

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

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
      <PageHero
        icon={<CheckSquare size={22} />}
        title="Tâches par chantier et affectation"
        subtitle="Admin et chef de chantier peuvent ajouter, modifier, supprimer et cocher les tâches (do / not do)."
        accent="amber"
      />

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl bg-white p-3.5 shadow-sm border border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Chantiers</h2>
              <p className="text-xs text-slate-500">
                {chantiersQuery.data?.meta.total ?? 0} chantier(s)
              </p>
            </div>
            {chantiersQuery.isLoading ? (
              <Loader2 size={17} className="animate-spin text-amber-600" />
            ) : null}
          </div>

          <div className="relative mb-3">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher client ou référence chantier..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-1.5 text-sm outline-none focus:border-amber-400 focus:bg-white transition-all"
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
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-slate-200 bg-white hover:bg-slate-50',
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
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 border border-slate-100">
                Aucun chantier trouvé.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl bg-white p-3.5 shadow-sm border border-slate-200">
          {!activeChantier ? (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-8 text-center text-sm text-slate-500">
              Sélectionnez un chantier.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <HardHat size={18} className="text-amber-600" />
                    <h2 className="text-lg font-bold text-slate-900">{activeChantier.reference}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Client: {activeChantier.client?.prenom} {activeChantier.client?.nom}
                  </p>
                  <p className="text-xs text-slate-500">{activeChantier.adresse}</p>
                </div>
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Ajouter tâche
                </button>
              </div>

              {tasksQuery.isLoading ? (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-8 text-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Chargement des tâches...
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
                    <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 border border-slate-100">
                      Aucune tâche pour ce chantier.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {taskList.map((task) => (
                        <div key={task.id} className="rounded-xl border border-slate-200 bg-white p-3 hover:border-amber-200 transition-colors">
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
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
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
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                title="Modifier"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(task)}
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

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTask(null); setForm(emptyForm); }}
        title={editingTask ? 'Modifier tâche' : 'Nouvelle tâche'}
        icon={editingTask ? Edit3 : CheckSquare}
        accent="amber"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Libellé tâche"
              required
              value={form.libelle}
              onChange={(event) => setForm((current) => ({ ...current, libelle: event.target.value }))}
            />
            <Select
              label="Affectation"
              value={form.assigneeType}
              onChange={(event) => setForm((current) => ({
                ...current,
                assigneeType: event.target.value as TaskAssigneeType,
                sousTraitantId: '',
                equipeId: '',
              }))}
              options={[
                { value: 'AUCUNE', label: 'Non affectée' },
                { value: 'SOUS_TRAITANT', label: 'Sous-traitant' },
                { value: 'EQUIPE_INTERNE', label: 'Équipe interne' }
              ]}
            />
          </div>

          {form.assigneeType === 'SOUS_TRAITANT' && (
            <Select
              label="Choisir sous-traitant"
              required
              value={form.sousTraitantId}
              onChange={(event) => setForm((current) => ({ ...current, sousTraitantId: event.target.value }))}
              options={[
                { value: '', label: 'Sélectionner' },
                ...(assignmentOptionsQuery.data?.sousTraitants ?? []).map((st) => ({
                  value: st.id,
                  label: `${st.prenom} ${st.nom}`
                }))
              ]}
            />
          )}

          {form.assigneeType === 'EQUIPE_INTERNE' && (
            <Select
              label="Choisir équipe interne"
              required
              value={form.equipeId}
              onChange={(event) => setForm((current) => ({ ...current, equipeId: event.target.value }))}
              options={[
                { value: '', label: 'Sélectionner' },
                ...(assignmentOptionsQuery.data?.equipesInternes ?? []).map((eq) => ({
                  value: eq.id,
                  label: eq.nom
                }))
              ]}
            />
          )}

          <TextArea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Date début"
              type="date"
              value={form.dateDebut}
              onChange={(event) => setForm((current) => ({ ...current, dateDebut: event.target.value }))}
            />
            <Input
              label="Date fin"
              type="date"
              value={form.dateFin}
              onChange={(event) => setForm((current) => ({ ...current, dateFin: event.target.value }))}
            />
          </div>

          {submitMutation.error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 border border-rose-100">
              {getApiErrorMessage(submitMutation.error, 'Impossible d\'enregistrer cette tâche.')}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setShowModal(false); setEditingTask(null); setForm(emptyForm); }}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              Annuler
            </button>
            <SubmitButton isLoading={submitMutation.isPending} icon={editingTask ? Edit3 : CheckSquare}>
              {editingTask ? 'Mettre à jour' : 'Ajouter'}
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {tasksQuery.error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getApiErrorMessage(tasksQuery.error, 'Impossible de charger les taches du chantier.')}
        </section>
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer la tâche"
        message={
          deleteTarget
            ? `Êtes-vous sûr de vouloir supprimer la tâche "${deleteTarget.libelle}" ? Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
