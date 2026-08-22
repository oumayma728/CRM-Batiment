import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Euro,
  FileText,
  Percent,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

interface MonthlyTrend {
  mois: string;
  ca: number;
  marge: number;
  prospects: number;
  factures: number;
  chantiers: number;
  commandes: number;
}

interface DashboardStats {
  prospectsActifs: number;

  devis: {
    envoyes: number;
    acceptes: number;
    refuses: number;
    brouillons: number;
    signes: number;
  };

  tauxConversion: number;

  caSigneMois: number;

  facturesImpayees: {
    montant: number;
    nombre: number;
  };

  chantiersEnRetard: number;
  commandesEnAttente: number;

  margeMoyenne: {
    devis: number;
    chantiers: number;
  };

  tendancesMensuelles?: MonthlyTrend[];
}

interface AuditLogItem {
  id: number;
  action: string;
  entite: string;
  entiteId: number;
  createdAt: string;

  user?: {
    prenom?: string | null;
    nom?: string | null;
    email?: string | null;
  } | null;
}

interface AuditLogsResponse {
  data: AuditLogItem[];
}

interface RecentActivityItem {
  title: string;
  description: string;
  time: string;
  color: ActivityColor;
  icon: ReactNode;
}

type SummaryColor =
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'red';

type ActivityColor =
  | 'blue'
  | 'violet'
  | 'red'
  | 'orange'
  | 'emerald';

