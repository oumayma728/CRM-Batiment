import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileEdit, Upload, Search, Loader2, Camera, FileText, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function SousTraitantRapports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: rapports, isLoading } = useQuery({
    queryKey: ['sous-traitant-rapports'],
    queryFn: async () => {
      try {
        const response = await api.get('/rapports', { params: { page: 1, limit: 50 } });
        return response.data.data || [];
      } catch (error) {
        // Silently handle 403/404 errors - endpoints not yet implemented
        return [];
      }
    },
  });

  const rapportsArray = Array.isArray(rapports) ? rapports : [];
  const filteredRapports = rapportsArray.filter((rapport: any) =>
    rapport.titre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/rapports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sous-traitant-rapports'] });
      setShowUploadModal(false);
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    // Add file upload logic here
    uploadMutation.mutate(formData);
  };

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Comptes Rendus</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Dépôt de comptes rendus, rapports ou photographies</p>
      </div>

      {/* Search and Upload */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6 sm:mt-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un rapport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base"
          />
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium text-sm sm:text-base"
        >
          <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Déposer un rapport</span>
        </button>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 sm:py-16">
          <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-teal-600" />
        </div>
      ) : filteredRapports.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
          <FileEdit className="h-12 w-12 sm:h-14 sm:w-14 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Aucun rapport déposé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {filteredRapports.map((rapport: any) => (
            <div key={rapport.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">{rapport.titre || 'Rapport sans titre'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">{rapport.description || 'Pas de description'}</p>
                  {rapport.dateDepot && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3">
                      Déposé le {new Date(rapport.dateDepot).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  <span className="inline-block mt-2 sm:mt-3 text-xs font-medium px-2.5 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-300 rounded-full">
                    {rapport.type || 'Rapport'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Déposer un rapport</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titre
                </label>
                <input
                  type="text"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base"
                  placeholder="Titre du rapport"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base"
                  rows={3}
                  placeholder="Description du rapport"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm sm:text-base">
                  <option value="rapport">Rapport</option>
                  <option value="compte_rendu">Compte rendu</option>
                  <option value="photo">Photographie</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fichier
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 sm:p-8 text-center hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer">
                  <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Glissez-déposez ou cliquez pour sélectionner
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  Déposer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
