import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await api.post('/auth/forgot-password', { email: normalizedEmail });
      // If successful, navigate to reset page and pass the email
      navigate("/reset-password", { state: { email: response.data.email } });
    } catch (err: any) {
      setError(err.response?.data?.message || "Email introuvable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-blue-900 mb-2">Mot de passe oublié</h2>
        <p className="text-gray-500 mb-6 text-sm">Entrez votre email pour réinitialiser votre mot de passe.</p>
        
        {error && (
          <div className="mb-4 text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="votre@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Vérification..." : "Vérifier l'email"}
          </button>
        </form>
      </div>
    </div>
  );
}