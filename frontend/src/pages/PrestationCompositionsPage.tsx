import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2, Pencil, Plus, Search, Trash2, ListPlus, Edit3 } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Select, Input, SubmitButton } from '@/components/ui/Form';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import PageHero from '@/components/PageHero';
import type {
  CatalogueCategorieWithCompositions,
  Materiau,
  Prestation,
  ServiceMainOeuvre,
} from '@/types';

type CompositionRow = {
  key: string;
  compositionId: number;
  prestationId: number;
  prestationNom: string;
  prestationUnite: string;
  categorieNom: string;
  sousCategorieNom: string;
  typeComposant: string;
  composantNom: string;
  composantUnite: string;
  quantiteParUnite: number;
  coutUnitaire: number | null;
  coutParUnite: number | null;
  materiauId: number | null;
  serviceMainOeuvreId: number | null;
};

type PrestationChoice = {
  id: number;
  nom: string;
  categorieNom: string;
  sousCategorieNom: string;
};

type CompositionFormState = {
  prestationId: string;
  materiauId: string;
  serviceMainOeuvreId: string;
  quantiteParUnite: string;
};

function createEmptyForm(prestationId = ''): CompositionFormState {
  return {
    prestationId,
    materiauId: '',
    serviceMainOeuvreId: '',
    quantiteParUnite: '1',
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
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
    const apiMessage = error.response.data.message;
    if (Array.isArray(apiMessage)) return apiMessage.join(', ');
    if (typeof apiMessage === 'string') return apiMessage;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

function flattenCompositions(catalogue: CatalogueCategorieWithCompositions[]): CompositionRow[] {
  const rows: CompositionRow[] = [];

  const pushRowsForPrestation = (
    prestation: Prestation,
    categorieNom: string,
    sousCategorieNom: string,
  ) => {
    for (const composition of prestation.compositions ?? []) {
      const materiau = composition.materiau;
      const service = composition.serviceMainOeuvre;

      let typeComposant = 'Inconnu';
      let composantNom = '-';
      let composantUnite = '-';
      let coutUnitaire: number | null = null;

      if (materiau && service) {
        typeComposant = 'Mixte';
        composantNom = `${materiau.nom} + ${service.nom}`;
        composantUnite = `${materiau.unite} + ${service.unite}`;
        coutUnitaire = materiau.prixAchatFixe + service.prixUnitaire;
      } else if (materiau) {
        typeComposant = 'Materiau';
        composantNom = materiau.nom;
        composantUnite = materiau.unite;
        coutUnitaire = materiau.prixAchatFixe;
      } else if (service) {
        typeComposant = "Main d'oeuvre";
        composantNom = service.nom;
        composantUnite = service.unite;
        coutUnitaire = service.prixUnitaire;
      }

      rows.push({
        key: `${composition.id}-${prestation.id}-${rows.length}`,
        compositionId: composition.id,
        prestationId: prestation.id,
        prestationNom: prestation.nom,
        prestationUnite: prestation.unite,
        categorieNom,
        sousCategorieNom,
        typeComposant,
        composantNom,
        composantUnite,
        quantiteParUnite: composition.quantiteParUnite,
        coutUnitaire,
        coutParUnite:
          coutUnitaire === null ? null : coutUnitaire * composition.quantiteParUnite,
        materiauId: composition.materiau?.id ?? null,
        serviceMainOeuvreId: composition.serviceMainOeuvre?.id ?? null,
      });
    }
  };

  for (const categorie of catalogue) {
    for (const prestation of categorie.prestations ?? []) {
      pushRowsForPrestation(prestation, categorie.nom, '-');
    }

    for (const sousCategorie of categorie.sousCategories ?? []) {
      for (const prestation of sousCategorie.prestations ?? []) {
        pushRowsForPrestation(prestation, categorie.nom, sousCategorie.nom);
      }
    }
  }

  return rows.sort((a, b) => {
    const byPrestation = a.prestationNom.localeCompare(b.prestationNom, 'fr', {
      sensitivity: 'base',
    });
    if (byPrestation !== 0) return byPrestation;
    return a.compositionId - b.compositionId;
  });
}

function flattenPrestations(catalogue: CatalogueCategorieWithCompositions[]): PrestationChoice[] {
  const byId = new Map<number, PrestationChoice>();

  for (const categorie of catalogue) {
    for (const prestation of categorie.prestations ?? []) {
      byId.set(prestation.id, {
        id: prestation.id,
        nom: prestation.nom,
        categorieNom: categorie.nom,
        sousCategorieNom: '-',
      });
    }

    for (const sousCategorie of categorie.sousCategories ?? []) {
      for (const prestation of sousCategorie.prestations ?? []) {
        byId.set(prestation.id, {
          id: prestation.id,
          nom: prestation.nom,
          categorieNom: categorie.nom,
          sousCategorieNom: sousCategorie.nom,
        });
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }),
  );
}

export default function PrestationCompositionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingRow, setEditingRow] = useState<CompositionRow | null>(null);
  const [form, setForm] = useState<CompositionFormState>(() => createEmptyForm());
  const [deleteTarget, setDeleteTarget] = useState<CompositionRow | null>(null);

  const {
    data: catalogue,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['catalogue-full', 'prestation-compositions'],
    queryFn: async () => {
      const res = await api.get('/prestations/catalogue');
      return res.data as CatalogueCategorieWithCompositions[];
    },
  });

  const { data: materiaux = [] } = useQuery({
    queryKey: ['materiaux', 'composition-editor'],
    enabled: isAdmin && showEditor,
    queryFn: async () => {
      const res = await api.get('/materiaux', {
        params: { page: 1, limit: 500, actif: true },
      });

      if (Array.isArray(res.data?.data)) {
        return res.data.data as Materiau[];
      }
      if (Array.isArray(res.data)) {
        return res.data as Materiau[];
      }
      return [] as Materiau[];
    },
  });

  const { data: servicesMo = [] } = useQuery({
    queryKey: ['services-mo', 'composition-editor'],
    enabled: isAdmin && showEditor,
    queryFn: async () => {
      const res = await api.get('/services-mo', {
        params: { page: 1, limit: 500, actif: true },
      });

      if (Array.isArray(res.data?.data)) {
        return res.data.data as ServiceMainOeuvre[];
      }
      if (Array.isArray(res.data)) {
        return res.data as ServiceMainOeuvre[];
      }
      return [] as ServiceMainOeuvre[];
    },
  });

  const rows = useMemo(
    () => flattenCompositions(catalogue ?? []),
    [catalogue],
  );

  const prestationChoices = useMemo(
    () => flattenPrestations(catalogue ?? []),
    [catalogue],
  );

  useEffect(() => {
    if (!showEditor) return;
    if (editingRow) return;
    if (form.prestationId) return;

    const firstPrestation = prestationChoices[0]?.id;
    if (firstPrestation) {
      setForm((current) => ({ ...current, prestationId: firstPrestation.toString() }));
    }
  }, [showEditor, editingRow, prestationChoices, form.prestationId]);

  async function refreshCatalogueQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['catalogue-full'] }),
      queryClient.invalidateQueries({ queryKey: ['catalogue-full', 'prestation-compositions'] }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: (payload: {
      prestationId: number;
      quantiteParUnite: number;
      materiauId?: number;
      serviceMainOeuvreId?: number;
    }) => api.post('/prestations/compositions', payload),
    onSuccess: async () => {
      await refreshCatalogueQueries();
      setShowEditor(false);
      setEditingRow(null);
      setForm(createEmptyForm());
      toast.success('Composition créée', 'La composition a été ajoutée avec succès.');
    },
    onError: (error) => {
      toast.error('Échec de la création', getApiErrorMessage(error, 'Erreur lors de la création.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        quantiteParUnite: number;
        materiauId: number | null;
        serviceMainOeuvreId: number | null;
      };
    }) => api.patch(`/prestations/compositions/${id}`, payload),
    onSuccess: async () => {
      await refreshCatalogueQueries();
      setShowEditor(false);
      setEditingRow(null);
      setForm(createEmptyForm());
      toast.success('Composition modifiée', 'Les modifications ont été enregistrées.');
    },
    onError: (error) => {
      toast.error('Échec de la modification', getApiErrorMessage(error, 'Erreur lors de la mise à jour.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/prestations/compositions/${id}`),
    onSuccess: async () => {
      await refreshCatalogueQueries();
      setDeleteTarget(null);
      toast.success('Composition supprimée', 'La composition a été retirée définitivement.');
    },
    onError: (error) => {
      toast.error('Échec de la suppression', getApiErrorMessage(error, 'Erreur lors de la suppression.'));
    },
  });

  function openCreateEditor() {
    setEditingRow(null);
    setForm(createEmptyForm(prestationChoices[0]?.id?.toString() ?? ''));
    setShowEditor(true);
  }

  function openEditEditor(row: CompositionRow) {
    setEditingRow(row);
    setForm({
      prestationId: row.prestationId.toString(),
      materiauId: row.materiauId ? row.materiauId.toString() : '',
      serviceMainOeuvreId: row.serviceMainOeuvreId ? row.serviceMainOeuvreId.toString() : '',
      quantiteParUnite: row.quantiteParUnite.toString(),
    });
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingRow(null);
    setForm(createEmptyForm());
  }

  function handleDelete(row: CompositionRow) {
    if (deleteMutation.isPending) return;
    setDeleteTarget(row);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.compositionId);
  }

  function handleEditorSubmit(e: React.FormEvent) {
    e.preventDefault();

    const prestationId = Number(form.prestationId);
    const quantiteParUnite = Number(form.quantiteParUnite);
    const materiauId = form.materiauId ? Number(form.materiauId) : null;
    const serviceMainOeuvreId = form.serviceMainOeuvreId
      ? Number(form.serviceMainOeuvreId)
      : null;

    if (!Number.isInteger(prestationId) || prestationId <= 0) {
      toast.warning('Champ manquant', 'Veuillez sélectionner une prestation.');
      return;
    }
    if (!Number.isFinite(quantiteParUnite) || quantiteParUnite <= 0) {
      toast.warning('Champ invalide', 'La quantité par unité doit être strictement positive.');
      return;
    }
    if (!materiauId && !serviceMainOeuvreId) {
      toast.warning('Champ manquant', 'Sélectionnez au moins un matériau ou un service main d\'œuvre.');
      return;
    }

    if (editingRow) {
      updateMutation.mutate({
        id: editingRow.compositionId,
        payload: {
          quantiteParUnite,
          materiauId,
          serviceMainOeuvreId,
        },
      });
      return;
    }

    createMutation.mutate({
      prestationId,
      quantiteParUnite,
      materiauId: materiauId ?? undefined,
      serviceMainOeuvreId: serviceMainOeuvreId ?? undefined,
    });
  }

  const editorError = createMutation.error || updateMutation.error;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((row) => {
      return (
        row.compositionId.toString().includes(keyword) ||
        row.prestationId.toString().includes(keyword) ||
        row.prestationNom.toLowerCase().includes(keyword) ||
        row.categorieNom.toLowerCase().includes(keyword) ||
        row.sousCategorieNom.toLowerCase().includes(keyword) ||
        row.typeComposant.toLowerCase().includes(keyword) ||
        row.composantNom.toLowerCase().includes(keyword)
      );
    });
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <PageHero
        icon={<BookOpen size={22} />}
        title="Prestations et leurs compositions"
        subtitle={`Table prestations_compositions: ${filteredRows.length} ligne(s)`}
        accent="orange"
        actions={
          isAdmin ? (
            <button
              onClick={openCreateEditor}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-all font-medium text-sm shadow-sm"
            >
              <Plus size={16} /> Nouvelle composition
            </button>
          ) : undefined
        }
      />

      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Mode lecture seule : les modifications sont réservées aux admins.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une composition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/20 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-orange-600" size={32} />
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-slate-500">
            <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">
              Impossible de charger les compositions
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">Aucune composition trouvee</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Prestation
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Categorie
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Sous-categorie
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Type composant
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Composant
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Qte / unite presta
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cout unitaire
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cout total / unite presta
                  </th>
                  {isAdmin && (
                    <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">#{row.compositionId}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{row.prestationNom}</p>
                      <p className="text-xs text-slate-500">ID prestation: {row.prestationId}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.categorieNom}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.sousCategorieNom}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.typeComposant}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{row.composantNom}</p>
                      <p className="text-xs text-slate-500">Unite: {row.composantUnite}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">
                      {row.quantiteParUnite} / {row.prestationUnite}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-700">
                      {row.coutUnitaire === null ? '-' : formatCurrency(row.coutUnitaire)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-slate-900">
                      {row.coutParUnite === null ? '-' : formatCurrency(row.coutParUnite)}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditEditor(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            title="Modifier"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showEditor && isAdmin}
        onClose={closeEditor}
        title={editingRow ? 'Modifier la composition' : 'Nouvelle composition'}
        icon={editingRow ? Edit3 : ListPlus}
        accent="orange"
        maxWidth="2xl"
      >
        <form onSubmit={handleEditorSubmit} className="p-6 space-y-5">
          <Select
            label="Prestation"
            value={form.prestationId}
            onChange={(e) => setForm((current) => ({ ...current, prestationId: e.target.value }))}
            disabled={Boolean(editingRow)}
            options={[
              { value: '', label: 'Choisir une prestation' },
              ...prestationChoices.map((prestation) => ({
                value: prestation.id,
                label: `${prestation.nom} - ${prestation.categorieNom}${prestation.sousCategorieNom !== '-' ? ` / ${prestation.sousCategorieNom}` : ''}`
              }))
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Matériau (optionnel)"
              value={form.materiauId}
              onChange={(e) => setForm((current) => ({ ...current, materiauId: e.target.value }))}
              options={[
                { value: '', label: 'Aucun matériau' },
                ...materiaux.map((materiau) => ({ value: materiau.id, label: materiau.nom }))
              ]}
            />

            <Select
              label="Main d'oeuvre (optionnel)"
              value={form.serviceMainOeuvreId}
              onChange={(e) => setForm((current) => ({ ...current, serviceMainOeuvreId: e.target.value }))}
              options={[
                { value: '', label: 'Aucun service MO' },
                ...servicesMo.map((service) => ({ value: service.id, label: service.nom }))
              ]}
            />
          </div>

          <Input
            label="Quantité par unité de prestation"
            type="number"
            min="0.0001"
            step="0.0001"
            value={form.quantiteParUnite}
            onChange={(e) => setForm((current) => ({ ...current, quantiteParUnite: e.target.value }))}
          />

          {editorError && (
            <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              {getApiErrorMessage(editorError, 'Erreur lors de la sauvegarde de la composition.')}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeEditor}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              Annuler
            </button>
            <SubmitButton isLoading={isSaving} icon={editingRow ? Pencil : Plus}>
              {editingRow ? 'Enregistrer' : 'Créer la composition'}
            </SubmitButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer la composition ?"
        message={
          <>
            Vous êtes sur le point de supprimer la composition de la prestation
            {deleteTarget ? <strong className="text-slate-800"> {deleteTarget.prestationNom} </strong> : ''}.
            Cette action est irréversible.
          </>
        }
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
