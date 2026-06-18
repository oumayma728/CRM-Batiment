import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import type { DemandeDevis } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import PageHero from '@/components/PageHero';
import {
  Plus, Search, Trash2, X, ChevronLeft, ChevronRight,
  FileText, Loader2, Eye, ListChecks, ClipboardList,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select, TextArea, SubmitButton } from '@/components/ui/Form';

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

      navigate(`/admin/checklist?demandeId=${demande.id}`);
    } catch (err: unknown) {
      setStudyError(err instanceof Error ? err.message : 'Impossible d ouvrir la checklist.');
    } finally {
      setStudyDemandeId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHero
        icon={<ClipboardList size={22} />}
        title="Demandes de Devis"
        subtitle={`${meta.total} demande(s) au total`}
        accent="blue"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all font-medium text-sm"
          >
            <Plus size={16} /> Nouvelle demande
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-400/20 transition-all"
          />
        </div>
      </div>

      {studyError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {studyError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
        ) : demandes.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucune demande trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Source</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {demandes.map((d) => {
                  const normalizedStatut = normalizeDemandeStatut(d.statut);
                  const st = statutConfig[normalizedStatut] ?? {
                    bg: 'bg-gray-50',
                    text: 'text-gray-600',
                    dot: 'bg-gray-400',
                    label: normalizedStatut,
                  };
                  return (
                  <tr key={d.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 text-[14px] truncate max-w-xs">{d.description}</p>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-600">
                      {d.client ? `${d.client.prenom} ${d.client.nom}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold', st.bg, st.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-100">
                        {d.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-500">{formatDate(d.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenStudy(d)}
                          disabled={!canOpenStudy(normalizedStatut) || studyDemandeId === d.id}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
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
                        <button onClick={() => setDetailDemande(d)} className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Eye size={15} /></button>
                        <button onClick={() => deleteMutation.mutate(d.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[13px] text-gray-500">Page <span className="font-semibold text-gray-700">{meta.page}</span> sur <span className="font-semibold text-gray-700">{meta.lastPage}</span></p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))} disabled={page === meta.lastPage} className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvelle demande de devis"
        icon={ClipboardList}
        accent="blue"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Select
            label="Client"
            required
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            options={[
              { value: '', label: 'Sélectionner un client' },
              ...(clientsList ?? []).map((c: { id: number; prenom: string; nom: string }) => ({
                value: c.id,
                label: `${c.prenom} ${c.nom}`
              }))
            ]}
          />
          
          <TextArea
            label="Description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Ex: Renovation salle de bain 8m2, fuite sous douche, intervention souhaitee sous 7 jours."
          />

          <Select
            label="Source"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            options={[
              { value: 'AUTRE', label: 'Autre' },
              { value: 'CHATBOT', label: 'Chatbot' },
              { value: 'TECHNICO_COMMERCIAL', label: 'Technico-Commercial' },
              { value: 'APPEL', label: 'Appel téléphonique' },
              { value: 'RECOMMANDATION', label: 'Recommandation' },
              { value: 'SITE_WEB', label: 'Site Web' }
            ]}
          />

          {createMutation.error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
              Erreur lors de la creation. Verifiez le client selectionne et la description.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm">Annuler</button>
            <SubmitButton isLoading={createMutation.isPending} icon={Plus}>
              Créer la demande
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailDemande}
        onClose={() => setDetailDemande(null)}
        title="Détail de la demande"
        icon={Eye}
        accent="blue"
        maxWidth="lg"
      >
        {detailDemande && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Description</p>
              <p className="text-sm font-semibold text-slate-800 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {detailDemande.description || '—'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Statut</p>
                {(() => { 
                  const normalizedStatut = normalizeDemandeStatut(detailDemande.statut); 
                  const st = statutConfig[normalizedStatut] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: normalizedStatut }; 
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold mt-1', st.bg, st.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                      {st.label}
                    </span>
                  ); 
                })()}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Source</p>
                <p className="text-[13px] font-semibold text-slate-700 mt-1">{detailDemande.source}</p>
              </div>
            </div>
            
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Client</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  {detailDemande.client ? detailDemande.client.prenom[0] + detailDemande.client.nom[0] : '—'}
                </span>
                <p className="text-[13px] font-semibold text-slate-700">
                  {detailDemande.client ? `${detailDemande.client.prenom} ${detailDemande.client.nom}` : '—'}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Créée le</p>
              <p className="text-[13px] font-medium text-slate-600 mt-1">{formatDate(detailDemande.createdAt)}</p>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleOpenStudy(detailDemande)}
                disabled={!canOpenStudy(detailDemande.statut) || studyDemandeId === detailDemande.id}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {studyDemandeId === detailDemande.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ListChecks size={16} />
                )}
                Étude checklist / générer devis
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
