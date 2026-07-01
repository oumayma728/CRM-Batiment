// LoginPage.tsx - Version avec bouton retour amélioré
import { useState, useEffect } from 'react';
import { authManager } from '@/lib/auth';
import api from '@/lib/api';
import { 
  Eye, 
  EyeOff, 
  Building2, 
  Mail, 
  Lock, 
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDemoRoleFromCredentials, isDemoEmail } from '@/lib/demoMode';

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const getApiErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' && error !== null
    ? ((error as ApiError).response?.data?.message ?? fallback)
    : fallback;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Charger l'email sauvegardé
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const demoRole = getDemoRoleFromCredentials(normalizedEmail, password);

      if (demoRole) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', normalizedEmail);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        authManager.startDemoSession(demoRole);
        setSuccessMessage('Mode demo active: donnees fictives en lecture seule.');

        setTimeout(() => {
          window.location.href = getRedirectPath(demoRole);
        }, 350);
        return;
      }

      if (isDemoEmail(normalizedEmail)) {
        setError('Mot de passe demo incorrect pour ce compte.');
        setLoading(false);
        return;
      }

      const response = await api.post('/auth/login', {
        email: normalizedEmail,
        password,
      });

      if (response.data?.mustChangePassword && response.data?.tempToken) {
        setMustChangePassword(true);
        setTempToken(response.data.tempToken);
        setPassword('');
        setSuccessMessage(
          response.data.message ||
            'Mot de passe temporaire valide. Choisissez votre nouveau mot de passe.',
        );
        setLoading(false);
        return;
      }

      const { user } = response.data;
      const token = response.data.token ?? response.data.accessToken;

      if (!token || !user) {
        throw new Error('Réponse de connexion invalide');
      }
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', normalizedEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      authManager.setSession(token, user);
      
      setSuccessMessage(`Bienvenue ${user.prenom || ''} ${user.nom || ''} !`);
      
      setTimeout(() => {
        const redirectPath = getRedirectPath(user.role);
        window.location.href = redirectPath;
      }, 800);
      
    } catch (err: unknown) {
      console.error('Erreur de connexion:', err);
      setError(getApiErrorMessage(err, 'Email ou mot de passe incorrect'));
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post(
        '/auth/change-password',
        { newPassword },
        { headers: { Authorization: `Bearer ${tempToken}` } },
      );
      const { user } = response.data;
      const token = response.data.token ?? response.data.accessToken;

      if (!token || !user) {
        throw new Error('Reponse de changement de mot de passe invalide');
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email.trim().toLowerCase());
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      authManager.setSession(token, user);
      setSuccessMessage(`Bienvenue ${user.prenom || ''} ${user.nom || ''} !`);

      setTimeout(() => {
        const redirectPath = getRedirectPath(user.role);
        window.location.href = redirectPath;
      }, 800);
    } catch (err: unknown) {
      console.error('Erreur de changement de mot de passe:', err);
      setError(getApiErrorMessage(err, 'Impossible de changer le mot de passe'));
      setLoading(false);
    }
  };

  const getRedirectPath = (role: string): string => {
    const roleMap: Record<string, string> = {
      'TECHNICO': '/technico',
      'SOUS_TRAITANT': '/fournisseur',
      'CHEF_CHANTIER': '/admin',
      'ASSISTANTE': '/admin',
      'ADMIN': '/admin',
      'CLIENT': '/profile',
    };
    return roleMap[role] || '/admin';
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation retour - Version améliorée */}
      <div className="container mx-auto px-4 py-6">
        <Link 
          to="/"
          className="inline-flex items-center gap-3 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-all duration-300 group shadow-sm hover:shadow-md"
        >
          <div className="relative">
            <ArrowLeft className="w-4 h-4 text-gray-600 group-hover:-translate-x-1 transition-transform duration-300" />
            <div className="absolute inset-0 bg-blue-500/10 rounded-full scale-0 group-hover:scale-150 transition-transform duration-300"></div>
          </div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
            Retour à l'accueil
          </span>
          <div className="w-px h-4 bg-gray-300 group-hover:bg-gray-400 transition-colors"></div>
          <Home className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors duration-300" />
        </Link>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo et marque */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg mb-4 hover:scale-105 transition-transform duration-300">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              Bati<span className="text-blue-600">CRM</span>
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              Plateforme de gestion de chantiers
            </p>
          </div>

          {/* Carte de connexion */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Connexion
            </h2>

            {/* Message de succès */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-3 animate-slideDown">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Message d'erreur */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={mustChangePassword ? handleChangePassword : handleLogin} className="space-y-5">
              {/* Champ Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email professionnel
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={mustChangePassword}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="vous@entreprise.fr"
                    required
                  />
                </div>
              </div>

              {!mustChangePassword ? (
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Client : utilisez votre numero de telephone comme mot de passe.
                </p>
              </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Minimum 8 caracteres"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirmer le nouveau mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Repeter le mot de passe"
                        minLength={8}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Options */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center ${
                      rememberMe 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {rememberMe && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                    Se souvenir de moi
                  </span>
                </label>
                <a 
                  href="#" 
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
                >
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  mustChangePassword ? 'Enregistrer le mot de passe' : 'Se connecter'
                )}
              </button>

            </form>

            {/* Lien d'inscription */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Pas encore de compte ?{' '}
                <Link to="/creer-compte" className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-400">
              © 2026 BatiCRM. Tous droits réservés.
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
