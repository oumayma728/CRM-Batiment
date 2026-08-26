import React from 'react';
import { exportDocumentsToExcel } from '../lib/export-excel';
import { exportDocumentsToPdf } from '../lib/export-pdf';
import type { DocumentType } from '../types';

interface ExportBarProps {
  allDocuments: any[];
  selectedDocuments: any[];
  typeDocument: DocumentType;
}

export const ExportBar: React.FC<ExportBarProps> = ({ allDocuments, selectedDocuments, typeDocument }) => {
  const docsToExport = selectedDocuments.length > 0 ? selectedDocuments : allDocuments;
  const validatedDocs = docsToExport.filter(d => d.statut === 'valide');
  
  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={() => exportDocumentsToExcel(validatedDocs, typeDocument)} 
        disabled={validatedDocs.length === 0}
        className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
          validatedDocs.length > 0 
            ? 'btn-primary' 
            : 'bg-surface-container border border-outline/30 text-on-surface-variant opacity-50 cursor-not-allowed'
        }`}
        title={validatedDocs.length === 0 ? 'Aucun document validé à exporter' : `Exporter ${validatedDocs.length} document(s) validé(s)`}
      >
        <span className="material-symbols-outlined text-[16px]">download</span> Export Excel
      </button>
      <button onClick={() => exportDocumentsToPdf(docsToExport, typeDocument)} className="px-3 py-1.5 rounded-lg text-xs bg-surface-container border border-outline/30 text-on-surface hover:bg-surface-variant flex items-center gap-1.5 transition-colors">
        <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> Export PDF
      </button>
      <span className="text-xs text-on-surface-variant">
        {selectedDocuments.length > 0 ? `${selectedDocuments.length} sélectionné(s)` : `${allDocuments.length} document(s)`}
      </span>
    </div>
  );
};
