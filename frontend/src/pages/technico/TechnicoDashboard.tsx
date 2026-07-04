import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Client, DemandeDevis, Devis } from '@/types';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  LifeBuoy,
  Plus,
  Send,
  TrendingUp,
  Users,
} from 'lucide-react';

const statusClasses: Record<string, string> = {
  BROUILLON: 'bg-slate-100 text-slate-600',
  ENVOYE: 'bg-blue-50 text-blue-700',
  ACCEPTE: 'bg-emerald-50 text-emerald-700',
  SIGNE: 'bg-emerald-50 text-emerald-700',
  REFUSE: 'bg-rose-50 text-rose-700',
  ANNULE: 'bg-orange-50 text-orange-700',
  NOUVEAU: 'bg-sky-50 text-sky-700',
  EN_COURS: 'bg-blue-50 text-blue-700',
  QUALIFIE: 'bg-blue-50 text-blue-700',
  CONVERTI: 'bg-emerald-50 text-emerald-700',
  PERDU: 'bg-rose-50 text-rose-700',
};

export default function TechnicoDashboard() {
  const { user } = useAuth();

  const { data: clientsData } = useQuery({
    queryKey: ['technico-clients-dashboard'],
    queryFn: async () => {
      const res = await api.get('/clients', { params: { page: 1, limit: 5 } });
      return res.data;
    },
  });

  const { data: demandesData } = useQuery({
    queryKey: ['technico-demandes-dashboard'],
    queryFn: async () => {
      const res = await api.get('/demandes-devis', { params: { page: 1, limit: 5 } });
      return res.data;
    },
  });

  const { data: devisData } = useQuery({
    queryKey: ['technico-devis-dashboard'],
    queryFn: async () => {
      const res = await api.get('/devis', { params: { page: 1, limit: 100 } });
      return res.data;
    },
  });

  const { data: savData } = useQuery({
    queryKey: ['technico-sav-dashboard'],
    queryFn: async () => {
      const res = await api.get('/sav/tickets', { params: { page: 1, limit: 5 } });
      return res.data;
    },
  });

  const allDevis: Devis[] = devisData?.data ?? [];
  const recentClients: Client[] = (clientsData?.data ?? []).slice(0, 4);
  const recentDemandes: DemandeDevis[] = (demandesData?.data ?? []).slice(0, 4);
  const recentDevis: Devis[] = allDevis.slice(0, 5);

  const totalClients = clientsData?.meta?.total ?? 0;
  const totalDemandes = demandesData?.meta?.total ?? 0;
  const totalDevis = devisData?.meta?.total ?? allDevis.length;
  const totalSav = savData?.meta?.total ?? savData?.data?.length ?? 0;

  const devisBrouillons = allDevis.filter((devis) => devis.statut === 'BROUILLON').length;
  const devisEnvoyes = allDevis.filter((devis) => devis.statut === 'ENVOYE').length;
  const devisAcceptes = allDevis.filter((devis) => ['ACCEPTE', 'SIGNE'].includes(devis.statut)).length;
  const devisRefuses = allDevis.filter((devis) => devis.statut === 'REFUSE').length;
  const chiffreAffaires = allDevis
    .filter((devis) => ['ACCEPTE', 'SIGNE'].includes(devis.statut))
    .reduce((sum, devis) => sum + (devis.totalTTC ?? 0), 0);

  const conversion = totalDevis > 0 ? Math.round((devisAcceptes / totalDevis) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="px-6 py-7 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
              <BarChart3 size={14} />
              Espace technico-commercial
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Bonjour {user?.prenom ?? 'Technico'}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Retrouvez vos clients, vos demandes, vos devis, les tickets SAV et les actions à suivre
              dans une interface alignée avec le tableau de bord administrateur.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/technico/clients"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Nouveau client
              </Link>

              <Link
                to="/technico/devis"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <FileSpreadsheet size={16} />
                Créer un devis
              </Link>

              <Link
                to="/technico/sav"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <LifeBuoy size={16} />
                Suivre SAV
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-6 lg:border-l lg:border-t-0">
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="Conversion" value={`${conversion}%`} />
              <MiniMetric label="CA accepté" value={formatCurrency(chiffreAffaires)} />
              <MiniMetric label="Devis envoyés" value={devisEnvoyes} />
              <MiniMetric label="Tickets SAV" value={totalSav} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Users size={18} />}
          label="Clients"
          value={totalClients}
          helper="Portefeuille commercial"
          to="/technico/clients"
        />
        <SummaryCard
          icon={<FileText size={18} />}
          label="Demandes"
          value={totalDemandes}
          helper="À qualifier"
          to="/technico/demandes"
        />
        <SummaryCard
          icon={<FileSpreadsheet size={18} />}
          label="Devis"
          value={totalDevis}
          helper="Créés et suivis"
          to="/technico/devis"
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          label="CA signé / accepté"
          value={formatCurrency(chiffreAffaires)}
          helper="Devis acceptés et signés"
        />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Pipeline devis</h3>
            <p className="mt-1 text-xs text-slate-500">Suivi rapide de votre activité commerciale.</p>
          </div>
          <Link to="/technico/devis" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            Voir les devis
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PipelineStep icon={<Clock size={16} />} label="Brouillons" count={devisBrouillons} />
          <PipelineStep icon={<Send size={16} />} label="Envoyés" count={devisEnvoyes} />
          <PipelineStep icon={<CheckCircle2 size={16} />} label="Acceptés / signés" count={devisAcceptes} />
          <PipelineStep icon={<AlertTriangle size={16} />} label="Refusés" count={devisRefuses} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <DashboardCard
          title="Derniers devis"
          action={<Link to="/technico/devis" className="text-xs font-semibold text-blue-600">Voir tout</Link>}
        >
          {recentDevis.length === 0 ? (
            <EmptyState text="Aucun devis pour le moment." />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentDevis.map((devis) => (
                <div key={devis.id} className="flex items-center gap-4 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xs font-semibold text-blue-700">
                    {devis.reference?.slice(-3) ?? '#'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{devis.reference}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {devis.client?.nom ?? 'Client'} • {formatDate(devis.createdAt)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses[devis.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                    {devis.statut}
                  </span>
                  <p className="hidden text-sm font-semibold text-slate-900 sm:block">
                    {formatCurrency(devis.totalTTC ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="Clients récents"
          action={<Link to="/technico/clients" className="text-xs font-semibold text-blue-600">Voir tout</Link>}
        >
          {recentClients.length === 0 ? (
            <EmptyState text="Aucun client récent." />
          ) : (
            <div className="space-y-3">
              {recentClients.map((client) => (
                <div key={client.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-blue-700 shadow-sm">
                    {`${client.prenom?.charAt(0) ?? ''}${client.nom?.charAt(0) ?? ''}`.toUpperCase() || 'CL'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {client.prenom} {client.nom}
                    </p>
                    <p className="truncate text-xs text-slate-500">{client.email ?? client.telephone ?? 'Contact non renseigné'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </section>

      <DashboardCard
        title="Dernières demandes"
        action={<Link to="/technico/demandes" className="text-xs font-semibold text-blue-600">Voir tout</Link>}
      >
        {recentDemandes.length === 0 ? (
          <EmptyState text="Aucune demande récente." />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentDemandes.map((demande) => (
              <div key={demande.id} className="flex items-center gap-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <FileText size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{demande.description}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {demande.client?.nom ?? 'Client'} • {formatDate(demande.createdAt)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses[demande.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                  {demande.statut}
                </span>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
  to?: string;
}) {
  const content = (
    <div className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
        {to && <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-blue-600" />}
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function PipelineStep({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-blue-700">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{count}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-blue-600" style={{ width: count > 0 ? '100%' : '0%' }} />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
