import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import type { User, Role } from '@/types';
import { formatDate, getInitials, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, Edit, Trash2, X, Shield, Loader2,
  Mail, Phone, RotateCcw,
} from 'lucide-react';

const roleConfig: Record<Role, { bg: string; text: string; dot: string; label: string }> = {
  ADMIN: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400', label: 'Administrateur' },
  TECHNICO: { bg: 'bg-lavande-50', text: 'text-lavande-700', dot: 'bg-lavande-400', label: 'Technico-commercial' },
  ASSISTANTE: { bg: 'bg-menthe-50', text: 'text-emerald-700', dot: 'bg-menthe-400', label: 'Assistante' },
  CHEF_CHANTIER: { bg: 'bg-jaune-50', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Chef de chantier' },
  SOUS_TRAITANT: { bg: 'bg-pervenche-50', text: 'text-pervenche-700', dot: 'bg-pervenche-400', label: 'Sous-traitant' },
};

const roles: Role[] = ['ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER', 'SOUS_TRAITANT'];

interface UserForm {
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: Role;
}

const emptyForm: UserForm = {
  email: '',
  nom: '',
  prenom: '',
  telephone: '',
  role: 'TECHNICO',
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

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editForm, setEditForm] = useState<Pick<UserForm, 'nom' | 'prenom' | 'telephone' | 'role'> & { actif: boolean }>({
    nom: '',
    prenom: '',
    telephone: '',
    role: 'TECHNICO',
    actif: true,
  });
  const [resetFeedback, setResetFeedback] = useState<{
    userId: number;
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [createFeedback, setCreateFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data as User[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: UserForm) =>
      api.post('/auth/create-user', {
        email: body.email,
        nom: body.nom,
        prenom: body.prenom,
        telephone: body.telephone || undefined,
        role: body.role,
      }),
    onSuccess: (response) => {
      const temporaryPassword =
        typeof response?.data?.temporaryPassword === 'string'
          ? response.data.temporaryPassword
          : '';

      queryClient.invalidateQueries({ queryKey: ['users'] });
      setForm(emptyForm);
      setCreateFeedback({
        type: 'success',
        message: temporaryPassword
          ? `Utilisateur cree. Mot de passe temporaire: ${temporaryPassword}`
          : 'Utilisateur cree. Verifiez la boite mail ou les logs backend pour le mot de passe temporaire.',
      });
    },
    onError: (error) => {
      setCreateFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Erreur lors de la creation.'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      userId: number;
      nom: string;
      prenom: string;
      telephone?: string;
      role: Role;
      actif: boolean;
    }) =>
      api.patch(`/users/${payload.userId}`, {
        nom: payload.nom,
        prenom: payload.prenom,
        telephone: payload.telephone,
        role: payload.role,
        actif: payload.actif,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditModal(false);
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetTempPasswordMutation = useMutation({
    mutationFn: (payload: { userId: number; email: string }) =>
      api.post('/auth/reset-temp-password', { email: payload.email }),
    onSuccess: async (response, payload) => {
      const temporaryPassword =
        typeof response?.data?.temporaryPassword === 'string'
          ? response.data.temporaryPassword
          : '';

      setResetFeedback({
        userId: payload.userId,
        type: 'success',
        message: temporaryPassword
          ? `Mot de passe temporaire: ${temporaryPassword}`
          : 'Mot de passe temporaire regenere. Verifiez les logs backend (console dev) ou la boite mail.',
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error, payload) => {
      setResetFeedback({
        userId: payload.userId,
        type: 'error',
        message: getApiErrorMessage(error, 'Echec de reinitialisation du mot de passe.'),
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      email: form.email.trim(),
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      telephone: form.telephone.trim(),
    });
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditForm({
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone ?? '',
      role: user.role,
      actif: user.actif,
    });
    setShowEditModal(true);
  }

  function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    updateMutation.mutate({
      userId: editingUser.id,
      nom: editForm.nom.trim(),
      prenom: editForm.prenom.trim(),
      telephone: editForm.telephone.trim() || undefined,
      role: editForm.role,
      actif: editForm.actif,
    });
  }

  function handleDeactivate(user: User) {
    if (currentUser?.id === user.id) {
      window.alert('Vous ne pouvez pas desactiver votre propre compte.');
      return;
    }

    const shouldDeactivate = window.confirm(
      `Desactiver le compte de ${user.prenom} ${user.nom} ?`,
    );
    if (!shouldDeactivate) return;

    deleteMutation.mutate(user.id);
  }

  const list = (users ?? []).filter((u) =>
    !search || `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={24} className="text-red-600" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{list.length} utilisateur(s) enregistré(s)</p>
        </div>
        <button
          onClick={() => {
            createMutation.reset();
            setCreateFeedback(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 batiflow-gradient text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all font-medium text-sm"
        >
          <Plus size={17} /> Nouvel utilisateur
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un utilisateur..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 text-sm transition-all" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Shield size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Rôle</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Créé le</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((u) => (
                  <tr key={u.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 batiflow-gradient rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-sm">
                          {getInitials(`${u.prenom} ${u.nom}`)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.prenom} {u.nom}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1.5"><Mail size={13} /> {u.email}</p>
                        {u.telephone && <p className="text-sm text-gray-600 flex items-center gap-1.5"><Phone size={13} /> {u.telephone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => { const rc = roleConfig[u.role]; return (
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold', rc.bg, rc.text)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', rc.dot)} />
                          {rc.label}
                        </span>
                      ); })()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold',
                        u.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600',
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', u.actif ? 'bg-emerald-500' : 'bg-gray-400')} />
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Modifier l utilisateur"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            const shouldReset = window.confirm(
                              `Reinitialiser le mot de passe temporaire pour ${u.email} ?`,
                            );
                            if (!shouldReset) return;
                            setResetFeedback(null);
                            resetTempPasswordMutation.mutate({
                              userId: u.id,
                              email: u.email,
                            });
                          }}
                          disabled={resetTempPasswordMutation.isPending || deleteMutation.isPending}
                          className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                          title="Reinitialiser le mot de passe temporaire"
                        >
                          {resetTempPasswordMutation.isPending &&
                          resetTempPasswordMutation.variables?.userId === u.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <RotateCcw size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeactivate(u)}
                          disabled={
                            deleteMutation.isPending ||
                            resetTempPasswordMutation.isPending ||
                            currentUser?.id === u.id ||
                            !u.actif
                          }
                          title={
                            currentUser?.id === u.id
                              ? 'Impossible de desactiver votre propre compte'
                              : !u.actif
                                ? 'Compte deja inactif'
                                : 'Desactiver le compte'
                          }
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {resetFeedback && resetFeedback.userId === u.id && (
                        <p
                          className={cn(
                            'mt-2 text-xs',
                            resetFeedback.type === 'success'
                              ? 'text-emerald-700'
                              : 'text-red-600',
                          )}
                        >
                          {resetFeedback.message}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deleteMutation.error && (
          <p className="px-6 pb-4 text-sm text-red-600">
            {getApiErrorMessage(deleteMutation.error, 'Erreur lors de la desactivation.')}
          </p>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Nouvel utilisateur</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCreateFeedback(null);
                }}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom *</label>
                  <input type="text" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                  <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
              </div>
              <div>
                <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Le mot de passe temporaire est genere automatiquement par le backend puis envoye par email
                  (ou affiche dans les logs backend en mode dev).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <input type="text" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rôle *</label>
                <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all">
                  {roles.map((r) => <option key={r} value={r}>{roleConfig[r].label}</option>)}
                </select>
              </div>
              {createMutation.error && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  {getApiErrorMessage(createMutation.error, 'Erreur lors de la creation.')}
                </p>
              )}
              {createFeedback && (
                <p
                  className={cn(
                    'text-sm px-4 py-2 rounded-lg',
                    createFeedback.type === 'success'
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-red-600 bg-red-50',
                  )}
                >
                  {createFeedback.message}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setCreateFeedback(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 text-sm font-medium text-white batiflow-gradient rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all">
                  {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Modifier utilisateur</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={editForm.prenom}
                    onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                  <input
                    type="text"
                    required
                    value={editForm.nom}
                    onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <input
                  type="text"
                  value={editForm.telephone}
                  onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rôle *</label>
                <select
                  required
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleConfig[r].label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Compte actif</span>
                <input
                  type="checkbox"
                  checked={editForm.actif}
                  onChange={(e) => setEditForm({ ...editForm, actif: e.target.checked })}
                  className="h-4 w-4"
                />
              </label>

              {updateMutation.error && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  {getApiErrorMessage(updateMutation.error, 'Erreur lors de la mise a jour.')}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-6 py-2.5 text-sm font-medium text-white batiflow-gradient rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {updateMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
