import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HardHat,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from 'lucide-react';
import axios from 'axios';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type {
  Chantier,
  ChantierStatut,
  Client,
  PaginatedResponse,
} from '@/types';

interface ChantierFormState {
  clientId: string;
  chefChantierId: string;
  reference: string;
  adresse: string;
  description: string;
  statut: ChantierStatut;
  dateDebut: string;
  dateFin: string;
  notes: string;
}

type ChantierStatusFilter = ChantierStatut | 'ALL';

const statusOptions: ChantierStatusFilter[] = [
  'ALL',
  'VISITE_TECHNIQUE',
  'DEVIS_EN_PREPARATION',
  'DEVIS_ENVOYE',
  'NEGOCIATION_EN_COURS',
  'DEVIS_VALIDE',
  'COMMANDES_GENEREES',
  'MATERIAUX_EN_LIVRAISON',
  'MATERIAUX_RECEPTIONNES',
  'PLANIFIE',
  'DEMARRE',
  'EN_COURS',
  'TERMINE',
  'CLOTURE',
];

const statusLabels: Record<ChantierStatut, string> = {
  VISITE_TECHNIQUE: 'Visite technique',
  DEVIS_EN_PREPARATION: 'Devis en preparation',
  DEVIS_ENVOYE: 'Devis envoye',
  NEGOCIATION_EN_COURS: 'Negociation',
  DEVIS_VALIDE: 'Devis valide',
  COMMANDES_GENEREES: 'Commandes generees',
  MATERIAUX_EN_LIVRAISON: 'Materiaux en livraison',
  MATERIAUX_RECEPTIONNES: 'Materiaux receptionnes',
  PLANIFIE: 'Planifie',
  DEMARRE: 'Demarre',
  EN_COURS: 'En cours',
  TERMINE: 'Termine',
  CLOTURE: 'Cloture',
};

