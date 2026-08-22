import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  HardHat, CheckSquare, FileText, ClipboardCheck,
  MapPin, Calendar, Clock, Users
} from 'lucide-react';
import api from '@/lib/api';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SousTraitantDemo() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['sous-traitant-demo-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/stats');
        return response.data;
      } catch (error) {
        return {
          activeChantiers: 3,
          pendingTasks: 8,
          pendingInterventions: 2,
          completedRapports: 15
        };
      }
    }
  });

  const demoStats = [
    { label: 'Chantiers actifs', value: stats?.activeChantiers || 3, icon: HardHat, color: 'from-teal-500 to-teal-600' },
    { label: 'Tâches en attente', value: stats?.pendingTasks || 8, icon: CheckSquare, color: 'from-blue-500 to-blue-600' },
    { label: 'Interventions', value: stats?.pendingInterventions || 2, icon: Clock, color: 'from-purple-500 to-purple-600' },
    { label: 'Rapports complétés', value: stats?.completedRapports || 15, icon: ClipboardCheck, color: 'from-green-500 to-green-600' },
  ];

  const demoChantiers = [
    { id: 1, reference: 'CH-2024-001', adresse: '123 Rue de Paris, Paris', statut: 'EN_COURS', debut: '2024-01-15' },
    { id: 2, reference: 'CH-2024-003', adresse: '45 Avenue Lyon, Lyon', statut: 'EN_COURS', debut: '2024-01-20' },
    { id: 3, reference: 'CH-2024-005', adresse: '78 Boulevard Marseille, Marseille', statut: 'PLANIFIE', debut: '2024-02-01' },
  ];

  const demoTasks = [
    { id: 1, title: 'Installation plomberie', chantier: 'CH-2024-001', priority: 'HAUTE', dueDate: "Aujourd'hui" },
    { id: 2, title: 'Électricité salle de bain', chantier: 'CH-2024-003', priority: 'MOYENNE', dueDate: 'Demain' },
    { id: 3, title: 'Finitions peinture', chantier: 'CH-2024-001', priority: 'BASSE', dueDate: 'Cette semaine' },
  ];

  const demoInterventions = [
    { id: 1, titre: 'Réparation fuite', lieu: 'CH-2024-001', statut: 'PLANIFIE', date: '2024-01-25 09:00' },
    { id: 2, titre: 'Contrôle qualité', lieu: 'CH-2024-003', statut: 'EN_COURS', date: '2024-01-25 14:00' },
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
          Espace Sous-traitant
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Page de démonstration - Gestion des interventions et rapports
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un chantier, tâche..."
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

      {/* Assigned Chantiers */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chantiers assignés
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {demoChantiers.map((chantier) => (
              <div
                key={chantier.id}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{chantier.reference}</h3>
                    <StatusBadge status={chantier.statut} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{chantier.adresse}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Début: {new Date(chantier.debut).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks */}
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Chantier: {task.chantier}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{task.dueDate}</span>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                  <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interventions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Interventions planifiées
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {demoInterventions.map((intervention) => (
              <div
                key={intervention.id}
                className="flex items-start gap-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{intervention.titre}</h3>
                    <StatusBadge status={intervention.statut} size="sm" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Lieu: {intervention.lieu}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(intervention.date).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
                <button className="p-2 hover:bg-teal-200 dark:hover:bg-teal-800 rounded-lg transition-colors">
                  <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
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
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <HardHat className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Voir les chantiers</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Liste assignée</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CheckSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Mes tâches</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Planning quotidien</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ClipboardCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Rapports</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Documents</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
