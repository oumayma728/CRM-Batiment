import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CategoriePrestation, TypeProjet } from '@/types';
import { cn } from '@/lib/utils';
import PageHero from '@/components/PageHero';
import {
  Plus, Search, Edit, Trash2, FolderKanban, Loader2, CheckSquare, Square, AlertCircle, Edit3,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, TextArea, SubmitButton } from '@/components/ui/Form';
import { useToast, getErrorMessage } from '@/components/ui/Toast';

interface TypeProjetForm {
  nom: string;
  description: string;
  categorieIds: number[];
}

type CreateMode = 'COMPLEXE' | 'SIMPLE';

interface SimpleTaskSelection {
  category: CategoriePrestation;
  linkedTypeIds: number[];
}

const createEmptyForm = (): TypeProjetForm => ({
  nom: '',
  description: '',
  categorieIds: [],
});

export default function TypesProjetPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('COMPLEXE');
  const [editingItem, setEditingItem] = useState<TypeProjet | null>(null);
  const [form, setForm] = useState<TypeProjetForm>(() => createEmptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showSimpleTaskModal, setShowSimpleTaskModal] = useState(false);
  const [editingSimpleTask, setEditingSimpleTask] = useState<SimpleTaskSelection | null>(null);
  const [simpleTaskForm, setSimpleTaskForm] = useState({ nom: '', description: '' });
  const [deleteSimpleTask, setDeleteSimpleTask] = useState<SimpleTaskSelection | null>(null);

  const { data: types, isLoading, isError: typesError } = useQuery({
    queryKey: ['types-projet'],
    queryFn: async () => {
      const res = await api.get('/types-projet');
      return (res.data ?? []) as TypeProjet[];
    },
  });

  const { data: categories, isLoading: loadingCategories, isError: categoriesError } = useQuery({
    queryKey: ['types-projet-categories'],
    queryFn: async () => {
      const res = await api.get('/prestations/categories');
      return (res.data ?? []) as CategoriePrestation[];
    },
  });

  const categoriesList = categories ?? [];
  const filteredTypes = (types ?? []).filter(
    (t) =>
      t.nom.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.categories ?? []).some((category) =>
        (category.categorie?.nom ?? '').toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const complexTypes = filteredTypes.filter((typeProjet) => (typeProjet.categories?.length ?? 0) > 1);
  const simpleTasks = categoriesList.filter(
    (categorie) =>
      categorie.nom.toLowerCase().includes(search.toLowerCase()) ||
      (categorie.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );
  const simpleTypesByCategory = (types ?? []).reduce(
    (acc, typeProjet) => {
      const links = typeProjet.categories ?? [];
      if (links.length !== 1) return acc;

      const categoryId = links[0]?.categorieId;
      if (!Number.isInteger(categoryId)) return acc;

      const entry = acc.get(categoryId) ?? { clients: 0, linkedTypeIds: [] as number[] };
      entry.clients += typeProjet._count?.clients ?? 0;
      entry.linkedTypeIds.push(typeProjet.id);
      acc.set(categoryId, entry);
      return acc;
    },
    new Map<number, { clients: number; linkedTypeIds: number[] }>(),
  );

  const toast = useToast();

  const createMutation = useMutation({
    mutationFn: (body: TypeProjetForm) => api.post('/types-projet', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['types-projet'] });
      closeModal();
      toast.success('Type de projet créé', 'Le type a été ajouté avec succès.');
    },
    onError: (err) => { toast.error('Échec de la création', getErrorMessage(err)); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: TypeProjetForm }) => api.patch(`/types-projet/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['types-projet'] });
      closeModal();
      toast.success('Type de projet modifié', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => { toast.error('Échec de la modification', getErrorMessage(err)); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/types-projet/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['types-projet'] });
      setDeleteId(null);
      toast.success('Type de projet supprimé', 'Le type a été retiré définitivement.');
    },
    onError: (err) => { toast.error('Échec de la suppression', getErrorMessage(err)); },
  });

  const createSimpleTaskMutation = useMutation({
    mutationFn: async (body: { nom: string; description?: string }) => {
      const categoryRes = await api.post('/prestations/categories', body);
      const categoryId = Number(categoryRes.data?.id);

      if (Number.isInteger(categoryId) && categoryId > 0) {
        try {
          await api.post('/types-projet', {
            nom: body.nom,
            description: body.description,
            categorieIds: [categoryId],
          });
        } catch (error) {
          await api.delete(`/prestations/categories/${categoryId}`).catch(() => undefined);
          throw error;
        }
      }

      return categoryRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['types-projet-categories'] });
      queryClient.invalidateQueries({ queryKey: ['types-projet'] });
      closeModal();
      toast.success('Tâche simple créée', 'La tâche a été ajoutée avec succès.');
    },
    onError: (err) => { toast.error('Échec de la création', getErrorMessage(err)); },
  });

  const updateSimpleTaskMutation = useMutation({
    mutationFn: async ({
      id,
      body,
      linkedTypeIds,
    }: {
      id: number;
      body: { nom: string; description?: string };
      linkedTypeIds: number[];
    }) => {
      await api.patch(`/prestations/categories/${id}`, body);
      if (linkedTypeIds.length) {
        await Promise.all(
          linkedTypeIds.map((typeId) =>
            api.patch(`/types-projet/${typeId}`, {
              nom: body.nom,
              description: body.description,
              categorieIds: [id],
            }),
          ),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['types-projet-categories'] });
      queryClient.invalidateQueries({ queryKey: ['types-projet'] });
      closeSimpleTaskModal();
      toast.success('Tâche simple modifiée', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => { toast.error('Échec de la modification', getErrorMessage(err)); },
  });

  const deleteSimpleTaskMutation = useMutation({
    mutationFn: async ({ categoryId, linkedTypeIds }: { categoryId: number; linkedTypeIds: number[] }) => {
      if (linkedTypeIds.length) {
        await Promise.all(linkedTypeIds.map((typeId) => api.delete(`/types-projet/${typeId}`)));
      }
      await api.delete(`/prestations/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['types-projet-categories'] });
      queryClient.invalidateQueries({ queryKey: ['types-projet'] });
      setDeleteSimpleTask(null);
      toast.success('Tâche simple supprimée', 'La tâche a été retirée définitivement.');
    },
    onError: (err) => { toast.error('Échec de la suppression', getErrorMessage(err)); },
  });

  function extractCategorieIds(item: TypeProjet) {
    const projectCategories = Array.isArray(item.categories) ? item.categories : [];
    return projectCategories
      .map((category) => Number(category?.categorieId))
      .filter((id): id is number => Number.isInteger(id) && id > 0);
  }

  function openCreate() {
    createMutation.reset();
    createSimpleTaskMutation.reset();
    updateMutation.reset();
    setCreateMode('COMPLEXE');
    setEditingItem(null);
    setForm(createEmptyForm());
    setShowModal(true);
  }

  function openEdit(item: TypeProjet) {
    createMutation.reset();
    createSimpleTaskMutation.reset();
    updateMutation.reset();
    setCreateMode('COMPLEXE');
    setEditingItem(item);
    setForm({
      nom: item.nom ?? '',
      description: item.description ?? '',
      categorieIds: extractCategorieIds(item),
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingItem(null);
    setCreateMode('COMPLEXE');
    setForm(createEmptyForm());
  }

  function openSimpleTaskEdit(categorie: CategoriePrestation, linkedTypeIds: number[]) {
    updateSimpleTaskMutation.reset();
    setEditingSimpleTask({ category: categorie, linkedTypeIds });
    setSimpleTaskForm({
      nom: categorie.nom ?? '',
      description: categorie.description ?? '',
    });
    setShowSimpleTaskModal(true);
  }

  function closeSimpleTaskModal() {
    setShowSimpleTaskModal(false);
    setEditingSimpleTask(null);
    setSimpleTaskForm({ nom: '', description: '' });
  }

  function handleSimpleTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSimpleTask) return;
    updateSimpleTaskMutation.mutate({
      id: editingSimpleTask.category.id,
      body: {
        nom: simpleTaskForm.nom.trim(),
        description: simpleTaskForm.description.trim() || undefined,
      },
      linkedTypeIds: editingSimpleTask.linkedTypeIds,
    });
  }

  function toggleCategorie(categorieId: number) {
    setForm((current) => ({
      ...current,
      categorieIds: current.categorieIds.includes(categorieId)
        ? current.categorieIds.filter((id) => id !== categorieId)
        : [...current.categorieIds, categorieId],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mustHaveMultipleCategories = editingItem !== null || createMode === 'COMPLEXE';
    if (mustHaveMultipleCategories && form.categorieIds.length < 2) {
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, body: form });
    } else if (createMode === 'SIMPLE') {
      createSimpleTaskMutation.mutate({
        nom: form.nom.trim(),
        description: form.description.trim() || undefined,
      });
    } else {
      createMutation.mutate(form);
    }
  }

  function renderTypesTable(items: TypeProjet[]) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">ID</th>
              <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Nom</th>
              <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Description</th>
              <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Categories</th>
              <th className="text-center px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Clients</th>
              <th className="text-right px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-primary-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <span className="text-xs font-mono text-gray-400">#{item.id}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
                      <FolderKanban size={16} />
                    </div>
                    <span className="font-semibold text-gray-900 text-[14px]">{item.nom}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[13px] text-gray-500 max-w-xs truncate">
                  {item.description || <span className="text-gray-300">-</span>}
                </td>
                <td className="px-6 py-4">
                  {(item.categories?.length ?? 0) === 0 ? (
                    <span className="text-[13px] text-gray-300">Aucune</span>
                  ) : (
                    <div className="flex max-w-sm flex-wrap gap-1.5">
                      {(item.categories ?? []).slice(0, 3).map((link) => (
                        <span
                          key={`${item.id}-${link.categorieId}`}
                          className="inline-flex items-center rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          {link.categorie?.nom ?? `#${link.categorieId}`}
                        </span>
                      ))}
                      {(item.categories?.length ?? 0) > 3 && (
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                          +{(item.categories?.length ?? 0) - 3}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold',
                      (item._count?.clients ?? 0) > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500',
                    )}
                  >
                    {item._count?.clients ?? 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Modifier"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(item.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSimpleTasksTable(items: CategoriePrestation[]) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">ID</th>
              <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Tache simple</th>
              <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Description</th>
              <th className="text-center px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Clients</th>
              <th className="text-right px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const linkedEntry = simpleTypesByCategory.get(item.id);
              const clientsCount = linkedEntry?.clients ?? 0;
              const linkedTypeIds = linkedEntry?.linkedTypeIds ?? [];

              return (
                <tr key={item.id} className="hover:bg-primary-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-gray-400">#{item.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <FolderKanban size={16} />
                      </div>
                      <span className="font-semibold text-gray-900 text-[14px]">{item.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-500 max-w-xs truncate">
                    {item.description || <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold',
                        clientsCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500',
                      )}
                    >
                      {clientsCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openSimpleTaskEdit(item, linkedTypeIds)}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Modifier"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteSimpleTask({ category: item, linkedTypeIds })}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const saving = createMutation.isPending || createSimpleTaskMutation.isPending || updateMutation.isPending;
  const simpleTaskSaving = updateSimpleTaskMutation.isPending;
  const isComplexMode = editingItem !== null || createMode === 'COMPLEXE';
  const invalidComplexSelection = isComplexMode && form.categorieIds.length < 2;

  return (
    <div className="space-y-4">
      <PageHero
        icon={<FolderKanban size={22} />}
        title="Types de Projet"
        subtitle={`${complexTypes.length} tâche(s) complexe(s) · ${simpleTasks.length} tâche(s) simple(s)`}
        accent="indigo"
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-all font-medium text-sm shadow-sm"
          >
            <Plus size={16} /> Nouveau type
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un type de projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/20 transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        </div>
      ) : typesError ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-16 text-center text-red-600">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
              <AlertCircle size={32} />
            </div>
            <p className="text-lg font-semibold text-red-700">Impossible de charger les types de projet</p>
            <p className="mt-1 text-sm text-red-500">
              L&apos;API a retourne une erreur. Verifiez le backend ou rechargez la page.
            </p>
          </div>
        </div>
      ) : complexTypes.length === 0 && simpleTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="text-center py-20 text-gray-500">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderKanban size={32} className="text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-700">Aucune tache</p>
            <p className="text-sm text-gray-400 mt-1">Ajustez la recherche ou ajoutez un nouveau type de projet.</p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 text-primary-600 font-medium text-sm hover:text-primary-700"
            >
              <Plus size={16} /> Ajouter un type
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50/40">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Taches complexes</h2>
                <p className="text-xs text-gray-500">Un grand projet avec plusieurs categories</p>
              </div>
              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {complexTypes.length}
              </span>
            </div>
            {complexTypes.length === 0 ? (
              <div className="px-6 py-10 text-sm text-gray-500">Aucune tache complexe pour ce filtre.</div>
            ) : (
              renderTypesTable(complexTypes)
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-50/40">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Taches simples</h2>
                <p className="text-xs text-gray-500">Meme liste que les categories (1 categorie = 1 tache simple)</p>
              </div>
              <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {simpleTasks.length}
              </span>
            </div>
            {categoriesError ? (
              <div className="px-6 py-10 text-sm text-red-600">Impossible de charger les categories.</div>
            ) : simpleTasks.length === 0 ? (
              <div className="px-6 py-10 text-sm text-gray-500">Aucune tache simple pour ce filtre.</div>
            ) : (
              renderSimpleTasksTable(simpleTasks)
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Complex Type Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingItem ? 'Modifier le type complexe' : 'Nouveau type de projet'}
        icon={editingItem ? Edit3 : FolderKanban}
        accent="slate"
        maxWidth="lg"
      >
        <div className="flex flex-col max-h-[70vh]">
          <form id="type-projet-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            <Input
              label="Nom du type"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Rénovation salle de bain"
            />
            <TextArea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Description optionnelle du type de travaux..."
            />

            {!editingItem && (
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Type de projet</label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2">
                  <button
                    type="button"
                    onClick={() => setCreateMode('COMPLEXE')}
                    className={cn(
                      'rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                      createMode === 'COMPLEXE'
                        ? 'bg-slate-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-slate-50',
                    )}
                  >
                    Complexe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode('SIMPLE');
                      setForm((current) => ({ ...current, categorieIds: [] }));
                    }}
                    className={cn(
                      'rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                      createMode === 'SIMPLE'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-emerald-50',
                    )}
                  >
                    Simple
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Complexe = plusieurs catégories. Simple = nom + description seulement.
                </p>
              </div>
            )}

            {isComplexMode ? (
              <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-[13px] font-semibold text-gray-700">Catégories compatibles</label>
                <span className="text-[11px] font-semibold text-slate-600">
                  {form.categorieIds.length} sélectionnée{form.categorieIds.length > 1 ? 's' : ''}
                </span>
              </div>
              {loadingCategories ? (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 py-6">
                  <Loader2 size={18} className="animate-spin text-slate-600" />
                </div>
              ) : categoriesError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-600">
                  Impossible de charger les catégories pour le moment.
                </div>
              ) : categoriesList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  Aucune catégorie active disponible.
                </div>
              ) : (
                <div className="grid gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 md:grid-cols-2">
                  {categoriesList.map((categorie) => {
                    const selected = form.categorieIds.includes(categorie.id);

                    return (
                      <button
                        key={categorie.id}
                        type="button"
                        onClick={() => toggleCategorie(categorie.id)}
                        className={cn(
                          'flex items-start gap-2 rounded-xl border px-6 py-4 text-left transition-all',
                          selected
                            ? 'border-slate-300 bg-slate-50 text-slate-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-slate-200',
                        )}
                      >
                        <span className="mt-0.5 text-slate-600">
                          {selected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{categorie.nom}</span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {categorie.description || 'Catégorie métier existante'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Sélectionnez au moins 2 catégories pour un type complexe.
              </p>
              {invalidComplexSelection && (
                <p className="mt-2 text-xs text-red-600">
                  Un type complexe doit avoir au minimum 2 catégories.
                </p>
              )}
            </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-xs text-emerald-700">
                En mode simple, la tâche sera créée avec nom + description.
              </div>
            )}

            {(createMutation.error || createSimpleTaskMutation.error || updateMutation.error) && (
              <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                Une erreur est survenue. Veuillez réessayer.
              </p>
            )}
          </form>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={closeModal}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              Annuler
            </button>
            <SubmitButton
              isLoading={saving}
              icon={editingItem ? Edit3 : Plus}
              disabled={saving || invalidComplexSelection}
              type="submit"
              form="type-projet-form"
            >
              {editingItem ? 'Enregistrer' : 'Créer'}
            </SubmitButton>
          </div>
        </div>
      </Modal>

      {/* Edit Simple Task Modal */}
      <Modal
        isOpen={showSimpleTaskModal && !!editingSimpleTask}
        onClose={closeSimpleTaskModal}
        title="Modifier la tâche simple"
        icon={Edit3}
        accent="green"
        maxWidth="lg"
      >
        <form id="simple-task-form" onSubmit={handleSimpleTaskSubmit} className="p-6 space-y-5">
          <Input
            label="Nom"
            required
            value={simpleTaskForm.nom}
            onChange={(e) => setSimpleTaskForm((current) => ({ ...current, nom: e.target.value }))}
          />
          <TextArea
            label="Description"
            value={simpleTaskForm.description}
            onChange={(e) => setSimpleTaskForm((current) => ({ ...current, description: e.target.value }))}
            rows={3}
          />
          {updateSimpleTaskMutation.error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              Échec de modification de la tâche simple.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeSimpleTaskModal}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              Annuler
            </button>
            <SubmitButton isLoading={simpleTaskSaving} icon={Edit3}>
              Enregistrer
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Delete Simple Task Confirmation */}
      <Modal
        isOpen={!!deleteSimpleTask}
        onClose={() => setDeleteSimpleTask(null)}
        title="Supprimer cette tâche simple ?"
        icon={Trash2}
        accent="slate"
        maxWidth="sm"
      >
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-600" size={24} />
          </div>
          <p className="text-sm text-gray-500 mb-6">
            La catégorie "{deleteSimpleTask?.category.nom}" et ses éléments associés seront désactivés.
          </p>
          {deleteSimpleTaskMutation.error && (
            <p className="mb-4 text-sm font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              Échec de suppression. Vérifiez les dépendances puis réessayez.
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteSimpleTask(null)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() =>
                deleteSimpleTask && deleteSimpleTaskMutation.mutate({
                  categoryId: deleteSimpleTask.category.id,
                  linkedTypeIds: deleteSimpleTask.linkedTypeIds,
                })
              }
              disabled={deleteSimpleTaskMutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleteSimpleTaskMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Complex Type Confirmation */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Supprimer ce type ?"
        icon={Trash2}
        accent="slate"
        maxWidth="sm"
      >
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-600" size={24} />
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Ce type de projet sera supprimé définitivement de la base de données.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
