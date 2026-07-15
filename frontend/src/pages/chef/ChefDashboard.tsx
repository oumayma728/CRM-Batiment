import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckSquare,
  ClipboardCheck,
  HardHat,
  MapPin,
  PackageSearch,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Chantier, FournisseurCommandeDetail, PaginatedResponse } from '@/types';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

const chantierStatusLabel: Record<Chantier['statut'], string> = {
  VISITE_TECHNIQUE: 'Visite technique',
  DEVIS_EN_PREPARATION: 'Devis en preparation',
  DEVIS_ENVOYE: 'Devis envoye',
  NEGOCIATION_EN_COURS: 'Negociation',
  DEVIS_VALIDE: 'Devis valide',
  COMMANDES_GENEREES: 'Commandes generees',
  MATERIAUX_EN_LIVRAISON: 'Materiaux en livraison',
  MATERIAUX_RECEPTIONNES: 'Materiaux receptionnes',
  PLANIFIE: 'Planifie',
  DEMARRE: 'Demarre',
  EN_COURS: 'En cours',
  TERMINE: 'Termine',
  CLOTURE: 'Cloture',
};

export default function ChefDashboard() {
  const navigate = useNavigate();

  const chantiersQuery = useQuery({
    queryKey: ['chef-dashboard-chantiers'],
    queryFn: async () => {
      try {
        const res = await api.get<PaginatedResponse<Chantier>>('/chantiers', {
          params: { page: 1, limit: 5 },
        });
        return res.data;
      } catch (error) {
        console.error('Erreur chargement chantiers:', error);
        return { data: [], meta: { total: 0 } };
      }
    },
  });

  const chantiersEnCoursQuery = useQuery({
    queryKey: ['chef-dashboard-chantiers-en-cours'],
    queryFn: async () => {
      try {
        const res = await api.get<PaginatedResponse<Chantier>>('/chantiers', {
          params: { page: 1, limit: 10, statut: 'EN_COURS' },
        });
        return res.data;
      } catch (error) {
        console.error('Erreur chargement chantiers en cours:', error);
        return { data: [], meta: { total: 0 } };
      }
    },
  });

  const commandesQuery = useQuery({
    queryKey: ['chef-dashboard-commandes'],
    queryFn: async () => {
      try {
        const res = await api.get<PaginatedResponse<FournisseurCommandeDetail>>(
          '/commandes-fournisseur',
          { params: { page: 1, limit: 5 } }
        );
        return res.data;
      } catch (error) {
        console.error('Erreur chargement commandes:', error);
        return { data: [], meta: { total: 0 } };
      }
    },
  });

  const chantiersEnCours = useMemo(
    () => chantiersEnCoursQuery.data?.data ?? [],
    [chantiersEnCoursQuery.data?.data]
  );
  const commandes = useMemo(() => commandesQuery.data?.data ?? [], [commandesQuery.data?.data]);

  const stats = useMemo(() => {
    return {
      totalChantiers: chantiersQuery.data?.meta?.total ?? 0,
      chantiersEnCours: chantiersEnCoursQuery.data?.meta?.total ?? 0,
      commandesEnAttente: commandes.filter(
        (c) => c.statutLivraison === 'ENVOYEE' || c.statutLivraison === 'CREEE'
      ).length,
      receptionsAujourdhui: commandes.filter((c) => {
        if (!c.dateLivraisonPrevue) return false;
        const today = new Date();
        const deliveryDate = new Date(c.dateLivraisonPrevue);
        return (
          today.toDateString() === deliveryDate.toDateString() &&
          c.statutLivraison === 'RECUE'
        );
      }).length,
    };
  }, [chantiersQuery.data?.meta?.total, chantiersEnCoursQuery.data?.meta?.total, commandes]);

  const isLoading = chantiersQuery.isLoading || chantiersEnCoursQuery.isLoading || commandesQuery.isLoading;

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tableau de bord - Chef de Chantier
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Vue d'ensemble de vos chantiers et opérations
        </p>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-700 dark:to-orange-800 rounded-xl p-4 sm:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-orange-100">Chantiers totaux</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.totalChantiers}</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
                <HardHat size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-xl p-4 sm:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-100">En cours</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.chantiersEnCours}</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-700 dark:to-amber-800 rounded-xl p-4 sm:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-amber-100">Livraisons en attente</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.commandesEnAttente}</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
                <PackageSearch size={24} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-xl p-4 sm:p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-100">Réceptions aujourd'hui</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.receptionsAujourdhui}</p>
              </div>
              <div className="p-2 sm:p-3 bg-white/20 rounded-lg">
                <ClipboardCheck size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/chef/chantiers')}
          className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all border border-gray-200 dark:border-gray-700"
        >
          <div className="p-2 sm:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <HardHat className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-left flex-1">
            <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Voir les chantiers</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Accéder à la liste</span>
          </div>
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 ml-auto" />
        </button>

        <button
          onClick={() => navigate('/chef/taches')}
          className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all border border-gray-200 dark:border-gray-700"
        >
          <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left flex-1">
            <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Gérer les tâches</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Planning équipes</span>
          </div>
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 ml-auto" />
        </button>

        <button
          onClick={() => navigate('/chef/receptions')}
          className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all border border-gray-200 dark:border-gray-700"
        >
          <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-left flex-1">
            <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Réceptions</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Matériaux livraisons</span>
          </div>
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 ml-auto" />
        </button>
      </div>

      {/* Chantiers en cours */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HardHat className="h-5 w-5 text-orange-600" />
            Chantiers en cours
          </h2>
        </div>
        <div className="p-6">
          {chantiersEnCoursQuery.isLoading ? (
            <LoadingSkeleton type="card" count={3} />
          ) : chantiersEnCours.length === 0 ? (
            <EmptyState
              icon={HardHat}
              title="Aucun chantier en cours"
              description="Il n'y a actuellement aucun chantier en cours."
            />
          ) : (
            <div className="space-y-4">
              {chantiersEnCours.map((chantier) => (
                <div
                  key={chantier.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => navigate(`/chef/chantiers`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{chantier.reference}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{chantier.adresse}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      )}
                    >
                      {chantierStatusLabel[chantier.statut]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-700 dark:to-amber-700 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-lg mb-2">Informations importantes</p>
            <p className="text-orange-100 leading-relaxed">
              En tant que chef de chantier, vous avez accès aux chantiers qui vous sont affectés.
              Vous pouvez gérer les tâches, suivre les réceptions de matériaux et contrôler l'avancement
              des travaux. Les données administratives et commerciales restent restreintes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
