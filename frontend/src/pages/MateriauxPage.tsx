import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Materiau, Fournisseur } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Plus, Search, Edit, Trash2, X, Box, Loader2,
} from 'lucide-react';

export default function MateriauxPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    couleur: '',
    finition: '',
    unite: '',
    prixAchatFixe: '',
    fournisseurId: '',
  });

  const {
    data: materiaux,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['materiaux', search],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;
      const res = await api.get('/materiaux', { params });
      return (res.data?.data ?? res.data) as Materiau[];
    },
  });

  const { data: fournisseurs } = useQuery({
    queryKey: ['fournisseurs', 'materiaux-form'],
    queryFn: async () => {
      const res = await api.get('/fournisseurs', { params: { limit: 300 } });
      return (res.data?.data ?? res.data) as Fournisseur[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/materiaux', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiaux'] });
      setShowModal(false);
      setForm({
        nom: '',
        couleur: '',
        finition: '',
        unite: '',
        prixAchatFixe: '',
        fournisseurId: '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/materiaux/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materiaux'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      nom: form.nom,
      couleur: form.couleur || undefined,
      finition: form.finition || undefined,
      unite: form.unite || undefined,
      prixAchatFixe: form.prixAchatFixe ? parseFloat(form.prixAchatFixe) : undefined,
      fournisseurId: form.fournisseurId ? Number(form.fournisseurId) : undefined,
    });
  }

  const list = materiaux ?? [];
  const fournisseursList = fournisseurs ?? [];
  const errorStatus = (error as { response?: { status?: number } } | null)?.response?.status;
  const isForbidden = errorStatus === 403;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Box size={24} className="text-blue-600" />
            Gestion des Matériaux
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isError ? 'Erreur de chargement' : `${list.length} matériau(x) enregistré(s)`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 batiflow-gradient text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all font-medium text-sm">
          <Plus size={17} /> Nouveau matériau
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un matériau..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 text-sm transition-all" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
        ) : isError ? (
          <div className="text-center py-20 text-gray-500">
            <Box size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {isForbidden ? 'Accès réservé aux admins' : 'Impossible de charger les matériaux'}
            </p>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Box size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucun matériau trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Unité</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Prix d'achat</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Fournisseur</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((m) => (
                  <tr key={m.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{m.nom}</p>
                      {m.couleur && <p className="text-xs text-gray-500">{m.couleur}{m.finition ? ` - ${m.finition}` : ''}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.unite ?? '—'}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{m.prixAchatFixe ? formatCurrency(m.prixAchatFixe) : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.fournisseur?.nom ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50"><Edit size={16} /></button>
                        <button onClick={() => deleteMutation.mutate(m.id)} className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Nouveau matériau</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur</label>
                  <input type="text" value={form.couleur} onChange={(e) => setForm({ ...form, couleur: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Finition</label>
                  <input type="text" value={form.finition} onChange={(e) => setForm({ ...form, finition: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix d'achat *</label>
                  <input type="number" step="0.01" required value={form.prixAchatFixe} onChange={(e) => setForm({ ...form, prixAchatFixe: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unité</label>
                  <input type="text" placeholder="kg, m³, u..." value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fournisseur</label>
                <select
                  value={form.fournisseurId}
                  onChange={(e) => setForm({ ...form, fournisseurId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Aucun fournisseur</option>
                  {fournisseursList.map((fournisseur) => (
                    <option key={fournisseur.id} value={fournisseur.id}>
                      {fournisseur.nom}
                    </option>
                  ))}
                </select>
              </div>
              {createMutation.error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">Erreur lors de la création.</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Annuler</button>
                <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 text-sm font-medium text-white batiflow-gradient rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all">
                  {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
