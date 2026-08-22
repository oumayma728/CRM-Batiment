import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Loader2, AlertCircle, Download, Eye } from 'lucide-react';
import api from '@/lib/api';

export default function SousTraitantDocuments() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['sous-traitant-documents'],
    queryFn: async () => {
      try {
        const response = await api.get('/documents', { params: { page: 1, limit: 50 } });
        return response.data.data || [];
      } catch (error) {
        // Silently handle 403/404 errors - endpoints not yet implemented
        return [];
      }
    },
  });

  const documentsArray = Array.isArray(documents) ? documents : [];
  const filteredDocuments = documentsArray.filter((doc: any) =>
    doc.nom?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Documents Nécessaires</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Accès aux documents nécessaires à votre intervention</p>
      </div>

      {/* Search */}
      <div className="relative mt-6 sm:mt-8">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un document..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm sm:text-base"
        />
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 sm:py-16">
          <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-teal-600" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <AlertCircle className="h-12 w-12 sm:h-14 sm:w-14 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Aucun document disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {filteredDocuments.map((doc: any) => (
            <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{doc.nom}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{doc.type || 'Document'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 text-teal-600 dark:text-teal-400 rounded-xl hover:from-teal-100 hover:to-cyan-100 dark:hover:from-teal-900/50 dark:hover:to-cyan-900/50 transition-all">
                  <Eye className="h-4 w-4" />
                  <span>Voir</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all">
                  <Download className="h-4 w-4" />
                  <span>Télécharger</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
