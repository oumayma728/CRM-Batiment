import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  HardHat,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import { authManager } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatDate } from '@/lib/utils';
import type { User } from '@/types';

interface AuthProfileResponse extends User {
  company?: {
    id: number;
    nom: string;
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data
  ) {
    const apiMessage = error.response.data.message;
    if (typeof apiMessage === 'string') return apiMessage;
    if (Array.isArray(apiMessage)) {
      return apiMessage.filter((item): item is string => typeof item === 'string').join(' | ');
    }
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export default function ChefProfilePage() {
  const { user } = useAuth();
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const profileQuery = useQuery({
    queryKey: ['chef-auth-profile'],
    queryFn: async () => {
      const response = await api.get('/auth/profile');
      return response.data as AuthProfileResponse;
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (passwordForm.newPassword.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caracteres.');
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('Les deux mots de passe ne correspondent pas.');
      }

      const response = await api.post('/auth/change-password', {
        newPassword: passwordForm.newPassword,
      });
      return response.data as { message: string; accessToken?: string; token?: string; user?: User };
    },
    onSuccess: (data) => {
      const nextToken = data.accessToken ?? data.token;
      if (nextToken && data.user) {
        authManager.setSession(nextToken, data.user);
      }
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setFeedback({ type: 'success', text: data.message ?? 'Mot de passe mis a jour.' });
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        text: getApiErrorMessage(error, 'Impossible de changer le mot de passe.'),
      });
    },
  });

  const profile = profileQuery.data ?? user;
  const fullName = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || 'Chef de chantier';
  const initials = `${profile?.prenom?.charAt(0) ?? ''}${profile?.nom?.charAt(0) ?? ''}` || 'CC';

  const completion = useMemo(() => {
    const items = [
      { label: 'Email renseigne', done: Boolean(profile?.email) },
      { label: 'Telephone renseigne', done: Boolean(profile?.telephone) },
      { label: 'Compte actif', done: profile?.actif !== false },
      { label: 'Mot de passe personnel', done: profile?.mustChangePassword === false },
    ];
    const percent = Math.round((items.filter((item) => item.done).length / items.length) * 100);
    return { items, percent };
  }, [profile]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.18),transparent_30%),linear-gradient(135deg,#ffffff_0%,#eff6ff_52%,#f0fdfa_100%)] p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 sm:gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-blue-700 text-xl sm:text-2xl font-extrabold text-white shadow-lg shadow-blue-900/20">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Profil terrain
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-950">{fullName}</h1>
                <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 sm:px-3 py-1.5 ring-1 ring-slate-200">
                    <Mail size={12} sm:size={14} />
                    {profile?.email ?? 'Email non renseigne'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 sm:px-3 py-1.5 font-semibold text-blue-800 ring-1 ring-blue-100">
                    <HardHat size={12} sm:size={14} />
                    Chef de chantier
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-950 p-4 sm:p-5 text-white lg:border-l lg:border-t-0 lg:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
              Completion du compte
            </p>
            <p className="mt-2 sm:mt-3 text-3xl sm:text-4xl font-bold">{completion.percent}%</p>
            <div className="mt-3 sm:mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sky-300" style={{ width: `${completion.percent}%` }} />
            </div>
            <div className="mt-4 grid gap-2">
              {completion.items.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2
                    size={15}
                    className={item.done ? 'text-emerald-300' : 'text-slate-500'}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {feedback ? (
        <section
          className={cn(
            'flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium',
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {feedback.text}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <UserCircle2 size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Informations personnelles</h2>
              <p className="text-sm text-slate-500">Coordonnees et rattachement entreprise</p>
            </div>
          </div>

          {profileQuery.isLoading && !profile ? (
            <div className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Chargement du profil...
              </span>
            </div>
          ) : (
            <div className="grid gap-3">
              <InfoRow icon={<Mail size={17} />} label="Email" value={profile?.email ?? '-'} />
              <InfoRow icon={<Phone size={17} />} label="Telephone" value={profile?.telephone ?? '-'} />
              <InfoRow icon={<ShieldCheck size={17} />} label="Role" value={profile?.role ?? '-'} />
              <InfoRow
                icon={<Building2 size={17} />}
                label="Entreprise"
                value={profile?.company?.nom ?? `Entreprise #${profile?.companyId ?? '-'}`}
              />
              <InfoRow
                icon={<CheckCircle2 size={17} />}
                label="Statut"
                value={profile?.actif === false ? 'Inactif' : 'Actif'}
              />
              <InfoRow
                icon={<HardHat size={17} />}
                label="Compte cree"
                value={profile?.createdAt ? formatDate(profile.createdAt) : '-'}
              />
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Securite</h2>
              <p className="text-sm text-slate-500">Mise a jour du mot de passe de connexion</p>
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setFeedback(null);
              changePasswordMutation.mutate();
            }}
          >
            <PasswordInput
              label="Nouveau mot de passe"
              value={passwordForm.newPassword}
              showPassword={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
            />
            <PasswordInput
              label="Confirmer le mot de passe"
              value={passwordForm.confirmPassword}
              showPassword={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: value }))
              }
            />

            <button
              type="submit"
              disabled={
                changePasswordMutation.isPending ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <KeyRound size={16} />
              )}
              Mettre a jour le mot de passe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  showPassword,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  showPassword: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative mt-1.5 block">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={8}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          placeholder="Minimum 8 caracteres"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}
