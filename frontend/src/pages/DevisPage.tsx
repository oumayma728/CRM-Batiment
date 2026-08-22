import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { DevisInvoice } from '@/components/DevisInvoice';
import { DevisManualEditorModal } from '@/components/devis/DevisManualEditorModal';
import { FactureDocument } from '@/components/documents/FactureDocument';
import { BonCommandeDocument } from '@/components/documents/BonCommandeDocument';
import { CommandeFournisseurDocument } from '@/components/documents/CommandeFournisseurDocument';
import {
  buildSupplierPurchaseDocumentData,
  type SupplierPurchaseDocumentData,
} from '@/lib/documentBuilders';
import type { BonCommande, Client, Devis, DevisStatut, Facture } from '@/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';

// -----------------------------------------------------------------------------

type SortField = 'reference' | 'client' | 'statut' | 'totalHT' | 'totalTTC' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface DevisForm {
  clientId: string;
  tauxTVA: string;
  notes: string;
  lignes: LigneForm[];
}

interface LigneForm {
  id: string; // client-side key
  designation: string;
  quantite: string;
  prixUnitaire: string;
  unite: string;
}

type ActiveGeneratedDocument =
  | { kind: 'facture'; devis: Devis; facture: Facture }
  | { kind: 'bonCommande'; devis: Devis; bonCommande: BonCommande }
  | { kind: 'commandeFournisseur'; document: SupplierPurchaseDocumentData }
  | null;

// -----------------------------------------------------------------------------

