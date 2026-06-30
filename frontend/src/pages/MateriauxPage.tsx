import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Materiau, Fournisseur } from '@/types';
import { formatCurrency } from '@/lib/utils';
import PageHero from '@/components/PageHero';
import {
  Plus, Search, Edit, Trash2, Box, Loader2
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, SubmitButton } from '@/components/ui/Form';

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
    <div className="space-y-4">
      <PageHero
        icon={<Box size={22} />}
        title="Gestion des Matériaux"
        subtitle={isError ? 'Erreur de chargement' : `${list.length} matériau(x) enregistré(s)`}
        accent="orange"
        actions={
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-all font-medium text-sm shadow-sm">
            <Plus size={16} /> Nouveau matériau
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher un matériau..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20 transition-all" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-orange-600" size={32} /></div>
        ) : isError ? (
          <div className="text-center py-20 text-slate-500">
            <Box size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">{isForbidden ? 'Accès réservé aux admins' : 'Impossible de charger les matériaux'}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Box size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">Aucun matériau trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Unité</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Prix d'achat</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fournisseur</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{m.nom}</p>
                      {m.couleur && <p className="text-xs text-slate-500">{m.couleur}{m.finition ? ` - ${m.finition}` : ''}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{m.unite ?? '—'}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">{m.prixAchatFixe ? formatCurrency(m.prixAchatFixe) : '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{m.fournisseur?.nom ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"><Edit size={16} /></button>
                        <button onClick={() => deleteMutation.mutate(m.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau matériau"
        icon={Box}
        accent="orange"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input
            label="Nom"
            required
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Couleur"
              value={form.couleur}
              onChange={(e) => setForm({ ...form, couleur: e.target.value })}
            />
            <Input
              label="Finition"
              value={form.finition}
              onChange={(e) => setForm({ ...form, finition: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prix d'achat"
              type="number"
              step="0.01"
              required
              value={form.prixAchatFixe}
              onChange={(e) => setForm({ ...form, prixAchatFixe: e.target.value })}
            />
            <Input
              label="Unité"
              placeholder="kg, m³, u..."
              value={form.unite}
              onChange={(e) => setForm({ ...form, unite: e.target.value })}
            />
          </div>
          <Select
            label="Fournisseur"
            value={form.fournisseurId}
            onChange={(e) => setForm({ ...form, fournisseurId: e.target.value })}
            options={[
              { value: '', label: 'Aucun fournisseur' },
              ...fournisseursList.map((f) => ({ value: f.id, label: f.nom }))
            ]}
          />
          {createMutation.error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              Erreur lors de la création.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              Annuler
            </button>
            <SubmitButton isLoading={createMutation.isPending} icon={Plus}>
              Créer le matériau
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
