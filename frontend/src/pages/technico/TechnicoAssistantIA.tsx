import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';

interface ProspectItem {
  id: number;
  nom: string;
  prenom?: string | null;
  telephone?: string | null;
  email?: string | null;
  besoin?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  typeProjet?: {
    id: number;
    nom: string;
  } | null;
  latestDemandeDevis?: {
    id: number;
    statut: string;
    createdAt: string;
  } | null;
  latestDevis?: {
    id: number;
    reference: string;
    statut: string;
    createdAt: string;
  } | null;
}

interface ProspectsResponse {
  total: number;
  items: ProspectItem[];
}

interface FutureProjectItem {
  label: string;
  suggestedType: string | null;
  frequence: number;
  lastDetectedAt: string;
  latestDescription: string;
  latestProspect: {
    nom: string;
    telephone: string;
    email: string;
  };
}

interface FutureProjectsResponse {
  totalSignals: number;
  uniqueProjects: number;
  items: FutureProjectItem[];
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
    if (Array.isArray(apiMessage)) return apiMessage.join(', ');
    if (typeof apiMessage === 'string') return apiMessage;
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export default function TechnicoAssistantIA() {
  const queryClient = useQueryClient();

  const prospectsQuery = useQuery({
    queryKey: ['technico-assistant-prospects'],
    queryFn: async () => {
      const res = await api.get('/assistant/admin/prospects');
      return res.data as ProspectsResponse;
    },
  });

  const futureProjectsQuery = useQuery({
    queryKey: ['technico-assistant-future-projects'],
    queryFn: async () => {
      const res = await api.get('/assistant/admin/projets-futurs');
      return res.data as FutureProjectsResponse;
    },
  });

  const qualifyMutation = useMutation({
    mutationFn: (payload: { prospectId: number; createDevisDraft: boolean }) =>
      api.post(`/assistant/admin/prospects/${payload.prospectId}/qualify`, {
        createDevisDraft: payload.createDevisDraft,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['technico-assistant-prospects'] });
      await queryClient.invalidateQueries({ queryKey: ['technico-assistant-future-projects'] });
      await queryClient.invalidateQueries({ queryKey: ['technico-demandes'] });
      await queryClient.invalidateQueries({ queryKey: ['technico-devis'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (prospectId: number) =>
      api.delete(`/assistant/admin/prospects/${prospectId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['technico-assistant-prospects'] });
      await queryClient.invalidateQueries({ queryKey: ['technico-assistant-future-projects'] });
    },
  });

  const prospects = prospectsQuery.data?.items ?? [];
  const futureProjects = futureProjectsQuery.data?.items ?? [];

  const pendingCount = useMemo(
    () => prospects.filter((item) => !item.latestDemandeDevis).length,
    [prospects],
  );

  const queryError = prospectsQuery.error ?? futureProjectsQuery.error;
  const queryErrorMessage = queryError
    ? getApiErrorMessage(queryError, 'Impossible de charger les donnees Assistant IA.')
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assistant IA - Pilotage Technico</h2>
            <p className="mt-1 text-sm text-gray-600">
              Qualifie les prospects chatbot, cree des demandes/devis et surveille les projets non classes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Prospects chatbot" value={prospects.length} />
        <MetricCard label="A qualifier" value={pendingCount} />
        <MetricCard label="Projets non classes" value={futureProjects.length} />
      </div>

      {queryErrorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {queryErrorMessage}
        </div>
      )}

      {(prospectsQuery.isLoading || futureProjectsQuery.isLoading) && (
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
          <Loader2 size={16} className="animate-spin" />
          Chargement des donnees Assistant IA...
        </div>
      )}

      {(qualifyMutation.error || removeMutation.error) && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(
            qualifyMutation.error ?? removeMutation.error,
            'Operation impossible.',
          )}
        </div>
      )}

      {qualifyMutation.isSuccess && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Prospect qualifie avec succes.
        </div>
      )}

      {removeMutation.isSuccess && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Prospect supprime avec succes.
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-bold text-gray-900">Prospects chatbot</h3>

        {prospects.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
            Aucun prospect chatbot a gerer pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {prospects.map((prospect) => {
              const hasTypeProjet = Boolean(prospect.typeProjet?.id);
              const disableActions =
                qualifyMutation.isPending ||
                removeMutation.isPending;

              return (
                <div
                  key={prospect.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                          <UserRound size={12} />
                          {`${prospect.prenom ?? ''} ${prospect.nom}`.trim() || `Prospect #${prospect.id}`}
                        </span>
                        {prospect.typeProjet ? (
                          <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            {prospect.typeProjet.nom}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            <AlertCircle size={12} />
                            Type projet manquant
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {prospect.telephone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={12} />
                            {prospect.telephone}
                          </span>
                        )}
                        {prospect.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail size={12} />
                            {prospect.email}
                          </span>
                        )}
                        <span>Detecte le {formatDate(prospect.createdAt)}</span>
                      </div>

                      {(prospect.notes || prospect.besoin) && (
                        <p className="text-sm text-gray-700">
                          {prospect.notes || prospect.besoin}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        {prospect.latestDemandeDevis ? (
                          <span className="rounded-full bg-violet-50 px-2 py-1 font-semibold text-violet-700">
                            Demande #{prospect.latestDemandeDevis.id} ({prospect.latestDemandeDevis.statut})
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-600">
                            Pas de demande liee
                          </span>
                        )}

                        {prospect.latestDevis ? (
                          <span className="rounded-full bg-teal-50 px-2 py-1 font-semibold text-teal-700">
                            Devis {prospect.latestDevis.reference} ({prospect.latestDevis.statut})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        onClick={() =>
                          qualifyMutation.mutate({
                            prospectId: prospect.id,
                            createDevisDraft: hasTypeProjet,
                          })
                        }
                        disabled={disableActions}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {qualifyMutation.isPending ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        Qualifier
                      </button>

                      <button
                        onClick={() => {
                          const confirmed = window.confirm(
                            'Supprimer ce prospect et ses donnees liees ?',
                          );
                          if (confirmed) removeMutation.mutate(prospect.id);
                        }}
                        disabled={disableActions}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={13} />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="inline-flex items-center gap-2 text-base font-bold text-gray-900">
          <Sparkles size={16} className="text-amber-500" />
          Projets futurs detectes
        </h3>

        {futureProjects.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
            Aucun projet non classe detecte.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {futureProjects.map((item) => (
              <div
                key={`${item.label}-${item.lastDetectedAt}`}
                className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    x{item.frequence}
                  </span>
                </div>
                {item.suggestedType && (
                  <p className="mt-1 text-xs text-gray-600">
                    Type suggere: <span className="font-semibold">{item.suggestedType}</span>
                  </p>
                )}
                {item.latestDescription && (
                  <p className="mt-2 text-sm text-gray-700">{item.latestDescription}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Derniere detection: {formatDate(item.lastDetectedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
