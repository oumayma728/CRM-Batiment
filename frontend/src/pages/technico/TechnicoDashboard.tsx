import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import RevenueChart from '@/components/charts/RevenueChart';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  Percent,
  Phone,
  Plus,
  Receipt,
  Send,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { Client, DemandeDevis, Devis, DevisStatut } from '@/types';

const wonStatuses: DevisStatut[] = ['ACCEPTE', 'SIGNE'];
const activeStatuses: DevisStatut[] = ['BROUILLON', 'ENVOYE', 'REVISE', 'RENVOYE'];

const statusColors: Record<string, string> = {
  BROUILLON: 'bg-gray-100 text-gray-600',
  ENVOYE: 'bg-blue-100 text-blue-700',
  RENVOYE: 'bg-cyan-100 text-cyan-700',
  REVISE: 'bg-indigo-100 text-indigo-700',
  ACCEPTE: 'bg-emerald-100 text-emerald-700',
  SIGNE: 'bg-teal-100 text-teal-700',
  REFUSE: 'bg-red-100 text-red-700',
  ANNULE: 'bg-orange-100 text-orange-700',
  NOUVEAU: 'bg-sky-100 text-sky-700',
  EN_COURS: 'bg-blue-100 text-blue-700',
  CONVERTI: 'bg-emerald-100 text-emerald-700',
  PERDU: 'bg-rose-100 text-rose-700',
};

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoye',
  RENVOYE: 'Renvoye',
  REVISE: 'Revise',
  ACCEPTE: 'Accepte',
  SIGNE: 'Signe',
  REFUSE: 'Refuse',
  ANNULE: 'Annule',
  NOUVEAU: 'Nouveau',
  EN_COURS: 'En cours',
  CONVERTI: 'Converti',
  PERDU: 'Perdu',
};