const statutConfig: Record<string, { bg: string; text: string; dot: string; label: string; darkBg: string; darkText: string }> = {
  BROUILLON: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', label: 'Brouillon', darkBg: 'dark:bg-slate-700', darkText: 'dark:text-slate-300' },
  ENVOYE:    { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500',  label: 'Envoyé',    darkBg: 'dark:bg-blue-900/40',    darkText: 'dark:text-blue-300' },
  ACCEPTE:   { bg: 'bg-emerald-50',text: 'text-emerald-700',dot:'bg-emerald-500',label:'Accepté',   darkBg: 'dark:bg-emerald-900/40', darkText: 'dark:text-emerald-300' },
  SIGNE:     { bg: 'bg-emerald-100',text:'text-emerald-800',dot:'bg-emerald-600',label:'Signé',     darkBg: 'dark:bg-emerald-900/60', darkText: 'dark:text-emerald-200' },
  REFUSE:    { bg: 'bg-rose-50',   text: 'text-rose-700',  dot: 'bg-rose-500',  label: 'Refusé',    darkBg: 'dark:bg-rose-900/40',    darkText: 'dark:text-rose-300' },
  ANNULE:    { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500', label: 'Annulé',    darkBg: 'dark:bg-amber-900/40',   darkText: 'dark:text-amber-300' },
  REVISE:    { bg: 'bg-violet-50', text: 'text-violet-700',dot: 'bg-violet-500',label: 'Révisé',    darkBg: 'dark:bg-violet-900/40',  darkText: 'dark:text-violet-300' },
  RENVOYE:   { bg: 'bg-cyan-50',   text: 'text-cyan-700',  dot: 'bg-cyan-500',  label: 'Renvoyé',   darkBg: 'dark:bg-cyan-900/40',    darkText: 'dark:text-cyan-300' },
};

const statutActions: Record<DevisStatut, { label: string; value: DevisStatut; color: string }[]> = {
  BROUILLON: [
    { label: 'Marquer envoyé', value: 'ENVOYE', color: 'text-blue-600' },
    { label: 'Annuler', value: 'ANNULE', color: 'text-amber-600' },
  ],
  ENVOYE: [
    { label: 'Marquer signé', value: 'SIGNE', color: 'text-emerald-700' },
    { label: 'Marquer accepté', value: 'ACCEPTE', color: 'text-emerald-600' },
    { label: 'Marquer refusé', value: 'REFUSE', color: 'text-rose-600' },
    { label: 'Annuler', value: 'ANNULE', color: 'text-amber-600' },
  ],
  ACCEPTE: [
    { label: 'Marquer signé', value: 'SIGNE', color: 'text-emerald-700' },
    { label: 'Annuler', value: 'ANNULE', color: 'text-amber-600' },
  ],
  SIGNE: [],
  REFUSE: [
    { label: 'Passer en révisé', value: 'REVISE', color: 'text-violet-600' },
    { label: 'Annuler', value: 'ANNULE', color: 'text-amber-600' },
  ],
  ANNULE: [],
  REVISE: [
    { label: 'Renvoyer au client', value: 'RENVOYE', color: 'text-cyan-700' },
    { label: 'Annuler', value: 'ANNULE', color: 'text-amber-600' },
  ],
  RENVOYE: [
    { label: 'Marquer signé', value: 'SIGNE', color: 'text-emerald-700' },
    { label: 'Marquer accepté', value: 'ACCEPTE', color: 'text-emerald-600' },
    { label: 'Marquer refusé', value: 'REFUSE', color: 'text-rose-600' },
    { label: 'Annuler', value: 'ANNULE', color: 'text-amber-600' },
  ],
};

const emptyLigne = (): LigneForm => ({
  id: crypto.randomUUID(),
  designation: '',
  quantite: '1',
  prixUnitaire: '',
  unite: 'unité',
});

const emptyForm: DevisForm = {
  clientId: '',
  tauxTVA: '20',
  notes: '',
  lignes: [emptyLigne()],
};

// -----------------------------------------------------------------------------

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' && error !== null &&
    'response' in error &&
    typeof (error as any).response === 'object' &&
    (error as any).response !== null &&
    'data' in (error as any).response &&
    typeof (error as any).response.data === 'object' &&
    (error as any).response.data !== null &&
    'message' in (error as any).response.data
  ) {
    const msg = (error as any).response.data.message;
    if (typeof msg === 'string') return msg;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function buildPurchaseOrderFeedback(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback;
  const message = 'message' in data && typeof (data as any).message === 'string' ? (data as any).message : fallback;
  const warnings = 'warnings' in data && Array.isArray((data as any).warnings)
    ? (data as any).warnings.filter((w: unknown): w is string => typeof w === 'string')
    : [];
  return warnings.length > 0 ? `${message} Avertissements : ${warnings.join(' | ')}` : message;
}

// -----------------------------------------------------------------------------

function MenuAction({ label, onClick, color, disabled }: {
  label: string; onClick: () => void; color: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full px-4 py-2 text-left text-sm font-medium transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50',
        color,
      )}
    >
      {label}
    </button>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowUpDown size={12} className="ml-1 inline text-slate-400" />;
  return sortDir === 'asc'
    ? <ArrowUpAZ size={12} className="ml-1 inline text-primary-600 dark:text-primary-400" />
    : <ArrowDownAZ size={12} className="ml-1 inline text-primary-600 dark:text-primary-400" />;
}

// -----------------------------------------------------------------------------

function DeleteConfirmModal({ reference, onConfirm, onCancel, loading }: {
  reference: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-2xl">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/30">
            <AlertTriangle size={26} className="text-rose-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Supprimer le devis ?</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Le devis <span className="font-semibold text-slate-700 dark:text-slate-300">{reference}</span> sera supprimé définitivement. Cette action est irréversible.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

function DevisFormModal({
  mode,
  initial,
  clientsList,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  mode: 'create' | 'edit';
  initial: DevisForm;
  clientsList: Client[];
  onClose: () => void;
  onSubmit: (form: DevisForm) => void;
  loading: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<DevisForm>(initial);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {mode === 'create' ? 'Nouveau devis' : 'Modifier le devis'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-6">
            {/* Client + TVA */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Client *</label>
                <select
                  required
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                >
                  <option value="">Sélectionner un client</option>
                  {clientsList.map(c => (
                    <option key={c.id} value={c.id}>
                      {`${c.prenom ?? ''} ${c.nom}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">TVA (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.tauxTVA}
                  onChange={e => setForm({ ...form, tauxTVA: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Info lignes */}
            {mode === 'create' && (
              <div className="rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                💡 Les lignes du devis peuvent être ajoutées après la création via l'éditeur manuel (icône aperçu → Modifier).
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</label>
              <textarea
                value={form.notes}
                rows={3}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Conditions, remarques, délais de paiement..."
                className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-2 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:hover:bg-primary-700 disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'create' ? 'Créer le devis' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

export default function DevisPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const workspaceBasePath = user?.role === 'ASSISTANTE' ? '/assistante' : '/admin';
  const queryClient = useQueryClient();

  // Pagination + search + sort
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editDevis, setEditDevis] = useState<Devis | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Devis | null>(null);
  const [previewDevisId, setPreviewDevisId] = useState<number | null>(null);
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [activeDocumentPreview, setActiveDocumentPreview] = useState<ActiveGeneratedDocument>(null);
  const [sendingDevisId, setSendingDevisId] = useState<number | null>(null);
  const [updatingDevisId, setUpdatingDevisId] = useState<number | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const limit = 10;

  // Close action menu on outside click
  useEffect(() => {
    function handler() {
      if (actionMenuId !== null) setActionMenuId(null);
    }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [actionMenuId]);

  // -- Queries --

  const { data, isLoading } = useQuery({
    queryKey: ['devis', page, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await api.get('/devis', { params });
      return response.data;
    },
  });

  const { data: previewDevis, isLoading: loadingPreview } = useQuery({
    queryKey: ['devis-detail', previewDevisId],
    enabled: previewDevisId !== null,
    queryFn: async () => {
      const response = await api.get(`/devis/${previewDevisId}`);
      return response.data as Devis;
    },
  });

  const { data: clientsList } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const response = await api.get('/clients', { params: { limit: 100 } });
      return (response.data?.data ?? []) as Client[];
    },
  });

  // -- Mutations --

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/devis', body),
    onMutate: () => { setFormError(null); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devis'] });
      setShowCreateModal(false);
      setFeedback({ type: 'success', text: 'Devis créé avec succès.' });
    },
    onError: (error: unknown) => {
      setFormError(getApiErrorMessage(error, 'Erreur lors de la création du devis.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.patch(`/devis/${id}`, body),
    onMutate: () => { setFormError(null); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devis'] });
      setEditDevis(null);
      setFeedback({ type: 'success', text: 'Devis mis à jour avec succès.' });
    },
    onError: (error: unknown) => {
      setFormError(getApiErrorMessage(error, 'Erreur lors de la mise à jour.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/devis/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devis'] });
      setDeleteTarget(null);
      setFeedback({ type: 'success', text: 'Devis supprimé.' });
    },
    onError: (error: unknown) => {
      setDeleteTarget(null);
      setFeedback({ type: 'error', text: getApiErrorMessage(error, 'Erreur lors de la suppression.') });
    },
  });

  const sendClientMutation = useMutation({
    mutationFn: (id: number) => api.post(`/devis/${id}/send-client`),
    onMutate: (id) => { setSendingDevisId(id); setFeedback(null); },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['devis'] });
      setFeedback({ type: 'success', text: response.data?.message ?? 'Devis envoyé au client.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', text: getApiErrorMessage(error, "Erreur lors de l'envoi.") });
    },
    onSettled: () => setSendingDevisId(null),
  });

  const validateBonCommandeAndSendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/devis/${id}/bon-commande/validate-send`),
    onMutate: () => { setFeedback(null); },
    onSuccess: async (response, devisId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['devis'] }),
        queryClient.invalidateQueries({ queryKey: ['devis-detail', devisId] }),
      ]);
      setActionMenuId(null);
      setFeedback({ type: 'success', text: buildPurchaseOrderFeedback(response.data, 'Bon de commande validé.') });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', text: getApiErrorMessage(error, 'Erreur validation bon de commande.') });
    },
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: DevisStatut }) =>
      api.patch(`/devis/${id}/statut`, { statut }),
    onMutate: ({ id }) => { setUpdatingDevisId(id); setFeedback(null); },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['devis'] });
      setActionMenuId(null);
      setFeedback({ type: 'success', text: response.data?.message ?? 'Statut mis à jour.' });
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', text: getApiErrorMessage(error, 'Erreur mise à jour statut.') });
    },
    onSettled: () => setUpdatingDevisId(null),
  });

  const createFactureFromDevisMutation = useMutation({
    mutationFn: (devisId: number) => api.post(`/factures/from-devis/${devisId}`, {}),
    onMutate: () => { setFeedback(null); },
    onSuccess: (response) => {
      setFeedback({ type: 'success', text: 'Facture créée depuis le devis.' });
      navigate(`${workspaceBasePath}/factures/${response.data.id}`);
    },
    onError: (error: unknown) => {
      setFeedback({ type: 'error', text: getApiErrorMessage(error, 'Impossible de transformer ce devis en facture.') });
    },
  });

  // -- Helpers --

  const rawList: Devis[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, totalPages: 1 };

  const devisList = [...rawList].sort((a, b) => {
    let valA: string | number = '';
    let valB: string | number = '';

    switch (sortField) {
      case 'reference':
        valA = a.reference ?? '';
        valB = b.reference ?? '';
        break;
      case 'client':
        valA = a.client ? `${a.client.prenom ?? ''} ${a.client.nom}`.trim() : '';
        valB = b.client ? `${b.client.prenom ?? ''} ${b.client.nom}`.trim() : '';
        break;
      case 'statut':
        valA = a.statut ?? '';
        valB = b.statut ?? '';
        break;
      case 'totalHT':
        valA = a.totalHT ?? 0;
        valB = b.totalHT ?? 0;
        break;
      case 'totalTTC':
        valA = a.totalTTC ?? 0;
        valB = b.totalTTC ?? 0;
        break;
      case 'createdAt':
      default:
        valA = a.createdAt ?? '';
        valB = b.createdAt ?? '';
        break;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function buildFormBody(form: DevisForm): Record<string, unknown> {
    const body: Record<string, unknown> = {
      clientId: Number(form.clientId),
      tauxTVA: Number(form.tauxTVA),
      modeValidation: 'VERBAL',
    };
    if (form.notes.trim()) body.notes = form.notes.trim();
    // Les lignes sont gérées séparément via le manuel editor après création
    return body;
  }

  function handleCreate(form: DevisForm) {
    createMutation.mutate(buildFormBody(form));
  }

  function handleEdit(form: DevisForm) {
    if (!editDevis) return;
    updateMutation.mutate({ id: editDevis.id, body: buildFormBody(form) });
  }

  function devisToForm(devis: Devis): DevisForm {
    return {
      clientId: String(devis.client?.id ?? ''),
      tauxTVA: String(devis.tauxTVA ?? 20),
      notes: devis.notes ?? '',
      lignes: (devis.lignes ?? []).map((l: any) => ({
        id: crypto.randomUUID(),
        designation: l.designation ?? '',
        quantite: String(l.quantite ?? 1),
        prixUnitaire: String(l.prixUnitaire ?? ''),
        unite: l.unite ?? 'unité',
      })),
    };
  }

  function canSendToClient(statut: string) {
    return ['BROUILLON', 'REVISE', 'ENVOYE', 'RENVOYE'].includes(statut);
  }

  function handleOpenFacture(factureId: number) {
    if (!previewDevis) return;
    const facture = previewDevis.factures?.find((item) => item.id === factureId);
    if (!facture) return;
    setActiveDocumentPreview({ kind: 'facture', devis: previewDevis, facture });
  }

  function handleOpenBonCommande() {
    if (!previewDevis?.bonCommande) return;
    setActiveDocumentPreview({ kind: 'bonCommande', devis: previewDevis, bonCommande: previewDevis.bonCommande });
  }

  function handleOpenCommandeFournisseur(commandeId: number) {
    if (!previewDevis) return;
    const commande = previewDevis.commandesFournisseur?.find((item) => item.id === commandeId);
    if (!commande) return;
    setActiveDocumentPreview({ kind: 'commandeFournisseur', document: buildSupplierPurchaseDocumentData(previewDevis, commande) });
  }

  async function refreshPreviewDevis() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['devis'] }),
      queryClient.invalidateQueries({ queryKey: ['devis-detail', previewDevisId] }),
    ]);
  }

  const thClass = 'px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition';
  const thRClass = thClass + ' text-right';

  // -- Render --

  return (
    <div className="max-w-full space-y-6 dark:text-slate-100">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <FileSpreadsheet size={24} className="text-primary-600 dark:text-primary-400" />
            Gestion des devis
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meta.total} devis enregistrés</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#185FA5] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F4780] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 dark:bg-[#2380B8] dark:hover:bg-[#185FA5]"
          >
            <Plus size={16} />
            Nouveau devis
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={cn(
          'flex items-center justify-between rounded-2xl border px-4 py-3 text-sm',
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
        )}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-4 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="w-full max-w-md">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            placeholder="Rechercher par référence, client..."
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        ) : devisList.length === 0 ? (
          <div className="py-24 text-center text-slate-500 dark:text-slate-400">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
              <FileSpreadsheet size={32} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Aucun devis trouvé</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              {debouncedSearch ? `Aucun résultat pour "${debouncedSearch}"` : 'Créez votre premier devis pour commencer.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
                  <th className={thClass} onClick={() => toggleSort('reference')}>
                    Référence <SortIcon field="reference" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('client')}>
                    Client <SortIcon field="client" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('statut')}>
                    Statut <SortIcon field="statut" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thRClass} onClick={() => toggleSort('totalHT')}>
                    HT <SortIcon field="totalHT" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thRClass} onClick={() => toggleSort('totalTTC')}>
                    TTC <SortIcon field="totalTTC" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort('createdAt')}>
                    Date <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {devisList.map((devis) => {
                  const status = statutConfig[devis.statut] ?? statutConfig.BROUILLON;
                  const actions = statutActions[devis.statut] ?? [];
                  const clientName = devis.client
                    ? `${devis.client.prenom ?? ''} ${devis.client.nom}`.trim()
                    : 'Client non renseigné';

                  return (
                    <tr key={devis.id} className="group transition hover:bg-primary-50/30 dark:hover:bg-slate-800/60">
                      <td className="px-4 sm:px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{devis.reference}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{clientName}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold',
                          status.bg, status.text, status.darkBg, status.darkText,
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(devis.totalHT ?? 0)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(devis.totalTTC ?? 0)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(devis.createdAt)}</td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">

                          {/* Send */}
                          {canSendToClient(devis.statut) && (
                            <button
                              onClick={() => sendClientMutation.mutate(devis.id)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
                              title={['ENVOYE', 'RENVOYE'].includes(devis.statut) ? 'Renvoyer au client' : 'Envoyer au client'}
                            >
                              {sendingDevisId === devis.id && sendClientMutation.isPending
                                ? <Loader2 size={15} className="animate-spin" />
                                : <Send size={15} />}
                            </button>
                          )}

                          {/* Status menu */}
                          {actions.length > 0 && (
                            <div className="relative" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setActionMenuId(actionMenuId === devis.id ? null : devis.id)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Changer statut"
                              >
                                {updatingDevisId === devis.id && updateStatutMutation.isPending
                                  ? <Loader2 size={15} className="animate-spin" />
                                  : <MoreVertical size={15} />}
                              </button>
                              {actionMenuId === devis.id && (
                                <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg">
                                  {actions.map((action) => (
                                    <MenuAction
                                      key={action.value}
                                      label={action.label}
                                      color={action.color}
                                      disabled={updateStatutMutation.isPending}
                                      onClick={() => updateStatutMutation.mutate({ id: devis.id, statut: action.value })}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Preview */}
                          <button
                            onClick={() => setPreviewDevisId(devis.id)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400"
                            title="Aperçu"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => { setFormError(null); setEditDevis(devis); }}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400"
                            title="Modifier"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* To invoice */}
                          <button
                            onClick={() => createFactureFromDevisMutation.mutate(devis.id)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400"
                            title="Transformer en facture"
                          >
                            {createFactureFromDevisMutation.isPending
                              ? <Loader2 size={15} className="animate-spin" />
                              : <Receipt size={15} />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(devis)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400"
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
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 px-6 py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{meta.page}</span>
              {' '}sur{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{meta.totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-400 transition hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-400 transition hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* -- Modals -- */}

      {showCreateModal && (
        <DevisFormModal
          mode="create"
          initial={emptyForm}
          clientsList={clientsList ?? []}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          loading={createMutation.isPending}
          error={formError}
        />
      )}

      {editDevis && (
        <DevisFormModal
          mode="edit"
          initial={devisToForm(editDevis)}
          clientsList={clientsList ?? []}
          onClose={() => setEditDevis(null)}
          onSubmit={handleEdit}
          loading={updateMutation.isPending}
          error={formError}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          reference={deleteTarget.reference}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMutation.isPending}
        />
      )}

      {/* Preview loading */}
      {loadingPreview && previewDevisId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 px-5 py-4 shadow-xl">
            <Loader2 size={18} className="animate-spin text-primary-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Chargement du devis...</span>
          </div>
        </div>
      )}

      {previewDevis && previewDevisId !== null && (
        <DevisInvoice
          devis={previewDevis}
          onClose={() => setPreviewDevisId(null)}
          onPrint={() => window.print()}
          showGeneratedDocuments={false}
          onManualEdit={() => setShowManualEditor(true)}
          onOpenFacture={handleOpenFacture}
          onOpenBonCommande={handleOpenBonCommande}
          onOpenCommandeFournisseur={handleOpenCommandeFournisseur}
          onValidateBonCommandeAndSend={
            previewDevis.bonCommande &&
            ['ACCEPTE', 'SIGNE'].includes(previewDevis.statut) &&
            (previewDevis.bonCommande.statut !== 'ENVOYE' ||
              (previewDevis.commandesFournisseur ?? []).some(c => c.statutLivraison === 'CREEE'))
              ? async () => { await validateBonCommandeAndSendMutation.mutateAsync(previewDevis.id); }
              : undefined
          }
          validateBonCommandeLabel={
            previewDevis.bonCommande?.statut === 'BROUILLON'
              ? 'Valider BC et envoyer fournisseurs'
              : 'Envoyer commandes fournisseur'
          }
          validateBonCommandeConfirmMessage="Confirmez-vous la validation du bon de commande et l'envoi des commandes fournisseur ?"
          validateBonCommandeLoadingLabel="Envoi en cours..."
        />
      )}

      {previewDevis && showManualEditor && (
        <DevisManualEditorModal
          devis={previewDevis}
          open={showManualEditor}
          onClose={() => setShowManualEditor(false)}
          onSaved={refreshPreviewDevis}
        />
      )}

      {activeDocumentPreview?.kind === 'facture' && (
        <FactureDocument
          devis={activeDocumentPreview.devis}
          facture={activeDocumentPreview.facture}
          onClose={() => setActiveDocumentPreview(null)}
          onPrint={() => window.print()}
        />
      )}

      {activeDocumentPreview?.kind === 'bonCommande' && (
        <BonCommandeDocument
          devis={activeDocumentPreview.devis}
          bonCommande={activeDocumentPreview.bonCommande}
          onClose={() => setActiveDocumentPreview(null)}
          onPrint={() => window.print()}
        />
      )}

      {activeDocumentPreview?.kind === 'commandeFournisseur' && (
        <CommandeFournisseurDocument
          document={activeDocumentPreview.document}
          onClose={() => setActiveDocumentPreview(null)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}