const emptyStats: DashboardStats = {
  prospectsActifs: 0,

  devis: {
    envoyes: 0,
    acceptes: 0,
    refuses: 0,
    brouillons: 0,
    signes: 0,
  },

  tauxConversion: 0,
  caSigneMois: 0,

  facturesImpayees: {
    montant: 0,
    nombre: 0,
  },

  chantiersEnRetard: 0,
  commandesEnAttente: 0,

  margeMoyenne: {
    devis: 0,
    chantiers: 0,
  },

  tendancesMensuelles: [],
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isFetching,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],

    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data;
    },

    staleTime: 60_000,
  });

  const {
    data: auditLogsResponse,
    isLoading: isAuditLogsLoading,
    isFetching: isAuditLogsFetching,
    refetch: refetchAudit,
  } = useQuery<AuditLogsResponse>({
    queryKey: ['dashboard-audit-logs'],

    queryFn: async () => {
      const response = await api.get('/audit-logs', {
        params: {
          page: 1,
          limit: 4,
        },
      });

      return response.data;
    },

    staleTime: 60_000,
    retry: false,
  });

  const stats: DashboardStats = {
    ...emptyStats,
    ...data,

    devis: {
      ...emptyStats.devis,
      ...(data?.devis ?? {}),
    },

    facturesImpayees: {
      ...emptyStats.facturesImpayees,
      ...(data?.facturesImpayees ?? {}),
    },

    margeMoyenne: {
      ...emptyStats.margeMoyenne,
      ...(data?.margeMoyenne ?? {}),
    },

    tendancesMensuelles:
      data?.tendancesMensuelles ?? [],
  };

  const firstName =
    user?.prenom ?? 'Super Admin';

  const totalDevis =
    stats.devis.brouillons +
    stats.devis.envoyes +
    stats.devis.acceptes +
    stats.devis.signes +
    stats.devis.refuses;

  const totalAlerts =
    stats.facturesImpayees.nombre +
    stats.chantiersEnRetard +
    stats.commandesEnAttente;

  const monthlyData =
    stats.tendancesMensuelles?.length
      ? stats.tendancesMensuelles.slice(-12)
      : buildEmptyMonths();

  const caSeries =
    monthlyData.map((item) => item.ca);

  const labels =
    monthlyData.map((item) => item.mois);

  const recentActivities =
    buildRecentActivities(
      auditLogsResponse?.data ?? [],
      stats,
      totalDevis,
      totalAlerts,
    );

  const activityItems = [
    {
      key: 'prospects',
      label: 'Prospects',
      value: stats.prospectsActifs,
      color: '#2563eb',
    },

    {
      key: 'devis',
      label: 'Devis',
      value: totalDevis,
      color: '#8b5cf6',
    },

    {
      key: 'factures',
      label: 'Factures impayées',
      value: stats.facturesImpayees.nombre,
      color: '#ef4444',
    },

    {
      key: 'chantiers',
      label: 'Chantiers en retard',
      value: stats.chantiersEnRetard,
      color: '#f97316',
    },

    {
      key: 'commandes',
      label: 'Commandes en attente',
      value: stats.commandesEnAttente,
      color: '#10b981',
    },
  ];

  const focusItems = useMemo(
    () => [
      {
        title: 'Performance commerciale',
        description:
          'Devis envoyés, acceptés et refusés',
        icon: <BarChart3 size={19} />,
        color: 'bg-blue-600',
      },

      {
        title: 'Expérience client',
        description:
          'Prospects actifs sur les 30 derniers jours',
        icon: <Users size={19} />,
        color: 'bg-emerald-600',
      },

      {
        title: 'Production & délais',
        description:
          'Chantiers en retard et commandes fournisseur',
        icon: <FileText size={19} />,
        color: 'bg-violet-600',
      },

      {
        title: 'Conformité & qualité',
        description:
          'Factures impayées, marges et suivi global',
        icon: <ShieldCheck size={19} />,
        color: 'bg-orange-500',
      },
    ],
    [],
  );

  const handleRefresh = async () => {
    await Promise.all([
      refetchStats(),
      refetchAudit(),
    ]);
  };

  const refreshing =
    isFetching || isAuditLogsFetching;

  return (
    <div className="space-y-6">
      {/* Barre supérieure */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#185FA5] dark:text-blue-400">
            Vue générale
          </p>

          <h1 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            Tableau de bord administrateur
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Suivi des performances et données du CRM en temps réel.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />

          {refreshing
            ? 'Actualisation...'
            : 'Actualiser'}
        </button>
      </section>

      {/* Hero */}
      <HeroBanner
        firstName={firstName}
        focusItems={focusItems}
      />

      {/* KPI */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Users size={19} />}
          title="Prospects actifs"
          value={stats.prospectsActifs}
          detail="30 derniers jours"
          action="Voir les clients"
          color="blue"
          loading={isLoading}
          onClick={() =>
            navigate('/admin/clients')
          }
        />

        <SummaryCard
          icon={<FileText size={19} />}
          title="Devis"
          value={totalDevis}
          detail={`${stats.devis.envoyes} envoyés · ${stats.devis.acceptes} acceptés · ${stats.devis.refuses} refusés`}
          action="Voir les devis"
          color="violet"
          loading={isLoading}
          onClick={() =>
            navigate('/admin/devis')
          }
        />

        <SummaryCard
          icon={<Euro size={19} />}
          title="CA signé du mois"
          value={formatCurrency(
            stats.caSigneMois,
          )}
          detail={`${stats.tauxConversion}% de conversion`}
          action="Voir le CA"
          color="emerald"
          loading={isLoading}
          onClick={() =>
            navigate('/admin/devis')
          }
        />

        <SummaryCard
          icon={<Bell size={19} />}
          title="Alertes"
          value={totalAlerts}
          detail={`${stats.facturesImpayees.nombre} facture(s), ${stats.chantiersEnRetard} chantier(s), ${stats.commandesEnAttente} commande(s)`}
          action="Traiter les alertes"
          color="red"
          loading={isLoading}
          onClick={() =>
            navigate('/admin/factures')
          }
        />
      </section>

      {/* Première ligne de graphiques */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <DashboardCard className="xl:col-span-5">
          <CardHeader
            title="Évolution du CA signé"
            description="Chiffre d’affaires signé sur les 12 derniers mois"
            badge="12 derniers mois"
            icon={<CalendarDays size={15} />}
          />

          <div className="mt-5 grid gap-4 md:grid-cols-[150px_1fr]">
            <div>
              <p className="text-2xl font-bold text-slate-950 dark:text-white">
                {formatCurrency(
                  stats.caSigneMois,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                CA signé ce mois
              </p>

              <div className="mt-4 rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <TrendingUp size={14} />
                  {stats.tauxConversion}%
                </div>

                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  Taux de conversion
                </p>
              </div>
            </div>

            <LineChart
              values={caSeries}
              labels={labels}
              color="#2563eb"
              gradientId="caArea"
            />
          </div>
        </DashboardCard>

        <DashboardCard className="xl:col-span-3">
          <CardHeader
            title="Statuts des devis"
            description="Répartition réelle des devis"
            badge="Par statut"
            icon={<BarChart3 size={15} />}
          />

          <div className="mt-4 grid grid-cols-1 items-center gap-3 sm:grid-cols-[118px_1fr]">
            <DonutChart
              total={Math.max(totalDevis, 1)}
              centerValue={totalDevis}
              centerLabel="Devis"
              slices={[
                {
                  label: 'Envoyés',
                  value: stats.devis.envoyes,
                  color: '#2563eb',
                },
                {
                  label: 'Acceptés',
                  value: stats.devis.acceptes,
                  color: '#8b5cf6',
                },
                {
                  label: 'Signés',
                  value: stats.devis.signes,
                  color: '#22c55e',
                },
                {
                  label: 'Refusés',
                  value: stats.devis.refuses,
                  color: '#fb923c',
                },
              ]}
            />

            <ChartLegend
              items={[
                {
                  label: 'Envoyés',
                  value: stats.devis.envoyes,
                  color: '#2563eb',
                },
                {
                  label: 'Acceptés',
                  value: stats.devis.acceptes,
                  color: '#8b5cf6',
                },
                {
                  label: 'Signés',
                  value: stats.devis.signes,
                  color: '#22c55e',
                },
                {
                  label: 'Refusés',
                  value: stats.devis.refuses,
                  color: '#fb923c',
                },
              ]}
            />
          </div>
        </DashboardCard>

        <RecentActivitiesCard
          className="xl:col-span-4"
          activities={recentActivities}
          loading={isAuditLogsLoading}
          onViewAll={() =>
            navigate('/admin/audit')
          }
        />
      </section>

      {/* Deuxième ligne */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <DashboardCard className="xl:col-span-4">
          <CardHeader
            title="Marge moyenne"
            description="Comparaison devis et chantiers"
            badge="Rentabilité"
            icon={<Percent size={15} />}
          />

          <div className="mt-5">
            <MarginComparisonChart
              devis={stats.margeMoyenne.devis}
              chantiers={
                stats.margeMoyenne.chantiers
              }
            />
          </div>
        </DashboardCard>

        <DashboardCard className="xl:col-span-4">
          <CardHeader
            title="Vue d’ensemble activité"
            description="Volumes actuels par indicateur"
            badge="Global"
            icon={<Building2 size={15} />}
          />

          <div className="mt-5">
            <ActivityBarChart
              items={activityItems}
            />
          </div>
        </DashboardCard>

        <DashboardCard className="xl:col-span-4">
          <CardHeader
            title="Tendances opérationnelles"
            description="Prospects, factures, chantiers et commandes"
            badge="12 derniers mois"
            icon={<TrendingUp size={15} />}
          />

          <div className="mt-5">
            <MonthlyOperationsChart
              data={monthlyData}
            />
          </div>
        </DashboardCard>
      </section>

      {/* Contrôle et risques */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <DashboardCard className="xl:col-span-7">
          <CardHeader
            title="Lecture de contrôle détaillée"
            description="Correspondance exacte avec les données du backend"
            icon={
              <ClipboardCheck size={15} />
            }
          />

          <div className="mt-5">
            <ControlTable
              stats={stats}
              totalDevis={totalDevis}
              totalAlerts={totalAlerts}
            />
          </div>
        </DashboardCard>

        <div className="space-y-5 xl:col-span-5">
          <DashboardCard>
            <CardHeader
              title="Synthèse des risques"
              description="Montants et volumes à suivre"
              badge="Priorité"
              icon={
                <AlertTriangle size={15} />
              }
            />

            <div className="mt-5 grid gap-3">
              <RiskRow
                label="Factures impayées"
                value={formatCurrency(
                  stats.facturesImpayees
                    .montant,
                )}
                detail={`${stats.facturesImpayees.nombre} facture(s)`}
                color="red"
                onClick={() =>
                  navigate('/admin/factures')
                }
              />

              <RiskRow
                label="Chantiers en retard"
                value={`${stats.chantiersEnRetard}`}
                detail="Date prévue dépassée"
                color="orange"
                onClick={() =>
                  navigate('/admin/chantiers')
                }
              />

              <RiskRow
                label="Commandes fournisseur"
                value={`${stats.commandesEnAttente}`}
                detail="En attente de suivi"
                color="blue"
                onClick={() =>
                  navigate(
                    '/admin/commandes-fournisseur',
                  )
                }
              />
            </div>
          </DashboardCard>

          <DashboardCard>
            <CardHeader
              title="Priorités immédiates"
              description="Factures, chantiers et commandes"
              badge="À surveiller"
              icon={
                <AlertTriangle size={15} />
              }
            />

            <div className="mt-5">
              <PriorityHorizontalChart
                factures={
                  stats.facturesImpayees
                }
                chantiers={
                  stats.chantiersEnRetard
                }
                commandes={
                  stats.commandesEnAttente
                }
              />
            </div>
          </DashboardCard>
        </div>
      </section>
    </div>
  );
}

function HeroBanner({
  firstName,
  focusItems,
}: {
  firstName: string;

  focusItems: {
    title: string;
    description: string;
    icon: ReactNode;
    color: string;
  }[];
}) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-blue-100 bg-gradient-to-br from-[#eaf4ff] via-[#f2f8ff] to-white shadow-[0_16px_45px_rgba(30,64,175,0.08)] dark:border-slate-700 dark:from-[#0d2745] dark:via-[#12395f] dark:to-[#0f2746]">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-400/10" />

      <div className="relative z-10 grid min-h-[235px] grid-cols-1 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col justify-center px-6 py-8 lg:px-10">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-blue-200">
            <ShieldCheck size={14} />
            Espace administrateur
          </div>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 dark:text-white md:text-4xl">
            Bonjour,{' '}
            <span className="text-blue-600 dark:text-cyan-300">
              {firstName}
            </span>
          </h2>

          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
            Pilotez la performance commerciale,
            la qualité et l’avancement de vos
            projets depuis une vue unique.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 px-6 pb-7 sm:grid-cols-2 lg:py-7 lg:pl-0 lg:pr-8">
          {focusItems.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/10"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${item.color}`}
              >
                {item.icon}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  {item.title}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  detail,
  action,
  color,
  loading,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  value: string | number;
  detail: string;
  action: string;
  color: SummaryColor;
  loading: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    blue:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',

    violet:
      'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',

    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',

    red:
      'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorClasses[color]}`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {title}
            </p>

            {loading ? (
              <div className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ) : (
              <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                {value}
              </p>
            )}

            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {detail}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50/70 dark:border-slate-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        {action}

        <ArrowRight
          size={16}
          className="transition group-hover:translate-x-1"
        />
      </button>
    </div>
  );
}

function DashboardCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  description,
  badge,
  icon,
}: {
  title: string;
  description: string;
  badge?: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-bold text-slate-950 dark:text-white">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      {badge && (
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {icon}
          {badge}
        </div>
      )}
    </div>
  );
}

function RecentActivitiesCard({
  activities,
  loading,
  onViewAll,
  className = '',
}: {
  activities: RecentActivityItem[];
  loading: boolean;
  onViewAll: () => void;
  className?: string;
}) {
  return (
    <DashboardCard className={className}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Activités récentes
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Derniers événements issus du backend
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          Voir tout
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3"
            >
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />

              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-44 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <RecentActivityRow
              key={`${activity.title}-${activity.description}-${activity.time}`}
              activity={activity}
            />
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

function RecentActivityRow({
  activity,
}: {
  activity: RecentActivityItem;
}) {
  const colors = {
    blue:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',

    violet:
      'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',

    red:
      'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',

    orange:
      'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300',

    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${colors[activity.color]}`}
        >
          {activity.icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {activity.title}
          </p>

          <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-500 dark:text-slate-400">
            {activity.description}
          </p>
        </div>
      </div>

      {activity.time ? (
        <span className="shrink-0 text-xs font-medium text-slate-400">
          {activity.time}
        </span>
      ) : null}
    </div>
  );
}

function LineChart({
  values,
  labels,
  color,
  gradientId,
}: {
  values: number[];
  labels: string[];
  color: string;
  gradientId: string;
}) {
  const width = 420;
  const height = 180;
  const paddingX = 28;
  const paddingY = 24;

  const max =
    Math.max(...values, 1);

  const points = values.map(
    (value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : paddingX +
            (index *
              (width - paddingX * 2)) /
              (values.length - 1);

      const y =
        height -
        paddingY -
        (value / max) *
          (height - paddingY * 2);

      return {
        x,
        y,
        value,
      };
    },
  );

  const line = points
    .map(
      (point) =>
        `${point.x},${point.y}`,
    )
    .join(' ');

  const area = [
    `M ${points[0]?.x ?? 0} ${
      height - paddingY
    }`,

    ...points.map(
      (point) =>
        `L ${point.x} ${point.y}`,
    ),

    `L ${
      points[points.length - 1]?.x ?? 0
    } ${height - paddingY}`,

    'Z',
  ].join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-48 w-full"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor={color}
            stopOpacity="0.18"
          />

          <stop
            offset="100%"
            stopColor={color}
            stopOpacity="0.02"
          />
        </linearGradient>
      </defs>

      {[0, 1, 2].map(
        (lineIndex) => {
          const y =
            paddingY +
            lineIndex *
              ((height -
                paddingY * 2) /
                2);

          return (
            <line
              key={lineIndex}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="#cbd5e1"
              strokeOpacity="0.65"
              strokeDasharray="4 5"
            />
          );
        },
      )}

      <path
        d={area}
        fill={`url(#${gradientId})`}
      />

      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map(
        (point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="2"
          />
        ),
      )}

      {labels.map(
        (label, index) => {
          const x =
            labels.length === 1
              ? width / 2
              : paddingX +
                (index *
                  (width -
                    paddingX * 2)) /
                  (labels.length - 1);

          return (
            <text
              key={`${label}-${index}`}
              x={x}
              y={height - 5}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {label}
            </text>
          );
        },
      )}
    </svg>
  );
}

function DonutChart({
  total,
  centerValue,
  centerLabel,
  slices,
}: {
  total: number;
  centerValue: number;
  centerLabel: string;

  slices: {
    label: string;
    value: number;
    color: string;
  }[];
}) {
  const cx = 80;
  const cy = 80;
  const radius = 64;
  const innerRadius = 40;

  const realTotal =
    slices.reduce(
      (sum, slice) =>
        sum + slice.value,
      0,
    );

  const safeTotal =
    realTotal > 0
      ? realTotal
      : total;

  let currentAngle = 0;

  return (
    <svg
      viewBox="0 0 160 160"
      className="h-32 w-32"
    >
      {realTotal <= 0 ? (
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="#e2e8f0"
        />
      ) : (
        slices.map((slice) => {
          const angle =
            (slice.value /
              safeTotal) *
            360;

          const path =
            createArcPath(
              cx,
              cy,
              radius,
              innerRadius,
              currentAngle,
              currentAngle + angle,
            );

          currentAngle += angle;

          return (
            <path
              key={slice.label}
              d={path}
              fill={slice.color}
            />
          );
        })
      )}

      <circle
        cx={cx}
        cy={cy}
        r={innerRadius}
        fill="white"
      />

      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        className="fill-slate-950 text-lg font-semibold"
      >
        {centerValue}
      </text>

      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        className="fill-slate-500 text-[11px]"
      >
        {centerLabel}
      </text>
    </svg>
  );
}

function ChartLegend({
  items,
}: {
  items: {
    label: string;
    value: number;
    color: string;
  }[];
}) {
  const total =
    items.reduce(
      (sum, item) =>
        sum + item.value,
      0,
    );

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const percent =
          total > 0
            ? Math.round(
                (item.value /
                  total) *
                  100,
              )
            : 0;

        return (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    item.color,
                }}
              />

              <span className="text-slate-600 dark:text-slate-300">
                {item.label}
              </span>
            </div>

            <span className="font-medium text-slate-700 dark:text-slate-200">
              {item.value} ({percent}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PriorityHorizontalChart({
  factures,
  chantiers,
  commandes,
}: {
  factures:
    DashboardStats['facturesImpayees'];
  chantiers: number;
  commandes: number;
}) {
  const items = [
    {
      label:
        'Factures impayées',
      value: factures.nombre,
      displayValue:
        formatCurrency(
          factures.montant,
        ),
      color: '#e06434',
    },

    {
      label:
        'Chantiers en retard',
      value: chantiers,
      displayValue: `${chantiers}`,
      color: '#179a63',
    },

    {
      label:
        'Commandes fournisseur',
      value: commandes,
      displayValue: `${commandes}`,
      color: '#3b82f6',
    },
  ];

  return (
    <HorizontalMetricBars
      items={items}
    />
  );
}

function HorizontalMetricBars({
  items,
}: {
  items: {
    label: string;
    value: number;
    displayValue?: string;
    color: string;
  }[];
}) {
  const max =
    Math.max(
      ...items.map(
        (item) => item.value,
      ),
      1,
    );

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const width =
          item.value === 0
            ? '16px'
            : `${Math.max(
                (item.value / max) *
                  100,
                18,
              )}%`;

        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-4">
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {item.label}
              </span>

              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {item.displayValue ??
                  item.value}
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width,
                  backgroundColor:
                    item.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MarginComparisonChart({
  devis,
  chantiers,
}: {
  devis: number;
  chantiers: number;
}) {
  const max =
    Math.max(
      devis,
      chantiers,
      1,
    );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
        <svg
          viewBox="0 0 360 145"
          className="h-36 w-full"
        >
          <line
            x1="38"
            y1="108"
            x2="322"
            y2="108"
            stroke="#cbd5e1"
          />

          {[
            {
              label: 'Devis',
              value: devis,
              x: 62,
              color: '#2563eb',
            },

            {
              label: 'Chantiers',
              value: chantiers,
              x: 298,
              color: '#f97316',
            },
          ].map((item) => {
            const y =
              108 -
              (item.value / max) *
                74;

            return (
              <g key={item.label}>
                <circle
                  cx={item.x}
                  cy={y}
                  r="7"
                  fill="white"
                  stroke={item.color}
                  strokeWidth="4"
                />

                <text
                  x={item.x}
                  y={y - 14}
                  textAnchor="middle"
                  className="fill-slate-700 text-[12px] font-semibold"
                >
                  {item.value}%
                </text>

                <text
                  x={item.x}
                  y="132"
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px]"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          <polyline
            points={`62,${
              108 -
              (devis / max) * 74
            } 298,${
              108 -
              (chantiers / max) *
                74
            }`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <HorizontalMetricBars
        items={[
          {
            label:
              'Marge moyenne devis',
            value: devis,
            displayValue: `${devis}%`,
            color: '#2563eb',
          },

          {
            label:
              'Marge moyenne chantier',
            value: chantiers,
            displayValue: `${chantiers}%`,
            color: '#f97316',
          },
        ]}
      />
    </div>
  );
}

function ActivityBarChart({
  items,
}: {
  items: {
    key: string;
    label: string;
    value: number;
    color: string;
  }[];
}) {
  const max =
    Math.max(
      ...items.map(
        (item) => item.value,
      ),
      1,
    );

  return (
    <div className="flex h-60 items-end justify-around gap-3 rounded-2xl bg-slate-50 px-4 py-5 dark:bg-slate-800/60">
      {items.map((item) => {
        const barHeight =
          item.value === 0
            ? 8
            : Math.max(
                (item.value / max) *
                  150,
                20,
              );

        return (
          <div
            key={item.key}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {item.value}
            </span>

            <div
              className="w-full max-w-[72px] rounded-t-2xl transition-all"
              style={{
                height:
                  barHeight,
                backgroundColor:
                  item.color,
                opacity:
                  item.value === 0
                    ? 0.24
                    : 1,
              }}
            />

            <p className="max-w-[80px] text-center text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyOperationsChart({
  data,
}: {
  data: MonthlyTrend[];
}) {
  const labels =
    data.map(
      (item) => item.mois,
    );

  const prospects =
    data.map(
      (item) =>
        item.prospects,
    );

  const factures =
    data.map(
      (item) =>
        item.factures,
    );

  const chantiers =
    data.map(
      (item) =>
        item.chantiers,
    );

  const commandes =
    data.map(
      (item) =>
        item.commandes,
    );

  return (
    <div>
      <MultiLineChart
        labels={labels}
        series={[
          {
            label: 'Prospects',
            values: prospects,
            color: '#2563eb',
          },

          {
            label: 'Factures',
            values: factures,
            color: '#ef4444',
          },

          {
            label: 'Chantiers',
            values: chantiers,
            color: '#f97316',
          },

          {
            label: 'Commandes',
            values: commandes,
            color: '#10b981',
          },
        ]}
      />

      <div className="mt-3 flex flex-wrap gap-3">
        {[
          {
            label: 'Prospects',
            color: '#2563eb',
          },

          {
            label: 'Factures',
            color: '#ef4444',
          },

          {
            label: 'Chantiers',
            color: '#f97316',
          },

          {
            label: 'Commandes',
            color: '#10b981',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  item.color,
              }}
            />

            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLineChart({
  labels,
  series,
}: {
  labels: string[];

  series: {
    label: string;
    values: number[];
    color: string;
  }[];
}) {
  const width = 420;
  const height = 190;
  const paddingX = 28;
  const paddingY = 24;

  const max =
    Math.max(
      ...series.flatMap(
        (item) =>
          item.values,
      ),
      1,
    );

  const buildPoints = (
    values: number[],
  ) =>
    values.map(
      (value, index) => {
        const x =
          values.length === 1
            ? width / 2
            : paddingX +
              (index *
                (width -
                  paddingX *
                    2)) /
                (values.length -
                  1);

        const y =
          height -
          paddingY -
          (value / max) *
            (height -
              paddingY * 2);

        return {
          x,
          y,
          value,
        };
      },
    );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-52 w-full"
    >
      {[0, 1, 2].map(
        (lineIndex) => {
          const y =
            paddingY +
            lineIndex *
              ((height -
                paddingY * 2) /
                2);

          return (
            <line
              key={lineIndex}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="#cbd5e1"
              strokeOpacity="0.65"
              strokeDasharray="4 5"
            />
          );
        },
      )}

      {series.map((item) => {
        const points =
          buildPoints(
            item.values,
          );

        const line =
          points
            .map(
              (point) =>
                `${point.x},${point.y}`,
            )
            .join(' ');

        return (
          <g key={item.label}>
            <polyline
              points={line}
              fill="none"
              stroke={
                item.color
              }
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />

            {points.map(
              (
                point,
                index,
              ) => (
                <circle
                  key={`${item.label}-${index}`}
                  cx={
                    point.x
                  }
                  cy={
                    point.y
                  }
                  r="3.5"
                  fill={
                    item.color
                  }
                  stroke="white"
                  strokeWidth="2"
                />
              ),
            )}
          </g>
        );
      })}

      {labels.map(
        (label, index) => {
          const x =
            labels.length === 1
              ? width / 2
              : paddingX +
                (index *
                  (width -
                    paddingX *
                      2)) /
                  (labels.length -
                    1);

          return (
            <text
              key={`${label}-${index}`}
              x={x}
              y={height - 5}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {label}
            </text>
          );
        },
      )}
    </svg>
  );
}

function RiskRow({
  label,
  value,
  detail,
  color,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  color: ActivityColor;
  onClick: () => void;
}) {
  const colors = {
    blue:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',

    violet:
      'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',

    red:
      'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',

    orange:
      'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300',

    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:border-blue-100 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}
        >
          <AlertTriangle
            size={16}
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {label}
          </p>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {detail}
          </p>
        </div>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </span>

        <ArrowRight
          size={15}
          className="text-slate-400"
        />
      </div>
    </button>
  );
}

function ControlTable({
  stats,
  totalDevis,
  totalAlerts,
}: {
  stats: DashboardStats;
  totalDevis: number;
  totalAlerts: number;
}) {
  const rows = [
    [
      'Prospects actifs',
      `${stats.prospectsActifs}`,
      'Clients créés sur les 30 derniers jours',
    ],

    [
      'Devis envoyés / acceptés / refusés',
      `${stats.devis.envoyes} / ${stats.devis.acceptes} / ${stats.devis.refuses}`,
      'Répartition réelle des statuts',
    ],

    [
      'Taux de conversion',
      `${stats.tauxConversion}%`,
      'Acceptés + signés / devis traités',
    ],

    [
      'CA signé du mois',
      formatCurrency(
        stats.caSigneMois,
      ),
      'Devis signés du mois courant',
    ],

    [
      'Factures impayées',
      `${stats.facturesImpayees.nombre}`,
      formatCurrency(
        stats.facturesImpayees
          .montant,
      ),
    ],

    [
      'Chantiers en retard',
      `${stats.chantiersEnRetard}`,
      'Date prévue dépassée',
    ],

    [
      'Commandes fournisseur',
      `${stats.commandesEnAttente}`,
      'Commandes en attente de suivi',
    ],

    [
      'Marge devis / chantier',
      `${stats.margeMoyenne.devis}% / ${stats.margeMoyenne.chantiers}%`,
      'Calculée depuis les données réelles',
    ],

    [
      'Total alertes',
      `${totalAlerts}`,
      'Factures + chantiers + commandes',
    ],

    [
      'Total devis',
      `${totalDevis}`,
      'Tous statuts confondus',
    ],
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
      <table className="min-w-[700px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">
              Donnée
            </th>

            <th className="px-4 py-3 font-semibold">
              Valeur
            </th>

            <th className="px-4 py-3 font-semibold">
              Lecture
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {rows.map((row) => (
            <tr
              key={row[0]}
              className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/70"
            >
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                {row[0]}
              </td>

              <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">
                {row[1]}
              </td>

              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                {row[2]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildRecentActivities(
  auditLogs: AuditLogItem[],
  stats: DashboardStats,
  totalDevis: number,
  totalAlerts: number,
): RecentActivityItem[] {
  if (auditLogs.length > 0) {
    return auditLogs
      .slice(0, 4)
      .map((log) => ({
        title:
          formatAuditTitle(
            log.action,
            log.entite,
          ),

        description:
          formatAuditDescription(
            log,
          ),

        time:
          formatRelativeTime(
            log.createdAt,
          ),

        color:
          getAuditColor(
            log.entite,
            log.action,
          ),

        icon:
          getAuditIcon(
            log.entite,
            log.action,
          ),
      }));
  }

  return [
    {
      title: 'Prospects actifs',

      description:
        `${stats.prospectsActifs} client(s) créé(s) sur les 30 derniers jours`,

      time: '',
      color: 'blue',

      icon:
        <Users size={18} />,
    },

    {
      title: 'Suivi des devis',

      description:
        `${totalDevis} devis · ${stats.devis.envoyes} envoyé(s), ${stats.devis.acceptes} accepté(s), ${stats.devis.refuses} refusé(s)`,

      time: '',
      color: 'violet',

      icon:
        <FileText size={18} />,
    },

    {
      title:
        totalAlerts > 0
          ? 'Alertes à traiter'
          : 'Aucune alerte critique',

      description:
        `${stats.facturesImpayees.nombre} facture(s), ${stats.chantiersEnRetard} chantier(s), ${stats.commandesEnAttente} commande(s)`,

      time: '',

      color:
        totalAlerts > 0
          ? 'red'
          : 'emerald',

      icon:
        totalAlerts > 0
          ? (
              <AlertTriangle
                size={18}
              />
            )
          : (
              <CheckCircle2
                size={18}
              />
            ),
    },

    {
      title:
        'Rentabilité calculée',

      description:
        `Marge moyenne : ${stats.margeMoyenne.devis}% devis · ${stats.margeMoyenne.chantiers}% chantier`,

      time: '',
      color: 'orange',

      icon:
        <Percent size={18} />,
    },
  ];
}

function formatAuditTitle(
  action: string,
  entite: string,
) {
  const normalizedAction =
    action.toLowerCase();

  const entityLabel =
    formatEntityLabel(
      entite,
    );

  if (
    normalizedAction.includes(
      'create',
    ) ||
    normalizedAction.includes(
      'cré',
    )
  ) {
    return `${entityLabel} créé`;
  }

  if (
    normalizedAction.includes(
      'update',
    ) ||
    normalizedAction.includes(
      'modif',
    )
  ) {
    return `${entityLabel} modifié`;
  }

  if (
    normalizedAction.includes(
      'delete',
    ) ||
    normalizedAction.includes(
      'suppr',
    )
  ) {
    return `${entityLabel} supprimé`;
  }

  if (
    normalizedAction.includes(
      'login',
    ) ||
    normalizedAction.includes(
      'connexion',
    )
  ) {
    return 'Connexion utilisateur';
  }

  return `${entityLabel} mis à jour`;
}

function formatAuditDescription(
  log: AuditLogItem,
) {
  const userName = [
    log.user?.prenom,
    log.user?.nom,
  ]
    .filter(Boolean)
    .join(' ');

  const actor =
    userName ||
    log.user?.email ||
    'Système';

  return `${actor} · ${formatEntityLabel(
    log.entite,
  )} #${log.entiteId}`;
}

function formatEntityLabel(
  entite: string,
) {
  const normalized =
    entite.toLowerCase();

  if (
    normalized.includes(
      'devis',
    )
  ) {
    return 'Devis';
  }

  if (
    normalized.includes(
      'client',
    )
  ) {
    return 'Client';
  }

  if (
    normalized.includes(
      'facture',
    )
  ) {
    return 'Facture';
  }

  if (
    normalized.includes(
      'chantier',
    )
  ) {
    return 'Chantier';
  }

  if (
    normalized.includes(
      'commande',
    )
  ) {
    return 'Commande fournisseur';
  }

  if (
    normalized.includes(
      'demorequest',
    )
  ) {
    return 'Demande de démo';
  }

  if (
    normalized.includes(
      'user',
    ) ||
    normalized.includes(
      'utilisateur',
    )
  ) {
    return 'Utilisateur';
  }

  return (
    entite.charAt(0).toUpperCase() +
    entite
      .slice(1)
      .toLowerCase()
  );
}

function getAuditColor(
  entite: string,
  action: string,
): ActivityColor {
  const normalizedEntity =
    entite.toLowerCase();

  const normalizedAction =
    action.toLowerCase();

  if (
    normalizedAction.includes(
      'delete',
    ) ||
    normalizedAction.includes(
      'suppr',
    )
  ) {
    return 'red';
  }

  if (
    normalizedEntity.includes(
      'devis',
    )
  ) {
    return 'violet';
  }

  if (
    normalizedEntity.includes(
      'client',
    )
  ) {
    return 'blue';
  }

  if (
    normalizedEntity.includes(
      'facture',
    )
  ) {
    return 'red';
  }

  if (
    normalizedEntity.includes(
      'chantier',
    )
  ) {
    return 'orange';
  }

  if (
    normalizedEntity.includes(
      'commande',
    )
  ) {
    return 'emerald';
  }

  return 'blue';
}

function getAuditIcon(
  entite: string,
  action: string,
) {
  const normalizedEntity =
    entite.toLowerCase();

  const normalizedAction =
    action.toLowerCase();

  if (
    normalizedAction.includes(
      'delete',
    ) ||
    normalizedAction.includes(
      'suppr',
    )
  ) {
    return (
      <AlertTriangle
        size={18}
      />
    );
  }

  if (
    normalizedEntity.includes(
      'client',
    )
  ) {
    return (
      <Users size={18} />
    );
  }

  if (
    normalizedEntity.includes(
      'chantier',
    )
  ) {
    return (
      <Building2
        size={18}
      />
    );
  }

  if (
    normalizedEntity.includes(
      'facture',
    )
  ) {
    return (
      <Euro size={18} />
    );
  }

  if (
    normalizedEntity.includes(
      'commande',
    )
  ) {
    return (
      <CheckCircle2
        size={18}
      />
    );
  }

  return (
    <FileText size={18} />
  );
}

function formatRelativeTime(
  dateValue: string,
) {
  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Récent';
  }

  const diffMs =
    Date.now() -
    date.getTime();

  const diffMinutes =
    Math.max(
      0,
      Math.floor(
        diffMs / 60_000,
      ),
    );

  if (diffMinutes < 1) {
    return 'À l’instant';
  }

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours =
    Math.floor(
      diffMinutes / 60,
    );

  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  const diffDays =
    Math.floor(
      diffHours / 24,
    );

  return `Il y a ${diffDays} j`;
}

function buildEmptyMonths(): MonthlyTrend[] {
  return [
    'Janv.',
    'Févr.',
    'Mars',
    'Avr.',
    'Mai',
    'Juin',
    'Juil.',
    'Août',
    'Sept.',
    'Oct.',
    'Nov.',
    'Déc.',
  ].map((mois) => ({
    mois,
    ca: 0,
    marge: 0,
    prospects: 0,
    factures: 0,
    chantiers: 0,
    commandes: 0,
  }));
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
) {
  const radians =
    ((angle - 90) *
      Math.PI) /
    180;

  return {
    x:
      cx +
      radius *
        Math.cos(radians),

    y:
      cy +
      radius *
        Math.sin(radians),
  };
}

function createArcPath(
  cx: number,
  cy: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter =
    polarToCartesian(
      cx,
      cy,
      radius,
      endAngle,
    );

  const endOuter =
    polarToCartesian(
      cx,
      cy,
      radius,
      startAngle,
    );

  const startInner =
    polarToCartesian(
      cx,
      cy,
      innerRadius,
      startAngle,
    );

  const endInner =
    polarToCartesian(
      cx,
      cy,
      innerRadius,
      endAngle,
    );

  const largeArcFlag =
    endAngle -
      startAngle <=
    180
      ? 0
      : 1;

  return [
    `M ${startOuter.x} ${startOuter.y}`,

    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,

    `L ${startInner.x} ${startInner.y}`,

    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,

    'Z',
  ].join(' ');
}