import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { History, Search } from 'lucide-react';

interface AuditLog {
  id: number;
  action: string;
  entite: string;
  entiteId: number;
  ancienneValeur?: unknown;
  nouvelleValeur?: unknown;
  createdAt: string;
  user?: {
    nom: string;
    prenom: string;
    email: string;
    role: string;
  } | null;
}

interface AuditResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entite, setEntite] = useState('');
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ['audit-logs', page, entite, action],
    queryFn: async () => {
      const res = await api.get('/audit-logs', {
        params: {
          page,
          limit: 20,
          entite: entite || undefined,
          action: action || undefined,
        },
      });
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <History size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Historique des modifications
            </h1>
            <p className="text-sm text-gray-500">
              Suivi des actions sensibles, changements de statut, prix et notifications.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Entité
            </label>
            <input
              value={entite}
              onChange={(e) => {
                setPage(1);
                setEntite(e.target.value);
              }}
              placeholder="Devis, Facture, Commande..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Action
            </label>
            <input
              value={action}
              onChange={(e) => {
                setPage(1);
                setAction(e.target.value);
              }}
              placeholder="UPDATE, SIGNATURE..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <div className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500">
              <Search size={16} />
              {data?.meta.total ?? 0} résultat(s)
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entité</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Détails</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : data && data.data.length > 0 ? (
                data.data.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div>
                          <p className="font-semibold text-gray-900">
                            {log.user.prenom} {log.user.nom}
                          </p>
                          <p className="text-xs text-gray-500">{log.user.role}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Système</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {log.entite}
                    </td>
                    <td className="px-4 py-3 text-gray-500">#{log.entiteId}</td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-blue-600">
                          Voir JSON
                        </summary>
                        <pre className="mt-2 max-h-52 overflow-auto rounded-xl bg-gray-900 p-3 text-xs text-gray-100">
                          {JSON.stringify(
                            {
                              ancienneValeur: log.ancienneValeur,
                              nouvelleValeur: log.nouvelleValeur,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Aucun historique trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:opacity-40"
          >
            Précédent
          </button>

          <span className="text-sm text-gray-500">
            Page {data?.meta.page ?? page} / {data?.meta.totalPages ?? 1}
          </span>

          <button
            disabled={!data || page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}