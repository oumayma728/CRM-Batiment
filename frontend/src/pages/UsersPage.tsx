import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User, Role } from '@/types';
import { formatDate, getInitials, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PageHero from '@/components/PageHero';
import {
  Plus, Search, Edit, Trash2, Shield,
  Mail, Phone, RotateCcw, Users, Loader2, Edit3, KeyRound,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, SubmitButton } from '@/components/ui/Form';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast, getErrorMessage } from '@/components/ui/Toast';

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

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
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
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

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
      setShowModal(false);

      if (temporaryPassword) {
        toast.success('Utilisateur créé', `Mot de passe temporaire : ${temporaryPassword}`);
      } else {
        toast.success(
          'Utilisateur créé',
          'Vérifiez la boîte mail ou les logs backend pour le mot de passe temporaire.',
        );
      }
    },
    onError: (err) => {
      toast.error('Échec de la création', getErrorMessage(err, 'Erreur lors de la création.'));
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
      toast.success('Utilisateur modifié', 'Les modifications ont été enregistrées.');
    },
    onError: (err) => {
      toast.error('Échec de la modification', getErrorMessage(err, 'Erreur lors de la mise à jour.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeactivateTarget(null);
      toast.success('Utilisateur désactivé', 'Le compte a été désactivé avec succès.');
    },
    onError: (err) => {
      toast.error('Échec de la désactivation', getErrorMessage(err, 'Erreur lors de la désactivation.'));
    },
  });

  const resetTempPasswordMutation = useMutation({
    mutationFn: (payload: { userId: number; email: string }) =>
      api.post('/auth/reset-temp-password', { email: payload.email }),
    onSuccess: async (response) => {
      const temporaryPassword =
        typeof response?.data?.temporaryPassword === 'string'
          ? response.data.temporaryPassword
          : '';

      setResetTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });

      if (temporaryPassword) {
        toast.success(
          'Mot de passe réinitialisé',
          `Nouveau mot de passe temporaire : ${temporaryPassword}`,
        );
      } else {
        toast.success(
          'Mot de passe réinitialisé',
          'Vérifiez les logs backend (console dev) ou la boîte mail.',
        );
      }
    },
    onError: (err) => {
      toast.error('Échec de la réinitialisation', getErrorMessage(err, 'Échec de réinitialisation du mot de passe.'));
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
      toast.warning('Action impossible', 'Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }
    setDeactivateTarget(user);
  }

  function confirmDeactivate() {
    if (!deactivateTarget) return;
    deleteMutation.mutate(deactivateTarget.id);
  }

  function confirmReset() {
    if (!resetTarget) return;
    resetTempPasswordMutation.mutate({
      userId: resetTarget.id,
      email: resetTarget.email,
    });
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
                  <tr key={u.id} className="hover:bg-primary-50/30 transition-colors">
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Modifier l'utilisateur"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setResetTarget(u)}
                          disabled={resetTempPasswordMutation.isPending || deleteMutation.isPending}
                          className="p-2 rounded-lg text-gray-400 hover:text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          title="Réinitialiser le mot de passe temporaire"
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
                              ? 'Impossible de désactiver votre propre compte'
                              : !u.actif
                                ? 'Compte déjà inactif'
                                : 'Désactiver le compte'
                          }
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
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

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); }}
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
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setShowModal(false); }}
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

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={!!deactivateTarget}
        title="Désactiver le compte ?"
        message={
          <>
            Vous êtes sur le point de désactiver le compte de
            {deactivateTarget ? (
              <strong className="text-slate-800"> {deactivateTarget.prenom} {deactivateTarget.nom} </strong>
            ) : null}.
            L'utilisateur ne pourra plus se connecter.
          </>
        }
        confirmLabel="Désactiver"
        loading={deleteMutation.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => setDeactivateTarget(null)}
      />

      {/* Reset Password Confirmation Dialog */}
      <ConfirmDialog
        open={!!resetTarget}
        title="Réinitialiser le mot de passe ?"
        icon={KeyRound}
        message={
          <>
            Un nouveau mot de passe temporaire sera généré pour
            {resetTarget ? (
              <strong className="text-slate-800"> {resetTarget.email} </strong>
            ) : null}.
            L'ancien mot de passe ne fonctionnera plus.
          </>
        }
        confirmLabel="Réinitialiser"
        loading={resetTempPasswordMutation.isPending}
        onConfirm={confirmReset}
        onClose={() => setResetTarget(null)}
      />
    </div>
  );
}
