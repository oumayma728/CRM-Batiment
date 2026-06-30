import fs from 'fs';

const fileContent = `import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, Save, Settings, UploadCloud, Activity, Calculator, User, ListChecks } from 'lucide-react';
import api from '@/lib/api';
import PageHero from '@/components/PageHero';

interface ChiffrageSettingsResponse {
  tvaDefaut: number;
  devise: string;
  margeCiblePourcent: number;
  fraisFixeDeplacement: number;
  pasArrondiPrix: number;
  updatedAt: string | null;
}

interface ValidationIssue {
  type: string;
  message: string;
  prestationId?: number;
  optionId?: number;
}

interface CatalogueValidationResponse {
  isValid: boolean;
  validatedAt: string;
  stats: {
    activeCategories: number;
    activePrestations: number;
    errors: number;
    warnings: number;
  };
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface PublicationStatusResponse {
  lastPublication: {
    publishedAt: string;
    details: unknown;
  } | null;
  chiffrageSettings: ChiffrageSettingsResponse;
}

interface PublicationHistoryItem {
  id: number;
  publishedAt: string;
  publishedBy: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  validationStats: {
    activeCategories: number | null;
    activePrestations: number | null;
    errors: number | null;
    warnings: number | null;
  } | null;
}

interface ChiffrageSettingsForm {
  tvaDefaut: string;
  devise: string;
  margeCiblePourcent: string;
  fraisFixeDeplacement: string;
  pasArrondiPrix: string;
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
    if (typeof apiMessage === 'object' && apiMessage !== null && 'message' in apiMessage) {
      const nested = apiMessage.message;
      if (typeof nested === 'string') return nested;
    }
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Jamais';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function StatCard({ label, value, icon, danger = false }: { label: string, value: number, icon: React.ReactNode, danger?: boolean }) {
  return (
    <div className={"flex items-center gap-4 rounded-xl p-4 border " + (danger && value > 0 ? 'bg-red-50 border-red-100 text-red-800' : 'bg-white border-slate-200 text-slate-800')}>
       <div className={"p-3 rounded-full " + (danger && value > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500')}>
         {icon}
       </div>
       <div>
         <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-0.5">{label}</p>
         <p className="text-2xl font-black">{value}</p>
       </div>
    </div>
  );
}

export default function ParametresChiffragePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ChiffrageSettingsForm>({
    tvaDefaut: '20', devise: 'EUR', margeCiblePourcent: '30',
    fraisFixeDeplacement: '0', pasArrondiPrix: '0.01',
  });
  const [lastValidation, setLastValidation] = useState<CatalogueValidationResponse | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['chiffrage-settings'],
    queryFn: async () => {
      const res = await api.get('/prestations/admin/chiffrage-settings');
      return res.data as ChiffrageSettingsResponse;
    },
  });

  const { data: publicationStatus } = useQuery({
    queryKey: ['catalogue-publication-status'],
    queryFn: async () => {
      const res = await api.get('/prestations/admin/catalogue-publication-status');
      return res.data as PublicationStatusResponse;
    },
  });

  const { data: publicationHistory, isLoading: loadingPublicationHistory } = useQuery({
    queryKey: ['catalogue-publication-history'],
    queryFn: async () => {
      const res = await api.get('/prestations/admin/catalogue-publication-history');
      return res.data as PublicationHistoryItem[];
    },
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      tvaDefaut: String(settings.tvaDefaut ?? 20),
      devise: settings.devise ?? 'EUR',
      margeCiblePourcent: String(settings.margeCiblePourcent ?? 30),
      fraisFixeDeplacement: String(settings.fraisFixeDeplacement ?? 0),
      pasArrondiPrix: String(settings.pasArrondiPrix ?? 0.01),
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return api.patch('/prestations/admin/chiffrage-settings', {
        tvaDefaut: Number(form.tvaDefaut),
        devise: form.devise.trim(),
        margeCiblePourcent: Number(form.margeCiblePourcent),
        fraisFixeDeplacement: Number(form.fraisFixeDeplacement),
        pasArrondiPrix: Number(form.pasArrondiPrix),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chiffrage-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['catalogue-publication-status'] }),
      ]);
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/prestations/admin/catalogue-validation');
      return res.data as CatalogueValidationResponse;
    },
    onSuccess: (data) => {
      setLastValidation(data);
      setPublishError(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/prestations/admin/catalogue-publication');
      return res.data as { publishedAt: string; validation: CatalogueValidationResponse };
    },
    onSuccess: async (data) => {
      setLastValidation(data.validation);
      setPublishError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['catalogue-publication-status'] }),
        queryClient.invalidateQueries({ queryKey: ['catalogue-publication-history'] }),
      ]);
    },
    onError: (error) => {
      setPublishError(
        getApiErrorMessage(error, 'Publication impossible: le catalogue contient des erreurs.'),
      );
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPublishError(null);
    saveMutation.mutate();
  }

  const effectiveValidation = lastValidation ?? null;

  return (
    <div className="space-y-8 pb-12">
      <PageHero
        icon={<Settings size={28} className="text-slate-600" />}
        title="Paramètres de chiffrage"
        subtitle="Configurer les règles globales de calcul et piloter la publication catalogue."
        accent="slate"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <section className="bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 px-8 py-6 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white shadow-sm ring-1 ring-slate-100 rounded-xl text-slate-700">
                  <Calculator size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Règles de calcul globales</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Marge, TVA, devise et règles d&apos;arrondi par défaut</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="p-8">
              {loadingSettings ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 className="animate-spin" size={28} />
                  <span className="font-medium">Chargement des paramètres...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <Field label="TVA par défaut (%)" value={form.tvaDefaut} onChange={(v) => setForm(f => ({ ...f, tvaDefaut: v }))} type="number" step="0.01" />
                    <Field label="Devise" value={form.devise} onChange={(v) => setForm(f => ({ ...f, devise: v }))} />
                    <Field label="Marge cible (%)" value={form.margeCiblePourcent} onChange={(v) => setForm(f => ({ ...f, margeCiblePourcent: v }))} type="number" step="0.01" />
                    <Field label="Frais fixes déplacement" value={form.fraisFixeDeplacement} onChange={(v) => setForm(f => ({ ...f, fraisFixeDeplacement: v }))} type="number" step="0.01" />
                    <div className="md:col-span-2">
                       <Field label="Pas d'arrondi des prix" value={form.pasArrondiPrix} onChange={(v) => setForm(f => ({ ...f, pasArrondiPrix: v }))} type="number" step="0.01" />
                    </div>
                  </div>

                  {saveMutation.error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 ring-1 ring-red-100 rounded-xl text-sm text-red-800 font-medium">
                      <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                      <p>{getApiErrorMessage(saveMutation.error, "Erreur lors de la sauvegarde.")}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-6 border-t border-slate-100">
                    <button type="submit" disabled={saveMutation.isPending} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition-all disabled:opacity-50">
                      {saveMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Enregistrer les modifications
                    </button>
                  </div>
                </div>
              )}
            </form>
          </section>

          <section className="bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="border-b border-slate-100 px-8 py-6 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white shadow-sm ring-1 ring-emerald-100 rounded-xl text-emerald-600">
                  <UploadCloud size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Validation et publication</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">Validez l&apos;intégrité du catalogue avant de le rendre public</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
               <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending} className="flex-1 inline-flex justify-center items-center gap-2 px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50">
                    {validateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
                    Inspecter le catalogue
                  </button>
                  <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="flex-1 inline-flex justify-center items-center gap-2 px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow transition-colors disabled:opacity-50">
                    {publishMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                    Publier la version
                  </button>
               </div>

               {publishError && (
                 <div className="flex items-start gap-3 p-4 bg-red-50 ring-1 ring-red-100 rounded-xl text-sm text-red-800 font-medium">
                   <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                   <p>{publishError}</p>
                 </div>
               )}

               {effectiveValidation && (
                 <div className={"mt-8 rounded-2xl ring-1 p-8 " + (effectiveValidation.isValid ? 'ring-emerald-200 bg-emerald-50/30' : 'ring-amber-200 bg-amber-50/30')}>
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-4">
                        {effectiveValidation.isValid ? (
                          <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 shadow-inner">
                            <CheckCircle2 size={28} />
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-100 rounded-full text-amber-600 shadow-inner">
                            <AlertTriangle size={28} />
                          </div>
                        )}
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                             {effectiveValidation.isValid ? 'Catalogue opérationnel' : 'Validation échouée'}
                           </h3>
                           <p className="text-sm font-medium text-slate-500 mt-1">
                             Rapport généré le {formatDateTime(effectiveValidation.validatedAt)}
                           </p>
                        </div>
                      </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                         <StatCard label="Catégories" value={effectiveValidation.stats.activeCategories} icon={<ListChecks size={20} />} />
                         <StatCard label="Prestations" value={effectiveValidation.stats.activePrestations} icon={<Settings size={20} />} />
                         <StatCard label="Erreurs" value={effectiveValidation.stats.errors} icon={<AlertTriangle size={20} />} danger />
                         <StatCard label="Alertes" value={effectiveValidation.stats.warnings} icon={<Activity size={20} />} />
                       </div>

                       {effectiveValidation.errors.length > 0 && (
                          <div className="mt-4 rounded-xl bg-white shadow-sm ring-1 ring-red-100 p-6">
                             <h4 className="flex items-center gap-2 text-sm font-bold text-red-700 uppercase tracking-wider mb-4"><AlertTriangle size={16}/> Points bloquants</h4>
                             <ul className="space-y-3 text-sm text-red-900 font-medium">
                               {effectiveValidation.errors.slice(0, 8).map((error, idx) => (
                                 <li key={idx} className="flex gap-3 items-start bg-red-50/50 p-3 rounded-lg">
                                   <span className="mt-0.5 text-red-500">•</span>
                                   <span className="leading-relaxed">{error.message}</span>
                                 </li>
                               ))}
                             </ul>
                          </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
           <div className="bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200 p-8">
             <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Activity size={18} className="text-slate-400"/> Monitoring</h3>
             <div className="space-y-6">
               <div className="flex items-start gap-4">
                 <div className="p-3 bg-slate-50 rounded-xl ring-1 ring-slate-100 text-slate-600 shadow-sm">
                   <UploadCloud size={20} />
                 </div>
                 <div>
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Version Publique</p>
                   <p className="text-base font-bold text-slate-900 mt-1">
                     {formatDateTime(publicationStatus?.lastPublication?.publishedAt ?? null)}
                   </p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="p-3 bg-slate-50 rounded-xl ring-1 ring-slate-100 text-slate-600 shadow-sm">
                   <Settings size={20} />
                 </div>
                 <div>
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dernière Modif.</p>
                   <p className="text-base font-bold text-slate-900 mt-1">
                     {formatDateTime(publicationStatus?.chiffrageSettings?.updatedAt ?? settings?.updatedAt ?? null)}
                   </p>
                 </div>
               </div>
             </div>
           </div>

           <div className="bg-white rounded-[24px] shadow-sm ring-1 ring-slate-200 p-8">
             <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2"><UploadCloud size={18} className="text-slate-400"/> Historique</h3>
             {loadingPublicationHistory ? (
               <div className="flex justify-center py-8 text-slate-400">
                 <Loader2 className="animate-spin" size={28} />
               </div>
             ) : publicationHistory && publicationHistory.length > 0 ? (
               <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[17px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:to-transparent">
                 {publicationHistory.slice(0, 6).map((item) => (
                   <div key={item.id} className="relative flex items-start gap-5">
                      <div className="flex items-center justify-center w-[36px] h-[36px] rounded-full ring-4 ring-white bg-slate-100 text-slate-500 shrink-0 z-10">
                         <CheckCircle2 size={16} />
                      </div>
                      
                      <div className="flex-1 pb-2">
                         <p className="text-[13px] font-bold text-slate-900">{formatDateTime(item.publishedAt)}</p>
                         <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                           <User size={12} />
                           <p className="text-[11px] font-semibold truncate">{item.publishedBy?.fullName || "Système"}</p>
                         </div>
                         
                         {item.validationStats && (
                           <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold tracking-wide text-slate-600">
                              <span className="bg-slate-50 ring-1 ring-slate-100 px-2 py-1 rounded w-fit">{item.validationStats.activePrestations ?? 0} PREST.</span>
                              {item.validationStats.errors ? <span className="bg-red-50 text-red-700 ring-1 ring-red-100 px-2 py-1 rounded w-fit">{item.validationStats.errors} ERR.</span> : null}
                           </div>
                         )}
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-sm font-medium text-slate-400 text-center py-8">Aucun historique disponible.</p>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', step }: { label: string; value: string; onChange: (v: string) => void; type?: string; step?: string; }) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide mb-2">{label}</label>
      <input
        type={type} value={value} step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3.5 bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl text-slate-900 font-semibold transition-all focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none shadow-sm hover:ring-slate-300"
      />
    </div>
  );
}
\`;

fs.writeFileSync('frontend/src/pages/ParametresChiffragePage.tsx', fileContent);
console.log('Successfully updated ParametresChiffragePage.tsx');
