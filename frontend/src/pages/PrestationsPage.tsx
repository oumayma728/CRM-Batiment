import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { CatalogueCategorieWithCompositions, OptionPrestation } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Plus, Search, Edit, Trash2, X, Loader2, BookOpen, Download,
  ChevronDown, ChevronRight, Layers, FolderOpen, Settings2, CheckCircle2,
} from 'lucide-react';

interface PrestationOptionFormChoix {
  nom: string;
  impactPrix: string;
}

interface PrestationOptionForm {
  nom: string;
  description: string;
  obligatoire: boolean;
  choix: PrestationOptionFormChoix[];
}

interface OptionPayload {
  prestationId: number;
  nom: string;
  description?: string;
  obligatoire: boolean;
  ordre: number;
  choix: Array<{
    nom: string;
    impactPrix: number;
    ordre: number;
  }>;
}

type UniteValue =
  | 'M2'
  | 'ML'
  | 'PIECE'
  | 'JOUR'
  | 'HEURE'
  | 'LITRE'
  | 'KG'
  | 'FORFAIT';

const UNITES: Array<{ value: UniteValue; label: string }> = [
  { value: 'M2', label: 'm²' },
  { value: 'ML', label: 'mètre linéaire' },
  { value: 'PIECE', label: 'pièce' },
  { value: 'JOUR', label: 'jour' },
  { value: 'HEURE', label: 'heure' },
  { value: 'LITRE', label: 'litre' },
  { value: 'KG', label: 'kg' },
  { value: 'FORFAIT', label: 'forfait' },
];

interface PrestationCreateFormState {
  nom: string;
  description: string;
  prixVenteMin: string;
  prixVenteMax: string;
  unite: UniteValue;
  categorieId: string;
  sousCategorieId: string;
}

const createEmptyPrestationForm = (): PrestationCreateFormState => ({
  nom: '',
  description: '',
  prixVenteMin: '',
  prixVenteMax: '',
  unite: 'M2',
  categorieId: '',
  sousCategorieId: '',
});

const createDefaultOptionForm = (): PrestationOptionForm => ({
  nom: '',
  description: '',
  obligatoire: true,
  choix: [{ nom: '', impactPrix: '' }],
});

function buildOptionsPayload(options: PrestationOptionForm[]) {
  const payload: OptionPayload[] = [];

  for (const [optionIndex, option] of options.entries()) {
    const optionNom = option.nom.trim();
    const optionDescription = option.description.trim();

    const hasChoiceContent = option.choix.some(
      (choice) => choice.nom.trim().length > 0 || choice.impactPrix.trim().length > 0,
    );
    const optionTouched =
      optionNom.length > 0 || optionDescription.length > 0 || hasChoiceContent;

    if (!optionTouched) {
      continue;
    }

    if (!optionNom) {
      return {
        error: `Option #${optionIndex + 1}: le nom de l'option est obligatoire.`,
      };
    }

    const choixPayload: OptionPayload['choix'] = [];
    for (const [choiceIndex, choice] of option.choix.entries()) {
      const choiceNom = choice.nom.trim();
      const impactRaw = choice.impactPrix.trim();
      const choiceTouched = choiceNom.length > 0 || impactRaw.length > 0;

      if (!choiceTouched) continue;

      if (!choiceNom) {
        return {
          error: `Option #${optionIndex + 1}: chaque valeur doit avoir un nom.`,
        };
      }

      let parsedImpact = 0;
      if (!option.obligatoire) {
        parsedImpact = Number((impactRaw || '0').replace(',', '.'));
        if (!Number.isFinite(parsedImpact)) {
          return {
            error: `Option #${optionIndex + 1}, valeur #${choiceIndex + 1}: prix option invalide.`,
          };
        }
      }

      choixPayload.push({
        nom: choiceNom,
        impactPrix: option.obligatoire ? 0 : parsedImpact,
        ordre: choiceIndex,
      });
    }

    if (choixPayload.length === 0) {
      return {
        error: `Option #${optionIndex + 1}: ajoutez au moins une valeur possible.`,
      };
    }

    payload.push({
      prestationId: 0,
      nom: optionNom,
      description: optionDescription || undefined,
      obligatoire: option.obligatoire,
      ordre: optionIndex,
      choix: choixPayload,
    });
  }

  return { payload };
}

