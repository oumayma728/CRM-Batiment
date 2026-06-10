import React, { useState } from "react";
import { Eye, EyeOff, Lock, Mail, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const getApiMessage = (err: unknown, fallback: string) => {
    if (typeof err === "object" && err !== null && "response" in err) {
      const response = (err as { response?: { data?: { message?: string | string[] } } }).response;
      const message = response?.data?.message;
      return Array.isArray(message) ? message.join(" ") : message || fallback;
    }

    return err instanceof Error ? err.message : fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetMessage("");

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
      setError(getApiMessage(err, "Erreur de connexion"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError("");
    setResetMessage("");

    try {
      const { data } = await api.post<{ message: string }>("/auth/forgot-password", {
        email: resetEmail,
        newPassword,
      });
      setResetMessage(data.message);
      setEmail(resetEmail);
      setPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      setError(
        getApiMessage(
          err,
          "API backend indisponible. Demarrez ou redemarrez le backend sur http://localhost:3000.",
        ),
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="login-page min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <section className="grid w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl md:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden bg-slate-950 px-10 py-12 text-white md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                CRM Batiment
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-normal">BATIFLOW</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
                Connectez-vous pour piloter les clients, devis, factures et chantiers depuis un seul espace.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Clients", value: "500+" },
                { label: "Devis", value: "1200+" },
                { label: "Satisfaction", value: "98%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-md border border-white/10 bg-white/5 p-3">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="mt-1 text-xs text-slate-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-8 sm:px-8 md:px-12 md:py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-7">
                <p className="text-sm font-medium text-cyan-700 md:hidden">BATIFLOW</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Bienvenue</h2>
                <p className="mt-2 text-sm text-slate-500">Connectez-vous a votre espace.</p>
              </div>

              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {resetMessage && (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                      placeholder="admin@batiment-pro.fr"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Mot de passe</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-11 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                      placeholder="Votre mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <label className="inline-flex items-center gap-2 text-slate-600">
                    <input className="h-4 w-4 rounded border-slate-300 text-cyan-700" type="checkbox" />
                    Se souvenir de moi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword((value) => !value);
                      setResetEmail(email);
                      setError("");
                      setResetMessage("");
                    }}
                    className="font-medium text-cyan-700 hover:text-cyan-900"
                  >
                    Mot de passe oublie ?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </button>
              </form>

              {showForgotPassword && (
                <form
                  onSubmit={handleForgotPassword}
                  className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <RotateCcw className="h-4 w-4 text-cyan-700" />
                    Reinitialisation du mot de passe
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Email du compte</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                        placeholder="admin@batiment-pro.fr"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                        placeholder="8 caracteres minimum"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {resetLoading ? "Reinitialisation..." : "Changer le mot de passe"}
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-7 text-center text-xs text-slate-400">
                BATIFLOW v1.0 - Plateforme securisee
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
