import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CheckCircle2,
  Edit2,
  Eye,
  Loader2,
  Moon,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react';

type ClientForm = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresseClient: string;
  adresseChantier: string;
  source: string;
  besoin: string;
  notes: string;
};

type Client = {
  id: number | string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  adresseClient?: string;
  adresseChantier?: string;
  source?: string;
  besoin?: string;
  notes?: string;
};

type SortField = 'nom' | 'email' | 'telephone' | 'adresse';
type SortOrder = 'asc' | 'desc';

const emptyForm: ClientForm = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  adresseClient: '',
  adresseChantier: '',
  source: '',
  besoin: '',
  notes: '',
};

const sourceOptions = [
  { value: '', label: 'Non renseignee' },
  { value: 'APPEL', label: 'Appel' },
  { value: 'SITE_WEB', label: 'Site web' },
  { value: 'CHATBOT', label: 'Chatbot' },
  { value: 'TECHNICO_COMMERCIAL', label: 'Technico-commercial' },
  { value: 'RECOMMANDATION', label: 'Recommandation' },
  { value: 'AUTRE', label: 'Autre' },
];

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'nom', label: 'Nom' },
  { value: 'email', label: 'Email' },
  { value: 'telephone', label: 'Telephone' },
  { value: 'adresse', label: 'Adresse' },
];

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#185FA5] dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500';

const labelClass = 'text-sm font-medium text-gray-700 dark:text-gray-300';

const buildPayload = (form: ClientForm) =>
  Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value),
  );

