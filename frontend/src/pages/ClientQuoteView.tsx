import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Calendar,
  MapPin,
  Loader2,
  X,
  Send
} from 'lucide-react';
import api from '@/lib/api';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

type DevisDetail = {
  id: number;
  reference: string;
  statut: string;
  dateCreation: string;
  dateValidite?: string | null;
  totalHT: number;
  totalTTC: number;
  tauxTVA: number;
  notes?: string | null;
  client: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string | null;
    adresseClient?: string | null;
  };
  chantier?: {
    id: number;
    reference: string;
    adresse: string;
  } | null;
  lignes: Array<{
    id: number;
    description: string;
    quantite: number;
    unite: string;
    prixUnitaireVente: number;
    prixAchat: number;
    mainOeuvre: number;
    totalHT: number;
  }>;
  conditions?: {
    paymentTerms?: string;
    deliveryTerms?: string;
    warranty?: string;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700', icon: FileText },
  ENVOYEE: { label: 'Envoyée', color: 'bg-blue-100 text-blue-700', icon: Send },
  SIGNEE: { label: 'Signée', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  REFUSEE: { label: 'Refusée', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  EXPIREE: { label: 'Expirée', color: 'bg-amber-100 text-amber-700', icon: Clock },
  ACCEPTEE: { label: 'Acceptée', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

export default function ClientQuoteView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState('');

  const { data: devis, isLoading, error } = useQuery({
    queryKey: ['client-devis', id],
    queryFn: async () => {
      const response = await api.get<DevisDetail>(`/clients/me/devis/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const signDevisMutation = useMutation({
    mutationFn: async (signature: string) => {
      const response = await api.post(`/clients/me/devis/${id}/signer`, { signature });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-devis', id] });
      queryClient.invalidateQueries({ queryKey: ['client-portal'] });
      setShowSignatureModal(false);
    },
  });

  const handleSign = () => {
    if (signatureData.trim()) {
      signDevisMutation.mutate(signatureData);
    }
  };

  const handleDownload = () => {
    // Implementation for PDF download
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSkeleton type="card" count={3} />
        </div>
      </div>
    );
  }

  if (error || !devis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="mx-auto max-w-3xl p-6">
          <EmptyState
            icon={AlertCircle}
            title="Erreur de chargement"
            description="Impossible de charger le devis. Veuillez réessayer."
          />
          <button
            onClick={() => navigate('/portal')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Retour au portail
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[devis.statut] || statusConfig.BROUILLON;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/portal')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Download size={16} />
                Télécharger
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                <Printer size={16} />
                Imprimer
              </button>
              {(devis.statut === 'ENVOYEE' || devis.statut === 'BROUILLON') && (
                <button
                  onClick={() => setShowSignatureModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-purple-700 transition"
                >
                  <CheckCircle2 size={16} />
                  Signer le devis
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Document Header */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Status Banner */}
          <div className={`flex items-center justify-between px-6 py-4 ${status.color}`}>
            <div className="flex items-center gap-3">
              <StatusIcon size={24} />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider">Statut</p>
                <p className="text-lg font-bold">{status.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold uppercase tracking-wider">Référence</p>
              <p className="text-lg font-bold">{devis.reference}</p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Client & Company Info */}
            <div className="grid gap-8 sm:grid-cols-2 mb-8">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Client</h3>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">
                    {devis.client.prenom} {devis.client.nom}
                  </p>
                  <p className="text-sm text-slate-600">{devis.client.email}</p>
                  {devis.client.telephone && (
                    <p className="text-sm text-slate-600">{devis.client.telephone}</p>
                  )}
                  {devis.client.adresseClient && (
                    <p className="text-sm text-slate-600">{devis.client.adresseClient}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Informations</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={16} />
                    <span>Créé le {formatDate(devis.dateCreation)}</span>
                  </div>
                  {devis.dateValidite && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={16} />
                      <span>Valide jusqu'au {formatDate(devis.dateValidite)}</span>
                    </div>
                  )}
                  {devis.chantier && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} />
                      <span>{devis.chantier.adresse}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quote Lines */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Détail du devis</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Description</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Quantité</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Unité</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Prix unitaire</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devis.lignes.map((ligne) => (
                      <tr key={ligne.id} className="border-b border-slate-100">
                        <td className="py-4 px-4 text-sm text-slate-900">{ligne.description}</td>
                        <td className="py-4 px-4 text-sm text-slate-600 text-center">{ligne.quantite}</td>
                        <td className="py-4 px-4 text-sm text-slate-600 text-center">{ligne.unite}</td>
                        <td className="py-4 px-4 text-sm text-slate-600 text-right">{formatMoney(ligne.prixUnitaireVente)}</td>
                        <td className="py-4 px-4 text-sm font-semibold text-slate-900 text-right">{formatMoney(ligne.totalHT)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="mb-8 flex justify-end">
              <div className="w-full sm:w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total HT</span>
                  <span className="font-semibold text-slate-900">{formatMoney(devis.totalHT)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">TVA ({devis.tauxTVA}%)</span>
                  <span className="font-semibold text-slate-900">{formatMoney(devis.totalTTC - devis.totalHT)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t-2 border-slate-200 pt-3">
                  <span className="text-slate-900">Total TTC</span>
                  <span className="text-blue-600">{formatMoney(devis.totalTTC)}</span>
                </div>
              </div>
            </div>

            {/* Conditions */}
            {devis.conditions && (
              <div className="mb-8 rounded-xl bg-slate-50 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Conditions</h3>
                <div className="space-y-4 text-sm text-slate-700">
                  {devis.conditions.paymentTerms && (
                    <div>
                      <p className="font-semibold mb-1">Conditions de paiement</p>
                      <p>{devis.conditions.paymentTerms}</p>
                    </div>
                  )}
                  {devis.conditions.deliveryTerms && (
                    <div>
                      <p className="font-semibold mb-1">Conditions de livraison</p>
                      <p>{devis.conditions.deliveryTerms}</p>
                    </div>
                  )}
                  {devis.conditions.warranty && (
                    <div>
                      <p className="font-semibold mb-1">Garantie</p>
                      <p>{devis.conditions.warranty}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {devis.notes && (
              <div className="rounded-xl bg-blue-50 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-700 mb-2">Notes</h3>
                <p className="text-sm text-blue-900">{devis.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => navigate('/portal')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={16} />
            Retour au portail
          </button>
          {(devis.statut === 'ENVOYEE' || devis.statut === 'BROUILLON') && (
            <button
              onClick={() => setShowSignatureModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-purple-700 transition"
            >
              <CheckCircle2 size={16} />
              Signer le devis
            </button>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Signer le devis</h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                En signant ce devis, vous acceptez les conditions et montants indiqués.
              </p>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Votre signature (tapez votre nom complet)
                </label>
                <input
                  type="text"
                  value={signatureData}
                  onChange={(e) => setSignatureData(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSign}
                  disabled={!signatureData.trim() || signDevisMutation.isPending}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {signDevisMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                  ) : (
                    'Confirmer la signature'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
