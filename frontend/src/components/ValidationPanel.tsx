import React, { useState, useEffect } from 'react';
import type { DocumentItem, ExtractedFieldCard, PlanPiece } from '../types';
import { FieldCard } from './FieldCard';
import { getDocumentFileUrl } from '../services/documentsApi';
import { confirmDocumentValidation, rejectDocumentValidation } from '../services/validationApi';
import { StatusBadge } from './StatusBadge';
import { recalculateDevisFromPieces } from '../lib/devisUtils';
import { exportSinglePlanToExcel } from '../lib/export-excel';

interface ValidationPanelProps {
  document: DocumentItem;
  onValidationComplete: (updatedDoc: DocumentItem) => void;
  onBackToList?: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  document: docItem,
  onValidationComplete,
  onBackToList,
}) => {
  const [formData, setFormData] = useState<Partial<DocumentItem>>({
    date_facture: docItem.date_facture,
    numero_facture: docItem.numero_facture,
    nom_fournisseur: docItem.nom_fournisseur,
    montant_ht: docItem.montant_ht,
    montant_tva: docItem.montant_tva,
    montant_ttc: docItem.montant_ttc,
    produits: docItem.produits || [],
    pieces: docItem.pieces || [],
    surface_totale_m2: docItem.surface_totale_m2,
    lignes_devis_proposees: docItem.lignes_devis_proposees || [],
    pieces_sans_devis_possible: docItem.pieces_sans_devis_possible || [],
  });

  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'confirm' | 'reject' | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      date_facture: docItem.date_facture,
      numero_facture: docItem.numero_facture,
      nom_fournisseur: docItem.nom_fournisseur,
      montant_ht: docItem.montant_ht,
      montant_tva: docItem.montant_tva,
      montant_ttc: docItem.montant_ttc,
      produits: docItem.produits || [],
      pieces: docItem.pieces || [],
      surface_totale_m2: docItem.surface_totale_m2,
      lignes_devis_proposees: docItem.lignes_devis_proposees || [],
      pieces_sans_devis_possible: docItem.pieces_sans_devis_possible || [],
    });
  }, [docItem]);

  const handleFieldChange = (key: keyof DocumentItem, value: any) => {
    // Si l'utilisateur modifie la liste des pièces (ou leurs surfaces)
    if (key === 'pieces') {
      const pieces = value as PlanPiece[];
      const { lignes_devis_proposees, pieces_sans_devis_possible, surface_totale_m2 } = recalculateDevisFromPieces(pieces);

      setFormData((prev) => ({
        ...prev,
        pieces,
        lignes_devis_proposees,
        pieces_sans_devis_possible,
        // Met à jour la surface totale si elle n'a pas été saisie manuellement
        surface_totale_m2: surface_totale_m2 !== null ? surface_totale_m2 : prev.surface_totale_m2,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuickAssignSurface = (pieceNom: string, surfaceM2: number) => {
    const currentPieces = [...(formData.pieces || [])];
    const pieceIndex = currentPieces.findIndex((p) => p.nom.trim().toLowerCase() === pieceNom.trim().toLowerCase());

    if (pieceIndex >= 0) {
      currentPieces[pieceIndex] = {
        ...currentPieces[pieceIndex],
        surface_m2: surfaceM2,
      };
    } else {
      currentPieces.push({
        nom: pieceNom,
        surface_m2: surfaceM2,
        cotes: [],
      });
    }

    handleFieldChange('pieces', currentPieces);
  };

  const handleAutoSumTotalSurface = () => {
    const pieces = formData.pieces || [];
    const validSurfaces = pieces
      .map((p) => p.surface_m2)
      .filter((s): s is number => typeof s === 'number' && s > 0);
    const sum = validSurfaces.reduce((acc, curr) => acc + curr, 0);
    if (sum > 0) {
      setFormData((prev) => ({ ...prev, surface_totale_m2: Math.round(sum * 100) / 100 }));
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setActionType('confirm');
    setErrorMsg(null);
    try {
      const updated = await confirmDocumentValidation(docItem.id, formData);
      onValidationComplete(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la confirmation.');
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  const handleRejectSubmit = async () => {
    setIsSubmitting(true);
    setActionType('reject');
    setErrorMsg(null);
    try {
      const updated = await rejectDocumentValidation(docItem.id, rejectReason);
      setShowRejectModal(false);
      onValidationComplete(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du rejet.');
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  const isPlan = docItem.type_document === 'plan';

  const piecesList = formData.pieces || [];
  const devisLinesList = formData.lignes_devis_proposees || [];
  const piecesSansDevisList = formData.pieces_sans_devis_possible || [];

  const fieldsList: ExtractedFieldCard[] = isPlan
    ? [
        {
          id: 'surface_totale_m2',
          label: 'Surface Totale (m²)',
          value: formData.surface_totale_m2 !== undefined ? formData.surface_totale_m2 : null,
          type: 'number',
          position: null,
          confidence: 0.92,
        },
        {
          id: 'pieces',
          label: `Liste des Pièces Détectées (${piecesList.length})`,
          value: piecesList,
          type: 'pieces',
          position: null,
          confidence: 0.88,
        },
        {
          id: 'lignes_devis_proposees',
          label: `Lignes de Devis Proposées (Automatiques : ${devisLinesList.length})`,
          value: devisLinesList,
          type: 'devis_lines',
          position: null,
          confidence: 0.95,
        },
        {
          id: 'pieces_sans_devis_possible',
          label: `Pièces Sans Devis Possible (Saisie Manuelle : ${piecesSansDevisList.length})`,
          value: piecesSansDevisList,
          type: 'pieces_sans_devis',
          position: null,
          confidence: piecesSansDevisList.length === 0 ? 1.0 : 0.60,
        },
      ]
    : [
        { id: 'nom_fournisseur', label: 'Fournisseur / Émetteur', value: formData.nom_fournisseur || null, type: 'text', position: null, confidence: formData.nom_fournisseur ? 0.98 : 0.0 },
        { id: 'numero_facture', label: 'N° de Facture', value: formData.numero_facture || null, type: 'text', position: null, confidence: formData.numero_facture ? 0.95 : 0.0 },
        { id: 'date_facture', label: 'Date de la Facture', value: formData.date_facture || null, type: 'text', position: null, confidence: formData.date_facture ? 0.90 : 0.0 },
        { id: 'montant_ht', label: 'Montant Total HT (€)', value: formData.montant_ht !== undefined ? formData.montant_ht : null, type: 'number', position: null, confidence: formData.montant_ht !== undefined ? 0.96 : 0.0 },
        { id: 'montant_tva', label: 'Montant TVA (€)', value: formData.montant_tva !== undefined ? formData.montant_tva : null, type: 'number', position: null, confidence: formData.montant_tva !== undefined ? 0.90 : 0.0 },
        { id: 'montant_ttc', label: 'Montant Total TTC (€)', value: formData.montant_ttc !== undefined ? formData.montant_ttc : null, type: 'number', position: null, confidence: formData.montant_ttc !== undefined ? 0.98 : 0.0 },
        { id: 'produits', label: 'Lignes Produits / Services', value: formData.produits || [], type: 'list', position: null, confidence: 0.85 },
      ];

  const fileUrl = getDocumentFileUrl(docItem.id);
  const isImage = docItem.nom_fichier.match(/\.(jpeg|jpg|png)$/i);

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] gap-4">
      {/* Top Header Controls Bar */}
      <div className="glass-panel px-5 py-3 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-on-surface/10 transition-colors"
              title="Retour au tableau"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-on-surface truncate max-w-md">{docItem.nom_fichier}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/15 text-primary border border-[#c0c1ff]/30">
                {isPlan ? 'Plan BTP' : 'Facture'}
              </span>
              <StatusBadge statut={docItem.statut} />
            </div>
            <p className="text-xs text-on-surface-variant/60 mt-0.5 font-mono">
              ID #{docItem.id} • Moteur : {docItem.technologie} • Temps : {docItem.temps_traitement_s}s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPlan && docItem.statut === 'en_attente' && (
            <button
              type="button"
              onClick={handleAutoSumTotalSurface}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-[#c0c1ff]/30 hover:bg-primary/20 transition-all flex items-center gap-1.5"
              title="Calculer automatiquement la surface totale à partir de la somme des pièces"
            >
              <span className="material-symbols-outlined text-[16px]">calculate</span>
              <span>Somme pièces auto</span>
            </button>
          )}

          {docItem.statut === 'en_attente' && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-error-container/20 text-error border border-error/30 hover:bg-error-container/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>Rejeter</span>
              </button>

              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="btn-primary px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting && actionType === 'confirm' ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                )}
                <span>Confirmer & Valider</span>
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-error-container/20 border border-error/30 rounded-xl p-3 px-4 text-xs text-error flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Split-Screen Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left Col: Document Viewer */}
        <div className="lg:col-span-7 xl:col-span-8 glass-panel rounded-2xl p-3 flex flex-col overflow-hidden">
          <div className="text-xs font-semibold text-on-surface-variant/70 mb-2 px-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">description</span>
              <span>Aperçu du Document Original Source ({isPlan ? 'Plan PDF' : 'Facture'})</span>
            </div>
            <span className="text-[11px] font-mono text-success-emerald">Consulter & Vérifier</span>
          </div>

          <div className="flex-1 bg-[#09090b] rounded-xl border border-on-surface/10 overflow-hidden relative">
            {/* Highlight Overlay */}
            {(() => {
              if (hoveredFieldId) {
                const field = fieldsList.find((f) => f.id === hoveredFieldId);
                if (field && field.position) {
                  return (
                    <div
                      className="absolute z-10 pointer-events-none"
                      style={{
                        left: `${field.position.x * 100}%`,
                        top: `${field.position.y * 100}%`,
                        width: `${field.position.width * 100}%`,
                        height: `${field.position.height * 100}%`,
                        backgroundColor: 'rgba(31, 168, 179, 0.3)',
                        border: '2px solid #1FA8B3',
                        borderRadius: '4px',
                        boxShadow: '0 0 10px rgba(31, 168, 179, 0.5)'
                      }}
                    />
                  );
                }
              }
              return null;
            })()}

            {isImage ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                <img src={fileUrl} alt="Document Source" className="max-w-full max-h-full object-contain rounded" />
              </div>
            ) : (
              <iframe
                src={`${fileUrl}#toolbar=0`}
                title="Aperçu du PDF"
                className="w-full h-full border-0"
              />
            )}
          </div>
        </div>

        {/* Right Col: Extracted Data Cards (Editable) */}
        <div className="lg:col-span-5 xl:col-span-4 glass-panel rounded-2xl p-4 flex flex-col overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-on-surface/10">
            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider font-mono">
              {isPlan ? 'Pièces & Devis Éditables' : 'Champs Extraits (Éditables)'}
            </h3>
            <div className="flex items-center gap-2">
              {docItem.statut === 'valide' && isPlan && (
                <button
                  onClick={() => exportSinglePlanToExcel(docItem)}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-[#107c41]/20 text-[#107c41] border border-[#107c41]/30 hover:bg-[#107c41]/40 transition-colors flex items-center gap-1"
                  title="Exporter ce plan en format Excel détaillé"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  Excel
                </button>
              )}
              {docItem.statut === 'en_attente' && (
                <span className="text-[11px] text-on-surface-variant/60">Éditer les valeurs</span>
              )}
            </div>
          </div>

          {fieldsList.map((f) => (
            <FieldCard
              key={f.id}
              field={f}
              onChange={(val) => handleFieldChange(f.id as any, val)}
              isHovered={hoveredFieldId === f.id}
              onHover={(hovered) => setHoveredFieldId(hovered ? f.id : null)}
              onQuickAssignSurface={handleQuickAssignSurface}
            />
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-on-surface/15 rounded-2xl p-6 space-y-4 shadow-2xl" style={{width: '100%', maxWidth: '448px', minWidth: '320px'}}>
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <h3 className="text-base font-semibold">Motif du rejet du document</h3>
            </div>

            <p className="text-xs text-on-surface-variant/70">
              Indiquez la raison du rejet pour l'historique de validation humaine et les métriques d'amélioration.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Plan illisible, cotes manquantes, erreur de fournisseur..."
              className="w-full bg-[#09090b] border border-on-surface/10 rounded-xl p-3 text-xs text-on-surface focus:outline-none focus:border-error"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:bg-on-surface/5"
              >
                Annuler
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-error-container text-on-surface hover:bg-error-container/80 flex items-center gap-1.5"
              >
                {isSubmitting && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                <span>Confirmer le Rejet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
