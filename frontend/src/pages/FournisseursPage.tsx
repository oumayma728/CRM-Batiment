import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Edit,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { Fournisseur } from '@/types';

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const content = rows.map((row) => row.map(csvCell).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const emptyForm = {
  nom: '',
  contact: '',
  email: '',
  telephone: '',
  adresse: '',
  typesMateriaux: '',
  conditions: '',
};

export default function FournisseursPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [form, setForm] = useState(emptyForm);

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
    mutationFn: (body: Record<string, unknown>) =>
      api.post('/fournisseurs', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: Record<string, unknown>;
    }) => api.patch(`/fournisseurs/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/fournisseurs/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }),
  });

  const list = fournisseurs ?? [];

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(fournisseur: Fournisseur) {
    setEditing(fournisseur);
    setForm({
      nom: fournisseur.nom,
      contact: fournisseur.contact ?? '',
      email: fournisseur.email ?? '',
      telephone: fournisseur.telephone ?? '',
      adresse: fournisseur.adresse ?? '',
      typesMateriaux: fournisseur.typesMateriaux ?? '',
      conditions: fournisseur.conditions ?? '',
    });
    setShowModal(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const body: Record<string, unknown> = {
      nom: form.nom.trim(),
    };

    if (form.contact.trim()) body.contact = form.contact.trim();
    if (form.email.trim()) body.email = form.email.trim();
    if (form.telephone.trim()) body.telephone = form.telephone.trim();
    if (form.adresse.trim()) body.adresse = form.adresse.trim();
    if (form.typesMateriaux.trim()) {
      body.typesMateriaux = form.typesMateriaux.trim();
    }
    if (form.conditions.trim()) body.conditions = form.conditions.trim();

    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function handleExport() {
    downloadCsv('fournisseurs.csv', [
      [
        'Nom',
        'Contact',
        'Email',
        'Téléphone',
        'Adresse',
        'Types de matériaux',
        'Conditions',
      ],
      ...list.map((fournisseur) => [
        fournisseur.nom,
        fournisseur.contact,
        fournisseur.email,
        fournisseur.telephone,
        fournisseur.adresse,
        fournisseur.typesMateriaux,
        fournisseur.conditions,
      ]),
    ]);
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error || updateMutation.error;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Truck size={24} className="text-violet-600" />
            Gestion des Fournisseurs
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {list.length} fournisseur(s) enregistré(s)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={list.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Exporter
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={openCreate}
              className="batiflow-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              <Plus size={17} />
              Nouveau fournisseur
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-20 text-center text-gray-500 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
            <Truck size={32} className="text-gray-300" />
          </div>
          <p className="text-lg font-semibold text-gray-700">
            Aucun fournisseur trouvé
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((fournisseur) => (
            <div
              key={fournisseur.id}
              className="card-hover rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Truck size={20} />
                </div>

                {isAdmin ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(fournisseur)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600"
                      title={`Modifier ${fournisseur.nom}`}
                    >
                      <Edit size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(fournisseur.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title={`Supprimer ${fournisseur.nom}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </div>

              <h3 className="mb-2 font-semibold text-gray-900">
                {fournisseur.nom}
              </h3>

              <div className="space-y-1.5 text-sm text-gray-500">
                {fournisseur.contact ? (
                  <p className="text-xs text-gray-600">{fournisseur.contact}</p>
                ) : null}

                {fournisseur.email ? (
                  <p className="flex items-center gap-2">
                    <Mail size={14} />
                    {fournisseur.email}
                  </p>
                ) : null}

                {fournisseur.telephone ? (
                  <p className="flex items-center gap-2">
                    <Phone size={14} />
                    {fournisseur.telephone}
                  </p>
                ) : null}

                {fournisseur.typesMateriaux ? (
                  <p className="mt-1 text-xs">
                    Types : {fournisseur.typesMateriaux}
                  </p>
                ) : null}
              </div>

              {fournisseur.materiaux && fournisseur.materiaux.length > 0 ? (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="mb-1.5 text-xs text-gray-500">
                    {fournisseur.materiaux.length} matériau(x) fourni(s)
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {fournisseur.materiaux.slice(0, 3).map((materiau) => (
                      <span
                        key={materiau.id}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {materiau.nom}
                      </span>
                    ))}

                    {fournisseur.materiaux.length > 3 ? (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        +{fournisseur.materiaux.length - 3}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {showModal && isAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nom *
                </label>
                <input
                  type="text"
                  required
                  value={form.nom}
                  onChange={(event) =>
                    setForm({ ...form, nom: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Contact
                </label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={(event) =>
                    setForm({ ...form, contact: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={form.telephone}
                    onChange={(event) =>
                      setForm({ ...form, telephone: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Adresse
                </label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={(event) =>
                    setForm({ ...form, adresse: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Types de matériaux
                </label>
                <input
                  type="text"
                  placeholder="Bois, Béton, Acier..."
                  value={form.typesMateriaux}
                  onChange={(event) =>
                    setForm({ ...form, typesMateriaux: event.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Conditions
                </label>
                <textarea
                  value={form.conditions}
                  onChange={(event) =>
                    setForm({ ...form, conditions: event.target.value })
                  }
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {saveError ? (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                  Erreur lors de l’enregistrement.
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="batiflow-gradient flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}