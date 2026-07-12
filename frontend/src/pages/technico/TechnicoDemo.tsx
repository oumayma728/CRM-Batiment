import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Bot, FileText, Users, Calculator,
  Sparkles, BookOpen, TrendingUp, Zap
} from 'lucide-react';
import api from '@/lib/api';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

export default function TechnicoDemo() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['technico-demo-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/stats');
        return response.data;
      } catch (error) {
        return {
          generatedDevis: 23,
          aiSuggestions: 45,
          timeSaved: 12,
          accuracy: 95
        };
      }
    }
  });

  const demoStats = [
    { label: 'Devis générés', value: stats?.generatedDevis || 23, icon: FileText, color: 'from-blue-500 to-blue-600' },
    { label: 'Suggestions IA', value: stats?.aiSuggestions || 45, icon: Sparkles, color: 'from-purple-500 to-purple-600' },
    { label: 'Temps économisé (h)', value: stats?.timeSaved || 12, icon: Zap, color: 'from-amber-500 to-amber-600' },
    { label: 'Précision (%)', value: stats?.accuracy || 95, icon: TrendingUp, color: 'from-green-500 to-green-600' },
  ];

  const demoProjects = [
    { id: 1, client: 'Martin Dupont', type: 'Rénovation salle de bain', statut: 'EN_COURS', progress: 60 },
    { id: 2, client: 'Sophie Bernard', type: 'Construction garage', statut: 'PLANIFIE', progress: 20 },
    { id: 3, client: 'Pierre Durand', type: 'Isolation toiture', statut: 'TERMINE', progress: 100 },
  ];

  const demoAiSuggestions = [
    { id: 1, type: 'Matériaux', suggestion: 'Utiliser des carrelages de classe 3 pour la salle de bain', confidence: 92 },
    { id: 2, type: 'Main d\'œuvre', suggestion: 'Prévoir 2 plombiers pour l\'installation', confidence: 88 },
    { id: 3, type: 'Délai', suggestion: 'Délai estimé: 5 jours ouvrés', confidence: 95 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Espace Technico
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Page de démonstration - Assistant IA pour les devis
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un projet, client..."
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

      {/* AI Assistant Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Bot className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Assistant IA actif</h3>
            <p className="text-sm opacity-90">L'intelligence artificielle vous aide à créer des devis précis et rapides</p>
          </div>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
            Démarrer
          </button>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Projets récents
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {demoProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.client}</h3>
                    <StatusBadge status={project.statut} size="sm" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.type}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{project.progress}% complété</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Suggestions IA
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {demoAiSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                      {suggestion.type}
                    </span>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      {suggestion.confidence}% de confiance
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion.suggestion}</p>
                </div>
                <button className="p-2 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg transition-colors">
                  <Calculator className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Nouveau devis IA</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Créer avec l'assistant</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Catalogue</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Prestations & matériaux</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Clients</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gérer les clients</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
