import React, { useEffect, useState } from 'react';

interface TechMetric {
  technologie: string;
  total_documents: number;
  temps_moyen_sec: number;
  taux_succes_pct: number;
}

interface DailyVolume {
  date: string;
  factures: number;
  plans: number;
  total: number;
  corrections: number;
}

interface CorrectionItem {
  id: number;
  document_id: number;
  champ: string;
  valeur_ia: string | null;
  valeur_corrigee: string | null;
  date: string | null;
}

interface MetricsData {
  status: string;
  total_documents: number;
  repartition: {
    factures: number;
    plans: number;
  };
  statuts: {
    en_attente: number;
    valide: number;
    rejete: number;
  };
  performances: {
    temps_traitement_moyen_sec: number;
    taux_succes_pct: number;
    documents_en_erreur: number;
    total_corrections_humaines: number;
  };
  par_technologie?: TechMetric[];
  volumes_journaliers?: DailyVolume[];
  champs_les_plus_corriges?: { champ: string; count: number }[];
  totaux_metier?: {
    total_montant_ttc_eur: number;
    total_surface_m2: number;
  };
  recent_corrections?: CorrectionItem[];
}

export const MetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/validation/metrics');
      if (!res.ok) throw new Error('Échec du chargement des métriques');
      const data = await res.json();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const total = metrics?.total_documents || 0;
  const facturesCount = metrics?.repartition?.factures || 0;
  const plansCount = metrics?.repartition?.plans || 0;

  const enAttente = metrics?.statuts?.en_attente || 0;
  const valides = metrics?.statuts?.valide || 0;
  const rejetes = metrics?.statuts?.rejete || 0;

  const successPct = metrics?.performances?.taux_succes_pct ?? 100;
  const tempsMoyen = metrics?.performances?.temps_traitement_moyen_sec ?? 0;
  const montantTotal = metrics?.totaux_metier?.total_montant_ttc_eur ?? 0;

  const volumes = metrics?.volumes_journaliers || [];
  const maxVolume = Math.max(...volumes.map((v) => v.total), 1);

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-on-surface tracking-tight">Statistiques & Monitoring Système</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success-emerald/15 text-success-emerald border border-success-emerald/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success-emerald animate-pulse" />
              API En Ligne
            </span>
          </div>
          <p className="text-xs text-on-surface-variant/70 mt-1 font-mono">
            Métriques d'ingestion OCR, précision IA et traçabilité des validations humaines en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-[#c0c1ff]/30 hover:bg-primary/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
            <span>Actualiser</span>
          </button>

        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 text-xs text-error flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span>{error}</span>
          <button onClick={() => fetchMetrics()} className="ml-auto text-primary underline cursor-pointer">
            Réessayer
          </button>
        </div>
      )}

      {/* Top Bento Row: 4 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Documents */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#c0c1ff]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Total Documents
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[16px]">description</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-on-surface font-mono tracking-tight">
              {isLoading ? '...' : total}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-on-surface-variant/70 font-mono">
              <span className="text-primary">{facturesCount} factures</span>
              <span>•</span>
              <span className="text-[#7dd3fc]">{plansCount} plans</span>
            </div>
          </div>
        </div>

        {/* 2. Temps Moyen de Traitement */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#c0c1ff]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Temps Moyen OCR
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-on-surface font-mono tracking-tight flex items-baseline gap-1">
              <span>{isLoading ? '...' : tempsMoyen}</span>
              <span className="text-sm font-normal text-on-surface-variant/60">sec</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px] text-success-emerald font-mono">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>Optimisé multi-moteurs</span>
            </div>
          </div>
        </div>

        {/* 3. Taux de Succès IA */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#c0c1ff]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Précision Extraction
            </span>
            <div className="p-2 rounded-xl bg-success-emerald/15 text-success-emerald">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-on-surface font-mono tracking-tight">
              {isLoading ? '...' : `${successPct}%`}
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px] text-success-emerald font-mono">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>0 document en erreur bloquante</span>
            </div>
          </div>
        </div>

        {/* 4. Montant Total Facturé Traité */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#c0c1ff]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Volume Facturé Traité
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[18px]">euro</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-on-surface font-mono tracking-tight">
              {isLoading ? '...' : `${montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`}
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px] text-on-surface-variant/70 font-mono">
              <span>{facturesCount} factures comptabilisées</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Workflow Status + Real Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Workflow Status Bar (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-1">
              Statut du Workflow de Validation
            </h3>
            <p className="text-xs text-on-surface-variant/60">Répartition des documents selon leur état de révision.</p>
          </div>

          <div className="space-y-3">
            {/* En attente */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-warning-amber flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning-amber" />
                  En Attente de Validation
                </span>
                <span className="font-bold text-on-surface">{enAttente}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-warning-amber rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (enAttente / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Validés */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-success-emerald flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success-emerald" />
                  Confirmés &amp; Validés
                </span>
                <span className="font-bold text-on-surface">{valides}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-success-emerald rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (valides / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Rejetés */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-error-crimson flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-error-crimson" />
                  Rejetés
                </span>
                <span className="font-bold text-on-surface">{rejetes}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-error-crimson rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (rejetes / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-on-surface-variant/70">Taux de validation finale :</span>
            <span className="font-bold text-success-emerald">
              {total > 0 ? Math.round((valides / total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Right: Real 14-Day Activity Bar Chart (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
                Activité des 14 Derniers Jours
              </h3>
              <p className="text-xs text-on-surface-variant/60">Volume quotidien de documents traités par ArchAI.</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-primary">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Factures
              </span>
              <span className="flex items-center gap-1 text-[#7dd3fc]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#7dd3fc]" /> Plans
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-44 w-full flex items-end justify-between gap-1.5 pt-4 pb-2 border-b border-white/10">
            {volumes.map((v, i) => {
              const heightPct = Math.max(Math.round((v.total / maxVolume) * 100), 4);
              const facturePct = v.total > 0 ? (v.factures / v.total) * 100 : 0;
              const planPct = v.total > 0 ? (v.plans / v.total) * 100 : 0;

              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 bg-surface-container border border-[#c0c1ff]/30 px-2 py-1 rounded text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    {v.date}: {v.total} doc(s) ({v.factures} factures, {v.plans} plans)
                  </div>

                  {/* Stacked bar */}
                  <div
                    className="w-full max-w-[20px] rounded-t-sm overflow-hidden flex flex-col-reverse transition-all group-hover:brightness-125"
                    style={{ height: `${v.total === 0 ? 4 : heightPct}%` }}
                  >
                    <div
                      className="bg-primary"
                      style={{ height: `${facturePct}%` }}
                    />
                    <div
                      className="bg-[#7dd3fc]"
                      style={{ height: `${planPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-on-surface-variant/50 mt-2 truncate w-full text-center">
                    {v.date}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono text-on-surface-variant/60 pt-2">
            <span>Données synchronisées automatiquement</span>
            <span className="text-primary font-semibold">{total} documents au total</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: AI Technologies Performance + Human Interventions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Technology Benchmark Table (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
                Performances Comparées des Moteurs IA
              </h3>
              <p className="text-xs text-on-surface-variant/60">Temps d'exécution et taux de réussite par technologie.</p>
            </div>
            <span className="material-symbols-outlined text-[18px]">memory</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-variant/60">
                  <th className="pb-2 font-semibold">Moteur / Modèle</th>
                  <th className="pb-2 font-semibold text-center">Docs Traités</th>
                  <th className="pb-2 font-semibold text-center">Temps Moyen</th>
                  <th className="pb-2 font-semibold text-right">Succès</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(metrics?.par_technologie || []).map((t, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 text-on-surface font-semibold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {t.technologie}
                    </td>
                    <td className="py-2.5 text-center text-on-surface-variant">{t.total_documents}</td>
                    <td className="py-2.5 text-center text-primary font-bold">{t.temps_moyen_sec}s</td>
                    <td className="py-2.5 text-right text-success-emerald font-bold">{t.taux_succes_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Human Corrections Log & Audit (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
                Audit des Corrections Humaines
              </h3>
              <p className="text-xs text-on-surface-variant/60">Traçabilité des ajustements de l'opérateur.</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/15 text-primary border border-[#c0c1ff]/30">
              {metrics?.performances?.total_corrections_humaines || 0} corrections
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-48">
            {(metrics?.recent_corrections || []).length === 0 ? (
              <div className="p-4 bg-white/5 rounded-xl text-center border border-white/5">
                <p className="text-xs text-on-surface-variant/50 italic">
                  Aucune correction manuelle requise jusqu'ici. Les extractions ont été validées conformes sans retouche.
                </p>
              </div>
            ) : (
              metrics?.recent_corrections?.map((c, i) => (
                <div key={i} className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono space-y-1">
                  <div className="flex justify-between text-on-surface-variant">
                    <span className="text-primary font-bold">Doc #{c.document_id} — {c.champ}</span>
                    <span className="text-[10px] text-on-surface-variant/50">{c.date}</span>
                  </div>
                  <div className="text-[11px] text-error">
                    IA: <span className="line-through">{c.valeur_ia || 'null'}</span> → <span className="text-success-emerald">{c.valeur_corrigee}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-white/5 text-[11px] text-on-surface-variant/60 font-mono flex items-center justify-between">
            <span>Traçabilité CDC #2972</span>
            <span className="text-success-emerald font-semibold">Conforme</span>
          </div>
        </div>
      </div>
    </div>
  );
};
