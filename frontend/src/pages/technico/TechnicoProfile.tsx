import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, PenSquare, Save, Trash2, UserCircle2 } from 'lucide-react';
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
      setFeedback({ type: 'success', text: data.message ?? 'Signature sauvegardee.' });
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <UserCircle2 size={24} className="text-slate-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Mon profil conseiller</h2>
            <p className="text-sm text-slate-500">
              {`${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim()} {user?.email ? `• ${user.email}` : ''}
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={
            feedback.type === 'success'
              ? 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
              : 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'
          }
        >
          {feedback.text}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <PenSquare size={18} className="text-violet-600" />
          <h3 className="text-lg font-bold text-slate-900">Ma signature</h3>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Dessinez votre signature a la souris ou au doigt, puis sauvegardez-la.
        </p>

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
            {signatureQuery.data?.signatureUpdatedAt && (
              <p className="mt-2 text-xs text-slate-500">
                Derniere mise a jour: {formatDate(signatureQuery.data.signatureUpdatedAt)}
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
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
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
    </div>
  );
}

