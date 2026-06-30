import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowRight,
  Building2,
  BookOpen,
  Truck,
  HardHat,
  Euro,
  Target,
  Zap,
  BarChart3,
  TrendingUp,
  Activity,
} from 'lucide-react';

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  bgLight: string;
  iconColor: string;
  stats: { label: string; value: number | string }[];
  href: string;
  comingSoon?: boolean;
}

interface DashboardStats {
  totalClients: number;
  totalDemandes: number;
  totalDevis: number;
  devisAcceptes: number;
  chiffreAffaires: number;
  chantiers: { total: number; enCours: number; termines: number };
  recentDevis: Array<{
    id: number;
    reference: string;
    statut: string;
    updatedAt: string;
    client: { nom: string; prenom: string } | null;
  }>;
}

const statutColors: Record<string, string> = {
  BROUILLON: 'text-slate-600 bg-slate-100',
  ENVOYE: 'text-blue-700 bg-blue-50',
  ACCEPTE: 'text-emerald-700 bg-emerald-50',
  SIGNE: 'text-emerald-800 bg-emerald-100',
  REFUSE: 'text-rose-700 bg-rose-50',
  ANNULE: 'text-amber-700 bg-amber-50',
  REVISE: 'text-violet-700 bg-violet-50',
  RENVOYE: 'text-cyan-700 bg-cyan-50',
};

const statutLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyé',
  ACCEPTE: 'Accepté',
  SIGNE: 'Signé',
  REFUSE: 'Refusé',
  ANNULE: 'Annulé',
  REVISE: 'Révisé',
  RENVOYE: 'Renvoyé',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const totalClients = stats?.totalClients ?? 0;
  const totalDemandes = stats?.totalDemandes ?? 0;
  const totalDevis = stats?.totalDevis ?? 0;
  const devisAcceptes = stats?.devisAcceptes ?? 0;
  const chiffreAffaires = stats?.chiffreAffaires ?? 0;
  const totalChantiers = stats?.chantiers?.total ?? 0;
  const chantiersEnCours = stats?.chantiers?.enCours ?? 0;
  const recentDevis = stats?.recentDevis ?? [];

  // Module cards
  const modules: ModuleCard[] = [
    {
      title: 'Clients & Devis',
      description: 'Gérez vos clients, demandes et devis commerciaux',
      icon: <Building2 size={28} />,
      gradient: 'from-blue-500 to-blue-700',
      bgLight: 'bg-blue-50',
      iconColor: 'text-blue-600',
      stats: [
        { label: 'Clients', value: totalClients },
        { label: 'Demandes', value: totalDemandes },
        { label: 'Devis', value: totalDevis },
      ],
      href: '/admin/clients',
    },
    {
      title: 'Bibliothèque Prix',
      description: "Catalogue de prestations, matériaux et main d'œuvre",
      icon: <BookOpen size={28} />,
      gradient: 'from-emerald-500 to-emerald-700',
      bgLight: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      stats: [
        { label: 'Prestations', value: '—' },
        { label: 'Catégories', value: '10+' },
      ],
      href: '/admin/prestations',
    },
    {
      title: 'Fournisseurs',
      description: 'Gestion des fournisseurs et commandes',
      icon: <Truck size={28} />,
      gradient: 'from-violet-500 to-violet-700',
      bgLight: 'bg-violet-50',
      iconColor: 'text-violet-600',
      stats: [
        { label: 'Fournisseurs', value: '—' },
        { label: 'Commandes', value: 0 },
      ],
      href: '/admin/fournisseurs',
    },
    {
      title: 'Chantier & Planning',
      description: 'Suivi des chantiers, tâches et planning',
      icon: <HardHat size={28} />,
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      iconColor: 'text-amber-600',
      stats: [
        { label: 'Chantiers', value: totalChantiers },
        { label: 'En cours', value: chantiersEnCours },
      ],
      href: '/admin/chantiers',
    },
  ];

  const kpiCards = [
    {
      label: 'Total Clients',
      value: totalClients,
      icon: <Users size={20} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: `${totalClients} inscrits`,
      trendColor: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Demandes en cours',
      value: totalDemandes,
      icon: <FileText size={20} />,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      trend: `${totalDemandes} reçues`,
      trendColor: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'Devis acceptés',
      value: devisAcceptes,
      icon: <FileSpreadsheet size={20} />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: devisAcceptes > 0 ? <><TrendingUp size={11} className="inline" /> {devisAcceptes}</> : '0 signé',
      trendColor: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: "Chiffre d'affaires",
      value: formatCurrency(chiffreAffaires),
      icon: <Euro size={20} />,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      trend: chiffreAffaires > 0 ? <><TrendingUp size={11} className="inline" /> CA réel</> : '—',
      trendColor: 'text-violet-600 bg-violet-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="batiflow-gradient rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-32 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-indigo-400" />
            <span className="text-indigo-200 text-sm font-medium">BÂTIFLOW Dashboard</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2 text-white">
            Bonjour, {user?.prenom} 👋
          </h1>
          <p className="text-slate-300 text-sm lg:text-base max-w-lg">
            Voici un aperçu de votre activité. Gérez vos projets de construction efficacement.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-300 p-5 card-hover group shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.bg} ${card.color}`}>
                {card.icon}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-0.5 ${card.trendColor}`}>
                {card.trend}
                {typeof card.trend === 'string' && <ArrowUpRight size={12} />}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-[13px] text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Module Cards */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Modules</h2>
            <p className="text-sm text-gray-500">Accédez rapidement aux différentes sections</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {modules.map((mod) => (
            <button
              key={mod.title}
              onClick={() => !mod.comingSoon && navigate(mod.href)}
              disabled={mod.comingSoon}
              className="module-card bg-white rounded-2xl border border-gray-100 p-6 text-left group relative overflow-hidden disabled:cursor-not-allowed"
            >
              {/* Gradient accent top */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mod.gradient}`} />

              {mod.comingSoon && (
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    Bientôt
                  </span>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 ${mod.bgLight} rounded-2xl flex items-center justify-center ${mod.iconColor} shrink-0`}>
                  {mod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-700 transition-colors flex items-center gap-2">
                    {mod.title}
                    {!mod.comingSoon && (
                      <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    )}
                  </h3>
                  <p className="text-[13px] text-gray-500 mt-0.5">{mod.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    {mod.stats.map((stat) => (
                      <div key={stat.label} className="flex items-center gap-1.5">
                        <span className="text-lg font-bold text-gray-900">{stat.value}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions + Pipeline + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Actions rapides */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={18} className="text-primary-600" />
            Actions rapides
          </h2>
          <div className="space-y-2">
            <ActionButton icon={<Users size={17} />} label="Ajouter un client" onClick={() => navigate('/admin/clients')} color="blue" />
            <ActionButton icon={<FileText size={17} />} label="Nouvelle demande" onClick={() => navigate('/admin/demandes-devis')} color="orange" />
            <ActionButton icon={<FileSpreadsheet size={17} />} label="Créer un devis" onClick={() => navigate('/admin/devis')} color="emerald" />
            <ActionButton icon={<Truck size={17} />} label="Gérer fournisseurs" onClick={() => navigate('/admin/fournisseurs')} color="violet" />
          </div>
        </div>

        {/* Statut pipeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-600" />
            Pipeline
          </h2>
          <div className="space-y-3">
            <PipelineCard icon={<Clock size={18} />} label="En attente" count={totalDemandes} color="amber" description="Demandes à traiter" />
            <PipelineCard icon={<FileSpreadsheet size={18} />} label="Devis en cours" count={Math.max(0, totalDevis - devisAcceptes)} color="blue" description="Devis non validés" />
            <PipelineCard icon={<CheckCircle size={18} />} label="Acceptés" count={devisAcceptes} color="emerald" description="Devis signés/acceptés" />
          </div>
        </div>

        {/* Recent activity feed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-primary-600" />
            Activité récente
          </h2>
          {recentDevis.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune activité récente</p>
          ) : (
            <div className="space-y-2">
              {recentDevis.map((d) => {
                const label = statutLabels[d.statut] ?? d.statut;
                const colorCls = statutColors[d.statut] ?? 'text-gray-600 bg-gray-100';
                const clientName = d.client
                  ? `${d.client.prenom ?? ''} ${d.client.nom}`.trim()
                  : 'Client inconnu';
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate('/admin/devis')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={13} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-900 truncate">{d.reference}</p>
                      <p className="text-[11px] text-gray-400 truncate">{clientName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${colorCls}`}>{label}</span>
                      <span className="text-[9px] text-gray-400">{formatDate(d.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  const colors: Record<string, string> = {
    blue: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700',
    orange: 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700',
    emerald: 'hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700',
    violet: 'hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 text-gray-600 transition-all text-left ${colors[color] ?? colors.blue}`}
    >
      {icon}
      <span className="text-[13px] font-medium">{label}</span>
      <ArrowRight size={14} className="ml-auto opacity-40" />
    </button>
  );
}

function PipelineCard({ icon, label, count, color, description }: { icon: React.ReactNode; label: string; count: number; color: string; description: string }) {
  const colorMap: Record<string, { iconBg: string; text: string }> = {
    amber: { iconBg: 'bg-amber-50 text-amber-600', text: 'text-amber-700' },
    blue: { iconBg: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-700' },
    emerald: { iconBg: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700' },
  };
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className={`w-9 h-9 ${c.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${c.text}`}>{label}</p>
        <p className="text-[11px] text-gray-400">{description}</p>
      </div>
      <span className="text-xl font-bold text-gray-900 tabular-nums">{count}</span>
    </div>
  );
}
