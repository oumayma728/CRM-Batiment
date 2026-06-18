import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import type { User, Role } from '@/types';
import { formatDate, getInitials, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PageHero from '@/components/PageHero';
import {
  Plus, Search, Edit, Trash2, Shield,
  Mail, Phone, RotateCcw, Users, Loader2, Edit3,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, SubmitButton } from '@/components/ui/Form';

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
    <div className="space-y-4">
      <PageHero
        icon={<Users size={22} />}
        title="Gestion des Utilisateurs"
        subtitle={`${list.length} utilisateur(s) enregistré(s)`}
        accent="indigo"
        actions={
          <button
            onClick={() => {
              createMutation.reset();
              setCreateFeedback(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-all font-medium text-sm shadow-sm"
          >
            <Plus size={16} /> Nouvel utilisateur
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Rechercher un utilisateur..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/20 transition-all" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
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
                      {(() => {
                        const rc = roleConfig[u.role]; return (
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold', rc.bg, rc.text)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', rc.dot)} />
                            {rc.label}
                          </span>
                        );
                      })()}
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
                          className="p-2 rounded-lg text-gray-400 hover:text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
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
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setCreateFeedback(null); }}
        title="Nouvel utilisateur"
        icon={Users}
        accent="slate"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              required
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            />
            <Input
              label="Nom"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />
          </div>
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
            Le mot de passe temporaire est généré automatiquement par le backend puis envoyé par email
            (ou affiché dans les logs backend en mode dev).
          </div>
          <Input
            label="Téléphone"
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
          />
          <Select
            label="Rôle"
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            options={roles.map((r) => ({ value: r, label: roleConfig[r].label }))}
          />
          {createMutation.error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              {getApiErrorMessage(createMutation.error, 'Erreur lors de la création.')}
            </p>
          )}
          {createFeedback && (
            <p className={cn(
              'text-sm font-medium px-4 py-3 rounded-xl border',
              createFeedback.type === 'success'
                ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                : 'text-red-600 bg-red-50 border-red-100',
            )}>
              {createFeedback.message}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setShowModal(false); setCreateFeedback(null); }}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              Annuler
            </button>
            <SubmitButton isLoading={createMutation.isPending} icon={Plus}>
              Créer l'utilisateur
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal && !!editingUser}
        onClose={() => { setShowEditModal(false); setEditingUser(null); }}
        title="Modifier utilisateur"
        icon={Edit3}
        accent="slate"
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateSubmit} className="p-6 space-y-5">
          <Input
            label="Email"
            type="email"
            value={editingUser?.email ?? ''}
            disabled
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              required
              value={editForm.prenom}
              onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
            />
            <Input
              label="Nom"
              required
              value={editForm.nom}
              onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
            />
          </div>
          <Input
            label="Téléphone"
            value={editForm.telephone}
            onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
          />
          <Select
            label="Rôle"
            required
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
            options={roles.map((r) => ({ value: r, label: roleConfig[r].label }))}
          />
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <span className="text-sm font-semibold text-slate-700">Compte actif</span>
            <input
              type="checkbox"
              checked={editForm.actif}
              onChange={(e) => setEditForm({ ...editForm, actif: e.target.checked })}
              className="h-4 w-4 rounded text-slate-600"
            />
          </label>
          {updateMutation.error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              {getApiErrorMessage(updateMutation.error, 'Erreur lors de la mise à jour.')}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setShowEditModal(false); setEditingUser(null); }}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              Annuler
            </button>
            <SubmitButton isLoading={updateMutation.isPending} icon={Edit3}>
              Enregistrer
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