const emptyForm: ChantierFormState = {
  clientId: '',
  chefChantierId: '',
  reference: '',
  adresse: '',
  description: '',
  statut: 'VISITE_TECHNIQUE',
  dateDebut: '',
  dateFin: '',
  notes: '',
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function toForm(chantier: Chantier): ChantierFormState {
  return {
    clientId: String(chantier.clientId),
    chefChantierId: chantier.chefChantierId ? String(chantier.chefChantierId) : '',
    reference: chantier.reference ?? '',
    adresse: chantier.adresse ?? '',
    description: chantier.description ?? '',
    statut: chantier.statut,
    dateDebut: chantier.dateDebut ? chantier.dateDebut.slice(0, 10) : '',
    dateFin: chantier.dateFin ? chantier.dateFin.slice(0, 10) : '',
    notes: chantier.notes ?? '',
  };
}

export default function ChantiersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChantierStatusFilter>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Chantier | null>(null);
  const [form, setForm] = useState<ChantierFormState>(emptyForm);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [documentsChantier, setDocumentsChantier] = useState<Chantier | null>(null);
  const [documentForm, setDocumentForm] = useState({ nom: '', type: 'PLAN', url: '' });

  const listQuery = useQuery({
    queryKey: ['chantiers', page, search, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.statut = statusFilter;
      const res = await api.get<PaginatedResponse<Chantier>>('/chantiers', { params });
      return res.data;
    },
  });

  const clientsQuery = useQuery({
    queryKey: ['clients-for-chantiers'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Client>>('/clients', {
        params: { page: 1, limit: 200 },
      });
      return res.data.data;
    },
  });

  const documentsQuery = useQuery({
    queryKey: ['chantier-documents', documentsChantier?.id],
    enabled: Boolean(documentsChantier),
    queryFn: async () => {
      const res = await api.get<Chantier>(`/chantiers/${documentsChantier!.id}`);
      return res.data;
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!documentsChantier) throw new Error('Aucun chantier sélectionné.');
      const res = await api.post(`/chantiers/${documentsChantier.id}/documents`, {
        nom: documentForm.nom.trim(),
        type: documentForm.type.trim(),
        url: documentForm.url.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setDocumentForm({ nom: '', type: 'PLAN', url: '' });
      queryClient.invalidateQueries({ queryKey: ['chantier-documents', documentsChantier?.id] });
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
      queryClient.invalidateQueries({ queryKey: ['internal-notifications'] });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      if (!documentsChantier) throw new Error('Aucun chantier sélectionné.');
      await api.delete(`/chantiers/${documentsChantier.id}/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantier-documents', documentsChantier?.id] });
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/chantiers/sync-from-devis');
      return res.data as {
        message: string;
        summary?: {
          totalAcceptedOrSignedDevis: number;
          created: number;
          alreadyLinked: number;
        };
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
      const created = result.summary?.created ?? 0;
      const total = result.summary?.totalAcceptedOrSignedDevis ?? 0;
      setSyncMessage(`${result.message} ${created} chantier(s) cree(s) sur ${total} devis.`);
    },
  });

  useEffect(() => {
    syncMutation.mutate();
    // Intentional one-shot sync on page mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMutation = useMutation({
    mutationFn: async (body: ChantierFormState) => {
      const payload = {
        clientId: Number(body.clientId),
        chefChantierId: body.chefChantierId ? Number(body.chefChantierId) : undefined,
        reference: body.reference.trim() || undefined,
        adresse: body.adresse.trim(),
        description: body.description.trim() || undefined,
        statut: body.statut,
        dateDebut: body.dateDebut || undefined,
        dateFin: body.dateFin || undefined,
        notes: body.notes.trim() || undefined,
      };
      const res = await api.post('/chantiers', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: ChantierFormState) => {
      if (!editing) throw new Error('Aucun chantier a modifier.');
      const payload = {
        clientId: Number(body.clientId),
        chefChantierId: body.chefChantierId ? Number(body.chefChantierId) : undefined,
        reference: body.reference.trim() || undefined,
        adresse: body.adresse.trim(),
        description: body.description.trim() || undefined,
        statut: body.statut,
        dateDebut: body.dateDebut || undefined,
        dateFin: body.dateFin || undefined,
        notes: body.notes.trim() || undefined,
      };
      const res = await api.patch(`/chantiers/${editing.id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/chantiers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chantiers'] });
    },
  });

  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data?.data]);
  const meta = listQuery.data?.meta ?? { page: 1, totalPages: 1, total: 0, limit: 15 };

  const submitMutation = editing ? updateMutation : createMutation;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(chantier: Chantier) {
    setEditing(chantier);
    setForm(toForm(chantier));
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.adresse.trim()) return;
    submitMutation.mutate(form);
  }

  async function handleDelete(chantier: Chantier) {
    const ok = window.confirm(
      `Supprimer le chantier ${chantier.reference} ? Cette action est irreversible.`,
    );
    if (!ok) return;
    await deleteMutation.mutateAsync(chantier.id);
  }

  return (
    <div className="max-w-full space-y-5">
      <section className="rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.14),_transparent_30%),linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#f8fafc_100%)] p-6 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Chef Chantier</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Liste des chantiers</h1>
            <p className="mt-2 text-sm text-slate-600">
              Les chantiers sont synchronises automatiquement a partir des devis acceptes/signes.
              Vous pouvez aussi ajouter, modifier et supprimer des elements manuellement.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => syncMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Synchroniser depuis devis
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <Plus size={16} /> Nouveau chantier
            </button>
          </div>
        </div>

        {syncMessage ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{syncMessage}</p>
        ) : null}
      </section>

      <section className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Rechercher client, reference chantier, adresse ou description"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-12 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value as ChantierStatusFilter);
            }}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'Tous les statuts' : statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-stone-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-stone-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Client</th>
                <th className="px-5 py-3 text-left font-semibold">Chantier</th>
                <th className="px-5 py-3 text-left font-semibold">Description detaillee</th>
                <th className="px-5 py-3 text-left font-semibold">Statut</th>
                <th className="px-5 py-3 text-left font-semibold">Mise a jour</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Chargement des chantiers...
                    </span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Aucun chantier trouve.
                  </td>
                </tr>
              ) : (
                rows.map((chantier) => (
                  <tr key={chantier.id} className="border-t border-stone-100 align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {chantier.client?.prenom} {chantier.client?.nom}
                      </p>
                      <p className="text-xs text-slate-500">{chantier.client?.email ?? 'Email non renseigne'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{chantier.reference}</p>
                      <p className="mt-1 text-slate-600">{chantier.adresse}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-[520px] leading-6 text-slate-700" title={chantier.description ?? ''}>
                        {chantier.description?.trim() || 'Aucune description detaillee'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', chantier.statut === 'EN_COURS' ? 'bg-amber-100 text-amber-700' : chantier.statut === 'TERMINE' || chantier.statut === 'CLOTURE' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700')}>
                        {statusLabels[chantier.statut]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(chantier.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDocumentsChantier(chantier)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                          title="Gérer les documents"
                        >
                          <FileText size={14} /> {chantier._count?.documents ?? 0}
                        </button>
                        <button
                          onClick={() => openEdit(chantier)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-slate-600 transition hover:bg-stone-50"
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(chantier)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                          title="Supprimer"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 px-5 py-4 text-sm">
          <p className="text-slate-500">{meta.total} chantier(s) au total</p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-slate-600 disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={meta.page <= 1}
            >
              Precedent
            </button>
            <span className="px-2 text-slate-600">Page {meta.page} / {meta.totalPages}</span>
            <button
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-slate-600 disabled:opacity-40"
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              disabled={meta.page >= meta.totalPages}
            >
              Suivant
            </button>
          </div>
        </div>
      </section>

      {listQuery.error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getApiErrorMessage(listQuery.error, 'Impossible de charger la liste des chantiers.')}
        </section>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editing ? 'Modifier chantier' : 'Nouveau chantier'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-slate-500 hover:bg-stone-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Client</span>
                  <select
                    required
                    value={form.clientId}
                    onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">Selectionner un client</option>
                    {(clientsQuery.data ?? []).map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.prenom} {client.nom}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Reference</span>
                  <input
                    value={form.reference}
                    onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                    placeholder="Auto si vide"
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Adresse chantier</span>
                <input
                  required
                  value={form.adresse}
                  onChange={(event) => setForm((current) => ({ ...current, adresse: event.target.value }))}
                  className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Description detaillee</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Statut</span>
                  <select
                    value={form.statut}
                    onChange={(event) => setForm((current) => ({ ...current, statut: event.target.value as ChantierStatut }))}
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  >
                    {statusOptions
                      .filter((status): status is ChantierStatut => status !== 'ALL')
                      .map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Date debut</span>
                  <input
                    type="date"
                    value={form.dateDebut}
                    onChange={(event) => setForm((current) => ({ ...current, dateDebut: event.target.value }))}
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Date fin</span>
                  <input
                    type="date"
                    value={form.dateFin}
                    onChange={(event) => setForm((current) => ({ ...current, dateFin: event.target.value }))}
                    className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-2xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </label>

              {submitMutation.error ? (
                <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {getApiErrorMessage(submitMutation.error, 'Impossible d enregistrer ce chantier.')}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                  }}
                  className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
                >
                  {submitMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <HardHat size={16} />}
                  {editing ? 'Mettre a jour' : 'Ajouter chantier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {documentsChantier ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Documents du chantier</h2>
                <p className="mt-1 text-sm text-slate-500">{documentsChantier.reference} — {documentsChantier.adresse}</p>
              </div>
              <button type="button" onClick={() => setDocumentsChantier(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-slate-500 hover:bg-stone-50" aria-label="Fermer">✕</button>
            </div>

            <form
              className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                createDocumentMutation.mutate();
              }}
            >
              <input required value={documentForm.nom} onChange={(event) => setDocumentForm((current) => ({ ...current, nom: event.target.value }))} placeholder="Nom du document" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              <select value={documentForm.type} onChange={(event) => setDocumentForm((current) => ({ ...current, type: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                <option value="PLAN">Plan</option>
                <option value="CONTRAT">Contrat</option>
                <option value="PV">Procès-verbal</option>
                <option value="RAPPORT">Rapport</option>
                <option value="AUTRE">Autre</option>
              </select>
              <input required type="url" value={documentForm.url} onChange={(event) => setDocumentForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 md:col-span-2" />
              <button type="submit" disabled={createDocumentMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 md:col-span-2">
                {createDocumentMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Ajouter le document
              </button>
              {createDocumentMutation.error ? <p className="text-sm text-rose-700 md:col-span-2">{getApiErrorMessage(createDocumentMutation.error, 'Impossible d’ajouter le document.')}</p> : null}
            </form>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              {documentsQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Chargement…</div>
              ) : (documentsQuery.data?.documents ?? []).length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Aucun document ajouté.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(documentsQuery.data?.documents ?? []).map((document) => (
                    <div key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <FileText size={18} className="shrink-0 text-blue-600" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{document.nom}</p><p className="text-xs text-slate-500">{document.type} · {formatDate(document.createdAt)}</p></div>
                      <a href={document.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><ExternalLink size={14} /> Ouvrir</a>
                      <button type="button" onClick={() => deleteDocumentMutation.mutate(document.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
