import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Upload,
  X,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  FileImage,
  File,
  Calendar,
  Folder
} from 'lucide-react';
import api from '@/lib/api';
import SearchBar from '@/components/ui/SearchBar';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

type ClientDocument = {
  id: number;
  nom: string;
  type: string;
  url: string;
  createdAt: string;
  categorie?: string;
  taille?: number;
};

const documentTypes = [
  { value: 'CONTRAT', label: 'Contrat', icon: FileSpreadsheet },
  { value: 'DEVIS', label: 'Devis', icon: FileSpreadsheet },
  { value: 'FACTURE', label: 'Facture', icon: FileSpreadsheet },
  { value: 'ATTESTATION', label: 'Attestation', icon: FileText },
  { value: 'PLAN', label: 'Plan', icon: FileImage },
  { value: 'PHOTO', label: 'Photo', icon: FileImage },
  { value: 'AUTRE', label: 'Autre', icon: File },
];

const getDocumentIcon = (type: string) => {
  const docType = documentTypes.find(dt => dt.value === type);
  return docType ? docType.icon : File;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value));
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '-';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function ClientDocuments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('AUTRE');
  const [uploadCategory, setUploadCategory] = useState('');

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['client-documents', search, selectedType, selectedCategory],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (selectedType) params.type = selectedType;
      if (selectedCategory) params.categorie = selectedCategory;
      
      const response = await api.get('/clients/me/documents', { params });
      return response.data as ClientDocument[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/clients/me/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadType('AUTRE');
      setUploadCategory('');
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await api.delete(`/clients/me/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents'] });
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('type', uploadType);
    if (uploadCategory) formData.append('categorie', uploadCategory);

    uploadMutation.mutate(formData);
  };

  const handleDownload = (document: ClientDocument) => {
    window.open(document.url, '_blank');
  };

  const handleDelete = (documentId: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      deleteMutation.mutate(documentId);
    }
  };

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = doc.nom.toLowerCase().includes(search.toLowerCase());
    const matchesType = !selectedType || doc.type === selectedType;
    const matchesCategory = !selectedCategory || doc.categorie === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  }) || [];

  const categories = [...new Set(documents?.map(d => d.categorie).filter(Boolean) || [])];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/portal')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <X size={16} />
              Retour
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-purple-700 transition"
            >
              <Upload size={16} />
              Téléverser un document
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Mes documents</h1>
          <p className="mt-2 text-slate-600">
            Gérez tous vos documents : contrats, devis, factures, plans et photos.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Tous les types</option>
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
            {(selectedType || selectedCategory) && (
              <button
                onClick={() => {
                  setSelectedType('');
                  setSelectedCategory('');
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                <X size={14} />
                Réinitialiser
              </button>
            )}
          </div>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Rechercher un document..."
            onClear={() => setSearch('')}
          />
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <LoadingSkeleton type="card" count={6} />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <AlertCircle className="mb-2" size={24} />
            <p>Erreur lors du chargement des documents.</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="Aucun document trouvé"
            description={search || selectedType || selectedCategory 
              ? "Aucun document ne correspond à vos critères de recherche." 
              : "Commencez par téléverser votre premier document."}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocuments.map((document) => {
              const DocumentIcon = getDocumentIcon(document.type);
              return (
                <div key={document.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                  <div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-slate-100 transition">
                    <DocumentIcon size={48} className="text-slate-400" />
                  </div>
                  <h3 className="mb-1 truncate text-sm font-semibold text-slate-900" title={document.nom}>
                    {document.nom}
                  </h3>
                  <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {documentTypes.find(dt => dt.value === document.type)?.label || document.type}
                    </span>
                    {document.categorie && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                        {document.categorie}
                      </span>
                    )}
                  </div>
                  <div className="mb-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(document.createdAt)}
                    </div>
                    {document.taille && (
                      <div className="mt-1">
                        {formatFileSize(document.taille)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(document)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Eye size={14} />
                      Voir
                    </button>
                    <button
                      onClick={() => handleDownload(document)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Download size={14} />
                      Télécharger
                    </button>
                    <button
                      onClick={() => handleDelete(document.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Téléverser un document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Fichier
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Type de document
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Catégorie (optionnel)
                </label>
                <input
                  type="text"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  placeholder="Ex: Chantier Paris, Rénovation 2024..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {uploadMutation.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Erreur lors du téléversement du document.
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploadMutation.isPending}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                  ) : (
                    'Téléverser'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
