import { useMemo, useState } from 'react';
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
  X,
} from 'lucide-react';
const statutBadges: Record<string, { label: string; className: string }> = {
  NOUVEAU: { label: 'Nouveau', className: 'bg-blue-100 text-blue-700' },
  EN_COURS: { label: 'À qualifier', className: 'bg-amber-100 text-amber-700' },
  QUALIFIE: { label: 'Qualifié', className: 'bg-emerald-100 text-emerald-700' },
  CONVERTI: { label: 'Converti', className: 'bg-violet-100 text-violet-700' },
  PERDU: { label: 'Rejeté', className: 'bg-rose-100 text-rose-700' },
};
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
  const [statutFilter, setStatutFilter] = useState<string>('TOUS');
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [duplicatesResult, setDuplicatesResult] = useState<{
    prospectId: number;
    duplicates: Array<{
      id: number;
      nom: string | null;
      prenom: string | null;
      email: string | null;
      telephone: string | null;
      matchedOn: string[];
    }>;
  } | null>(null);
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
  const rejectMutation = useMutation({
    mutationFn: (prospectId: number) =>
      api.post(`/assistant/admin/prospects/${prospectId}/reject`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['technico-assistant-prospects'] });
      await queryClient.invalidateQueries({ queryKey: ['technico-demandes'] });
    },
  });
  const notesMutation = useMutation({
    mutationFn: ({ prospectId, notes }: { prospectId: number; notes: string }) =>
      api.patch(`/assistant/admin/prospects/${prospectId}/notes`, { notes }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['technico-assistant-prospects'] });
      setEditingNotesId(null);
    },
  });
  const checkDuplicatesMutation = useMutation({
    mutationFn: async ({
      prospectId,
      email,
      telephone,
    }: {
      prospectId: number;
      email?: string;
      telephone?: string;
    }) => {
      const res = await api.post(
        '/assistant/admin/prospects/check-duplicates',
        { email, telephone, excludeProspectId: prospectId },
      );
      return { prospectId, duplicates: res.data.duplicates };
    },
    onSuccess: (data) => setDuplicatesResult(data),
  });
  const allProspects = useMemo(
    () => prospectsQuery.data?.items ?? [],
    [prospectsQuery.data?.items],
  );
  const prospects = useMemo(() => {
    let list = [...allProspects];
    if (statutFilter !== 'TOUS') {
      list = list.filter(
        (p) => p.latestDemandeDevis?.statut === statutFilter,
      );
    }
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === 'recent' ? db - da : da - db;
    });
    return list;
  }, [allProspects, statutFilter, sortOrder]);
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
            <h2 className="text-xl font-bold text-slate-950">Assistant IA - Pilotage Technico</h2>
            <p className="mt-1 text-sm text-slate-600">
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
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
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
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Prospect qualifie avec succes.
        </div>
      )}

      {removeMutation.isSuccess && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Prospect supprime avec succes.
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-950">Prospects chatbot</h3>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="NOUVEAU">Nouveau</option>
            <option value="EN_COURS">À qualifier</option>
            <option value="QUALIFIE">Qualifié</option>
            <option value="CONVERTI">Converti</option>
            <option value="PERDU">Rejeté</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'recent' | 'ancien')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="recent">Plus récents d&apos;abord</option>
            <option value="ancien">Plus anciens d&apos;abord</option>
          </select>
          <span className="text-xs text-slate-400">
            {prospects.length} prospect{prospects.length > 1 ? 's' : ''}
          </span>
        </div>
        {prospects.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">
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
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                          <UserRound size={12} />
                          {`${prospect.prenom ?? ''} ${prospect.nom}`.trim() || `Prospect #${prospect.id}`}
                        </span>
                        {prospect.typeProjet ? (
                          <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                            {prospect.typeProjet.nom}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            <AlertCircle size={12} />
                            Type projet manquant
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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

                      {editingNotesId === prospect.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Notes internes sur ce prospect..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                notesMutation.mutate({
                                  prospectId: prospect.id,
                                  notes: notesDraft,
                                })
                              }
                              disabled={notesMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              💾 Enregistrer
                            </button>
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          {(prospect.notes || prospect.besoin) && (
                            <p className="text-sm text-slate-700">
                              {prospect.notes || prospect.besoin}
                            </p>
                          )}
                          <button
                            onClick={() => {
                              setEditingNotesId(prospect.id);
                              setNotesDraft(prospect.notes ?? '');
                            }}
                            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
                          >
                            ✏️ Notes
                          </button>
                        </div>
                      )}
                      {/* Verification des doublons potentiels */}
                      <div className="space-y-2">
                        <button
                          onClick={() =>
                            checkDuplicatesMutation.mutate({
                              prospectId: prospect.id,
                              email: prospect.email ?? undefined,
                              telephone: prospect.telephone ?? undefined,
                            })
                          }
                          disabled={checkDuplicatesMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                        >
                          🔍 Vérifier les doublons
                        </button>
                        {duplicatesResult &&
                          duplicatesResult.prospectId === prospect.id &&
                          (duplicatesResult.duplicates.length === 0 ? (
                            <p className="text-xs text-emerald-600">
                              ✅ Aucun doublon détecté pour ce prospect.
                            </p>
                          ) : (
                            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                              <p className="text-xs font-semibold text-amber-800">
                                ⚠️ {duplicatesResult.duplicates.length} doublon(s)
                                potentiel(s) détecté(s) :
                              </p>
                              {duplicatesResult.duplicates.map((dup) => (
                                <div
                                  key={dup.id}
                                  className="flex flex-wrap items-center gap-2 text-xs text-amber-900"
                                >
                                  <span className="font-semibold">
                                    #{dup.id}{' '}
                                    {`${dup.prenom ?? ''} ${dup.nom ?? ''}`.trim() ||
                                      'Sans nom'}
                                  </span>
                                  {dup.email && <span>📧 {dup.email}</span>}
                                  {dup.telephone && <span>📱 {dup.telephone}</span>}
                                  {dup.matchedOn.map((m) => (
                                    <span
                                      key={m}
                                      className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold"
                                    >
                                      même {m}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {prospect.latestDemandeDevis ? (
                          <span className="rounded-full bg-violet-50 px-2 py-1 font-semibold text-violet-700">
                            Demande #{prospect.latestDemandeDevis.id}{' '}
                            <span
                              className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                statutBadges[prospect.latestDemandeDevis.statut]?.className ??
                                'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {statutBadges[prospect.latestDemandeDevis.statut]?.label ??
                                prospect.latestDemandeDevis.statut}
                            </span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                            Pas de demande liee
                          </span>
                        )}

                        {prospect.latestDevis ? (
                          <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                            Devis {prospect.latestDevis.reference} ({prospect.latestDevis.statut})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const confirmed = window.confirm(
                            'Qualifier ce prospect en demande de devis ?',
                          );
                          if (confirmed)
                            qualifyMutation.mutate({
                              prospectId: prospect.id,
                              createDevisDraft: hasTypeProjet,
                            });
                        }}
                        disabled={disableActions}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                            'Rejeter ce prospect ? (il sera conservé avec le statut Rejeté)',
                          );
                          if (confirmed) rejectMutation.mutate(prospect.id);
                        }}
                        disabled={disableActions}
                        className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X size={13} />
                        Rejeter
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
        <h3 className="inline-flex items-center gap-2 text-base font-bold text-slate-950">
          <Sparkles size={16} className="text-amber-500" />
          Projets futurs detectes
        </h3>

        {futureProjects.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">
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
                  <p className="text-sm font-bold text-slate-950">{item.label}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    x{item.frequence}
                  </span>
                </div>
                {item.suggestedType && (
                  <p className="mt-1 text-xs text-slate-600">
                    Type suggere: <span className="font-semibold">{item.suggestedType}</span>
                  </p>
                )}
                {item.latestDescription && (
                  <p className="mt-2 text-sm text-slate-700">{item.latestDescription}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
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
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}
