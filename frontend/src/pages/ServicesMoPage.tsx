import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ServiceMainOeuvre } from '@/types';
import { formatCurrency } from '@/lib/utils';
import PageHero from '@/components/PageHero';
import {
  Plus, Search, Edit, Trash2, Wrench, Loader2
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, SubmitButton } from '@/components/ui/Form';

export default function ServicesMoPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nom: '', prixUnitaire: '', unite: '' });

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
      setShowModal(false);
      setForm({ nom: '', prixUnitaire: '', unite: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/services-mo/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services-mo'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      nom: form.nom,
      prixUnitaire: form.prixUnitaire ? parseFloat(form.prixUnitaire) : undefined,
      unite: form.unite || undefined,
    });
  }

  const list = services ?? [];
  const errorStatus = (error as { response?: { status?: number } } | null)?.response?.status;
  const isForbidden = errorStatus === 403;

  return (
    <div className="space-y-4">
      <PageHero
        icon={<Wrench size={22} />}
        title="Services Main d'Œuvre"
        subtitle={isError ? 'Erreur de chargement' : `${list.length} service(s) enregistré(s)`}
        accent="orange"
        actions={
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-all font-medium text-sm shadow-sm">
            <Plus size={16} /> Nouveau service
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher un service..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-400/20 transition-all" />
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
      ) : isError ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench size={32} className="text-gray-300" /></div>
          <p className="text-lg font-semibold text-gray-700">
            {isForbidden ? 'Accès réservé aux admins' : 'Impossible de charger les services'}
          </p>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wrench size={32} className="text-gray-300" /></div>
          <p className="text-lg font-semibold text-gray-700">Aucun service trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5 card-hover shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                  <Wrench size={20} />
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"><Edit size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{s.nom}</h3>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-sm font-bold text-primary-600">
                  {s.prixUnitaire ? formatCurrency(s.prixUnitaire) : '—'}
                </span>
                <span className="text-xs text-gray-500">{s.unite ?? 'par heure'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau service"
        icon={Wrench}
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
              label="Prix unitaire"
              type="number"
              step="0.01"
              value={form.prixUnitaire}
              onChange={(e) => setForm({ ...form, prixUnitaire: e.target.value })}
            />
            <Input
              label="Unité"
              placeholder="heure, jour..."
              value={form.unite}
              onChange={(e) => setForm({ ...form, unite: e.target.value })}
            />
          </div>
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
              Créer le service
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
