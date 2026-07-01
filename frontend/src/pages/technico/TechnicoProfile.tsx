import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Mail,
  Palette,
  PenSquare,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserCircle2,
  Users,
} from 'lucide-react';
import api from '@/lib/api';
import { authManager } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { SignatureCanvas, type SignatureCanvasHandle } from '@/components/signature/SignatureCanvas';
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';

const PREFERENCES_KEY = 'technico-profile-preferences';

interface SignatureProfileResponse {
  id: number;
  signatureBase64?: string;
  signatureUpdatedAt?: string;
}

interface AuthProfileResponse extends User {
  company?: {
    id: number;
    nom: string;
  };
}

interface Preferences {
  compactDashboard: boolean;
  signatureReminder: boolean;
  commercialNotifications: boolean;
}

const defaultPreferences: Preferences = {
  compactDashboard: false,
  signatureReminder: true,
  commercialNotifications: true,
};

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

function readPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (!stored) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(stored) };
  } catch {
    return defaultPreferences;
  }
}

export default function TechnicoProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canvasRef = useRef<SignatureCanvasHandle | null>(null);
  const [draftSignature, setDraftSignature] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences());
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const profileQuery = useQuery({
    queryKey: ['auth-profile'],
    queryFn: async () => {
      const response = await api.get('/auth/profile');
      return response.data as AuthProfileResponse;
    },
  });

  const signatureQuery = useQuery({
    queryKey: ['conseiller-signature-profile'],
    queryFn: async () => {
      const response = await api.get('/conseiller/signature');
      return response.data as SignatureProfileResponse;
    },
  });

  const saveSignatureMutation = useMutation({
    mutationFn: async () => {
      const signatureBase64 = draftSignature ?? canvasRef.current?.exportAsDataUrl();
      if (!signatureBase64) {
        throw new Error('Veuillez dessiner votre signature avant de sauvegarder.');
      }

      const response = await api.post('/conseiller/signature', { signatureBase64 });
      return response.data as { message: string };
    },
    onSuccess: async (data) => {
      setFeedback({ type: 'success', text: data.message ?? 'Signature sauvegardee.' });
      setDraftSignature(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['conseiller-signature-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['auth-signature-profile'] }),
      ]);
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        text: getApiErrorMessage(error, 'Erreur lors de la sauvegarde de la signature.'),
      });
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
  const savedSignature = signatureQuery.data?.signatureBase64;
  const fullName = `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim() || 'Conseiller';
  const initials = `${profile?.prenom?.charAt(0) ?? ''}${profile?.nom?.charAt(0) ?? ''}` || 'TC';

  const completion = useMemo(() => {
    const items = [
      { label: 'Email renseigne', done: Boolean(profile?.email) },
      { label: 'Telephone renseigne', done: Boolean(profile?.telephone) },
      { label: 'Signature configuree', done: Boolean(savedSignature) },
      { label: 'Mot de passe personnel', done: profile?.mustChangePassword === false },
    ];
    const percent = Math.round((items.filter((item) => item.done).length / items.length) * 100);
    return { items, percent };
  }, [profile, savedSignature]);

  function updatePreference(key: keyof Preferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  async function copyEmail() {
    if (!profile?.email) return;
    await navigator.clipboard.writeText(profile.email);
    setFeedback({ type: 'success', text: 'Email copie dans le presse-papiers.' });
  }

  function downloadSignature() {
    if (!savedSignature) return;
    const link = document.createElement('a');
    link.href = savedSignature;
    link.download = `signature-${profile?.nom ?? 'conseiller'}.png`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-50 via-violet-50 to-emerald-50 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-extrabold text-blue-700 shadow-sm">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700">Profil technico-commercial</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{fullName}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Mail size={14} />
                    {profile?.email ?? 'Email non renseigne'}
                  </span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {profile?.role ?? 'TECHNICO'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyEmail()}
                disabled={!profile?.email}
                className="inline-flex items-center gap-2 rounded-xl border border-white bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-50"
              >
                <Copy size={15} />
                Copier email
              </button>
              <Link
                to="/technico/devis"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                <FileSpreadsheet size={15} />
                Mes devis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          className={
            feedback.type === 'success'
              ? 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700'
              : 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700'
          }
        >
          {feedback.text}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <ProfileSummaryCard
            profile={profile}
            completion={completion}
            signatureUpdatedAt={signatureQuery.data?.signatureUpdatedAt}
          />
          <PreferencesCard preferences={preferences} onToggle={updatePreference} />
          <QuickLinksCard />
        </div>

        <div className="space-y-6">
          <SignatureCard
            canvasRef={canvasRef}
            savedSignature={savedSignature}
            signatureUpdatedAt={signatureQuery.data?.signatureUpdatedAt}
            isLoading={signatureQuery.isLoading}
            isSaving={saveSignatureMutation.isPending}
            onChange={setDraftSignature}
            onClear={() => {
              canvasRef.current?.clear();
              setDraftSignature(null);
            }}
            onSave={() => saveSignatureMutation.mutate()}
            onDownload={downloadSignature}
          />
          <SecurityCard
            passwordForm={passwordForm}
            showPassword={showPassword}
            isSaving={changePasswordMutation.isPending}
            onToggleShow={() => setShowPassword((current) => !current)}
            onChange={setPasswordForm}
            onSubmit={() => changePasswordMutation.mutate()}
          />
        </div>
      </section>
    </div>
  );
}

function ProfileSummaryCard({
  profile,
  completion,
  signatureUpdatedAt,
}: {
  profile: AuthProfileResponse | User | null;
  completion: { items: { label: string; done: boolean }[]; percent: number };
  signatureUpdatedAt?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <UserCircle2 size={19} className="text-blue-600" />
        <h3 className="text-lg font-bold text-slate-900">Informations du compte</h3>
      </div>

      <div className="grid gap-3">
        <InfoRow icon={<Mail size={16} />} label="Email" value={profile?.email ?? 'Non renseigne'} />
        <InfoRow icon={<Phone size={16} />} label="Telephone" value={profile?.telephone ?? 'A completer'} />
        <InfoRow icon={<ShieldCheck size={16} />} label="Statut" value={profile?.actif ? 'Compte actif' : 'Compte inactif'} />
        <InfoRow
          icon={<Users size={16} />}
          label="Entreprise"
          value={getCompanyName(profile)}
        />
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Profil complete</p>
          <span className="text-sm font-extrabold text-blue-700">{completion.percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${completion.percent}%` }} />
        </div>
        <div className="mt-4 space-y-2">
          {completion.items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-slate-600">
              {item.done ? (
                <CheckCircle2 size={15} className="text-emerald-600" />
              ) : (
                <AlertCircle size={15} className="text-amber-600" />
              )}
              {item.label}
            </div>
          ))}
        </div>
        {signatureUpdatedAt && (
          <p className="mt-3 text-xs text-slate-500">
            Signature mise a jour le {formatDate(signatureUpdatedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function SignatureCard({
  canvasRef,
  savedSignature,
  signatureUpdatedAt,
  isLoading,
  isSaving,
  onChange,
  onClear,
  onSave,
  onDownload,
}: {
  canvasRef: React.MutableRefObject<SignatureCanvasHandle | null>;
  savedSignature?: string;
  signatureUpdatedAt?: string;
  isLoading: boolean;
  isSaving: boolean;
  onChange: (value: string | null) => void;
  onClear: () => void;
  onSave: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PenSquare size={18} className="text-violet-600" />
            <h3 className="text-lg font-bold text-slate-900">Ma signature</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Dessinez votre signature a la souris ou au doigt, puis sauvegardez-la.
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={!savedSignature}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Download size={15} />
          PNG
        </button>
      </div>

      {savedSignature && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Apercu signature actuelle
          </p>
          <img
            src={savedSignature}
            alt="Signature conseiller actuelle"
            className="mt-2 h-20 w-full rounded-lg bg-white object-contain"
          />
          {signatureUpdatedAt && (
            <p className="mt-2 text-xs text-slate-500">
              Derniere mise a jour: {formatDate(signatureUpdatedAt)}
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <SignatureCanvas ref={canvasRef} initialValue={savedSignature} onChange={onChange} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Trash2 size={15} />
          Effacer
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Sauvegarder ma signature
        </button>
      </div>
    </div>
  );
}

function SecurityCard({
  passwordForm,
  showPassword,
  isSaving,
  onToggleShow,
  onChange,
  onSubmit,
}: {
  passwordForm: { newPassword: string; confirmPassword: string };
  showPassword: boolean;
  isSaving: boolean;
  onToggleShow: () => void;
  onChange: (value: { newPassword: string; confirmPassword: string }) => void;
  onSubmit: () => void;
}) {
  const passwordType = showPassword ? 'text' : 'password';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <KeyRound size={18} className="text-emerald-600" />
        <h3 className="text-lg font-bold text-slate-900">Securite</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Nouveau mot de passe
          </span>
          <input
            type={passwordType}
            value={passwordForm.newPassword}
            onChange={(event) => onChange({ ...passwordForm, newPassword: event.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            placeholder="Minimum 8 caracteres"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Confirmation
          </span>
          <input
            type={passwordType}
            value={passwordForm.confirmPassword}
            onChange={(event) => onChange({ ...passwordForm, confirmPassword: event.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            placeholder="Repeter le mot de passe"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleShow}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          {showPassword ? 'Masquer' : 'Afficher'}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving || !passwordForm.newPassword || !passwordForm.confirmPassword}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
          Changer le mot de passe
        </button>
      </div>
    </div>
  );
}

function PreferencesCard({
  preferences,
  onToggle,
}: {
  preferences: Preferences;
  onToggle: (key: keyof Preferences) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Palette size={18} className="text-violet-600" />
        <h3 className="text-lg font-bold text-slate-900">Preferences</h3>
      </div>
      <div className="space-y-3">
        <PreferenceToggle
          icon={<ClipboardCheck size={16} />}
          label="Dashboard compact"
          description="Memorise une preference d'affichage pour vos vues commerciales."
          checked={preferences.compactDashboard}
          onClick={() => onToggle('compactDashboard')}
        />
        <PreferenceToggle
          icon={<PenSquare size={16} />}
          label="Rappel signature"
          description="Garder le rappel lorsque votre signature n'est pas configuree."
          checked={preferences.signatureReminder}
          onClick={() => onToggle('signatureReminder')}
        />
        <PreferenceToggle
          icon={<Bell size={16} />}
          label="Notifications commerciales"
          description="Activer les rappels locaux pour les devis et demandes."
          checked={preferences.commercialNotifications}
          onClick={() => onToggle('commercialNotifications')}
        />
      </div>
    </div>
  );
}

function QuickLinksCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck size={18} className="text-blue-600" />
        <h3 className="text-lg font-bold text-slate-900">Raccourcis</h3>
      </div>
      <div className="grid gap-2">
        <QuickLink to="/technico/clients" label="Mes clients" />
        <QuickLink to="/technico/demandes" label="Demandes de devis" />
        <QuickLink to="/technico/checklist" label="Checklist devis" />
        <QuickLink to="/technico/factures" label="Mes factures" />
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
      <div className="text-slate-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function getCompanyName(profile: AuthProfileResponse | User | null) {
  if (!profile) return 'Non renseignee';
  if ('company' in profile && profile.company?.nom) return profile.company.nom;
  return `Societe #${profile.companyId ?? '-'}`;
}

function PreferenceToggle({
  icon,
  label,
  description,
  checked,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition hover:bg-blue-50/70"
    >
      <div className="text-blue-600">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      {label}
    </Link>
  );
}