const getClientSortValue = (client: Client, sortBy: SortField) => {
  if (sortBy === 'adresse') {
    return client.adresseClient || client.adresseChantier || '';
  }

  return client[sortBy] || '';
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const isValidPhone = (telephone: string) =>
  /^[+()\d\s.-]{6,20}$/.test(telephone.trim());

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<Client['id'] | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('nom');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const { data: clientsData, isLoading, error, refetch } = useQuery({
    queryKey: ['clients', page, searchTerm],
    queryFn: async () => {
      const response = await api.get('/clients', {
        params: { page, limit: 10, search: searchTerm },
      });
      return response.data;
    },
  });

  const createClient = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      const response = await api.post('/clients', payload);
      return response.data;
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setFormError('');
      setIsFormOpen(false);
      await refetch();
    },
    onError: (mutationError: any) => {
      setFormError(
        mutationError.response?.data?.message ||
          mutationError.message ||
          'Impossible de creer le client.',
      );
    },
  });

  const updateClient = useMutation({
    mutationFn: async () => {
      if (!editingClient) {
        throw new Error('Aucun client selectionne.');
      }

      const payload = buildPayload(form);
      const response = await api.patch(`/clients/${editingClient.id}`, payload);
      return response.data;
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setFormError('');
      setEditingClient(null);
      setIsFormOpen(false);
      setActionMessage('Client modifie avec succes.');
      await refetch();
    },
    onError: (mutationError: any) => {
      setFormError(
        mutationError.response?.data?.message ||
          mutationError.message ||
          'Impossible de modifier le client.',
      );
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (clientId: Client['id']) => {
      const response = await api.delete(`/clients/${clientId}`);
      return response.data;
    },
    onMutate: (clientId) => {
      setDeletingClientId(clientId);
      setActionMessage('');
    },
    onSuccess: async () => {
      setActionMessage('Client supprime avec succes.');
      await refetch();
    },
    onError: (mutationError: any) => {
      setActionMessage(
        mutationError.response?.data?.message ||
          mutationError.message ||
          'Impossible de supprimer le client.',
      );
    },
    onSettled: () => {
      setDeletingClientId(null);
    },
  });

  const clients: Client[] = clientsData?.data || [];
  const total = clientsData?.meta?.total || 0;

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const first = getClientSortValue(a, sortBy).toLowerCase();
      const second = getClientSortValue(b, sortBy).toLowerCase();
      const result = first.localeCompare(second, 'fr', { sensitivity: 'base' });
      return sortOrder === 'asc' ? result : -result;
    });
  }, [clients, sortBy, sortOrder]);

  const updateForm = (field: keyof ClientForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openCreateForm = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setFormError('');
    setActionMessage('');
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setForm({
      nom: client.nom || '',
      prenom: client.prenom || '',
      email: client.email || '',
      telephone: client.telephone || '',
      adresseClient: client.adresseClient || '',
      adresseChantier: client.adresseChantier || '',
      source: client.source || '',
      besoin: client.besoin || '',
      notes: client.notes || '',
    });
    setFormError('');
    setActionMessage('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (createClient.isPending || updateClient.isPending) {
      return;
    }

    setForm(emptyForm);
    setFormError('');
    setEditingClient(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (form.nom.trim().length < 2) {
      setFormError('Le nom du client doit contenir au moins 2 caracteres.');
      return;
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      setFormError('Veuillez saisir une adresse email valide.');
      return;
    }

    if (form.telephone.trim() && !isValidPhone(form.telephone)) {
      setFormError('Le telephone doit contenir entre 6 et 20 caracteres valides.');
      return;
    }

    if (editingClient) {
      updateClient.mutate();
      return;
    }

    createClient.mutate();
  };

  const handleDelete = (client: Client) => {
    const fullName = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'ce client';
    const confirmed = window.confirm(
      `Supprimer ${fullName} ? Cette action est definitive.`,
    );

    if (confirmed) {
      deleteClient.mutate(client.id);
    }
  };

  const isSubmitting = createClient.isPending || updateClient.isPending;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
        <p className="text-red-600 dark:text-red-300">Erreur de chargement des clients</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
        >
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Recherchez, triez et ajoutez vos clients.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setDarkMode((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
          >
            {darkMode ? (
              <Sun size={18} className="text-yellow-500" />
            ) : (
              <Moon size={18} className="text-gray-600" />
            )}
            {darkMode ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#185FA5] px-4 py-2 text-white transition hover:bg-[#0F4780]"
          >
            <Plus size={18} />
            Nouveau client
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_160px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            maxLength={80}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#185FA5] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#185FA5] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          aria-label="Trier les clients par"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Trier par {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {sortOrder === 'asc' ? <ArrowDownAZ size={18} /> : <ArrowUpAZ size={18} />}
          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </button>
      </div>

      {actionMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
          <CheckCircle2 size={16} />
          {actionMessage}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <span>Total: {total} client(s)</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Colonnes: identite, contact, adresse, source
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <table className="min-w-[980px] table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-slate-100 dark:bg-gray-900">
            <tr>
              <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-300">Identite</th>
              <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-300">Email</th>
              <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-300">Telephone</th>
              <th className="border-r border-gray-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-700 dark:text-gray-300">Adresse / Source</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {sortedClients.map((client, index) => (
              <tr
                key={client.id}
                className={`transition hover:bg-blue-50/70 dark:hover:bg-gray-700/70 ${
                  index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50/70 dark:bg-gray-800/60'
                }`}
              >
                <td className="border-r border-gray-100 px-6 py-4 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:ring-blue-800">
                      {client.prenom?.[0] || ''}
                      {client.nom?.[0] || '?'}
                    </div>
                    <div className="ml-3 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {`${client.prenom || ''} ${client.nom || ''}`.trim() || '-'}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        ID #{client.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="border-r border-gray-100 px-6 py-4 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  {client.email || '-'}
                </td>
                <td className="border-r border-gray-100 px-6 py-4 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  {client.telephone || '-'}
                </td>
                <td className="border-r border-gray-100 px-6 py-4 text-sm dark:border-gray-700">
                  <div className="line-clamp-2 text-gray-700 dark:text-gray-300">
                    {client.adresseClient || client.adresseChantier || '-'}
                  </div>
                  <div className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {sourceOptions.find((option) => option.value === client.source)?.label || 'Non renseignee'}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button
                    className="mr-2 rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
                    title="Voir"
                    type="button"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => openEditForm(client)}
                    className="mr-2 rounded-lg p-2 text-green-600 transition hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:hover:bg-green-950/50 dark:hover:text-green-300"
                    title="Modifier"
                    type="button"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    disabled={deletingClientId === client.id}
                    className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                    title="Supprimer"
                    type="button"
                  >
                    {deletingClientId === client.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clients.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">Aucun client trouve</p>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingClient ? 'Modifier le client' : 'Nouveau client'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {editingClient
                    ? 'Mettez a jour les informations du client.'
                    : 'Ajoutez les informations du client.'}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                disabled={isSubmitting}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {Array.isArray(formError) ? formError.join(', ') : formError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className={labelClass}>Nom *</span>
                  <input
                    value={form.nom}
                    onChange={(e) => updateForm('nom', e.target.value)}
                    minLength={2}
                    maxLength={80}
                    className={inputClass}
                    required
                  />
                </label>

                <label className="space-y-1.5">
                  <span className={labelClass}>Prenom</span>
                  <input
                    value={form.prenom}
                    onChange={(e) => updateForm('prenom', e.target.value)}
                    maxLength={80}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className={labelClass}>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    maxLength={120}
                    placeholder="client@email.com"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className={labelClass}>Telephone</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.telephone}
                    onChange={(e) => updateForm('telephone', e.target.value)}
                    maxLength={20}
                    pattern="[+()0-9 .-]{6,20}"
                    placeholder="+216 00 000 000"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className={labelClass}>Source</span>
                  <select
                    value={form.source}
                    onChange={(e) => updateForm('source', e.target.value)}
                    className={inputClass}
                  >
                    {sourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className={labelClass}>Besoin</span>
                  <input
                    value={form.besoin}
                    onChange={(e) => updateForm('besoin', e.target.value)}
                    maxLength={120}
                    placeholder="DEVIS, INFORMATION, URGENCE..."
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className={labelClass}>Adresse client</span>
                  <input
                    value={form.adresseClient}
                    onChange={(e) => updateForm('adresseClient', e.target.value)}
                    maxLength={180}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className={labelClass}>Adresse chantier</span>
                  <input
                    value={form.adresseChantier}
                    onChange={(e) => updateForm('adresseChantier', e.target.value)}
                    maxLength={180}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className={labelClass}>Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateForm('notes', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className={inputClass}
                  />
                  <span className="block text-right text-xs text-gray-400 dark:text-gray-500">
                    {form.notes.length}/500
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#185FA5] px-4 py-2 text-white transition hover:bg-[#0F4780] disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {editingClient ? 'Enregistrer' : 'Creer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
