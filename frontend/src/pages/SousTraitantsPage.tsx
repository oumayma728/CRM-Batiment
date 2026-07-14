import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Plus, Search, Pencil, Trash2, X, Loader2,
  Phone, Mail, HardHat, AlertTriangle, ChevronRight, ChevronLeft,
} from 'lucide-react';

interface SousTraitant {
  id: number;
  nom: string;
  siret?: string | null;
  contact?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  specialite?: string | null;
  actif: boolean;
  createdAt: string;
  _count?: { contrats: number; assurances: number; notations: number };
  assurancesExpirantBientot?: { id: number; type: string; dateExpiration: string }[];
}

interface FormState {
  nom: string;
  siret: string;
  contact: string;
  email: string;
  telephone: string;
  adresse: string;
  specialite: string;
}

const emptyForm: FormState = {
  nom: '', siret: '', contact: '', email: '',
  telephone: '', adresse: '', specialite: '',
};

function getApiError(err: unknown, fallback: string) {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: { message?: unknown } } }).response?.data;
    if (typeof data?.message === 'string') return data.message;
  }
  return fallback;
}

export default function SousTraitantsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SousTraitant | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['sous-traitants', page, search],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit, actif: true };
      if (search) params.search = search;
      const res = await api.get('/sous-traitants', { params });
      return res.data as {
        data: SousTraitant[];
        meta: { total: number; totalPages: number; page: number };
      };
    },
  });

  const list = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1, page: 1 };

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFeedback(null);
    setShowModal(true);
  }

  function openEdit(st: SousTraitant) {
    setEditing(st);
    setForm({
      nom: st.nom,
      siret: st.siret ?? '',
      contact: st.contact ?? '',
      email: st.email ?? '',
      telephone: st.telephone ?? '',
      adresse: st.adresse ?? '',
      specialite: st.specialite ?? '',
    });
    setFeedback(null);
    setShowModal(true);
  }

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing
        ? api.patch(`/sous-traitants/${editing.id}`, body)
        : api.post('/sous-traitants', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sous-traitants'] });
      setShowModal(false);
      setFeedback({
        type: 'success',
        text: editing ? 'Sous-traitant mis à jour.' : 'Sous-traitant créé.',
      });
    },
    onError: (err: unknown) => {
      setFeedback({ type: 'error', text: getApiError(err, 'Erreur lors de la sauvegarde.') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/sous-traitants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sous-traitants'] });
      setDeleteId(null);
      setFeedback({ type: 'success', text: 'Sous-traitant supprimé.' });
    },
    onError: (err: unknown) => {
      setFeedback({ type: 'error', text: getApiError(err, 'Impossible de supprimer.') });
      setDeleteId(null);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { nom: form.nom };
    if (form.siret) body.siret = form.siret;
    if (form.contact) body.contact = form.contact;
    if (form.email) body.email = form.email;
    if (form.telephone) body.telephone = form.telephone;
    if (form.adresse) body.adresse = form.adresse;
    if (form.specialite) body.specialite = form.specialite;
    saveMutation.mutate(body);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <HardHat size={24} className="text-primary-600" />
            Sous-traitants
          </h1>
          <p className="mt-1 text-sm text-slate-500">{meta.total} sous-traitant(s)</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus size={16} /> Nouveau sous-traitant
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700',
          )}
        >
          {feedback.text}
        </div>
      )}

      {/* Search */}
      <div className="flex max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100">
        <Search size={17} className="shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500">
            <X size={15} />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary-500" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <HardHat size={28} className="text-slate-300" />
          </div>
          <p className="text-base font-semibold text-slate-700">Aucun sous-traitant</p>
          <p className="mt-1 text-sm text-slate-400">
            Ajoutez votre premier sous-traitant pour commencer.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {['Nom', 'Contact', 'Spécialité', 'Contrats', 'Alertes assurance', ''].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      'px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-slate-500',
                      h === '' ? 'text-right' : 'text-left',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {list.map((st) => {
                const alertCount = st.assurancesExpirantBientot?.length ?? 0;
                return (
                  <tr key={st.id} className="group transition hover:bg-primary-50/30">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">{st.nom}</p>
                      {st.siret && (
                        <p className="text-xs text-slate-400">SIRET: {st.siret}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        {st.contact && (
                          <p className="text-sm text-slate-600">{st.contact}</p>
                        )}
                        {st.email && (
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <Mail size={11} /> {st.email}
                          </p>
                        )}
                        {st.telephone && (
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone size={11} /> {st.telephone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {st.specialite ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {st._count?.contrats ?? 0}
                    </td>
                    <td className="px-5 py-4">
                      {alertCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <AlertTriangle size={11} />
                          {alertCount} assurance{alertCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(st)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-primary-50 hover:text-primary-600"
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteId(st.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <p className="text-sm text-slate-500">
                Page <span className="font-semibold">{meta.page}</span> /{' '}
                <span className="font-semibold">{meta.totalPages}</span>
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-white disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-white disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editing ? 'Modifier le sous-traitant' : 'Nouveau sous-traitant'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom *
                </label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Plomberie Martin"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Contact</label>
                  <input
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder="Jean Martin"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">SIRET</label>
                  <input
                    value={form.siret}
                    onChange={(e) => setForm({ ...form, siret: e.target.value })}
                    placeholder="12345678901234"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@example.fr"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Téléphone</label>
                  <input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="0612345678"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Spécialité</label>
                <input
                  value={form.specialite}
                  onChange={(e) => setForm({ ...form, specialite: e.target.value })}
                  placeholder="Plomberie, Chauffage..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Adresse</label>
                <textarea
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  rows={2}
                  placeholder="12 rue des artisans, 75001 Paris"
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {saveMutation.isError && (
                <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
                  {getApiError(saveMutation.error, 'Erreur lors de la sauvegarde.')}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saveMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Supprimer ce sous-traitant ?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Cette action est définitive et supprime également les contrats, assurances, paiements
              et notations associés.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
