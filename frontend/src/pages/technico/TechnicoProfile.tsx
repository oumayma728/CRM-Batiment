import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Mail,
  PenSquare,
  Save,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SignatureCanvas, type SignatureCanvasHandle } from '@/components/signature/SignatureCanvas';
import { formatDate } from '@/lib/utils';

interface SignatureProfileResponse {
  id: number;
  signatureBase64?: string;
  signatureUpdatedAt?: string;
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

export default function TechnicoProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canvasRef = useRef<SignatureCanvasHandle | null>(null);
  const [draftSignature, setDraftSignature] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

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
      setFeedback({ type: 'success', text: data.message ?? 'Signature sauvegardée.' });
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

  const savedSignature = signatureQuery.data?.signatureBase64;
  const fullName = `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Conseiller';
  const initials =
    `${user?.prenom?.charAt(0) ?? ''}${user?.nom?.charAt(0) ?? ''}`.toUpperCase() || 'TC';

  async function copyEmail() {
    if (!user?.email) return;
    await navigator.clipboard.writeText(user.email);
    setFeedback({ type: 'success', text: 'Email copié dans le presse-papiers.' });
  }

  function downloadSignature() {
    if (!savedSignature) return;
    const link = document.createElement('a');
    link.href = savedSignature;
    link.download = `signature-${user?.nom ?? 'conseiller'}.png`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-extrabold text-teal-700 shadow-sm">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-teal-700">Profil technico-commercial</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{fullName}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Mail size={14} />
                    {user?.email ?? 'Email non renseigné'}
                  </span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {user?.role ?? 'TECHNICO'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyEmail()}
                disabled={!user?.email}
                className="inline-flex items-center gap-2 rounded-xl border border-white bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-50"
              >
                <Copy size={15} />
                Copier l’email
              </button>
              <Link
                to="/technico/devis"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800"
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <UserCircle2 size={19} className="text-teal-600" />
              <h3 className="text-lg font-bold text-slate-900">Informations du compte</h3>
            </div>

            <div className="space-y-3">
              <InfoRow label="Nom" value={fullName} />
              <InfoRow label="Email" value={user?.email ?? 'Non renseigné'} />
              <InfoRow label="Rôle" value={user?.role ?? 'TECHNICO'} />
              <InfoRow label="Statut" value={user?.actif === false ? 'Compte inactif' : 'Compte actif'} />
            </div>

            {signatureQuery.data?.signatureUpdatedAt && (
              <p className="mt-5 text-xs text-slate-500">
                Signature mise à jour le {formatDate(signatureQuery.data.signatureUpdatedAt)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Raccourcis</h3>
            <div className="grid gap-2">
              <QuickLink to="/technico/clients" label="Mes clients" />
              <QuickLink to="/technico/demandes" label="Demandes de devis" />
              <QuickLink to="/technico/checklist" label="Checklist devis" />
              <QuickLink to="/technico/factures" label="Mes factures" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <PenSquare size={18} className="text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Ma signature</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Dessinez votre signature à la souris ou au doigt, puis sauvegardez-la.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadSignature}
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
                Aperçu de la signature actuelle
              </p>
              <img
                src={savedSignature}
                alt="Signature conseiller actuelle"
                className="mt-2 h-20 w-full rounded-lg bg-white object-contain"
              />
              {signatureQuery.data?.signatureUpdatedAt && (
                <p className="mt-2 text-xs text-slate-500">
                  Dernière mise à jour : {formatDate(signatureQuery.data.signatureUpdatedAt)}
                </p>
              )}
            </div>
          )}

          <div className="mt-4">
            <SignatureCanvas
              ref={canvasRef}
              initialValue={savedSignature}
              onChange={setDraftSignature}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                canvasRef.current?.clear();
                setDraftSignature(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Trash2 size={15} />
              Effacer
            </button>

            <button
              type="button"
              onClick={() => saveSignatureMutation.mutate()}
              disabled={saveSignatureMutation.isPending || signatureQuery.isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {saveSignatureMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Sauvegarder ma signature
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
    >
      {label}
    </Link>
  );
}
