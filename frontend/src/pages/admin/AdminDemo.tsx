import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, Users, HardHat, FileText, 
  Settings, TrendingUp, Building2, Package 
} from 'lucide-react';
import api from '@/lib/api';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AdminDemo() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-demo-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/stats');
        return response.data;
      } catch (error) {
        return {
          totalChantiers: 12,
          totalClients: 45,
          totalDevis: 89,
          totalFactures: 67
        };
      }
    }
  });

  const demoStats = [
    { label: 'Chantiers', value: stats?.totalChantiers || 12, icon: HardHat, color: 'from-blue-500 to-blue-600' },
    { label: 'Clients', value: stats?.totalClients || 45, icon: Users, color: 'from-green-500 to-green-600' },
    { label: 'Devis', value: stats?.totalDevis || 89, icon: FileText, color: 'from-purple-500 to-purple-600' },
    { label: 'Factures', value: stats?.totalFactures || 67, icon: TrendingUp, color: 'from-orange-500 to-orange-600' },
  ];

  const demoActivities = [
    { id: 1, title: 'Nouveau client créé', description: 'Client Martin Dupont ajouté', time: 'Il y a 5 min', status: 'completed' },
    { id: 2, title: 'Devis envoyé', description: 'Devis #DEV-2024-001 envoyé au client', time: 'Il y a 15 min', status: 'pending' },
    { id: 3, title: 'Chantier démarré', description: 'Chantier #CH-2024-005 démarré', time: 'Il y a 1 heure', status: 'in_progress' },
    { id: 4, title: 'Facture générée', description: 'Facture #FAC-2024-089 générée', time: 'Il y a 2 heures', status: 'completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Espace Administrateur
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Page de démonstration - Vue d'ensemble du système
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher..."
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

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activité récente
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {demoActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{activity.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{activity.time}</p>
                </div>
                <StatusBadge status={activity.status === 'completed' ? 'TERMINE' : activity.status === 'pending' ? 'ATTENTE' : 'EN_COURS'} size="sm" />
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
              <h3 className="font-semibold text-gray-900 dark:text-white">Gérer les utilisateurs</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comptes et rôles</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Fournisseurs</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contacts et tarifs</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Paramètres</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configuration système</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
