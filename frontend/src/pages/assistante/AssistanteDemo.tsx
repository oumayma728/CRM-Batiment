import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, FileText, Phone, Calendar, 
  CheckCircle, Clock, AlertCircle 
} from 'lucide-react';
import api from '@/lib/api';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AssistanteDemo() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['assistante-demo-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/stats');
        return response.data;
      } catch (error) {
        return {
          totalClients: 45,
          pendingDevis: 12,
          todayCalls: 8,
          urgentTasks: 3
        };
      }
    }
  });

  const demoStats = [
    { label: 'Clients', value: stats?.totalClients || 45, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Devis en attente', value: stats?.pendingDevis || 12, icon: FileText, color: 'from-purple-500 to-purple-600' },
    { label: 'Appels du jour', value: stats?.todayCalls || 8, icon: Phone, color: 'from-green-500 to-green-600' },
    { label: 'Tâches urgentes', value: stats?.urgentTasks || 3, icon: AlertCircle, color: 'from-red-500 to-red-600' },
  ];

  const demoTasks = [
    { id: 1, title: 'Relancer client Martin', description: 'Devis #DEV-2024-001 en attente de réponse', priority: 'HAUTE', dueDate: "Aujourd'hui" },
    { id: 2, title: 'Préparer dossier Dupont', description: 'Documents manquants pour le chantier', priority: 'MOYENNE', dueDate: 'Demain' },
    { id: 3, title: 'Confirmer rendez-vous', description: 'Visite technique prévue', priority: 'HAUTE', dueDate: "Aujourd'hui" },
    { id: 4, title: 'Envoyer facture', description: 'Facture #FAC-2024-089 prête', priority: 'BASSE', dueDate: 'Cette semaine' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HAUTE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'MOYENNE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'BASSE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Espace Assistante
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Page de démonstration - Gestion administrative et commerciale
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un client, devis..."
          onClear={() => setSearchQuery('')}
        />
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {demoStats.map((stat, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${stat.color} rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tâches à effectuer
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {demoTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{task.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{task.dueDate}</span>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Nouveau client</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Créer une fiche client</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Créer un devis</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nouvelle demande</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Suivi administratif</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dossiers en cours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