export default function PrestationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<number>>(new Set());
  const [expandedPrestations, setExpandedPrestations] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PrestationCreateFormState>(() => createEmptyPrestationForm());
  const [optionsForm, setOptionsForm] = useState<PrestationOptionForm[]>([]);

  const { data: catalogue, isLoading } = useQuery({
    queryKey: ['catalogue-full'],
    queryFn: async () => {
      const res = await api.get('/prestations/catalogue');
      return res.data as CatalogueCategorieWithCompositions[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      prestationBody,
      options,
    }: {
      prestationBody: Record<string, unknown>;
      options: OptionPayload[];
    }) => {
      const prestationResponse = await api.post('/prestations', prestationBody);
      const prestationId = Number(prestationResponse.data?.id);

      if (!Number.isInteger(prestationId) || prestationId <= 0) {
        throw new Error('ID prestation invalide apres creation');
      }

      try {
        for (const optionPayload of options) {
          await api.post('/prestations/options', {
            ...optionPayload,
            prestationId,
          });
        }
      } catch (error) {
        // Rollback to avoid creating a prestation without its expected options.
        await api.delete(`/prestations/${prestationId}`).catch(() => undefined);
        throw error;
      }

      return {
        prestationId,
        optionsCount: options.length,
      };
    },
    onSuccess: ({ optionsCount }) => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-full'] });
      setShowModal(false);
      setForm(createEmptyPrestationForm());
      setOptionsForm([]);
      window.alert(
        optionsCount > 0
          ? `Prestation creee avec ${optionsCount} option(s). Cliquez sur la fleche de la prestation pour voir le raffinement.`
          : 'Prestation creee avec succes.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/prestations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogue-full'] }),
  });

  const deleteSelectedCategoryMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/prestations/categories/${id}`),
    onSuccess: (_, deletedCategoryId) => {
      queryClient.invalidateQueries({ queryKey: ['catalogue-full'] });
      setSelectedCatId((prev) => (prev === deletedCategoryId ? null : prev));
      setExpandedCats((prev) => {
        const next = new Set(prev);
        next.delete(deletedCategoryId);
        return next;
      });
      window.alert('Categorie supprimee avec succes.');
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        const apiMessage = (error.response?.data as { message?: string })?.message;
        if (apiMessage) {
          window.alert(apiMessage);
          return;
        }
      }
      window.alert('Echec de suppression de la categorie.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categorieId) {
      window.alert('Veuillez selectionner une categorie.');
      return;
    }

    const parsedMin = Number(form.prixVenteMin);
    const parsedMax = Number(form.prixVenteMax);

    if (
      !Number.isFinite(parsedMin) ||
      !Number.isFinite(parsedMax) ||
      parsedMin <= 0 ||
      parsedMax <= 0
    ) {
      window.alert('Veuillez saisir des prix strictement supérieurs à 0.');
      return;
    }

    if (parsedMax < parsedMin) {
      window.alert('Le prix de vente max doit etre superieur ou egal au prix de vente min.');
      return;
    }

    const builtOptions = buildOptionsPayload(optionsForm);
    if ('error' in builtOptions) {
      window.alert(builtOptions.error);
      return;
    }

    createMutation.mutate({
      prestationBody: {
      nom: form.nom.trim(),
      description: form.description.trim() || undefined,
      prixVenteMin: parsedMin,
      prixVenteMax: parsedMax,
      unite: form.unite,
        categorieId: parseInt(form.categorieId),
        sousCategorieId: form.sousCategorieId ? parseInt(form.sousCategorieId) : undefined,
      },
      options: builtOptions.payload,
    });
  }

  const createErrorMessage = (() => {
    if (!createMutation.error) return null;

    if (axios.isAxiosError(createMutation.error)) {
      const data = createMutation.error.response?.data as
        | { message?: string | string[] }
        | undefined;

      if (Array.isArray(data?.message)) {
        return data.message.join(' ');
      }

      if (typeof data?.message === 'string') {
        return data.message;
      }
    }

    if (createMutation.error instanceof Error) {
      return createMutation.error.message;
    }

    return 'Erreur lors de la création de la prestation.';
  })();

  const selectedCategory = (catalogue ?? []).find((category) => category.id === Number(form.categorieId));
  const selectedSubCategories = selectedCategory?.sousCategories ?? [];

  function addOptionBlock() {
    setOptionsForm((current) => [...current, createDefaultOptionForm()]);
  }

  function removeOptionBlock(optionIndex: number) {
    setOptionsForm((current) => current.filter((_, index) => index !== optionIndex));
  }

  function updateOptionBlock(optionIndex: number, patch: Partial<PrestationOptionForm>) {
    setOptionsForm((current) =>
      current.map((option, index) => (index === optionIndex ? { ...option, ...patch } : option)),
    );
  }

  function addChoiceToOption(optionIndex: number) {
    setOptionsForm((current) =>
      current.map((option, index) =>
        index === optionIndex
          ? { ...option, choix: [...option.choix, { nom: '', impactPrix: '' }] }
          : option,
      ),
    );
  }

  function removeChoiceFromOption(optionIndex: number, choiceIndex: number) {
    setOptionsForm((current) =>
      current.map((option, index) => {
        if (index !== optionIndex) return option;
        return {
          ...option,
          choix: option.choix.filter((_, existingChoiceIndex) => existingChoiceIndex !== choiceIndex),
        };
      }),
    );
  }

  function updateChoiceInOption(
    optionIndex: number,
    choiceIndex: number,
    patch: Partial<PrestationOptionFormChoix>,
  ) {
    setOptionsForm((current) =>
      current.map((option, index) => {
        if (index !== optionIndex) return option;
        return {
          ...option,
          choix: option.choix.map((choice, existingChoiceIndex) =>
            existingChoiceIndex === choiceIndex ? { ...choice, ...patch } : choice,
          ),
        };
      }),
    );
  }

  function toggleCat(id: number) {
    setExpandedCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSub(id: number) {
    setExpandedSubs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function togglePrestation(id: number) {
    setExpandedPrestations(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function expandAll() {
    if (!catalogue) return;
    const cats = new Set<number>();
    const subs = new Set<number>();
    catalogue.forEach(c => {
      cats.add(c.id);
      c.sousCategories?.forEach(sc => subs.add(sc.id));
    });
    setExpandedCats(cats);
    setExpandedSubs(subs);
  }
  function collapseAll() {
    setExpandedCats(new Set());
    setExpandedSubs(new Set());
    setExpandedPrestations(new Set());
  }

  function handleDeleteCategory(categoryId: number, categoryName: string) {
    if (deleteSelectedCategoryMutation.isPending) return;
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la catégorie "${categoryName}" ?`,
    );
    if (!confirmed) return;
    deleteSelectedCategoryMutation.mutate(categoryId);
  }

  // Filter catalogue by search
  const filteredCatalogue = catalogue?.map(cat => {
    if (!search) return cat;
    const lc = search.toLowerCase();
    const filteredSubs = cat.sousCategories?.map(sc => {
      const filteredPrestations = sc.prestations?.filter(p =>
        p.nom.toLowerCase().includes(lc) || p.description?.toLowerCase().includes(lc) || sc.nom.toLowerCase().includes(lc) || cat.nom.toLowerCase().includes(lc)
      ) ?? [];
      return { ...sc, prestations: filteredPrestations };
    }).filter(sc => sc.prestations.length > 0) ?? [];
    const filteredDirectPrestations = cat.prestations?.filter(p =>
      p.nom.toLowerCase().includes(lc) || p.description?.toLowerCase().includes(lc) || cat.nom.toLowerCase().includes(lc)
    ) ?? [];
    return { ...cat, sousCategories: filteredSubs, prestations: filteredDirectPrestations };
  }).filter(cat => (cat.sousCategories?.length ?? 0) > 0 || (cat.prestations?.length ?? 0) > 0) ?? [];

  // Count totals
  let totalPrestations = 0;
  let totalSousCategories = 0;
  let totalOptions = 0;
  catalogue?.forEach(cat => {
    cat.sousCategories?.forEach(sc => {
      totalSousCategories++;
      sc.prestations?.forEach(p => {
        totalPrestations++;
        totalOptions += p.options?.length ?? 0;
      });
    });
    cat.prestations?.forEach(p => {
      totalPrestations++;
      totalOptions += p.options?.length ?? 0;
    });
  });

  return (
    <div className="max-w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 flex items-center gap-2">
            <BookOpen size={24} className="text-blue-600" />
            Catalogue des Prestations
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {catalogue?.length ?? 0} catégories · {totalSousCategories} sous-catégories · {totalPrestations} prestations · {totalOptions} options
          </p>
          {!isAdmin && (
            <p className="text-amber-700 text-xs mt-1">
              Mode lecture seule: les modifications du catalogue sont réservées aux administrateurs.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium">
            <Download size={16} /> Exporter
          </button>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20">
              <Plus size={17} /> Nouvelle prestation
            </button>
          )}
        </div>
      </div>

      {/* Search + expand/collapse */}
      <div className="flex items-center gap-3 ">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher dans le catalogue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm transition-all outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-500">
              <X size={16} />
            </button>
          )}
        </div>
        <button onClick={expandAll} className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-blue-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Tout déplier
        </button>
        <button onClick={collapseAll} className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-blue-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Tout replier
        </button>
      </div>

      {/* Catalogue tree */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredCatalogue.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">Aucun résultat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCatalogue.map((cat) => (
            <div key={cat.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Catégorie header */}
              <div
                className={cn(
                  'w-full flex items-center gap-2 px-5 py-3.5 hover:bg-slate-50/50 transition-colors',
                  selectedCatId === cat.id && 'bg-red-50/40',
                )}
              >
                <button
                  onClick={() => {
                    setSelectedCatId(cat.id);
                    toggleCat(cat.id);
                  }}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                >
                  {expandedCats.has(cat.id) ? <ChevronDown size={18} className="text-blue-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-100 rounded-xl flex items-center justify-center">
                    <Layers size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-sm font-bold text-slate-950 truncate">{cat.nom}</h3>
                    {cat.description && <p className="text-xs text-slate-500 truncate">{cat.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{cat.sousCategories?.length ?? 0} sous-cat.</span>
                    <span className="text-slate-300">·</span>
                    <span>
                      {(cat.sousCategories?.reduce((acc, sc) => acc + (sc.prestations?.length ?? 0), 0) ?? 0) + (cat.prestations?.length ?? 0)} prestations
                    </span>
                  </div>
                </button>

                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(cat.id, cat.nom);
                    }}
                    disabled={deleteSelectedCategoryMutation.isPending}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors',
                      deleteSelectedCategoryMutation.isPending
                        ? 'text-slate-500 border-slate-200 cursor-not-allowed'
                        : 'text-slate-600 border-slate-300 hover:bg-slate-100',
                    )}
                    title={`Supprimer la catégorie ${cat.nom}`}
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                )}
              </div>

              {/* Sous-catégories */}
              {expandedCats.has(cat.id) && (
                <div className="border-t border-slate-200">
                  {/* Direct prestations (without sous-catégorie) */}
                  {(cat.prestations?.length ?? 0) > 0 && (
                    <div className="ml-8 border-l-2 border-slate-200">
                      {cat.prestations.map(p => (
                        <PrestationRow
                          key={p.id}
                          prestation={p}
                          expanded={expandedPrestations.has(p.id)}
                          onToggle={() => togglePrestation(p.id)}
                          onDelete={() => deleteMutation.mutate(p.id)}
                          canEdit={isAdmin}
                          indent={1}
                        />
                      ))}
                    </div>
                  )}

                  {cat.sousCategories?.map(sc => (
                    <div key={sc.id}>
                      {/* Sous-catégorie header */}
                      <button
                        onClick={() => toggleSub(sc.id)}
                        className="w-full flex items-center gap-3 pl-12 pr-5 py-3 hover:bg-slate-50/50 transition-colors border-t border-slate-50"
                      >
                        {expandedSubs.has(sc.id) ? <ChevronDown size={16} className="text-emerald-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                        <FolderOpen size={16} className="text-emerald-500" />
                        <div className="flex-1 text-left">
                          <span className="text-sm font-semibold text-slate-800">{sc.nom}</span>
                          {sc.description && <span className="text-xs text-slate-500 ml-2">— {sc.description}</span>}
                        </div>
                        <span className="text-xs text-slate-500">{sc.prestations?.length ?? 0} prestations</span>
                      </button>

                      {/* Prestations dans la sous-catégorie */}
                      {expandedSubs.has(sc.id) && sc.prestations?.map(p => (
                        <PrestationRow
                          key={p.id}
                          prestation={p}
                          expanded={expandedPrestations.has(p.id)}
                          onToggle={() => togglePrestation(p.id)}
                          onDelete={() => deleteMutation.mutate(p.id)}
                          canEdit={isAdmin}
                          indent={2}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-950">Nouvelle prestation</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setForm(createEmptyPrestationForm());
                  setOptionsForm([]);
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
                <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Categorie</label>
                <select required value={form.categorieId} onChange={(e) => setForm({ ...form, categorieId: e.target.value, sousCategorieId: '' })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Selectionner une categorie</option>
                  {(catalogue ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sous-categorie</label>
                <select
                  value={form.sousCategorieId}
                  onChange={(e) => setForm({ ...form, sousCategorieId: e.target.value })}
                  disabled={!form.categorieId || selectedSubCategories.length === 0}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">
                    {!form.categorieId
                      ? 'Choisissez une categorie d abord'
                      : selectedSubCategories.length === 0
                        ? 'Aucune sous-categorie'
                        : 'Selectionner une sous-categorie'}
                  </option>
                  {selectedSubCategories.map((sousCategorie) => (
                    <option key={sousCategorie.id} value={sousCategorie.id}>
                      {sousCategorie.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prix vente min *</label>
                  <input type="number" step="0.01" min="0.01" required value={form.prixVenteMin} onChange={(e) => setForm({ ...form, prixVenteMin: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prix vente max *</label>
                  <input type="number" step="0.01" min="0.01" required value={form.prixVenteMax} onChange={(e) => setForm({ ...form, prixVenteMax: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unité *</label>
                  <select
                    required
                    value={form.unite}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unite: e.target.value as UniteValue,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {UNITES.map((unite) => (
                      <option key={unite.value} value={unite.value}>
                        {unite.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Choix de prestation</p>
                    <p className="text-xs text-slate-500">
                      Ajouter un ou plusieurs choix. Si optionnelle, saisir le prix de l option.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addOptionBlock}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Plus size={14} />
                    Ajouter choix
                  </button>
                </div>

                {optionsForm.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs text-slate-500">
                    Aucun choix ajoute. Vous pouvez creer la prestation sans choix.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {optionsForm.map((option, optionIndex) => (
                      <div key={optionIndex} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Option #{optionIndex + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeOptionBlock(optionIndex)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-red-50"
                            title="Supprimer cette option"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Nom de l option *</label>
                            <input
                              type="text"
                              value={option.nom}
                              onChange={(e) => updateOptionBlock(optionIndex, { nom: e.target.value })}
                              placeholder="Ex: Type de finition"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                            <input
                              type="text"
                              value={option.description}
                              onChange={(e) => updateOptionBlock(optionIndex, { description: e.target.value })}
                              placeholder="Description optionnelle"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              checked={option.obligatoire}
                              onChange={() => updateOptionBlock(optionIndex, { obligatoire: true })}
                            />
                            Obligatoire
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              checked={!option.obligatoire}
                              onChange={() => updateOptionBlock(optionIndex, { obligatoire: false })}
                            />
                            Optionnelle
                          </label>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-600">Valeurs possibles</p>
                            <button
                              type="button"
                              onClick={() => addChoiceToOption(optionIndex)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              <Plus size={12} />
                              Ajouter valeur
                            </button>
                          </div>
                          {option.choix.map((choice, choiceIndex) => (
                            <div key={choiceIndex} className="grid md:grid-cols-12 gap-2 items-end">
                              <div className={option.obligatoire ? 'md:col-span-10' : 'md:col-span-7'}>
                                <label className="block text-xs text-slate-600 mb-1">Nom *</label>
                                <input
                                  type="text"
                                  value={choice.nom}
                                  onChange={(e) =>
                                    updateChoiceInOption(optionIndex, choiceIndex, { nom: e.target.value })
                                  }
                                  placeholder="Ex: Standard"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              {!option.obligatoire && (
                                <div className="md:col-span-3">
                                  <label className="block text-xs text-slate-600 mb-1">Prix option (EUR)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={choice.impactPrix}
                                    onChange={(e) =>
                                      updateChoiceInOption(optionIndex, choiceIndex, { impactPrix: e.target.value })
                                    }
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              )}
                              <div className="md:col-span-2">
                                <button
                                  type="button"
                                  onClick={() => removeChoiceFromOption(optionIndex, choiceIndex)}
                                  disabled={option.choix.length <= 1}
                                  className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:text-blue-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Retirer
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {createErrorMessage && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  {createErrorMessage}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setForm(createEmptyPrestationForm());
                    setOptionsForm([]);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 text-sm font-semibold text-white rounded-2xl bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all">
                  {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Creer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sub-component: Prestation Row
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PrestationRow({
  prestation: p,
  expanded,
  onToggle,
  onDelete,
  canEdit,
  indent,
}: {
  prestation: CatalogueCategorieWithCompositions['prestations'][0];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  canEdit: boolean;
  indent: number;
}) {
  const hasOptions = (p.options?.length ?? 0) > 0;
  // Indentation reduite en mobile (ecran etroit), complete en desktop.
  const paddingLeft = indent === 1 ? 'pl-3 md:pl-14' : 'pl-4 md:pl-20';

  return (
    <div className="border-t border-slate-50">
      <div className={cn('flex flex-wrap items-center gap-3 pr-3 md:pr-5 py-3 hover:bg-blue-50/30 transition-colors', paddingLeft)}>
        {hasOptions ? (
          <button onClick={onToggle} className="shrink-0">
            {expanded ? <ChevronDown size={14} className="text-amber-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <div className="w-7 h-7 bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg flex items-center justify-center shrink-0">
          <BookOpen size={14} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-950">{p.nom}</span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-medium text-slate-500 rounded">{p.unite}</span>
            {hasOptions && (
              <span className="px-1.5 py-0.5 bg-amber-50 text-[10px] font-medium text-amber-600 rounded border border-amber-100">
                {p.options!.length} option{p.options!.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {p.description && <p className="text-xs text-slate-500 truncate max-w-lg">{p.description}</p>}
        </div>
        <span className="w-full pl-9 text-sm font-semibold text-slate-700 md:w-auto md:pl-0 md:whitespace-nowrap">
          {formatCurrency(p.prixVenteMin)} – {formatCurrency(p.prixVenteMax)}
        </span>
        {canEdit && (
          <div className="flex items-center gap-1 ml-2">
            <button className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"><Edit size={14} /></button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-red-50"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      {/* Options & Choix */}
      {expanded && hasOptions && (
        <div className={cn('pb-3', indent === 1 ? 'pl-4 md:pl-24' : 'pl-5 md:pl-28')}>
          {p.options!.map((opt) => (
            <OptionBlock key={opt.id} option={opt} />
          ))}
        </div>
      )}
    </div>
  );
}


function OptionBlock({ option }: { option: OptionPrestation }) {
  return (
    <div className="mt-2 bg-slate-50/80 rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 size={13} className="text-amber-500" />
        <span className="text-xs font-bold text-slate-700">{option.nom}</span>
        {option.obligatoire && (
          <span className="px-1.5 py-0.5 bg-red-50 text-[10px] font-semibold text-red-500 rounded border border-red-100">
            Obligatoire
          </span>
        )}
        {option.description && <span className="text-[11px] text-slate-500 ml-1">— {option.description}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {option.choix.map(ch => (
          <div key={ch.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs hover:border-blue-300 transition-colors">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span className="font-medium text-slate-700">{ch.nom}</span>
            {ch.impactPrix !== 0 && (
              <span className={cn('font-semibold', ch.impactPrix > 0 ? 'text-blue-600' : 'text-red-500')}>
                {ch.impactPrix > 0 ? '+' : ''}{formatCurrency(ch.impactPrix)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}