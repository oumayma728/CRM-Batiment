import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  HardHat,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Chantier, PaginatedResponse } from '@/types';
import SearchBar from '@/components/ui/SearchBar';
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

const statutColors: Record<Chantier['statut'], string> = {
  VISITE_TECHNIQUE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  DEVIS_EN_PREPARATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DEVIS_ENVOYE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  NEGOCIATION_EN_COURS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DEVIS_VALIDE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  COMMANDES_GENEREES: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  MATERIAUX_EN_LIVRAISON: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  MATERIAUX_RECEPTIONNES: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  PLANIFIE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  DEMARRE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  EN_COURS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  TERMINE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CLOTURE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function ChefAvancement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: chantiers, isLoading } = useQuery({
    queryKey: ['chef-avancement-chantiers'],
    queryFn: async () => {
      try {
        const response = await api.get<PaginatedResponse<Chantier>>('/chantiers', {
          params: { page: 1, limit: 50 },
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Erreur chargement chantiers:', error);
        return [];
      }
    },
  });

  const filteredChantiers = chantiers?.filter((chantier: Chantier) => {
    const matchesSearch = 
      chantier.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chantier.adresse.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || chantier.statut === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const stats = {
    total: chantiers?.length || 0,
    enCours: chantiers?.filter((c: Chantier) => c.statut === 'EN_COURS').length || 0,
    planifies: chantiers?.filter((c: Chantier) => c.statut === 'PLANIFIE' || c.statut === 'DEMARRE').length || 0,
    termines: chantiers?.filter((c: Chantier) => c.statut === 'TERMINE' || c.statut === 'CLOTURE').length || 0,
  };

  const statusOptions = ['ALL', 'PLANIFIE', 'DEMARRE', 'EN_COURS', 'TERMINE', 'CLOTURE'];

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Avancement des Travaux
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Contrôle et suivi de l'avancement de vos chantiers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Total chantiers</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <HardHat className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100">En cours</p>
              <p className="text-3xl font-bold mt-1">{stats.enCours}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-700 dark:to-amber-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-100">Planifiés/Démarrés</p>
              <p className="text-3xl font-bold mt-1">{stats.planifies}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-700 dark:to-emerald-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-100">Terminés</p>
              <p className="text-3xl font-bold mt-1">{stats.termines}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un chantier..."
            onClear={() => setSearchQuery('')}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'Tous les statuts' : chantierStatusLabel[status as Chantier['statut']]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chantiers List */}
      {isLoading ? (
        <LoadingSkeleton type="list" count={5} />
      ) : filteredChantiers.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title={searchQuery || statusFilter !== 'ALL' ? 'Aucun chantier trouvé' : 'Aucun chantier disponible'}
          description="Il n'y a aucun chantier à afficher."
        />
      ) : (
        <div className="space-y-4">
          {filteredChantiers.map((chantier: Chantier) => (
            <div
              key={chantier.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <HardHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {chantier.reference}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{chantier.adresse}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    statutColors[chantier.statut]
                  )}
                >
                  {chantierStatusLabel[chantier.statut]}
                </span>
              </div>

              {chantier.dateDebut && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Début prévu: {new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}</span>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Progression</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {chantier.statut === 'TERMINE' || chantier.statut === 'CLOTURE' ? '100%' : 
                     chantier.statut === 'EN_COURS' ? '50%' :
                     chantier.statut === 'DEMARRE' ? '25%' :
                     chantier.statut === 'PLANIFIE' ? '10%' : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: chantier.statut === 'TERMINE' || chantier.statut === 'CLOTURE' ? '100%' : 
                             chantier.statut === 'EN_COURS' ? '50%' :
                             chantier.statut === 'DEMARRE' ? '25%' :
                             chantier.statut === 'PLANIFIE' ? '10%' : '0%'
                    }}
                  />
                </div>
              </div>

              {/* Alerts */}
              {(chantier.statut === 'EN_COURS' || chantier.statut === 'DEMARRE') && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Surveillance active requise</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-2">
              Suivi de l'avancement
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              En tant que chef de chantier, vous pouvez suivre l'avancement des travaux pour les
              chantiers qui vous sont affectés. Mettez à jour régulièrement le statut pour assurer
              un suivi optimal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
