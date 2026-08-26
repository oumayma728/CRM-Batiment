import React, { useState } from 'react';
import type { DocumentType, FactureExtractionResult, PlanResponse } from '../types';
import { extractFacture, extractPlan } from '../services/ocrApi';

interface UploadZoneProps {
  onExtractionSuccess: (result: FactureExtractionResult | PlanResponse, docType: DocumentType) => void;
}

const FACTURE_TECHS = [
  { id: 'gemini', label: 'Gemini Pro Vision' },
  { id: 'mistral', label: 'Mistral Large' },
  { id: 'easyocr+groq', label: 'EasyOCR + Tesseract' },
  { id: 'easyocr', label: 'EasyOCR (Local)' },
  { id: 'tesseract', label: 'Tesseract (Local)' },
];

const PLAN_TECHS = [
  { id: 'gemini', label: 'Gemini Pro Vision' },
  { id: 'mistral', label: 'Mistral Vision' },
];

export const UploadZone: React.FC<UploadZoneProps> = ({ onExtractionSuccess }) => {
  const [docType, setDocType] = useState<DocumentType>('facture');
  const [technology, setTechnology] = useState<string>('gemini');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const currentTechList = docType === 'facture' ? FACTURE_TECHS : PLAN_TECHS;

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validMimes.includes(file.type)) {
      setErrorMsg(`Format non supporté (${file.type || 'inconnu'}). Formats acceptés : PDF, JPEG, PNG.`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg(`Le fichier dépasse la taille maximale de 50 Mo (${(file.size / (1024 * 1024)).toFixed(1)} Mo).`);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (docType === 'facture') {
        const res = await extractFacture(selectedFile, technology);
        onExtractionSuccess(res, 'facture');
      } else {
        const res = await extractPlan(selectedFile, technology);
        onExtractionSuccess(res, 'plan');
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors du traitement du document par l'IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Controls Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
        {/* Toggle Switch */}
        <div className="flex items-center bg-[#09090b] rounded-full p-1 border border-on-surface/10 relative">
          <div
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-surface-variant rounded-full transition-all duration-300 pointer-events-none"
            style={{ transform: docType === 'plan' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          <button
            onClick={() => { setDocType('facture'); setTechnology('gemini'); }}
            className="relative z-10 px-5 py-2 text-sm font-semibold text-on-surface rounded-full transition-colors w-40 text-center"
          >
            Facture (OCR)
          </button>
          <button
            onClick={() => { setDocType('plan'); setTechnology('gemini'); }}
            className="relative z-10 px-5 py-2 text-sm font-semibold text-on-surface-variant rounded-full transition-colors w-40 text-center"
          >
            Plan (Devis)
          </button>
        </div>

        {/* Engine Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Moteur IA :</span>
          <div className="relative">
            <select
              value={technology}
              onChange={(e) => setTechnology(e.target.value)}
              className="appearance-none bg-[#09090b] border border-on-surface/10 rounded-lg pl-3 pr-8 py-2 text-sm text-on-surface focus:border-primary focus:ring-0 focus:outline-none cursor-pointer"
            >
              {currentTechList.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="glass-panel rounded-2xl h-80 flex flex-col items-center justify-center border-dashed border-2 border-on-surface/10 dropzone-pulse cursor-pointer relative overflow-hidden group"
      >
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />

        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center text-center z-20">
            <div className="loading-ring mb-4" />
            <h4 className="text-lg font-semibold text-on-surface mb-2">
              Traitement IA en cours...
            </h4>
            <p className="text-xs font-mono text-primary uppercase tracking-wider">
              Analyse structurelle...
            </p>
          </div>
        ) : !selectedFile ? (
          <div className="pointer-events-none flex flex-col items-center text-center px-8">
            <span className="material-symbols-outlined text-[56px] text-primary mb-4 transition-transform group-hover:scale-110 duration-300">
              cloud_upload
            </span>
            <h3 className="text-lg font-semibold text-on-surface mb-2">
              Glissez vos fichiers ici
            </h3>
            <p className="text-sm text-on-surface-variant">
              PDF, JPG, PNG supportés.  Taille maximale : 50 Mo.
            </p>
            <div className="mt-5 px-6 py-2.5 border border-on-surface/10 rounded-lg bg-[#09090b] text-sm font-semibold text-on-surface group-hover:border-on-surface/20 transition-all">
              Parcourir les fichiers
            </div>
          </div>
        ) : (
          <div className="z-20 flex flex-col items-center text-center pointer-events-auto">
            <span className="material-symbols-outlined text-[48px] text-primary mb-4">description</span>
            <p className="text-base text-on-surface font-semibold">{selectedFile.name}</p>
            <p className="text-xs text-on-surface-variant font-mono mt-1">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo • {docType === 'plan' ? 'Plan BTP' : 'Facture'}
            </p>
            <div className="flex justify-center gap-3 pt-5">
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                className="px-4 py-2 rounded-lg text-xs border border-on-surface/10 hover:bg-on-surface/10 text-on-surface-variant font-semibold transition-colors"
              >
                Changer de fichier
              </button>
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="px-6 py-2 rounded-lg text-xs font-semibold btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Lancer l'Extraction
              </button>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 text-xs text-error flex items-center gap-3">
          <span className="material-symbols-outlined text-error">warning</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
