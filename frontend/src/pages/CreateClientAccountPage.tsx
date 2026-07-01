import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import api from '@/lib/api';

type ClientAccountForm = {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresseClient: string;
};

const emptyForm: ClientAccountForm = {
  nom: '',
  prenom: '',
  telephone: '',
  email: '',
  adresseClient: '',
};

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#185FA5] focus:ring-2 focus:ring-[#185FA5]/20';
const phonePattern = String.raw`(?:[0-9]|\+|\(|\)| |\.|-){6,20}`;

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function CreateClientAccountPage() {
  const [form, setForm] = useState<ClientAccountForm>(emptyForm);
  const [successMessage, setSuccessMessage] = useState('');

  const createClientAccount = useMutation({
    mutationFn: async (payload: ClientAccountForm) => {
      const normalized = {
        nom: payload.nom.trim(),
        prenom: payload.prenom.trim(),
        telephone: payload.telephone.trim(),
        email: payload.email.trim().toLowerCase(),
        adresseClient: payload.adresseClient.trim(),
      };

      const response = await api.post('/clients/public-account', normalized);
      return response.data;
    },
    onSuccess: (response) => {
      setForm(emptyForm);
      setSuccessMessage(
        response?.message ||
          'Client cree avec le role CLIENT. Il peut se connecter avec son email et son numero de telephone comme mot de passe.',
      );
    },
  });

  const updateField = (field: keyof ClientAccountForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccessMessage('');
    createClientAccount.reset();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage('');
    createClientAccount.mutate(form);
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="bg-[#0F4780] p-8 text-white lg:p-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white/12 text-white ring-1 ring-white/20">
            <Building2 size={24} />
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
              Espace client
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight">
              Creation d'un compte client
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-50">
              Renseignez les informations du client pour generer sa fiche et son acces personnel en une seule action.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            <div className="flex gap-3 rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
              <ShieldCheck className="mt-0.5 shrink-0 text-blue-100" size={19} />
              <div>
                <p className="text-sm font-semibold">Role CLIENT attribue</p>
                <p className="mt-1 text-xs leading-5 text-blue-100">
                  Le client se connecte avec son email et utilise son numero de telephone comme mot de passe.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
              <Mail className="mt-0.5 shrink-0 text-blue-100" size={19} />
              <div>
                <p className="text-sm font-semibold">Identifiants client</p>
                <p className="mt-1 text-xs leading-5 text-blue-100">
                  L'email saisi devient l'identifiant de connexion du client.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#185FA5]">
                <UserPlus size={22} />
              </div>
              <h2 className="text-2xl font-bold text-slate-950">Coordonnees client</h2>
              <p className="mt-1 text-sm text-slate-500">
                Les champs marques d'un asterisque sont obligatoires.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Home size={16} />
                Accueil
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <LogIn size={16} />
                Connexion
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Nom *</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.nom}
              onChange={(event) => updateField('nom', event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Prenom *</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.prenom}
              onChange={(event) => updateField('prenom', event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Telephone *</span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                required
                type="tel"
                inputMode="tel"
                maxLength={20}
                pattern={phonePattern}
                placeholder="+216 00 000 000"
                value={form.telephone}
                onChange={(event) => updateField('telephone', event.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Email *</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                required
                type="email"
                maxLength={120}
                placeholder="client@email.com"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Adresse client *</span>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                required
                maxLength={180}
                placeholder="Adresse complete du client"
                value={form.adresseClient}
                onChange={(event) => updateField('adresseClient', event.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
          </label>
        </div>

        {createClientAccount.error && (
          <p className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getApiErrorMessage(
              createClientAccount.error,
              'Impossible de creer le client.',
            )}
          </p>
        )}

        {successMessage && (
          <p className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} className="shrink-0" />
            {successMessage}
          </p>
        )}

        <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={createClientAccount.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#185FA5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F4780] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createClientAccount.isPending && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Creer le client
            {!createClientAccount.isPending && <ArrowRight size={16} />}
          </button>
        </div>
          </form>
        </section>
      </div>
    </div>
  );
}
