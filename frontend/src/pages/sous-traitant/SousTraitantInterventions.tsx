import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Search, Loader2, AlertCircle, Clock, MapPin } from 'lucide-react';
import api from '@/lib/api';

export default function SousTraitantInterventions() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: interventions, isLoading } = useQuery({
    queryKey: ['sous-traitant-interventions'],
    queryFn: async () => {
      try {
        const response = await api.get('/interventions', { params: { page: 1, limit: 50 } });
        return response.data.data || [];
      } catch (error) {
        // Silently handle 403/404 errors - endpoints not yet implemented
        return [];
      }
    },
  });

  const interventionsArray = Array.isArray(interventions) ? interventions : [];
  const filteredInterventions = interventionsArray.filter((intervention: any) =>
    intervention.titre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    intervention.lieu?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dates d'Intervention</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Consultation des dates d'intervention planifiées</p>
      </div>

      {/* Search */}
      <div className="relative mt-6 sm:mt-8">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une intervention..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base"
        />
      </div>

      {/* Interventions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 sm:py-16">
          <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-teal-600" />
        </div>
      ) : filteredInterventions.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <AlertCircle className="h-12 w-12 sm:h-14 sm:w-14 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Aucune intervention planifiée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {filteredInterventions.map((intervention: any) => (
            <div key={intervention.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">{intervention.titre || 'Intervention sans titre'}</h3>
                  {intervention.date && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">Date: {new Date(intervention.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  {intervention.lieu && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs sm:text-sm">{intervention.lieu}</span>
                    </div>
                  )}
                  <span className="inline-block mt-2 sm:mt-3 text-xs font-medium px-2.5 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-300 rounded-full">
                    {intervention.statut || 'Planifiée'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
