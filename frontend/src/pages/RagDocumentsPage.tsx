import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Database,
  Edit,
  Loader2,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast, getErrorMessage } from '@/components/ui/Toast';
import type { RagDocument } from '@/types';
import PageHero from '@/components/PageHero';
import ManagerAssistantChat from '@/components/ManagerAssistantChat';

interface RagDocumentForm {
  titre: string;
  categorie: string;
  contenu: string;
  actif: boolean;
  priorite: number;
}

const emptyForm: RagDocumentForm = {
  titre: '',
  categorie: 'faq',
  contenu: '',
  actif: true,
  priorite: 0,
};

const categoryOptions = [
  'faq',
  'services',
  'prix',
  'conditions',
  'procedure',
  'commercial',
];

export default function RagDocumentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<RagDocument | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<RagDocumentForm>(emptyForm);
  const [activeTab, setActiveTab] = useState<'documents' | 'assistant'>('documents');

  const { data: documents, isLoading, isError } = useQuery({
    queryKey: ['rag-documents', search, categoryFilter],
    queryFn: async () => {
      const res = await api.get('/rag/documents', {
        params: {
          search: search.trim() || undefined,
          categorie: categoryFilter || undefined,
        },
      });
      return (res.data ?? []) as RagDocument[];
    },
  });

  const availableCategories = useMemo(() => {
    const fromDocuments = (documents ?? []).map((document) => document.categorie);
    return [...new Set([...categoryOptions, ...fromDocuments])].filter(Boolean);
  }, [documents]);

  const toast = useToast();

  const saveMutation = useMutation({
    mutationFn: (payload: RagDocumentForm) => {
      const body = {
        ...payload,
        titre: payload.titre.trim(),
        categorie: payload.categorie.trim(),
        contenu: payload.contenu.trim(),
        priorite: Number(payload.priorite) || 0,
      };

      if (editingDocument) {
        return api.patch(`/rag/documents/${editingDocument.id}`, body);
      }

      return api.post('/rag/documents', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });
      closeModal();
      toast.success(editingDocument ? 'Document mis à jour' : 'Document créé', editingDocument ? 'Les modifications ont été enregistrées.' : 'Le document a été ajouté avec succès.');
    },
    onError: (err) => { toast.error('Échec de l\'enregistrement', getErrorMessage(err)); },
  });

  const toggleMutation = useMutation({
    mutationFn: (document: RagDocument) =>
      api.patch(`/rag/documents/${document.id}`, { actif: !document.actif }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });
    },
    onError: (err) => { toast.error('Échec du changement de statut', getErrorMessage(err)); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/rag/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rag-documents'] });
      setDeleteId(null);
      toast.success('Document supprimé', 'Le document a été retiré définitivement.');
    },
    onError: (err) => { toast.error('Échec de la suppression', getErrorMessage(err)); },
  });

  function openCreate() {
    saveMutation.reset();
    setEditingDocument(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(document: RagDocument) {
    saveMutation.reset();
    setEditingDocument(document);
    setForm({
      titre: document.titre,
      categorie: document.categorie,
      contenu: document.contenu,
      actif: document.actif,
      priorite: document.priorite,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingDocument(null);
    setForm(emptyForm);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  const items = documents ?? [];

  if (activeTab === 'assistant') {
    return (
      <div className="-mx-3 sm:-mx-4 lg:-mx-6 -mb-3 sm:-mb-4 lg:-mb-6 -mt-3 sm:-mt-4 lg:-mt-6 h-[calc(100vh-61px)] flex flex-col z-10 relative">
        <ManagerAssistantChat onSwitchToDocuments={() => setActiveTab('documents')} />
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col">
      <PageHero
        icon={<Database size={22} />}
        title="IA & Système RAG"
        subtitle={`${items.length} document(s) dans la base de connaissance`}
        accent="indigo"
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Tabs inside Header */}
            <div className="flex bg-white/50 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-slate-200/60 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className="flex items-center justify-center whitespace-nowrap gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none bg-white text-slate-900 shadow-sm"
              >
                <Database size={15} />
                Base de Connaissance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('assistant')}
                className="flex items-center justify-center whitespace-nowrap gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none text-slate-600 hover:text-slate-900"
              >
                <Bot size={15} />
                Assistant IA
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">NOUVEAU</span>
              </button>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center whitespace-nowrap gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-all font-medium text-sm shadow-sm w-full sm:w-auto"
            >
              <Plus size={16} /> Ajouter document
            </button>
          </div>
        }
      />

      {/* Documents Tab */}


          <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un document..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/20 transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="">Toutes catégories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="flex h-44 items-center justify-center text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Chargement
              </div>
            ) : isError ? (
              <div className="flex h-44 items-center justify-center text-sm text-red-600">
                Impossible de charger la base IA.
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center gap-2 text-gray-500">
                <Database className="h-8 w-8 text-gray-300" />
                <span className="text-sm">Aucun document</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Document</th>
                      <th className="px-6 py-4">Categorie</th>
                      <th className="px-6 py-4">Priorite</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((document) => (
                      <tr key={document.id} className="align-top hover:bg-gray-50/70">
                        <td className="max-w-xl px-6 py-4">
                          <p className="font-semibold text-gray-900">{document.titre}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                            {document.contenu}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {document.categorie}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{document.priorite}</td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate(document)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                              document.actif
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-500',
                            )}
                          >
                            {document.actif ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                            {document.actif ? 'Actif' : 'Inactif'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(document)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                              title="Modifier"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(document.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      {showModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingDocument ? 'Modifier document' : 'Ajouter document'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5">
              <label className="grid gap-1.5 relative">
                <span className="text-sm font-semibold text-gray-700">Titre</span>
                <input
                  value={form.titre}
                  onChange={(event) => setForm((prev) => ({ ...prev, titre: event.target.value }))}
                  required
                  maxLength={160}
                  className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[1fr_140px_110px]">
                <label className="grid gap-1.5 relative">
                  <span className="text-sm font-semibold text-gray-700">Categorie</span>
                  <input
                    value={form.categorie}
                    onChange={(event) => setForm((prev) => ({ ...prev, categorie: event.target.value }))}
                    required
                    maxLength={80}
                    list="rag-categories"
                    className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                  <datalist id="rag-categories">
                    {availableCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Priorite</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.priorite}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, priorite: Number(event.target.value) }))
                    }
                    className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-700">Actif</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, actif: !prev.actif }))}
                    className={cn(
                      'inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition',
                      form.actif
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500',
                    )}
                  >
                    {form.actif ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {form.actif ? 'Oui' : 'Non'}
                  </button>
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-gray-700">Contenu</span>
                <textarea
                  value={form.contenu}
                  onChange={(event) => setForm((prev) => ({ ...prev, contenu: event.target.value }))}
                  required
                  maxLength={10000}
                  rows={9}
                  className="resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                />
              </label>

              {saveMutation.isError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
                  <X size={16} className="text-red-600" /> Enregistrement impossible.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-lg">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {saveMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 size={20} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Supprimer document</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600 pl-13">
              Cette action retire le document de la base IA de façon permanente.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
