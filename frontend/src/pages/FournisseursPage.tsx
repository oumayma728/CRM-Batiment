import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Fournisseur } from '@/types';
import PageHero from '@/components/PageHero';
import {
  Plus, Search, Edit, Trash2, Truck,
  Phone, Mail, Download, Loader2
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, TextArea, SubmitButton } from '@/components/ui/Form';

export default function FournisseursPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nom: '', contact: '', email: '', telephone: '', adresse: '', typesMateriaux: '', conditions: '' });

  const { data: fournisseurs, isLoading } = useQuery({
    queryKey: ['fournisseurs', search],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;
      const res = await api.get('/fournisseurs', { params });
      return (res.data?.data ?? res.data) as Fournisseur[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/fournisseurs', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      setShowModal(false);
      setForm({ nom: '', contact: '', email: '', telephone: '', adresse: '', typesMateriaux: '', conditions: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/fournisseurs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { nom: form.nom };
    if (form.contact) body.contact = form.contact;
    if (form.email) body.email = form.email;
    if (form.telephone) body.telephone = form.telephone;
    if (form.adresse) body.adresse = form.adresse;
    if (form.typesMateriaux) body.typesMateriaux = form.typesMateriaux;
    if (form.conditions) body.conditions = form.conditions;
    createMutation.mutate(body);
  }

  const list = fournisseurs ?? [];

  return (
    <div className="space-y-4">
      <PageHero
        icon={<Truck size={22} />}
        title="Gestion des Fournisseurs"
        subtitle={`${list.length} fournisseur(s) enregistré(s)`}
        accent="emerald"
        actions={
          <>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
              <Download size={16} /> Exporter
            </button>
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all font-medium text-sm shadow-sm">
              <Plus size={16} /> Nouveau fournisseur
            </button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher un fournisseur..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/20 transition-all" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Truck size={32} className="text-gray-300" /></div>
          <p className="text-lg font-semibold text-gray-700">Aucun fournisseur trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-5 card-hover shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"><Edit size={14} /></button>
                  <button onClick={() => deleteMutation.mutate(f.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.nom}</h3>
              <div className="space-y-1.5 text-sm text-gray-500">
                {f.contact && <p className="text-xs text-gray-600">{f.contact}</p>}
                {f.email && <p className="flex items-center gap-2"><Mail size={14} /> {f.email}</p>}
                {f.telephone && <p className="flex items-center gap-2"><Phone size={14} /> {f.telephone}</p>}
                {f.typesMateriaux && <p className="text-xs mt-1">Types : {f.typesMateriaux}</p>}
              </div>
              {f.materiaux && f.materiaux.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1.5">{f.materiaux.length} matériau(x) fourni(s)</p>
                  <div className="flex flex-wrap gap-1">
                    {f.materiaux.slice(0, 3).map((m) => (
                      <span key={m.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{m.nom}</span>
                    ))}
                    {f.materiaux.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">+{f.materiaux.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau fournisseur"
        icon={Truck}
        accent="green"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input
            label="Nom"
            required
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
          <Input
            label="Contact"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Téléphone"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            />
          </div>
          <Input
            label="Adresse"
            value={form.adresse}
            onChange={(e) => setForm({ ...form, adresse: e.target.value })}
          />
          <Input
            label="Types de matériaux"
            placeholder="Bois, Béton, Acier..."
            value={form.typesMateriaux}
            onChange={(e) => setForm({ ...form, typesMateriaux: e.target.value })}
          />
          <TextArea
            label="Conditions"
            value={form.conditions}
            onChange={(e) => setForm({ ...form, conditions: e.target.value })}
            rows={2}
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
              Créer le fournisseur
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
