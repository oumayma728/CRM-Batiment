import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Filter,
} from 'lucide-react';

type VisiteTechnique = {
  id: number;
  clientId: number;
  clientNom: string;
  clientPrenom: string;
  clientEmail: string;
  clientTelephone: string;
  adresse: string;
  datePlanifiee: string;
  heurePlanifiee: string;
  dureeEstimee: number;
  statut: 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
  notes?: string;
  technicienId?: number;
  technicienNom?: string;
  devisId?: number;
  createdAt: string;
};

interface VisiteForm {
  clientId: string;
  datePlanifiee: string;
  heurePlanifiee: string;
  dureeEstimee: string;
  adresse: string;
  notes: string;
}

const statutConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PLANIFIE: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Planifié' },
  EN_COURS: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'En cours' },
  TERMINE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Terminé' },
  ANNULE: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Annulé' },
};

const emptyForm: VisiteForm = {
  clientId: '',
  datePlanifiee: '',
  heurePlanifiee: '',
  dureeEstimee: '1',
  adresse: '',
  notes: '',
};

export default function VisitesTechniquesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<VisiteForm>(emptyForm);
  const [selectedVisite, setSelectedVisite] = useState<VisiteTechnique | null>(null);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['visites-techniques', page, search, filterStatut],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (search) params.search = search;
      if (filterStatut) params.statut = filterStatut;
      const res = await api.get('/visites-techniques', { params });
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

  const visites: VisiteTechnique[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, lastPage: 1 };

  const createMutation = useMutation({
    mutationFn: (body: { clientId: number; datePlanifiee: string; heurePlanifiee: string; dureeEstimee: number; adresse: string; notes: string }) =>
      api.post('/visites-techniques', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visites-techniques'] });
      setShowModal(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & { datePlanifiee: string; heurePlanifiee: string; dureeEstimee: number; adresse: string; notes: string }) =>
      api.patch(`/visites-techniques/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visites-techniques'] });
      setShowModal(false);
      setSelectedVisite(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/visites-techniques/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visites-techniques'] }),
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      api.patch(`/visites-techniques/${id}`, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visites-techniques'] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientId = Number(form.clientId);
    if (!Number.isInteger(clientId) || clientId <= 0) return;

    const payload = {
      clientId,
      datePlanifiee: form.datePlanifiee,
      heurePlanifiee: form.heurePlanifiee,
      dureeEstimee: Number(form.dureeEstimee),
      adresse: form.adresse,
      notes: form.notes,
    };

    if (selectedVisite) {
      updateMutation.mutate({ id: selectedVisite.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleEdit(visite: VisiteTechnique) {
    setSelectedVisite(visite);
    setForm({
      clientId: String(visite.clientId),
      datePlanifiee: visite.datePlanifiee.split('T')[0],
      heurePlanifiee: visite.heurePlanifiee,
      dureeEstimee: String(visite.dureeEstimee),
      adresse: visite.adresse,
      notes: visite.notes || '',
    });
    setShowModal(true);
  }

  function handleDelete(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette visite technique?')) {
      deleteMutation.mutate(id);
    }
  }

  function handleStatutChange(id: number, statut: string) {
    updateStatutMutation.mutate({ id, statut });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Visites Techniques
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Planifiez et suivez les visites techniques auprès des clients
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedVisite(null);
            setForm(emptyForm);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4F8CFF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3B7BD9]"
        >
          <Plus size={18} />
          Nouvelle visite
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par client, adresse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 outline-none focus:border-[#4F8CFF] focus:ring-2 focus:ring-[#4F8CFF]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4F8CFF] focus:ring-2 focus:ring-[#4F8CFF]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tous les statuts</option>
              <option value="PLANIFIE">Planifié</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINE">Terminé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-[#4F8CFF]" size={32} />
        </div>
      ) : visites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            Aucune visite technique
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Commencez par planifier une nouvelle visite technique
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visites.map((visite) => {
            const config = statutConfig[visite.statut] || statutConfig.PLANIFIE;
            return (
              <div
                key={visite.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Client info */}
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {visite.clientPrenom} {visite.clientNom}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{visite.clientEmail}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{visite.clientTelephone}</p>
                      </div>
                    </div>

                    {/* Visit details */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Calendar size={16} className="text-gray-400" />
                        {formatDate(visite.datePlanifiee)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Clock size={16} className="text-gray-400" />
                        {visite.heurePlanifiee} ({visite.dureeEstimee}h)
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 sm:col-span-2">
                        <MapPin size={16} className="mt-0.5 text-gray-400" />
                        <span>{visite.adresse}</span>
                      </div>
                    </div>

                    {visite.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        "{visite.notes}"
                      </p>
                    )}
                  </div>

                  {/* Status and actions */}
                  <div className="flex flex-col gap-3 lg:min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                      <span className={`text-sm font-semibold ${config.text}`}>{config.label}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select
                        value={visite.statut}
                        onChange={(e) => handleStatutChange(visite.id, e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-[#4F8CFF] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      >
                        <option value="PLANIFIE">Planifié</option>
                        <option value="EN_COURS">En cours</option>
                        <option value="TERMINE">Terminé</option>
                        <option value="ANNULE">Annulé</option>
                      </select>
                      <button
                        onClick={() => handleEdit(visite)}
                        className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(visite.id)}
                        className="rounded-lg border border-gray-300 bg-white p-1.5 text-red-600 transition hover:bg-red-50 dark:border-gray-600 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} sur {meta.lastPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
            disabled={page === meta.lastPage}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              {selectedVisite ? 'Modifier la visite' : 'Nouvelle visite technique'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client *
                </label>
                <select
                  required
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4F8CFF] focus:ring-2 focus:ring-[#4F8CFF]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Sélectionner un client</option>
                  {clientsList?.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.prenom} {client.nom} - {client.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.datePlanifiee}
                    onChange={(e) => setForm({ ...form, datePlanifiee: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4F8CFF] focus:ring-2 focus:ring-[#4F8CFF]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Heure *
                  </label>
                  <input
                    type="time"
                    required
                    value={form.heurePlanifiee}
                    onChange={(e) => setForm({ ...form, heurePlanifiee: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4F8CFF] focus:ring-2 focus:ring-[#4F8CFF]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Durée estimée (heures) *
                </label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={form.dureeEstimee}
                  onChange={(e) => setForm({ ...form, dureeEstimee: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4F8CFF] focus:ring-2 focus:ring-[#4F8CFF]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adresse *
                </label>
                <input
                  type="text"
                  required
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="Adresse du chantier"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4F8CFF] focus:ring-2 focus:ring-[#4F8CFF]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes sur la visite..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#4F8CFF] focus:ring-2 focus:ring-[#4F8CFF]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedVisite(null);
                    setForm(emptyForm);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 rounded-lg bg-[#4F8CFF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3B7BD9] disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  ) : (
                    selectedVisite ? 'Modifier' : 'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
