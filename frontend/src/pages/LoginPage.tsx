import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const getRedirectPath = (role: string): string => {
    const roleMap: Record<string, string> = {
      ADMIN: '/admin',
      ASSISTANTE: '/assistante',
      TECHNICO: '/technico',
      CHEF_CHANTIER: '/chef-chantier',
      SOUS_TRAITANT: '/sous-traitant',
    };

    return roleMap[role] ?? '/login';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const data = await login(normalizedEmail, password);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', normalizedEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setSuccessMessage(
        `Bienvenue ${data.user.prenom ?? ''} ${data.user.nom ?? ''} !`.trim(),
      );

      const redirectPath = getRedirectPath(data.user.role);

      setTimeout(() => {
        navigate(redirectPath);
      }, 350);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Email ou mot de passe incorrect',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Retour accueil - frontend Yasmine */}
      <div className="container mx-auto px-4 py-6">
        <Link
          to="/"
          className="group inline-flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 shadow-sm transition-all duration-300 hover:bg-gray-100 hover:shadow-md"
        >
          <div className="relative">
            <ArrowLeft className="h-4 w-4 text-gray-600 transition-transform duration-300 group-hover:-translate-x-1" />
            <div className="absolute inset-0 scale-0 rounded-full bg-blue-500/10 transition-transform duration-300 group-hover:scale-150" />
          </div>

          <span className="text-sm font-medium text-gray-700 transition-colors group-hover:text-gray-900">
            Retour à l&apos;accueil
          </span>

          <div className="h-4 w-px bg-gray-300 transition-colors group-hover:bg-gray-400" />

          <Home className="h-4 w-4 text-gray-400 transition-colors duration-300 group-hover:text-blue-600" />
        </Link>
      </div>

      {/* Contenu principal - frontend Yasmine */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo et marque */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-lg transition-transform duration-300 hover:scale-105">
              <Building2 className="h-10 w-10 text-white" />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              BÂTI<span className="text-blue-600">FLOW</span>
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Plateforme de gestion de chantiers
            </p>
          </div>

          {/* Carte connexion */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <h2 className="mb-6 text-xl font-semibold text-gray-800">
              Connexion
            </h2>

            {successMessage && (
              <div className="animate-slideDown mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="animate-shake mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email professionnel
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="vous@entreprise.fr"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-12 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={
                      showPassword
                        ? 'Masquer le mot de passe'
                        : 'Afficher le mot de passe'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="group flex cursor-pointer items-center">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="sr-only"
                    />

                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200 ${
                        rememberMe
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 group-hover:border-blue-400'
                      }`}
                    >
                      {rememberMe && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                  </div>

                  <span className="ml-2 text-sm text-gray-600 transition-colors group-hover:text-gray-800">
                    Se souvenir de moi
                  </span>
                </label>

                <span className="text-sm font-medium text-gray-400">
                  Mot de passe oublié ?
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            {/* Garde l'idée visuelle Yasmine sans réintroduire son ancienne logique Demo */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Besoin de découvrir la plateforme ?{' '}
                <Link
                  to="/demo"
                  className="font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                >
                  Demander une démo
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Yasmine, adapté au projet */}
          <div className="mt-6 text-center">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-200"
            >
              <Sparkles size={16} />
              Découvrir le mode démo
            </Link>

            <p className="mt-3 text-xs text-gray-400">
              © 2026 BÂTIFLOW. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}