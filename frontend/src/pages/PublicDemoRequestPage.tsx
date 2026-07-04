import { useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Loader2, Mail, Phone, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface DemoFormState {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  entreprise: string;
  message: string;
}

const initialForm: DemoFormState = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  entreprise: '',
  message: '',
};

const fieldClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

export default function PublicDemoRequestPage() {
  const [form, setForm] = useState<DemoFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof DemoFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/demo-requests/public', {
        nom: form.nom,
        prenom: form.prenom || undefined,
        email: form.email,
        telephone: form.telephone || undefined,
        entreprise: form.entreprise || undefined,
        message: form.message || undefined,
      });

      setSuccess(true);
      setForm(initialForm);
    } catch {
      setError("Impossible d'envoyer la demande pour le moment. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9ff] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            Retour
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">BÂTIFLOW</p>
              <p className="text-xs text-slate-500">Démo commerciale</p>
            </div>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[32px] border border-blue-100 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-9">
            <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Demande de démonstration
            </span>

            <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Découvrez comment piloter vos devis, chantiers et SAV dans un seul CRM.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Remplissez le formulaire et notre équipe commerciale vous contactera pour planifier une démo adaptée à vos besoins.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                'Suivi commercial centralisé',
                'Devis, factures et chantiers',
                'Notifications internes',
                'Module SAV intégré',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  <CheckCircle2 size={17} className="text-blue-600" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2">
                <Mail size={16} /> Réponse rapide
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2">
                <Phone size={16} /> Démo personnalisée
              </span>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
            {success ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                  <CheckCircle2 size={28} />
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  Demande envoyée
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Votre demande de démo a été envoyée avec succès. Notre équipe vous contactera prochainement.
                </p>

                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="mt-5 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Envoyer une autre demande
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    Planifier une démo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Les champs nom et email sont obligatoires.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className={fieldClass}
                    required
                    placeholder="Nom *"
                    value={form.nom}
                    onChange={(event) => updateField('nom', event.target.value)}
                  />
                  <input
                    className={fieldClass}
                    placeholder="Prénom"
                    value={form.prenom}
                    onChange={(event) => updateField('prenom', event.target.value)}
                  />
                </div>

                <input
                  className={fieldClass}
                  required
                  type="email"
                  placeholder="Email professionnel *"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className={fieldClass}
                    placeholder="Téléphone"
                    value={form.telephone}
                    onChange={(event) => updateField('telephone', event.target.value)}
                  />
                  <input
                    className={fieldClass}
                    placeholder="Entreprise"
                    value={form.entreprise}
                    onChange={(event) => updateField('entreprise', event.target.value)}
                  />
                </div>

                <textarea
                  className={cn(fieldClass, 'min-h-[140px] resize-none')}
                  placeholder="Décrivez votre besoin ou le contexte de la démo"
                  value={form.message}
                  onChange={(event) => updateField('message', event.target.value)}
                />

                {error ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                  Envoyer la demande
                </button>
              </form>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}