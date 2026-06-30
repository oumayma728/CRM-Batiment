import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, ArrowRight, HardHat, Eye, EyeOff, Zap, ServerCrash, RefreshCw } from 'lucide-react';

type ErrorKind = 'network' | 'auth' | null;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setErrorKind(null);
    try {
      const data = await login(email, password);
      if (data.user.role === "TECHNICO") {
        navigate("/technico");
      } else if (data.user.role === "SOUS_TRAITANT") {
        navigate("/fournisseur");
      } else {
        navigate("/admin");
      }
    } catch (err: unknown) {
      // Detect network errors (backend not yet ready / ECONNREFUSED)
      const isNetwork =
        err instanceof Error &&
        (err.message === 'Network Error' ||
          err.message.toLowerCase().includes('network') ||
          err.message.toLowerCase().includes('econnrefused') ||
          !('response' in (err as object)));

      // Also check axios-style error with no response
      const axiosNoResponse =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response: unknown }).response === undefined;

      if (isNetwork || axiosNoResponse) {
        setErrorKind('network');
        setErrorMsg(
          "Le serveur backend ne répond pas. Vérifiez qu'il est bien démarré (npm run start:dev) et réessayez.",
        );
      } else {
        setErrorKind('auth');
        const message =
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
            ? (err as { response: { data: { message: string } } }).response.data.message
            : err instanceof Error
            ? err.message
            : "Identifiants incorrects.";
        setErrorMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* LEFT SIDE: Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
          <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-slate-600/20 blur-[100px]"></div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
            <HardHat size={34} className="text-white" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight">BÂTIFLOW</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-extrabold mb-6 leading-tight">
            Système d'Information Global pour la Construction.
          </h1>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            Centralisez vos devis, factures, plannings et l'ensemble de votre relation client sur une seule plateforme intelligente.
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="flex-shrink-0 bg-slate-800 p-2 rounded-md border border-slate-700">
                <ShieldCheck size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Sécurité Maximale</h3>
                <p className="text-sm">Données chiffrées et accès granulaires ERP.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <div className="flex-shrink-0 bg-slate-800 p-2 rounded-md border border-slate-700">
                <RefreshCw size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Temps Réel</h3>
                <p className="text-sm">Synchronisation immédiate des statuts chantiers.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-slate-500 text-sm">
          © {new Date().getFullYear()} BâtiFlow - All rights reserved
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Form */}
      <div className="flex flex-1 flex-col justify-center items-center p-8 sm:p-12 lg:p-20 relative bg-gradient-to-br from-white via-indigo-50/30 to-slate-50 border-l border-slate-200">
        <div className="w-full max-w-md">
          
          {/* Form Top Branding */}
          <div className="flex justify-center mb-10">
            <img src="/batiflow-logo.png" alt="BatiFlow Logo" className="h-32 sm:h-40 w-auto object-contain drop-shadow-md scale-105" />
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Espace Professionnel.</h2>
            <p className="text-slate-500">Veuillez vous authentifier pour accéder à votre espace sécurisé.</p>
          </div>

          {/* Network error — backend not started */}
          {errorKind === 'network' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ServerCrash className="flex-shrink-0 text-amber-500 mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-semibold mb-0.5">Serveur inaccessible</p>
                <p className="text-amber-800">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Auth error — wrong credentials */}
          {errorKind === 'auth' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <ShieldCheck className="flex-shrink-0 text-red-500 mt-0.5" size={16} />
              <p>{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Adresse E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-colors shadow-sm text-sm"
                placeholder="prenom.nom@entreprise.com"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">Mot de passe</label>
                <button type="button" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-colors shadow-sm text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                Se souvenir de moi sur cet appareil
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full group flex items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-[0.98] disabled:opacity-70 transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Zap size={18} className="animate-pulse" />
                  Connexion en cours…
                </span>
              ) : errorKind === 'network' ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={18} /> Réessayer
                </span>
              ) : (
                <>Login <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform opacity-70 group-hover:opacity-100" /></>
              )}
            </button>
          </form>
          
        </div>
      </div>
      
    </div>
  );
}
