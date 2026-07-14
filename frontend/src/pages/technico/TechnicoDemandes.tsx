import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils'; // Assuming cn and formatDate are in utils
import type { DemandeDevis } from '@/types'; // DemandeDevisStatut is now imported from demande-utils
import { DEMANDE_STATUT_CONFIG, normalizeDemandeStatut, getClientLabel } from '@/lib/demande-utils';
import {
  FileText, // Keep FileText for the icon
  Search,
  X,
  Eye,
  Clock,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  type LucideIcon, // Import type for icons if needed
} from 'lucide-react';

import type { DemandeDevisStatut } from '@/types'; // Keep this if DemandeDevisStatut is used as a type directly

const statutOrder: DemandeDevisStatut[] = [
  'NOUVEAU',
  'EN_COURS',
  'CONVERTI',
  'PERDU',
];

function canOpenStudy(statut: DemandeDevisStatut) {
  return statut === 'NOUVEAU' || statut === 'EN_COURS';
}

export default function TechnicoDemandes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<DemandeDevisStatut | ''>('');
  const [selectedDemande, setSelectedDemande] = useState<DemandeDevis | null>(null);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['technico-demandes', page, search, statutFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statutFilter) params.statut = statutFilter;
      const res = await api.get('/demandes-devis', { params });
      return res.data;
    },
  });

  const demandes: DemandeDevis[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1 };

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: DemandeDevisStatut }) =>
      api.patch(`/demandes-devis/${id}/statut`, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technico-demandes'] });
      queryClient.invalidateQueries({ queryKey: ['demandes-devis'] });
      setSelectedDemande(null);
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => api.post(`/demandes-devis/${id}/convert`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['technico-demandes'] });
      queryClient.invalidateQueries({ queryKey: ['demandes-devis'] });
      queryClient.invalidateQueries({ queryKey: ['technico-devis'] }); // Invalidate devis list
      setSelectedDemande(null);
      // Redirect to the newly created devis's edit page
      navigate(`/technico/devis/${response.data.id}`);
    },
    onError: (err) => {
      const errorMessage =
        (err as any).response?.data?.message ||
        'Erreur lors de la conversion de la demande en devis.';
      alert(errorMessage);
    },
  });

  const queryErrorMessage =
    error instanceof Error ? error.message : 'Impossible de charger les demandes de devis.';

  // This function is now primarily for navigating to the checklist for existing devis or for initial status update
  async function handleStudyNavigation(demande: DemandeDevis) {
    const workflowStatut = normalizeDemandeStatut(demande.statut as string);

    if (workflowStatut === 'NOUVEAU') {
      await updateStatutMutation.mutateAsync({
        id: demande.id,
        statut: 'EN_COURS',
      });
    }

    // If the demand is already converted, navigate to its associated devis if available
    if (workflowStatut === 'CONVERTI' && demande.devis && demande.devis.length > 0) {
      navigate(`/technico/devis/${demande.devis[0].id}`); // Assuming one devis per demande
    } else {
      navigate(`/technico/checklist?demandeId=${demande.id}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Demandes de devis</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {meta.total} demande{meta.total > 1 ? 's' : ''} dans votre pipeline technico
          </p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700">
          Les demandes créées depuis <span className="font-semibold">Mes Clients</span> arrivent
          ici automatiquement avec le statut <span className="font-semibold">NOUVEAU</span>.
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statutOrder.map((statut) => {
          const cfg = DEMANDE_STATUT_CONFIG[statut];
          const count = demandes.filter(
            (demande) => normalizeDemandeStatut(demande.statut as string) === statut,
          ).length;

          return (
            <button
              key={statut}
              onClick={() => {
                setStatutFilter((current) => (current === statut ? '' : statut));
                setPage(1);
              }}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                statutFilter === statut
                  ? 'border-teal-400 bg-white ring-2 ring-teal-100 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-lg border',
                    cfg.color,
                  )}
                >
                  {cfg.icon}
                </span>
                <span className="text-xs font-semibold text-gray-500">{cfg.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{count}</p>
              <p className="mt-1 text-xs text-gray-400">{cfg.helper}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une demande..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          {queryErrorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : demandes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
            <FileText size={28} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Aucune demande</h3>
          <p className="text-sm text-gray-400 mt-1">
            Crée une demande depuis la fiche client pour alimenter ce tableau.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {demandes.map((demande) => {
            const workflowStatut = normalizeDemandeStatut(demande.statut as string);
            const cfg = DEMANDE_STATUT_CONFIG[workflowStatut];
            const studyButtonLabel =
              workflowStatut === 'NOUVEAU'
                ? 'Generer le devis'
                : 'Modifier devis';

            return (
              <div
                key={demande.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-gray-900">Demande #{demande.id}</span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                            cfg.color,
                          )}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{demande.description}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Client : {getClientLabel(demande)}</span>
                        <span>Source : {demande.source}</span>
                        <span>{formatDate(demande.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDemande(demande)}
                      className="shrink-0 px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600 transition-all text-xs font-medium flex items-center gap-1"
                    >
                      <Eye size={14} /> Détails
                    </button>
                  </div>
                </div>

                {canOpenStudy(workflowStatut) && (
                  <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex flex-wrap items-center gap-2 justify-end">
                    <span className="text-xs text-gray-400 mr-auto">Étape suivante :</span>
                    <button
                      onClick={() => convertMutation.mutate(demande.id)}
                      disabled={convertMutation.isPending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {convertMutation.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <FileText size={12} />
                      )}
                      Convertir en Devis
                    </button>
                    <Link
                      to={`/technico/checklist?demandeId=${demande.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      Aller à la Checklist
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-600 font-medium px-3">
            Page {page} / {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
            disabled={page >= meta.totalPages}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {selectedDemande && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Demande #{selectedDemande.id}</h3>
                <p className="text-sm text-gray-500 mt-1">{getClientLabel(selectedDemande)}</p>
              </div>
              <button
                onClick={() => setSelectedDemande(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <Detail
                label="Statut"
                value={DEMANDE_STATUT_CONFIG[normalizeDemandeStatut(selectedDemande.statut as string)].label}
              />
              <Detail label="Source" value={selectedDemande.source} />
              <Detail label="Description" value={selectedDemande.description} />
              <Detail label="Créée le" value={formatDate(selectedDemande.createdAt)} />

              {selectedDemande.notes && <Detail label="Notes" value={selectedDemande.notes} />}

              {canOpenStudy(normalizeDemandeStatut(selectedDemande.statut as string)) && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">Action principale</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => convertMutation.mutate(selectedDemande.id)}
                      disabled={convertMutation.isPending}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {convertMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                      Convertir en Devis
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}
