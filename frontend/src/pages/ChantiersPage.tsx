import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HardHat,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Select, Input, TextArea, SubmitButton } from '@/components/ui/Form';
import axios from 'axios';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import PageHero from '@/components/PageHero';
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
    <div className="space-y-4">
      <PageHero
        icon={<HardHat size={22} />}
        title="Gestion des Chantiers"
        subtitle={`${meta.total} chantier(s) au total · Synchronisation automatique depuis les devis acceptés`}
        accent="amber"
        actions={
          <>
            <button
              onClick={() => syncMutation.mutate()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors text-sm font-medium shadow-sm"
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
              Synchroniser
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-all font-medium text-sm shadow-sm"
            >
              <Plus size={16} /> Nouveau chantier
            </button>
          </>
        }
      />

      {syncMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{syncMessage}</div>
      )}

      {/* Search & Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Rechercher client, référence chantier, adresse..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/20 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => {
            setPage(1);
            setStatusFilter(event.target.value as ChantierStatusFilter);
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === 'ALL' ? 'Tous les statuts' : statusLabels[status]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Client</th>
                <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Chantier</th>
                <th className="w-[30%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Description détaillée</th>
                <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Statut</th>
                <th className="w-[15%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mise à jour</th>
                <th className="w-[10%] px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
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

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
          <p className="text-slate-500">{meta.total} chantier(s) au total</p>
          <div className="flex items-center gap-1.5">
            <button
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={meta.page <= 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm font-medium text-slate-600">Page {meta.page} / {meta.totalPages}</span>
            <button
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 transition-all"
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              disabled={meta.page >= meta.totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {listQuery.error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
          {getApiErrorMessage(listQuery.error, 'Impossible de charger la liste des chantiers.')}
        </section>
      ) : null}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        title={editing ? 'Modifier chantier' : 'Nouveau chantier'}
        icon={editing ? Edit3 : HardHat}
        accent="amber"
        maxWidth="3xl"
      >
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Client"
                required
                value={form.clientId}
                onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
                options={[
                  { value: '', label: 'Sélectionner un client' },
                  ...(clientsQuery.data ?? []).map((client) => ({ value: client.id, label: `${client.prenom} ${client.nom}` }))
                ]}
              />
              <Input
                label="Référence"
                value={form.reference}
                onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
                placeholder="Auto si vide"
              />
            </div>

            <Input
              label="Adresse chantier"
              required
              value={form.adresse}
              onChange={(event) => setForm((current) => ({ ...current, adresse: event.target.value }))}
            />

            <TextArea
              label="Description détaillée"
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Statut"
                value={form.statut}
                onChange={(event) => setForm((current) => ({ ...current, statut: event.target.value as ChantierStatut }))}
                options={statusOptions
                  .filter((status): status is ChantierStatut => status !== 'ALL')
                  .map((status) => ({ value: status, label: statusLabels[status] }))}
              />
              <Input
                label="Date début"
                type="date"
                value={form.dateDebut}
                onChange={(event) => setForm((current) => ({ ...current, dateDebut: event.target.value }))}
              />
              <Input
                label="Date fin"
                type="date"
                value={form.dateFin}
                onChange={(event) => setForm((current) => ({ ...current, dateFin: event.target.value }))}
              />
            </div>

            <TextArea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />

            {submitMutation.error && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 border border-rose-100">
                {getApiErrorMessage(submitMutation.error, 'Impossible d enregistrer ce chantier.')}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditing(null); }}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
              >
                Annuler
              </button>
              <SubmitButton isLoading={submitMutation.isPending} icon={editing ? Pencil : HardHat}>
                {editing ? 'Mettre à jour' : 'Ajouter chantier'}
              </SubmitButton>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
