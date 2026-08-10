import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import type { ServiceMainOeuvre } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Plus, Search, Edit, Trash2, X, Wrench, Loader2,
} from 'lucide-react';

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

export default function ServicesMoPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceMainOeuvre | null>(null);
  const [form, setForm] = useState({ nom: '', prixUnitaire: '', unite: 'M2' as UniteValue });

  const {
    data: services,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['services-mo', search],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;
      const res = await api.get('/services-mo', { params });
      return (res.data?.data ?? res.data) as ServiceMainOeuvre[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/services-mo', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-mo'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.patch(`/services-mo/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services-mo'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/services-mo/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services-mo'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const prixUnitaire = Number(form.prixUnitaire);
    if (!Number.isFinite(prixUnitaire) || prixUnitaire <= 0) {
      window.alert('Veuillez saisir un prix unitaire supérieur à 0.');
      return;
    }

    const payload = {
      nom: form.nom.trim(),
      prixUnitaire,
      unite: form.unite,
    };
    if (editing) updateMutation.mutate({ id: editing.id, body: payload });
    else createMutation.mutate(payload);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm({ nom: '', prixUnitaire: '', unite: 'M2' });
  }

  function openCreate() {
    closeModal();
    setShowModal(true);
  }

  function openEdit(service: ServiceMainOeuvre) {
    setEditing(service);
    setForm({
      nom: service.nom,
      prixUnitaire: String(service.prixUnitaire),
      unite: service.unite as UniteValue,
    });
    setShowModal(true);
  }

  const createErrorMessage = (() => {
    const mutationError = editing ? updateMutation.error : createMutation.error;
    if (!mutationError) return null;

    if (axios.isAxiosError(mutationError)) {
      const data = mutationError.response?.data as
        | { message?: string | string[] }
        | undefined;

      if (Array.isArray(data?.message)) {
        return data.message.join(' ');
      }

      if (typeof data?.message === 'string') {
        return data.message;
      }
    }

    return editing
      ? 'Erreur lors de la modification du service de main-d’œuvre.'
      : 'Erreur lors de la création du service de main-d’œuvre.';
  })();

  const list = services ?? [];
  const errorStatus = (error as { response?: { status?: number } } | null)?.response?.status;
  const isForbidden = errorStatus === 403;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench size={24} className="text-blue-600" />
            Services Main d'Œuvre
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isError ? 'Erreur de chargement' : `${list.length} service(s) enregistré(s)`}
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20">
          <Plus size={17} /> Nouveau service
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Rechercher un service..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm transition-all" />
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
      ) : isError ? (
        <div className="text-center py-20 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench size={32} className="text-slate-500" /></div>
          <p className="text-lg font-semibold text-slate-700">
            {isForbidden ? 'Accès réservé aux admins' : 'Impossible de charger les services'}
          </p>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench size={32} className="text-slate-500" /></div>
          <p className="text-lg font-semibold text-slate-700">Aucun service trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 card-hover shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 bg-orange-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Wrench size={20} />
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50" title={`Modifier ${s.nom}`}><Edit size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{s.nom}</h3>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-sm font-bold text-blue-600">
                  {s.prixUnitaire ? formatCurrency(s.prixUnitaire) : '—'}
                </span>
                <span className="text-xs text-slate-500">{s.unite ?? 'par heure'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Modifier le service' : 'Nouveau service'}</h2>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
                <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prix unitaire *</label>
                  <input type="number" step="0.01" min="0.01" required value={form.prixUnitaire} onChange={(e) => setForm({ ...form, prixUnitaire: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
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
              {createErrorMessage && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  {createErrorMessage}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Annuler</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-6 py-2.5 text-sm font-medium text-white batiflow-gradient rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={16} className="animate-spin" />}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
