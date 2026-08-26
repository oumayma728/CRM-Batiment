import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchDocumentById, fetchDocuments } from '../services/documentsApi';
import { ValidationPanel } from '../components/ValidationPanel';
import type { DocumentItem } from '../types';

export const ValidationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [pendingQueue, setPendingQueue] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocumentAndQueue();
  }, [id]);

  const loadDocumentAndQueue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pendingDocs = await fetchDocuments({ statut: 'en_attente' });
      setPendingQueue(pendingDocs);

      if (id) {
        const doc = await fetchDocumentById(parseInt(id, 10));
        setDocument(doc);
      } else if (pendingDocs.length > 0) {
        setDocument(pendingDocs[0]);
      } else {
        setDocument(null);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidationComplete = (_updatedDoc: DocumentItem) => {
    const remaining = pendingQueue.filter((d) => d.id !== document?.id);
    if (remaining.length > 0) {
      navigate(`/validation/${remaining[0].id}`);
    } else {
      navigate('/documents');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
        <p className="text-xs text-on-surface-variant">Chargement du document de validation...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="glass-panel border border-white/10 rounded-2xl p-12 text-center space-y-6" style={{width: '100%', maxWidth: '520px', minWidth: '320px'}}>
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[32px]">fact_check</span>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-on-surface">File de validation vide</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed" style={{whiteSpace: 'normal'}}>
              Aucun document en attente de vérification humaine.<br />Tous les documents ont été validés ou rejetés.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/85 transition-all"
          >
            <span>Extraire une nouvelle facture</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <ValidationPanel
      document={document}
      onValidationComplete={handleValidationComplete}
      onBackToList={() => navigate('/documents')}
    />
  );
};
