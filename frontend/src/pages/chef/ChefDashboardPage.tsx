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
  DEVIS_EN_PREPARATION: 'Devis en preparation',
  DEVIS_ENVOYE: 'Devis envoye',
  NEGOCIATION_EN_COURS: 'Negociation',
  DEVIS_VALIDE: 'Devis valide',
  COMMANDES_GENEREES: 'Commandes generees',
  MATERIAUX_EN_LIVRAISON: 'Materiaux en livraison',
  MATERIAUX_RECEPTIONNES: 'Materiaux receptionnes',
  PLANIFIE: 'Planifie',
  DEMARRE: 'Demarre',
  EN_COURS: 'En cours',
  TERMINE: 'Termine',
  CLOTURE: 'Cloture',
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

  const commandes = commandesQuery.data?.data ?? [];
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
      label: 'Receptions en attente',
      value: receptionsEnAttente,
      icon: <PackageSearch size={18} />,
    },
    {
      label: 'Receptions completes',
      value: receptionsCompletes,
      icon: <ClipboardCheck size={18} />,
    },
  ];

  const isLoading =
    chantiersQuery.isLoading || chantiersEnCoursQuery.isLoading || commandesQuery.isLoading;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_26%),linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#fefce8_100%)] p-4 shadow-sm ring-1 ring-amber-200">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
          Chef de chantier
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Tableau de bord terrain</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Interface isolee pour piloter les chantiers et suivre les receptions fournisseurs.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/admin/chantiers')}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Voir les chantiers <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/admin/taches-chantier')}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-amber-50"
          >
            Taches chantier <CheckSquare size={16} />
          </button>
          <button
            onClick={() => navigate('/admin/commandes-fournisseur')}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-amber-50"
          >
            Voir les receptions <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200"
          >
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              {kpi.icon}
            </div>
            <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-500">{kpi.label}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-stone-200">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Derniers chantiers</h2>
            <p className="text-xs text-slate-500">Vue rapide des derniers dossiers</p>
          </div>
          <button
            onClick={() => navigate('/admin/chantiers')}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-stone-50"
          >
            Tout voir
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-xl bg-stone-50 px-4 py-6 text-center text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Chargement du dashboard...
            </span>
          </div>
        ) : (chantiersQuery.data?.data ?? []).length === 0 ? (
          <div className="rounded-xl bg-stone-50 px-4 py-6 text-center text-slate-500">
            Aucun chantier trouve.
          </div>
        ) : (
          <div className="space-y-2.5">
            {(chantiersQuery.data?.data ?? []).map((chantier) => (
              <div
                key={chantier.id}
                className="rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5"
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
                  Mis a jour le {formatDate(chantier.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
