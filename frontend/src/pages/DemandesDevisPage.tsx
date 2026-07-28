import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { DemandeDevis } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import {
  Plus, Search, Trash2, X, ChevronLeft, ChevronRight,
  FileText, Loader2, Eye, ListChecks,
} from 'lucide-react';

const statutConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  NOUVEAU: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Nouveau' },
  EN_COURS: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'En cours' },
  CONVERTI: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Converti' },
  PERDU: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Perdu' },
};

function normalizeDemandeStatut(statut: string) {
  return statut === 'QUALIFIE' ? 'EN_COURS' : statut;
}

interface DemandeForm {
  description: string;
  clientId: string;
  source: string;
}

interface CreateDemandePayload {
  description: string;
  clientId: number;
  source: string;
}

const emptyForm: DemandeForm = {
  description: '', clientId: '', source: 'AUTRE',
};

export default function DemandesDevisPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const workspaceBasePath = user?.role === 'ASSISTANTE' ? '/assistante' : '/admin';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DemandeForm>(emptyForm);
  const [detailDemande, setDetailDemande] = useState<DemandeDevis | null>(null);
  const [studyDemandeId, setStudyDemandeId] = useState<number | null>(null);
  const [studyError, setStudyError] = useState('');
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['demandes-devis', page, search],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (search) params.search = search;
      const res = await api.get('/demandes-devis', { params });
      return res.data;
    },
  });

  const { data: clientsList } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const res = await api.get('/clients', { params: { limit: 100 } });
      return res.data?.data ?? [];
    },
  });

  const demandes: DemandeDevis[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, lastPage: 1 };

  const createMutation = useMutation({
    mutationFn: (body: CreateDemandePayload) => api.post('/demandes-devis', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes-devis'] });
      setShowModal(false);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/demandes-devis/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['demandes-devis'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientId = Number(form.clientId);
    if (!Number.isInteger(clientId) || clientId <= 0) return;

    createMutation.mutate({
      description: form.description.trim(),
      clientId,
      source: form.source,
    });
  }

  function canOpenStudy(statut: string) {
    const normalizedStatut = normalizeDemandeStatut(statut);
    return normalizedStatut === 'NOUVEAU' || normalizedStatut === 'EN_COURS';
  }

  async function handleOpenStudy(demande: DemandeDevis) {
    const normalizedStatut = normalizeDemandeStatut(demande.statut);

    setStudyError('');
    setStudyDemandeId(demande.id);

    try {
      if (normalizedStatut === 'NOUVEAU') {
        await api.patch(`/demandes-devis/${demande.id}/statut`, { statut: 'EN_COURS' });
        await queryClient.invalidateQueries({ queryKey: ['demandes-devis'] });
      }

      navigate(`${workspaceBasePath}/checklist?demandeId=${demande.id}`);
    } catch (err: unknown) {
      setStudyError(err instanceof Error ? err.message : 'Impossible d ouvrir la checklist.');
    } finally {
      setStudyDemandeId(null);
    }
  }

  return (
    <div className="max-w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 flex items-center gap-2">
            <FileText size={24} className="text-blue-600" />
            Demandes de Devis
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{meta.total} demande(s) au total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20"
        >
          <Plus size={17} /> Nouvelle demande
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm transition-all outline-none" />
        </div>
      </div>

      {studyError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {studyError}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
        ) : demandes.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">Aucune demande trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Source</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {demandes.map((d) => {
                  const normalizedStatut = normalizeDemandeStatut(d.statut);
                  const st = statutConfig[normalizedStatut] ?? {
                    bg: 'bg-slate-50',
                    text: 'text-slate-600',
                    dot: 'bg-slate-400',
                    label: normalizedStatut,
                  };
                  return (
                  <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-950 text-[14px] truncate max-w-xs">{d.description}</p>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-slate-600">
                      {d.client ? `${d.client.prenom} ${d.client.nom}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold', st.bg, st.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                        {d.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-slate-500">{formatDate(d.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenStudy(d)}
                          disabled={!canOpenStudy(normalizedStatut) || studyDemandeId === d.id}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                          title={
                            canOpenStudy(normalizedStatut)
                              ? 'Etude checklist / generation de devis'
                              : 'Disponible pour NOUVEAU ou EN_COURS'
                          }
                        >
                          {studyDemandeId === d.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <ListChecks size={15} />
                          )}
                        </button>
                        <button onClick={() => setDetailDemande(d)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye size={15} /></button>
                        <button onClick={() => deleteMutation.mutate(d.id)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.lastPage > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <p className="text-[13px] text-slate-500">Page <span className="font-semibold text-slate-700">{meta.page}</span> sur <span className="font-semibold text-slate-700">{meta.lastPage}</span></p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-2xl border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))} disabled={page === meta.lastPage} className="p-2 rounded-2xl border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-950">Nouvelle demande de devis</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Client *</label>
                <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Sélectionner un client</option>
                  {(clientsList ?? []).map((c: { id: number; prenom: string; nom: string }) => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
                <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Ex: Renovation salle de bain 8m2, fuite sous douche, intervention souhaitee sous 7 jours." className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                  <option value="AUTRE">Autre</option>
                  <option value="CHATBOT">Chatbot</option>
                  <option value="TECHNICO_COMMERCIAL">Technico-Commercial</option>
                  <option value="APPEL">Appel téléphonique</option>
                  <option value="RECOMMANDATION">Recommandation</option>
                  <option value="SITE_WEB">Site Web</option>
                </select>
              </div>
              {createMutation.error && (
                <p className="text-sm text-blue-600 bg-red-50 px-4 py-2 rounded-lg">
                  Erreur lors de la creation. Verifiez le client selectionne et la description.
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Annuler</button>
                <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 text-sm font-semibold text-white rounded-2xl bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all">
                  {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailDemande && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-950">Détail de la demande</h2>
              <button onClick={() => setDetailDemande(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><p className="text-[11px] font-bold text-slate-400 uppercase">Description</p><p className="text-sm text-slate-700 mt-0.5">{detailDemande.description || '—'}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[11px] font-bold text-slate-400 uppercase">Statut</p>
                  {(() => { const normalizedStatut = normalizeDemandeStatut(detailDemande.statut); const st = statutConfig[normalizedStatut] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: normalizedStatut }; return (
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold mt-0.5', st.bg, st.text)}><span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />{st.label}</span>
                  ); })()}
                </div>
                <div><p className="text-[11px] font-bold text-slate-400 uppercase">Source</p><p className="text-sm mt-0.5">{detailDemande.source}</p></div>
              </div>
              <div><p className="text-[11px] font-bold text-slate-400 uppercase">Client</p><p className="text-sm mt-0.5">{detailDemande.client ? `${detailDemande.client.prenom} ${detailDemande.client.nom}` : '—'}</p></div>
              <div><p className="text-[11px] font-bold text-slate-400 uppercase">Créée le</p><p className="text-sm mt-0.5">{formatDate(detailDemande.createdAt)}</p></div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleOpenStudy(detailDemande)}
                  disabled={!canOpenStudy(detailDemande.statut) || studyDemandeId === detailDemande.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {studyDemandeId === detailDemande.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ListChecks size={15} />
                  )}
                  Etude checklist / generer devis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
