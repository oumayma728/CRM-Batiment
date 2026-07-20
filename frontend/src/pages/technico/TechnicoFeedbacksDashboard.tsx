import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ThumbsUp, ThumbsDown, MessageSquare, BarChart3 } from 'lucide-react';
import api from '@/lib/api';

interface FeedbackStats {
  total: number;
  positifs: number;
  negatifs: number;
  satisfactionRate: number | null;
  recentNegatives: Array<{
    id: number;
    sessionId: number | null;
    messageExcerpt: string | null;
    createdAt: string;
  }>;
}

export default function TechnicoFeedbacksDashboard() {
  // 'all' = tout l'historique ; '7'/'30'/'90' = periode en jours
  const [days, setDays] = useState<string>('all');
  const [openSessionId, setOpenSessionId] = useState<number | null>(null);

  const sessionQuery = useQuery({
    queryKey: ['technico-feedback-session', openSessionId],
    queryFn: async () => {
      const res = await api.get(`/assistant/admin/sessions/${openSessionId}`);
      return res.data as {
        id: number;
        messages: Array<{ id: number; role: string; contenu: string }>;
      };
    },
    enabled: openSessionId !== null,   // la requete ne part QUE si une session est ouverte !
  });
  const statsQuery = useQuery({
    // days DANS la queryKey : changer le filtre => nouvelle requete automatique !
    queryKey: ['technico-feedback-stats', days],
    queryFn: async () => {
      const params = days === 'all' ? {} : { days };
      const res = await api.get('/assistant/admin/feedbacks/stats', { params });
      return res.data as FeedbackStats;
    },
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* En-tete + filtre de periode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard Feedbacks</h2>
          <p className="text-sm text-gray-500">
            Satisfaction des utilisateurs du chatbot Léa
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
        >
          <option value="all">Tout l'historique</option>
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">90 derniers jours</option>
        </select>
      </div>

      {statsQuery.isLoading && (
        <p className="text-sm text-gray-400">Chargement des statistiques...</p>
      )}
      {statsQuery.error != null && (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Erreur de chargement des statistiques.
        </p>
      )}

      {stats && (
        <>
          {/* Les 3 compteurs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <MessageSquare size={18} />
                <span className="text-xs font-semibold uppercase">Total avis</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600">
                <ThumbsUp size={18} />
                <span className="text-xs font-semibold uppercase">Positifs</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {stats.positifs}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-rose-600">
                <ThumbsDown size={18} />
                <span className="text-xs font-semibold uppercase">Négatifs</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-rose-700">{stats.negatifs}</p>
            </div>
          </div>

          {/* La jauge de satisfaction */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <BarChart3 size={18} />
              <span className="text-sm font-semibold">Taux de satisfaction</span>
            </div>
            {stats.satisfactionRate === null ? (
              <p className="mt-3 text-sm text-gray-400">
                Pas encore de données sur cette période.
              </p>
            ) : (
              <>
                <p className="mt-2 text-4xl font-bold text-gray-900">
                  {stats.satisfactionRate}%
                </p>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${stats.satisfactionRate}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Les reponses mal notees = les prochaines ameliorations RAG ! */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">
              Réponses mal notées ({stats.recentNegatives.length})
            </h3>
            {stats.recentNegatives.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">
                Aucun feedback négatif sur cette période. 🎉
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {stats.recentNegatives.map((fb) => (
                  <div
                    key={fb.id}
                    className="rounded-xl border border-rose-100 bg-rose-50/50 p-3"
                  >
                    <p className="text-sm text-gray-700">
                      {fb.messageExcerpt ?? 'Extrait non disponible'}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                      {new Date(fb.createdAt).toLocaleString('fr-FR')}
                      {fb.sessionId && (
                        <button
                          onClick={() => setOpenSessionId(fb.sessionId)}
                          className="rounded-md border border-gray-200 px-2 py-0.5 font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Voir la conversation (#{fb.sessionId})
                        </button>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal : la conversation complete de la session */}
      {openSessionId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenSessionId(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Conversation — Session #{openSessionId}
              </h3>
              <button
                onClick={() => setOpenSessionId(null)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
              >
                Fermer ✕
              </button>
            </div>
            {sessionQuery.isLoading && (
              <p className="text-sm text-gray-400">Chargement de la conversation...</p>
            )}
            {sessionQuery.data && (
              <div className="space-y-2">
                {sessionQuery.data.messages.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun message dans cette session.</p>
                ) : (
                  sessionQuery.data.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={
                        msg.role === 'USER'
                          ? 'ml-8 rounded-xl bg-blue-50 p-3 text-sm text-gray-800'
                          : 'mr-8 rounded-xl bg-gray-100 p-3 text-sm text-gray-700'
                      }
                    >
                      <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">
                        {msg.role === 'USER' ? 'Client' : 'Léa'}
                      </p>
                      {msg.contenu}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}