import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Calendar, Phone,
  Mail, FileText,
  ChevronDown, ChevronUp, Eye, AlertCircle
} from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

type SuiviItem = {
  id: number;
  type: 'CLIENT' | 'DEVIS' | 'FACTURE' | 'DEMANDE';
  titre: string;
  statut: string;
  date: string;
  client?: string;
  telephone?: string;
  email?: string;
  priorite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  notes?: string;
};

const prioriteConfig: Record<string, { bg: string; text: string; label: string }> = {
  HAUTE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Haute' },
  MOYENNE: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Moyenne' },
  BASSE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Basse' },
};

export default function AssistanteSuivi() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['suivi-administratif', search, selectedType, selectedStatut],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (search) params.search = search;
      if (selectedType) params.type = selectedType;
      if (selectedStatut) params.statut = selectedStatut;
      const res = await api.get('/suivi-administratif', { params });
      return res.data;
    },
  });

  const items: SuiviItem[] = data?.data ?? [];

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedType('');
    setSelectedStatut('');
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 dark:bg-gray-800/80">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 w-full">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Rechercher..."
                onClear={() => setSearch('')}
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="">Tous les types</option>
              <option value="CLIENT">Clients</option>
              <option value="DEVIS">Devis</option>
              <option value="FACTURE">Factures</option>
              <option value="DEMANDE">Demandes de devis</option>
            </select>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="">Tous les statuts</option>
              <option value="NOUVEAU">Nouveau</option>
              <option value="EN_COURS">En cours</option>
              <option value="ATTENTE">En attente</option>
              <option value="TERMINE">Terminé</option>
              <option value="URGENT">Urgent</option>
            </select>
            {(search || selectedType || selectedStatut) && (
              <button
                onClick={clearFilters}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm sm:text-base"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingSkeleton type="list" count={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun dossier à suivre"
            description="Il n'y a actuellement aucun dossier à suivre dans le système."
          />
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const priorite = prioriteConfig[item.priorite] || prioriteConfig.BASSE;
              const isExpanded = expandedItems.has(item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium ${priorite.bg} ${priorite.text} rounded-full`}>
                            {priorite.label}
                          </span>
                          <StatusBadge status={item.statut} size="sm" />
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {item.type}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {item.titre}
                        </h3>
                        {item.client && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Client: {item.client}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(item.date).toLocaleDateString('fr-FR')}
                          </div>
                          {item.telephone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {item.telephone}
                            </div>
                          )}
                          {item.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {item.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {item.notes && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Notes:
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.notes}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                            <Eye className="h-4 w-4" />
                            Voir les détails
                          </button>
                          <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                            <Phone className="h-4 w-4" />
                            Contacter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Informations sur le suivi
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Ce tableau de bord vous permet de suivre l'ensemble des dossiers clients. 
                Utilisez les filtres pour affiner votre recherche et cliquez sur les éléments 
                pour voir les détails et les actions disponibles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
