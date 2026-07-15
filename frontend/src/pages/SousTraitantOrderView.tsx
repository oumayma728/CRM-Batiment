import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  CheckSquare,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  MapPin,
  Truck,
  Loader2,
  X
} from 'lucide-react';
import api from '@/lib/api';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

type OrderDetail = {
  id: number;
  reference: string;
  statut: string;
  dateCommande: string;
  dateLivraisonPrev?: string | null;
  dateLivraisonReelle?: string | null;
  totalHT: number;
  totalTTC: number;
  tauxTVA: number;
  notes?: string | null;
  sousTraitant: {
    id: number;
    raisonSociale: string;
    nom: string;
    email: string;
    telephone?: string | null;
    adresse?: string | null;
  };
  chantier?: {
    id: number;
    reference: string;
    adresse: string;
    description?: string | null;
  } | null;
  lignes: Array<{
    id: number;
    description: string;
    quantite: number;
    unite: string;
    prixUnitaire: number;
    totalHT: number;
  }>;
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
  EN_ATTENTE: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  ACCEPTEE: { label: 'Acceptée', color: 'bg-blue-100 text-blue-700', icon: CheckSquare },
  EN_COURS: { label: 'En cours', color: 'bg-violet-100 text-violet-700', icon: Truck },
  LIVREE: { label: 'Livrée', color: 'bg-emerald-100 text-emerald-700', icon: CheckSquare },
  ANNULEE: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function SousTraitantOrderView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptNotes, setAcceptNotes] = useState('');

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['sous-traitant-order', id],
    queryFn: async () => {
      const response = await api.get<OrderDetail>(`/sous-traitants/me/commandes/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const response = await api.post(`/sous-traitants/me/commandes/${id}/accepter`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sous-traitant-order', id] });
      queryClient.invalidateQueries({ queryKey: ['sous-traitant-portal'] });
      setShowAcceptModal(false);
      setAcceptNotes('');
    },
  });

  const handleAccept = () => {
    acceptOrderMutation.mutate(acceptNotes.trim() || undefined);
  };

  const handleDownload = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSkeleton type="card" count={3} />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="mx-auto max-w-3xl p-6">
          <EmptyState
            icon={AlertCircle}
            title="Erreur de chargement"
            description="Impossible de charger la commande. Veuillez réessayer."
          />
          <button
            onClick={() => navigate('/sous-traitant/portal')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Retour au portail
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.statut] || statusConfig.EN_ATTENTE;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/sous-traitant/portal')}
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
              {order.statut === 'EN_ATTENTE' && (
                <button
                  onClick={() => setShowAcceptModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-amber-700 hover:to-orange-700 transition"
                >
                  <CheckSquare size={16} />
                  Accepter la commande
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
              <p className="text-lg font-bold">{order.reference}</p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Company & Project Info */}
            <div className="grid gap-8 sm:grid-cols-2 mb-8">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Sous-traitant</h3>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">
                    {order.sousTraitant.raisonSociale || order.sousTraitant.nom}
                  </p>
                  <p className="text-sm text-slate-600">{order.sousTraitant.email}</p>
                  {order.sousTraitant.telephone && (
                    <p className="text-sm text-slate-600">{order.sousTraitant.telephone}</p>
                  )}
                  {order.sousTraitant.adresse && (
                    <p className="text-sm text-slate-600">{order.sousTraitant.adresse}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Informations</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={16} />
                    <span>Commande le {formatDate(order.dateCommande)}</span>
                  </div>
                  {order.dateLivraisonPrev && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={16} />
                      <span>Livraison prévue le {formatDate(order.dateLivraisonPrev)}</span>
                    </div>
                  )}
                  {order.dateLivraisonReelle && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckSquare size={16} />
                      <span>Livraison réelle le {formatDate(order.dateLivraisonReelle)}</span>
                    </div>
                  )}
                  {order.chantier && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} />
                      <span>{order.chantier.adresse}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Lines */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Détail de la commande</h3>
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
                    {order.lignes.map((ligne) => (
                      <tr key={ligne.id} className="border-b border-slate-100">
                        <td className="py-4 px-4 text-sm text-slate-900">{ligne.description}</td>
                        <td className="py-4 px-4 text-sm text-slate-600 text-center">{ligne.quantite}</td>
                        <td className="py-4 px-4 text-sm text-slate-600 text-center">{ligne.unite}</td>
                        <td className="py-4 px-4 text-sm text-slate-600 text-right">{formatMoney(ligne.prixUnitaire)}</td>
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
                  <span className="font-semibold text-slate-900">{formatMoney(order.totalHT)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">TVA ({order.tauxTVA}%)</span>
                  <span className="font-semibold text-slate-900">{formatMoney(order.totalTTC - order.totalHT)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t-2 border-slate-200 pt-3">
                  <span className="text-slate-900">Total TTC</span>
                  <span className="text-amber-600">{formatMoney(order.totalTTC)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="rounded-xl bg-amber-50 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-700 mb-2">Notes</h3>
                <p className="text-sm text-amber-900">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => navigate('/sous-traitant/portal')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={16} />
            Retour au portail
          </button>
          {order.statut === 'EN_ATTENTE' && (
            <button
              onClick={() => setShowAcceptModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:from-amber-700 hover:to-orange-700 transition"
            >
              <CheckSquare size={16} />
              Accepter la commande
            </button>
          )}
        </div>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Accepter la commande</h3>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                En acceptant cette commande, vous vous engagez à livrer les matériaux/services selon les conditions indiquées.
              </p>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notes (optionnel)
                </label>
                <textarea
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  placeholder="Ajoutez des notes ou conditions particulières..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAccept}
                  disabled={acceptOrderMutation.isPending}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-amber-700 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {acceptOrderMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                  ) : (
                    'Confirmer l\'acceptation'
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
