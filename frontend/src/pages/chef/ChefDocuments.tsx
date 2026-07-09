import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  HardHat,
} from 'lucide-react';
import api from '@/lib/api';

interface Document {
  id: number;
  nom: string;
  type: string;
  dateAjout: string;
  chantierId?: number;
  chantierReference?: string;
}

export default function ChefDocuments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['chef-documents'],
    queryFn: async () => {
      try {
        const response = await api.get('/documents', { params: { page: 1, limit: 50 } });
        return response.data.data || [];
      } catch (error) {
        console.error('Erreur chargement documents:', error);
        return [];
      }
    },
  });

  const filteredDocuments = documents?.filter((doc: Document) => {
    const matchesSearch = doc.nom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const documentTypes = ['ALL', 'PDF', 'IMAGE', 'EXCEL', 'WORD'];

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Documents Chantiers
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestion des documents liés à vos chantiers
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'ALL' ? 'Tous les types' : type}
              </option>
            ))}
          </select>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Upload className="h-4 w-4" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || typeFilter !== 'ALL'
              ? 'Aucun document trouvé'
              : 'Aucun document disponible'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc: Document) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                  {doc.type}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                {doc.nom}
              </h3>
              {doc.chantierReference && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <HardHat className="h-4 w-4" />
                  <span>{doc.chantierReference}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Ajouté le {new Date(doc.dateAjout).toLocaleDateString('fr-FR')}
              </p>
              <div className="flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                  <Eye className="h-4 w-4" />
                  <span>Voir</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <Download className="h-4 w-4" />
                  <span>Télécharger</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-2">
              Informations sur les documents
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              En tant que chef de chantier, vous pouvez accéder aux documents liés aux chantiers
              qui vous sont affectés. Les documents administratifs et commerciaux restent restreints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