export default function TechnicoDashboard() {
  const { user } = useAuth();

  const { data: clientsData } = useQuery({
    queryKey: ['technico-clients'],
    queryFn: async () => {
      const res = await api.get('/clients', { params: { page: 1, limit: 8 } });
      return res.data;
    },
  });

  const { data: demandesData } = useQuery({
    queryKey: ['technico-demandes'],
    queryFn: async () => {
      const res = await api.get('/demandes-devis', { params: { page: 1, limit: 8 } });
      return res.data;
    },
  });

  const { data: devisData } = useQuery({
    queryKey: ['technico-devis'],
    queryFn: async () => {
      const res = await api.get('/devis', { params: { page: 1, limit: 100 } });
      return res.data;
    },
  });

  const totalClients = clientsData?.meta?.total ?? 0;
  const totalDemandes = demandesData?.meta?.total ?? 0;
  const allDevis: Devis[] = devisData?.data ?? [];
  const totalDevis = devisData?.meta?.total ?? allDevis.length;
  const recentClients: Client[] = (clientsData?.data ?? []).slice(0, 4);
  const recentDemandes: DemandeDevis[] = (demandesData?.data ?? []).slice(0, 5);
  const recentDevis = [...allDevis]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const metrics = useMemo(() => {
    const devisAcceptes = allDevis.filter((d) => wonStatuses.includes(d.statut)).length;
    const devisActifs = allDevis.filter((d) => activeStatuses.includes(d.statut)).length;
    const devisRefuses = allDevis.filter((d) => d.statut === 'REFUSE').length;
    const chiffreAffaires = allDevis
      .filter((d) => wonStatuses.includes(d.statut))
      .reduce((sum, d) => sum + (d.totalTTC ?? 0), 0);
    const valeurPipeline = allDevis
      .filter((d) => activeStatuses.includes(d.statut))
      .reduce((sum, d) => sum + (d.totalTTC ?? 0), 0);
    const tauxConversion = totalDevis > 0 ? Math.round((devisAcceptes / totalDevis) * 100) : 0;
    const panierMoyen = devisAcceptes > 0 ? chiffreAffaires / devisAcceptes : 0;

    return {
      chiffreAffaires,
      devisAcceptes,
      devisActifs,
      devisRefuses,
      panierMoyen,
      tauxConversion,
      valeurPipeline,
    };
  }, [allDevis, totalDevis]);

  const pipeline = useMemo(() => {
    const steps = [
      { key: 'NOUVEAU', label: 'Prospects', count: totalDemandes, amount: 0, color: 'bg-sky-500', icon: <Users size={18} /> },
      { key: 'BROUILLON', label: 'Preparation', count: 0, amount: 0, color: 'bg-slate-500', icon: <Clock size={18} /> },
      { key: 'ENVOYE', label: 'Envoyes', count: 0, amount: 0, color: 'bg-blue-500', icon: <Send size={18} /> },
      { key: 'ACCEPTE', label: 'Gagnes', count: 0, amount: 0, color: 'bg-emerald-500', icon: <CheckCircle2 size={18} /> },
      { key: 'REFUSE', label: 'Perdus', count: 0, amount: 0, color: 'bg-rose-500', icon: <AlertTriangle size={18} /> },
    ];

    allDevis.forEach((devis) => {
      const targetKey = wonStatuses.includes(devis.statut)
        ? 'ACCEPTE'
        : devis.statut === 'REFUSE'
          ? 'REFUSE'
          : devis.statut === 'BROUILLON' || devis.statut === 'REVISE'
            ? 'BROUILLON'
            : devis.statut === 'ENVOYE' || devis.statut === 'RENVOYE'
              ? 'ENVOYE'
              : null;
      const step = steps.find((item) => item.key === targetKey);
      if (step) {
        step.count += 1;
        step.amount += devis.totalTTC ?? 0;
      }
    });

    const maxCount = Math.max(...steps.map((step) => step.count), 1);
    return steps.map((step) => ({ ...step, percent: Math.max(8, Math.round((step.count / maxCount) * 100)) }));
  }, [allDevis, totalDemandes]);

  const monthlyRevenue = useMemo(() => {
    const labels = getLastSixMonthLabels();
    const values = labels.map((month) => {
      const total = allDevis
        .filter((devis) => wonStatuses.includes(devis.statut))
        .filter((devis) => getMonthKey(devis.dateValidation ?? devis.createdAt) === month.key)
        .reduce((sum, devis) => sum + (devis.totalTTC ?? 0), 0);
      return { ...month, total };
    });
    const max = Math.max(...values.map((item) => item.total), 1);
    return values.map((item) => ({ ...item, percent: Math.max(4, Math.round((item.total / max) * 100)) }));
  }, [allDevis]);

  // Données pour RevenueChart
  const revenueChartData = useMemo(() => {
    return monthlyRevenue.map(item => ({
      month: item.label,
      revenue: item.total
    }));
  }, [monthlyRevenue]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-r from-[#d9eefc] via-[#eee8ff] to-[#d7f8ed] p-6 text-slate-900 shadow-sm sm:p-8">
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-700">Bonjour,</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {user?.prenom} {user?.nom}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Votre activite commerciale en un coup d'oeil: prospects, devis, chiffre
              d'affaires et actions prioritaires.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuickButton to="/technico/clients" icon={<Plus size={16} />} label="Nouveau client" />
            <QuickButton to="/technico/checklist" icon={<ClipboardList size={16} />} label="Checklist devis" primary />
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users size={22} />} label="Clients" value={totalClients} detail={`${totalDemandes} demandes recues`} tone="blue" to="/technico/clients" />
        <StatCard icon={<FileSpreadsheet size={22} />} label="Devis actifs" value={metrics.devisActifs} detail={formatCurrency(metrics.valeurPipeline)} tone="amber" to="/technico/devis" />
        <StatCard icon={<TrendingUp size={22} />} label="CA gagne" value={formatCurrency(metrics.chiffreAffaires)} detail={`${metrics.devisAcceptes} devis acceptes/signes`} tone="emerald" />
        <StatCard icon={<Percent size={22} />} label="Conversion" value={`${metrics.tauxConversion}%`} detail={`Panier moyen ${formatCurrency(metrics.panierMoyen)}`} tone="violet" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pipeline commercial</h2>
              <p className="text-xs text-gray-500">Progression des opportunites jusqu'a la signature</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {formatCurrency(metrics.valeurPipeline)} en cours
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {pipeline.map(({ key, ...step }) => (
              <PipelineStep key={key} {...step} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Performance</h2>
              <p className="text-xs text-gray-500">Lecture rapide du portefeuille</p>
            </div>
          </div>
          <div className="space-y-4">
            <PerformanceRow label="Devis gagnes" value={metrics.devisAcceptes} max={Math.max(totalDevis, 1)} color="bg-emerald-500" />
            <PerformanceRow label="Devis actifs" value={metrics.devisActifs} max={Math.max(totalDevis, 1)} color="bg-blue-500" />
            <PerformanceRow label="Devis refuses" value={metrics.devisRefuses} max={Math.max(totalDevis, 1)} color="bg-rose-500" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Evolution du chiffre d'affaire</h2>
              <p className="text-xs text-gray-500">Montants acceptes ou signes sur les 6 derniers mois</p>
            </div>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <RevenueChart data={revenueChartData} title="" />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Actions rapides</h2>
              <p className="text-xs text-gray-500">Acces directs aux taches commerciales</p>
            </div>
            <Target size={18} className="text-blue-600" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard to="/technico/clients" icon={<Users size={18} />} label="Ajouter un client" detail="Creer une fiche prospect" />
            <ActionCard to="/technico/demandes" icon={<Phone size={18} />} label="Traiter les demandes" detail={`${totalDemandes} demandes au total`} />
            <ActionCard to="/technico/checklist" icon={<ClipboardList size={18} />} label="Generer un devis" detail="Depuis la checklist" />
            <ActionCard to="/technico/factures" icon={<Receipt size={18} />} label="Suivre factures" detail="Verifier les paiements" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <RecentDevis devis={recentDevis} />
        <RecentClients clients={recentClients} />
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">Dernieres demandes de devis</h2>
          <Link to="/technico/demandes" className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700">
            Voir tout <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentDemandes.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune demande</p>
          ) : (
            recentDemandes.map((demande) => (
              <div key={demande.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{demande.description}</p>
                  <p className="text-xs text-gray-400">{demande.client?.nom ?? 'Client'} - {formatDate(demande.createdAt)}</p>
                </div>
                <StatusBadge statut={normalizeDemandeStatut(demande.statut as string)} />
                <Link to="/technico/demandes" className="text-gray-400 transition-colors hover:text-teal-600" aria-label="Voir la demande">
                  <Eye size={16} />
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone: 'blue' | 'amber' | 'emerald' | 'violet';
  to?: string;
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  const content = (
    <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
        {to && <ArrowUpRight size={16} className="text-gray-300 transition-colors group-hover:text-teal-500" />}
      </div>
      <p className="text-2xl font-extrabold tabular-nums text-gray-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-3 text-xs font-semibold text-gray-500">{detail}</p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function PipelineStep({
  icon,
  label,
  count,
  amount,
  color,
  percent,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  amount: number;
  color: string;
  percent: number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600">
          {icon}
          <span className="text-xs font-bold">{label}</span>
        </div>
        <span className="text-lg font-extrabold text-gray-900">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-xs font-semibold text-gray-500">{amount > 0 ? formatCurrency(amount) : 'A qualifier'}</p>
    </div>
  );
}

function PerformanceRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percent = Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function RecentDevis({ devis }: { devis: Devis[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold text-gray-900">Derniers devis</h2>
        <Link to="/technico/devis" className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700">
          Voir tout <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {devis.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun devis</p>
        ) : (
          devis.map((item) => (
            <div key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50/50 sm:grid-cols-[auto_1fr_auto_auto]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 text-xs font-bold text-teal-600">
                {item.reference?.slice(-3) ?? '#'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{item.reference}</p>
                <p className="truncate text-xs text-gray-400">{getClientName(item.client)} - {formatDate(item.createdAt)}</p>
              </div>
              <StatusBadge statut={item.statut} />
              <span className="hidden text-sm font-bold tabular-nums text-gray-900 sm:block">{formatCurrency(item.totalTTC ?? 0)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecentClients({ clients }: { clients: Client[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold text-gray-900">Clients recents</h2>
        <Link to="/technico/clients" className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700">
          Voir tout <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {clients.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun client</p>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-gray-50/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-xs font-bold text-blue-600">
                {(client.prenom?.charAt(0) ?? '') + (client.nom?.charAt(0) ?? '')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{client.prenom} {client.nom}</p>
                <p className="truncate text-xs text-gray-400">{client.email ?? client.telephone ?? 'Contact a completer'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActionCard({ to, icon, label, detail }: { to: string; icon: React.ReactNode; label: string; detail: string }) {
  return (
    <Link to={to} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/70">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">{icon}</div>
      <p className="text-sm font-bold text-gray-900">{label}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </Link>
  );
}

function QuickButton({ to, icon, label, primary = false }: { to: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={
        primary
          ? 'inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition-colors hover:bg-blue-800'
          : 'inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white'
      }
    >
      {icon}
      {label}
    </Link>
  );
}

function StatusBadge({ statut }: { statut: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[statut] ?? 'bg-gray-100 text-gray-600'}`}>
      {statusLabels[statut] ?? statut}
    </span>
  );
}

function normalizeDemandeStatut(statut: string) {
  return statut === 'QUALIFIE' ? 'EN_COURS' : statut;
}

function getClientName(client?: Client) {
  if (!client) return 'Client';
  return [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client';
}

function getMonthKey(date: string) {
  const target = new Date(date);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
}

function getLastSixMonthLabels() {
  const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: getMonthKey(date.toISOString()),
      label: formatter.format(date).replace('.', ''),
    };
  });
}

function formatCompactCurrency(amount: number) {
  if (amount >= 1000) return `${Math.round(amount / 1000)} kEUR`;
  return formatCurrency(amount).replace(',00', '');
}
