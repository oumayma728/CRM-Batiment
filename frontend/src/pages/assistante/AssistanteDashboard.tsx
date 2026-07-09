import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Users, FileText, FileSpreadsheet, BookOpen, Euro,
  ArrowRight, Sparkles, LayoutDashboard, Loader2, AlertCircle
} from 'lucide-react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

export default function AssistanteDashboard() {
  const navigate = useNavigate();

  // Récupération des données pour l'assistante
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['clients-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/clients', { params: { page: 1, limit: 1 } });
        return response.data;
      } catch (error) {
        console.error('Erreur chargement clients:', error);
        return { meta: { total: 0 } };
      }
    },
  });

  const { data: demandes, isLoading: loadingDemandes } = useQuery({
    queryKey: ['demandes-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/demandes-devis', { params: { page: 1, limit: 1 } });
        return response.data;
      } catch (error) {
        console.error('Erreur chargement demandes:', error);
        return { meta: { total: 0 } };
      }
    },
  });

  const { data: devis, isLoading: loadingDevis } = useQuery({
    queryKey: ['devis-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/devis', { params: { page: 1, limit: 1 } });
        return response.data;
      } catch (error) {
        console.error('Erreur chargement devis:', error);
        return { meta: { total: 0 } };
      }
    },
  });

  const { data: factures, isLoading: loadingFactures } = useQuery({
    queryKey: ['factures-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/factures', { params: { page: 1, limit: 1 } });
        return response.data;
      } catch (error) {
        console.error('Erreur chargement factures:', error);
        return { meta: { total: 0 } };
      }
    },
  });

  const clientsCount = clients?.meta?.total || 0;
  const demandesCount = demandes?.meta?.total || 0;
  const devisCount = devis?.meta?.total || 0;
  const facturesCount = factures?.meta?.total || 0;

  // Modules accessibles pour l'assistante
  const modules = [
    {
      id: 'clients',
      title: 'Gestion Clients',
      description: 'Créer et mettre à jour les fiches clients',
      icon: Users,
      color: 'bg-blue-500',
      count: clientsCount,
      route: '/assistante/clients',
      permission: true,
    },
    {
      id: 'demandes',
      title: 'Demandes de Devis',
      description: 'Créer et qualifier les demandes de devis',
      icon: FileText,
      color: 'bg-purple-500',
      count: demandesCount,
      route: '/assistante/demandes-devis',
      permission: true,
    },
    {
      id: 'devis',
      title: 'Suivi Devis',
      description: 'Suivi administratif des devis',
      icon: FileSpreadsheet,
      color: 'bg-green-500',
      count: devisCount,
      route: '/assistante/devis',
      permission: true,
    },
    {
      id: 'factures',
      title: 'Facturation',
      description: 'Consultation et suivi des factures',
      icon: Euro,
      color: 'bg-amber-500',
      count: facturesCount,
      route: '/assistante/factures',
      permission: true,
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Préparation et gestion des documents',
      icon: BookOpen,
      color: 'bg-pink-500',
      count: 0,
      route: '/assistante/documents',
      permission: true,
    },
    {
      id: 'suivi',
      title: 'Suivi Administratif',
      description: 'Suivi global des dossiers clients',
      icon: Sparkles,
      color: 'bg-teal-500',
      count: 0,
      route: '/assistante/suivi',
      permission: true,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-2xl shadow-xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-100">Clients</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">
                  {loadingClients ? <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" /> : clientsCount}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-700 dark:to-purple-800 rounded-2xl shadow-xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-purple-100">Demandes de devis</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">
                  {loadingDemandes ? <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" /> : demandesCount}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-2xl shadow-xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-100">Devis en cours</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">
                  {loadingDevis ? <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" /> : devisCount}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl">
                <FileSpreadsheet className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-700 dark:to-amber-800 rounded-2xl shadow-xl p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-amber-100">Factures</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">
                  {loadingFactures ? <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" /> : facturesCount}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl">
                <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Modules disponibles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => navigate(module.route)}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className={`p-3 sm:p-4 ${module.color} rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      {module.count > 0 && (
                        <span className="px-2 py-1 sm:px-3 sm:py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-md">
                          {module.count}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base sm:text-lg">
                      {module.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                      {module.description}
                    </p>
                    <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-xs sm:text-sm group-hover:gap-3 transition-all">
                      <span>Accéder</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-blue-100 dark:border-gray-600 mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/assistante/creation-client')}
              className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Nouveau client</span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Créer une fiche client</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/assistante/demandes-devis')}
              className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Nouvelle demande</span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Créer une demande de devis</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/assistante/suivi')}
              className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 group"
            >
              <div className="p-2 sm:p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Suivi administratif</span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Voir le suivi des dossiers</span>
              </div>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-700 dark:to-purple-700 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Informations importantes
              </p>
              <p className="text-blue-100 leading-relaxed">
                En tant qu'assistante administrative, vous avez accès aux modules de gestion clients, 
                demandes de devis, suivi des devis et facturation. Les opérations techniques sensibles 
                nécessitent une autorisation préalable de l'administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
