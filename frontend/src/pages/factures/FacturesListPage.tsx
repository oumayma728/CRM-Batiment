import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Loader2, MessageCircle, Receipt, Search } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Facture, FactureSourceDevis, PaginatedResponse } from '@/types';
import PageHero from '@/components/PageHero';

interface FacturesListPageProps {
  scope: 'admin' | 'technico';
}

const factureStatusLabel: Record<Facture['statut'], string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyee',
  PAYEE: 'Payee',
  ANNULEE: 'Annulee',
};

const factureStatusClass: Record<Facture['statut'], string> = {
  BROUILLON: 'bg-slate-100 text-slate-700',
  ENVOYEE: 'bg-blue-100 text-blue-700',
  PAYEE: 'bg-emerald-100 text-emerald-700',
  ANNULEE: 'bg-rose-100 text-rose-700',
};

function getClientLabel(item: FactureSourceDevis) {
  const prenom = item.client?.prenom ?? '';
  const nom = item.client?.nom ?? '';
  return `${prenom} ${nom}`.trim() || 'Client non renseigne';
}

export default function FacturesListPage({ scope }: FacturesListPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [pageDevis, setPageDevis] = useState(1);
  const [pageFactures, setPageFactures] = useState(1);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const basePath = scope === 'admin' ? '/admin/factures' : '/technico/factures';

  const devisSourcesQuery = useQuery({
    queryKey: ['factures-devis-sources', scope, pageDevis, search],
    queryFn: async () => {
      const response = await api.get('/factures/devis-sources', {
        params: {
          page: pageDevis,
          limit: 8,
          search: search || undefined,
        },
      });
      return response.data as PaginatedResponse<FactureSourceDevis>;
    },
  });

  const facturesQuery = useQuery({
    queryKey: ['factures-list', scope, pageFactures, search],
    queryFn: async () => {
      const response = await api.get('/factures', {
        params: {
          page: pageFactures,
          limit: 8,
          search: search || undefined,
        },
      });
      return response.data as PaginatedResponse<Facture>;
    },
  });

  const createFromDevisMutation = useMutation({
    mutationFn: (devisId: number) => api.post(`/factures/from-devis/${devisId}`, {}),
    onMutate: () => {
      setFeedback(null);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['factures-devis-sources'] });
      queryClient.invalidateQueries({ queryKey: ['factures-list'] });
      setFeedback({ type: 'success', text: 'Facture creee avec succes depuis le devis.' });
      navigate(`${basePath}/${response.data.id}`);
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof error.response === 'object' &&
          error.response !== null &&
          'data' in error.response &&
          typeof error.response.data === 'object' &&
          error.response.data !== null &&
          'message' in error.response.data &&
          typeof error.response.data.message === 'string'
          ? error.response.data.message
          : 'Impossible de transformer ce devis en facture.';
      setFeedback({ type: 'error', text: message });
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async ({ factureId, telephone }: { factureId: number; telephone: string }) => {
      return api.post(`/whatsapp/send-facture/${factureId}`, { to: telephone });
    },
    onMutate: ({ factureId }) => {
      setSendingWhatsAppId(factureId);
      setFeedback(null);
    },
    onSuccess: (response) => {
      const data = response.data;
      const text = data?.dev
        ? `✅ Facture enregistrée en messagerie CRM (mode démo — sans clés Meta).`
        : `✅ Facture envoyée via WhatsApp avec succès.`;
      setFeedback({ type: 'success', text });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: () => {
      setFeedback({ type: 'error', text: 'Erreur lors de l envoi WhatsApp. Vérifiez le numéro du client.' });
    },
    onSettled: () => {
      setSendingWhatsAppId(null);
    },
  });

  const devisData = devisSourcesQuery.data?.data ?? [];
  const devisMeta = devisSourcesQuery.data?.meta;

  const facturesData = facturesQuery.data?.data ?? [];
  const facturesMeta = facturesQuery.data?.meta;

  return (
    <div className="space-y-4">
      <PageHero
        icon={<Receipt size={22} />}
        title="Mes factures"
        subtitle="Transformez vos devis en factures, modifiez puis envoyez au client."
        accent="indigo"
      />

      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPageDevis(1);
              setPageFactures(1);
            }}
            placeholder="Rechercher devis, facture ou client..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/20"
          />
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            'rounded-xl border px-6 py-4 text-sm',
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700',
          )}
        >
          {feedback.text}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Devis existants</h2>
          <span className="text-xs font-medium text-slate-400">
            {devisMeta?.total ?? 0} devis
          </span>
        </div>

        {devisSourcesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-teal-600" />
          </div>
        ) : devisData.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Aucun devis trouve.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-[20%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Devis</th>
                  <th className="w-[25%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Client</th>
                  <th className="w-[20%] px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Montant TTC</th>
                  <th className="w-[20%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Facture liée</th>
                  <th className="w-[15%] px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {devisData.map((devis) => (
                  <tr key={devis.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{devis.reference}</p>
                      <p className="text-xs text-slate-400">{formatDate(devis.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{getClientLabel(devis)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800">
                      {formatCurrency(devis.totalTTC ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {devis.existingFacture ? (
                        <button
                          onClick={() => navigate(`${basePath}/${devis.existingFacture?.id}`)}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {devis.existingFacture.reference}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Aucune</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => createFromDevisMutation.mutate(devis.id)}
                        disabled={createFromDevisMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {createFromDevisMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <FileSpreadsheet size={12} />
                        )}
                        Transformer en facture
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {devisMeta && devisMeta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
            <button
              onClick={() => setPageDevis((current) => Math.max(1, current - 1))}
              disabled={pageDevis <= 1}
              className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
            >
              Prec
            </button>
            <span>
              Page {pageDevis} / {devisMeta.totalPages}
            </span>
            <button
              onClick={() => setPageDevis((current) => Math.min(devisMeta.totalPages, current + 1))}
              disabled={pageDevis >= devisMeta.totalPages}
              className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
            >
              Suiv
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Factures creees</h2>
          <span className="text-xs font-medium text-slate-400">
            {facturesMeta?.total ?? 0} factures
          </span>
        </div>

        {facturesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-teal-600" />
          </div>
        ) : facturesData.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Aucune facture creee.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {facturesData.map((facture) => (
              <div
                key={facture.id}
                className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{facture.reference}</p>
                    <p className="text-xs text-slate-500">
                      Devis: {facture.referenceDevis ?? '-'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      factureStatusClass[facture.statut],
                    )}
                  >
                    {factureStatusLabel[facture.statut]}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md bg-slate-50 px-3 py-2 border border-slate-100">
                    <p className="text-slate-500">Date facture</p>
                    <p className="mt-1 font-medium text-slate-800">{formatDate(facture.date)}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 border border-slate-100">
                    <p className="text-slate-500">Échéance</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {facture.dateEcheance ? formatDate(facture.dateEcheance) : '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-base font-bold text-slate-900">
                    {formatCurrency(facture.montantTTC ?? 0)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const phone = (facture as any).telephoneClient || (facture as any).devis?.client?.telephone;
                        if (phone) {
                          sendWhatsAppMutation.mutate({ factureId: facture.id, telephone: phone });
                        } else {
                          setFeedback({ type: 'error', text: 'Aucun numéro WhatsApp trouvé pour ce client.' });
                        }
                      }}
                      disabled={sendingWhatsAppId === facture.id}
                      title="Envoyer par WhatsApp"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60 transition-colors"
                    >
                      {sendingWhatsAppId === facture.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <MessageCircle size={12} />
                      )}
                      WhatsApp
                    </button>
                    <button
                      onClick={() => navigate(`${basePath}/${facture.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Ouvrir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {facturesMeta && facturesMeta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
            <button
              onClick={() => setPageFactures((current) => Math.max(1, current - 1))}
              disabled={pageFactures <= 1}
              className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
            >
              Prec
            </button>
            <span>
              Page {pageFactures} / {facturesMeta.totalPages}
            </span>
            <button
              onClick={() =>
                setPageFactures((current) => Math.min(facturesMeta.totalPages, current + 1))
              }
              disabled={pageFactures >= facturesMeta.totalPages}
              className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
            >
              Suiv
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
