import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  HardHat,
  CheckSquare,
  Calendar,
  FileEdit,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import type { Chantier, PaginatedResponse } from '@/types';

export default function SousTraitantDashboard() {
  const navigate = useNavigate();

  const chantiersQuery = useQuery({
    queryKey: ['sous-traitant-chantiers'],
    queryFn: async () => {
      try {
        const res = await api.get<PaginatedResponse<Chantier>>('/chantiers', {
          params: { page: 1, limit: 10 },
        });
        return res.data;
      } catch (error) {
        // Silently handle 403/404 errors - endpoints not yet implemented
        return { data: [], meta: { total: 0 } };
      }
    },
  });

  const stats = useMemo(() => {
    return {
      totalChantiers: chantiersQuery.data?.meta?.total ?? 0,
      chantiersActifs: chantiersQuery.data?.data?.filter((c: Chantier) => 
        c.statut === 'EN_COURS' || c.statut === 'DEMARRE'
      ).length ?? 0,
      tachesEnAttente: 0, // Would come from tasks API
      interventionsAujourdhui: 0, // Would come from interventions API
    };
  }, [chantiersQuery.data]);

  const isLoading = chantiersQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Tableau de bord - Sous-Traitant
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Vue d'ensemble de vos missions et interventions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-700 dark:to-teal-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-teal-100">Chantiers attribués</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.totalChantiers}</p>
            </div>
            <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <HardHat size={24} className="sm:h-6 sm:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-blue-100">Chantiers actifs</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.chantiersActifs}</p>
            </div>
            <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <CheckSquare size={24} className="sm:h-6 sm:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-700 dark:to-amber-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-amber-100">Tâches en attente</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.tachesEnAttente}</p>
            </div>
            <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <Calendar size={24} className="sm:h-6 sm:w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-green-100">Interventions aujourd'hui</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{stats.interventionsAujourdhui}</p>
            </div>
            <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <FileEdit size={24} className="sm:h-6 sm:w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
        <button
          onClick={() => navigate('/sous-traitant/chantiers')}
          className="flex items-center gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
        >
          <div className="p-3 sm:p-4 bg-teal-100 dark:bg-teal-900/30 rounded-xl group-hover:bg-teal-200 dark:group-hover:bg-teal-900/50 transition-colors">
            <HardHat className="h-6 w-6 sm:h-7 sm:w-7 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-left flex-1">
            <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Voir les chantiers</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Chantiers attribués</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-teal-600 transition-colors" />
        </button>

        <button
          onClick={() => navigate('/sous-traitant/taches')}
          className="flex items-center gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
        >
          <div className="p-3 sm:p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
            <CheckSquare className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left flex-1">
            <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Gérer les tâches</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Tâches affectées</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </button>

        <button
          onClick={() => navigate('/sous-traitant/rapports')}
          className="flex items-center gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
        >
          <div className="p-3 sm:p-4 bg-amber-100 dark:bg-amber-900/30 rounded-xl group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
            <FileEdit className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-left flex-1">
            <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Déposer rapports</span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Comptes rendus</span>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
        </button>
      </div>

      {/* Chantiers assignés */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 mt-6 sm:mt-8 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-gray-700 dark:to-gray-600">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HardHat className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
            Chantiers attribués
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {chantiersQuery.data?.data && chantiersQuery.data.data.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {chantiersQuery.data.data.slice(0, 5).map((chantier: Chantier) => (
                <div
                  key={chantier.id}
                  className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer group hover:shadow-md"
                  onClick={() => navigate('/sous-traitant/chantiers')}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg group-hover:bg-teal-200 dark:group-hover:bg-teal-900/50 transition-colors">
                      <HardHat className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{chantier.reference}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{chantier.adresse}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 rounded-full">
                    {chantier.statut}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Aucun chantier attribué</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-teal-700 dark:to-cyan-700 rounded-2xl p-4 sm:p-6 text-white shadow-xl mt-6 sm:mt-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-base sm:text-lg mb-3">Accès restreint - Sous-traitant</p>
            <div className="space-y-3 text-sm sm:text-base">
              <div>
                <p className="font-semibold text-white mb-1">Responsabilités principales:</p>
                <ul className="text-teal-100 space-y-1 list-disc list-inside">
                  <li>Consultation des chantiers attribués</li>
                  <li>Consultation des tâches affectées</li>
                  <li>Accès aux documents nécessaires à l'intervention</li>
                  <li>Consultation des dates d'intervention</li>
                  <li>Dépôt de comptes rendus, rapports ou photographies</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Restrictions:</p>
                <ul className="text-teal-100 space-y-1 list-disc list-inside">
                  <li>Aucun accès aux marges commerciales</li>
                  <li>Aucun accès aux devis complets</li>
                  <li>Aucun accès aux factures globales</li>
                  <li>Aucun accès aux informations des autres sous-traitants</li>
                  <li>Aucun accès aux données commerciales confidentielles</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
