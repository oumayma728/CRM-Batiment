import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckSquare,
  ClipboardCheck,
  HardHat,
  Loader2,
  PackageSearch,
  TrendingUp,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import type { Chantier, FournisseurCommandeDetail, PaginatedResponse } from '@/types';

const chantierStatusLabel: Record<Chantier['statut'], string> = {
  VISITE_TECHNIQUE: 'Visite technique',
  DEVIS_EN_PREPARATION: 'Devis en préparation',
  DEVIS_ENVOYE: 'Devis envoyé',
  NEGOCIATION_EN_COURS: 'Négociation',
  DEVIS_VALIDE: 'Devis validé',
  COMMANDES_GENEREES: 'Commandes générées',
  MATERIAUX_EN_LIVRAISON: 'Matériaux en livraison',
  MATERIAUX_RECEPTIONNES: 'Matériaux réceptionnés',
  PLANIFIE: 'Planifié',
  DEMARRE: 'Démarré',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  CLOTURE: 'Clôturé',
};

export default function ChefDashboardPage() {
  const navigate = useNavigate();

  const chantiersQuery = useQuery({
    queryKey: ['chef-dashboard-chantiers'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Chantier>>('/chantiers', {
        params: { page: 1, limit: 5 },
      });
      return res.data;
    },
  });

  const chantiersEnCoursQuery = useQuery({
    queryKey: ['chef-dashboard-chantiers-en-cours'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Chantier>>('/chantiers', {
        params: { page: 1, limit: 1, statut: 'EN_COURS' },
      });
      return res.data;
    },
  });

  const commandesQuery = useQuery({
    queryKey: ['chef-dashboard-commandes'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<FournisseurCommandeDetail>>(
        '/commandes-fournisseur',
        { params: { page: 1, limit: 100 } },
      );
      return res.data;
    },
  });

  const commandes = useMemo(
    () => commandesQuery.data?.data ?? [],
    [commandesQuery.data?.data],
  );
  const receptionsEnAttente = useMemo(
    () =>
      commandes.filter(
        (commande) =>
          commande.tracking.reception.state === 'EN_ATTENTE' ||
          commande.tracking.reception.state === 'PARTIELLE',
      ).length,
    [commandes],
  );

  const receptionsCompletes = useMemo(
    () =>
      commandes.filter((commande) => commande.tracking.reception.state === 'COMPLETE').length,
    [commandes],
  );

  const kpis = [
    {
      label: 'Chantiers total',
      value: chantiersQuery.data?.meta.total ?? 0,
      icon: <HardHat size={18} />,
    },
    {
      label: 'Chantiers en cours',
      value: chantiersEnCoursQuery.data?.meta.total ?? 0,
      icon: <TrendingUp size={18} />,
    },
    {
      label: 'Réceptions en attente',
      value: receptionsEnAttente,
      icon: <PackageSearch size={18} />,
    },
    {
      label: 'Réceptions complètes',
      value: receptionsCompletes,
      icon: <ClipboardCheck size={18} />,
    },
  ];

  const isLoading =
    chantiersQuery.isLoading || chantiersEnCoursQuery.isLoading || commandesQuery.isLoading;

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.14),_transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef5ff_100%)] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Chef de chantier
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Tableau de bord terrain</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Pilotez vos chantiers, vos tâches et les réceptions depuis un espace clair et unifié.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/chef-chantier/chantiers')}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Voir les chantiers <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/chef-chantier/taches-chantier')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Tâches chantier <CheckSquare size={16} />
          </button>
          <button
            onClick={() => navigate('/chef-chantier/receptions')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Voir les réceptions <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {kpi.icon}
            </div>
            <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-500">{kpi.label}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Derniers chantiers</h2>
            <p className="text-xs text-slate-500">Vue rapide des derniers dossiers</p>
          </div>
          <button
            onClick={() => navigate('/chef-chantier/chantiers')}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Tout voir
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Chargement du dashboard...
            </span>
          </div>
        ) : (chantiersQuery.data?.data ?? []).length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-slate-500">
            Aucun chantier trouvé.
          </div>
        ) : (
          <div className="space-y-2.5">
            {(chantiersQuery.data?.data ?? []).map((chantier) => (
              <div
                key={chantier.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{chantier.reference}</p>
                    <p className="text-xs text-slate-500">{chantier.adresse}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                      chantier.statut === 'EN_COURS'
                        ? 'bg-amber-100 text-amber-700'
                        : chantier.statut === 'TERMINE' || chantier.statut === 'CLOTURE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-sky-100 text-sky-700',
                    )}
                  >
                    {chantierStatusLabel[chantier.statut]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Mis à jour le {formatDate(chantier.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
