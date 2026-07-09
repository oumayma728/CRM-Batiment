import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HardHat, MapPin } from 'lucide-react';
import api from '@/lib/api';
import type { Chantier, PaginatedResponse } from '@/types';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SousTraitantChantiers() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: chantiers, isLoading } = useQuery({
    queryKey: ['sous-traitant-chantiers'],
    queryFn: async () => {
      try {
        const response = await api.get<PaginatedResponse<Chantier>>('/chantiers', {
          params: { page: 1, limit: 50 },
        });
        return response.data.data || [];
      } catch (error) {
        // Silently handle 403/404 errors - endpoints not yet implemented
        return [];
      }
    },
  });

  const chantiersArray = Array.isArray(chantiers) ? chantiers : [];
  const filteredChantiers = chantiersArray.filter((chantier: Chantier) =>
    chantier.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chantier.adresse?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Chantiers Attribués</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Consultation des chantiers qui vous sont attribués</p>
      </div>

      {/* Search */}
      <div className="mt-6 sm:mt-8">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher un chantier..."
          onClear={() => setSearchQuery('')}
        />
      </div>

      {/* Chantiers List */}
      {isLoading ? (
        <LoadingSkeleton type="card" count={4} className="mt-6 sm:mt-8" />
      ) : filteredChantiers.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="Aucun chantier attribué"
          description="Vous n'avez pas encore de chantiers qui vous sont attribués."
          className="mt-6 sm:mt-8"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {filteredChantiers.map((chantier: Chantier) => (
            <div key={chantier.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <HardHat className="h-6 w-6 sm:h-7 sm:w-7 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">{chantier.reference}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">{chantier.adresse}</span>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <StatusBadge status={chantier.statut || 'EN_COURS'} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
