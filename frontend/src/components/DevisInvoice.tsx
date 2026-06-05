import type { Devis, LigneDevis } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { parseStructuredDevisNotes } from '@/lib/devisStructuredNotes';
import { Printer, X } from 'lucide-react';

interface DevisInvoiceProps {
  devis: Devis;
  onClose: () => void;
  onPrint: () => void;
  showGeneratedDocuments?: boolean;
  onOpenFacture?: (factureId: number) => void;
  onOpenBonCommande?: () => void;
  onOpenCommandeFournisseur?: (commandeId: number) => void;
  onManualEdit?: () => void;
  onValidate?: () => Promise<void>;
  onValidateBonCommandeAndSend?: () => Promise<void>;
  validateButtonLabel?: string;
  validateConfirmMessage?: string;
  validateLoadingLabel?: string;
  validateBonCommandeLabel?: string;
  validateBonCommandeConfirmMessage?: string;
  validateBonCommandeLoadingLabel?: string;
}

function getClientName(devis: Devis) {
  if (!devis.client) return 'Client non renseigne';
  return `${devis.client.prenom ?? ''} ${devis.client.nom}`.trim() || devis.client.nom;
}

function getClientAddress(devis: Devis) {
  return devis.client?.adresseChantier || devis.client?.adresseClient || 'Adresse non renseignee';
}

function getAdvisorName(devis: Devis) {
  if (!devis.createur) return 'Conseiller CRM';
  return `${devis.createur.prenom} ${devis.createur.nom}`.trim();
}

function getStatusLabel(statut: Devis['statut']) {
  switch (statut) {
    case 'BROUILLON':
      return 'Brouillon';
    case 'ENVOYE':
      return 'Envoye';
    case 'ACCEPTE':
      return 'Accepte';
    case 'SIGNE':
      return 'Signe conseiller';
    case 'REFUSE':
      return 'Refuse';
    case 'ANNULE':
      return 'Annule';
    case 'REVISE':
      return 'Revise';
    case 'RENVOYE':
      return 'Renvoye';
    default:
      return statut;
  }
}

function getModeValidationLabel(mode?: Devis['modeValidation']) {
  switch (mode) {
    case 'EMAIL':
      return 'Validation email';
    case 'SIGNATURE':
      return 'Signature';
    case 'VERBAL':
      return 'Validation verbale';
    case 'AUTRE':
      return 'Validation manuelle';
    default:
      return 'A definir';
  }
}

function getLineTitle(ligne: LigneDevis) {
  return ligne.description?.trim() || ligne.prestation?.nom || 'Ligne de devis';
}

function getLineDetails(ligne: LigneDevis) {
  const details = [
    ligne.materiau?.nom ? `Materiau: ${ligne.materiau.nom}` : null,
    ligne.serviceMainOeuvre?.nom ? `Main d'oeuvre: ${ligne.serviceMainOeuvre.nom}` : null,
    ligne.dimension ? `Dimensions: ${ligne.dimension}` : null,
    ligne.couleur ? `Couleur: ${ligne.couleur}` : null,
    ligne.finition ? `Finition: ${ligne.finition}` : null,
  ].filter(Boolean);

  return details.join(' / ');
}

function getLineCategory(ligne: LigneDevis) {
  if (ligne.prestation?.nom) return ligne.prestation.nom;
  if (ligne.materiau?.nom) return 'Fourniture';
  if (ligne.serviceMainOeuvre?.nom) return 'Main d oeuvre';
  return 'Divers';
}

function getLineMaterials(ligne: LigneDevis) {
  const parts = [ligne.materiau?.nom, ligne.serviceMainOeuvre?.nom].filter(Boolean);
  return parts.length > 0 ? parts.join(' + ') : '—';
}

function TotalsCard({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div
      className={
        emphasis
          ? 'rounded-2xl border border-slate-300 bg-amber-50 px-4 py-3'
          : 'rounded-2xl border border-slate-200 bg-white px-4 py-3'
      }
    >
      <p className="text-[12px] font-semibold text-slate-500">{label}</p>
      <p className={emphasis ? 'mt-2 text-2xl font-bold text-slate-900' : 'mt-2 text-lg font-semibold text-slate-900'}>
        {value}
      </p>
    </div>
  );
}

function DocumentActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-400">
        Bientot disponible
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
    >
      Apercu / PDF
    </button>
  );
}

import { useState } from 'react';

export function DevisInvoice({
  devis,
  onClose,
  onPrint,
  showGeneratedDocuments = false,
  onOpenFacture,
  onOpenBonCommande,
  onOpenCommandeFournisseur,
  onManualEdit,
  onValidate,
  onValidateBonCommandeAndSend,
  validateButtonLabel = 'Valider le devis',
  validateConfirmMessage = 'Confirmez-vous cette action sur ce devis ?',
  validateLoadingLabel = 'Enregistrement...',
  validateBonCommandeLabel = 'Valider le bon de commande et envoyer',
  validateBonCommandeConfirmMessage = 'Confirmez-vous la validation du bon de commande et l envoi des commandes fournisseur ?',
  validateBonCommandeLoadingLabel = 'Envoi en cours...',
}: DevisInvoiceProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSupplierConfirm, setShowSupplierConfirm] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const lignes = [...(devis.lignes ?? [])].sort((a, b) => a.ordre - b.ordre);
  const totalHT = devis.totalHT ?? 0;
  const totalTVA = devis.totalTVA ?? 0;
  const totalTTC = devis.totalTTC ?? 0;
  const tauxTVA = devis.tauxTVA ?? 20;
  const issueDate = formatDate(devis.createdAt);
  const validationDate = devis.dateValidation ? formatDate(devis.dateValidation) : 'En attente';
  const structuredNotes = parseStructuredDevisNotes(devis.notes);
  const hasGeneratedDocuments =
    (devis.factures?.length ?? 0) > 0 ||
    Boolean(devis.bonCommande) ||
    (devis.commandesFournisseur?.length ?? 0) > 0;

  return (
    <div className="devis-print-root fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="devis-print-zone flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="print-hidden flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">Aperçu du devis</p>
            <p className="text-sm text-slate-500">Document commercial prêt à l'impression</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Printer size={16} />
              Telecharger PDF
            </button>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Boutons d'action en bas du modal */}
        <div className="print-hidden flex flex-row justify-end gap-3 px-8 py-4 border-b border-slate-100">
          <button
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            onClick={onManualEdit ?? onClose}
          >
            Modifier contenu
          </button>
          {onValidateBonCommandeAndSend && (
            <button
              className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-800 disabled:opacity-60"
              onClick={() => setShowSupplierConfirm(true)}
              disabled={supplierLoading || loading}
            >
              {validateBonCommandeLabel}
            </button>
          )}
          {onValidate && (
            <button
              className="rounded-xl bg-[#9683EC] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#7a6ad6] disabled:opacity-60"
              onClick={() => setShowConfirm(true)}
              disabled={loading || !['BROUILLON', 'REVISE'].includes(devis.statut)}
            >
              {validateButtonLabel}
            </button>
          )}
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center">
              {/* eslint-disable no-irregular-whitespace */}
              {/*
                Confirmez-vous l’envoi de ce devis au client ?
              */}
              {/* eslint-enable no-irregular-whitespace */}
              <p className="text-base font-semibold text-slate-900 mb-4 text-center">
                {validateConfirmMessage}
              </p>
              {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
              <div className="flex gap-4 mt-2">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  className="rounded-xl bg-[#9683EC] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#7a6ad6] disabled:opacity-60"
                  onClick={async () => {
                    setLoading(true);
                    setError(null);
                    try {
                      if (onValidate) await onValidate();
                      setShowConfirm(false);
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : 'Erreur lors de la validation');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? validateLoadingLabel : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSupplierConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center">
              <p className="text-base font-semibold text-slate-900 mb-4 text-center">
                {validateBonCommandeConfirmMessage}
              </p>
              {supplierError && <p className="text-red-600 text-sm mb-2">{supplierError}</p>}
              <div className="flex gap-4 mt-2">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => setShowSupplierConfirm(false)}
                  disabled={supplierLoading}
                >
                  Annuler
                </button>
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-800 disabled:opacity-60"
                  onClick={async () => {
                    setSupplierLoading(true);
                    setSupplierError(null);
                    try {
                      if (onValidateBonCommandeAndSend) {
                        await onValidateBonCommandeAndSend();
                      }
                      setShowSupplierConfirm(false);
                    } catch (e: unknown) {
                      setSupplierError(
                        e instanceof Error
                          ? e.message
                          : 'Erreur lors de la validation du bon de commande',
                      );
                    } finally {
                      setSupplierLoading(false);
                    }
                  }}
                  disabled={supplierLoading}
                >
                  {supplierLoading
                    ? validateBonCommandeLoadingLabel
                    : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="devis-print-scroll overflow-y-auto bg-[#f4f1eb] px-4 py-5 md:px-8">
          <article className="mx-auto w-full max-w-[920px] rounded-[24px] bg-white p-6 text-slate-800 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:p-8">
            <header className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid gap-6 md:grid-cols-[1.25fr_0.75fr]">
                <div>
                  <p className="text-2xl font-bold text-slate-900">BATIFLOW</p>
                  <p className="mt-1 text-sm text-slate-500">Renovation & Gestion commerciale</p>
                  <div className="mt-4 space-y-1 text-sm text-slate-600">
                    <p>contact@crm-batiment.fr</p>
                    <p>+33 1 23 45 67 89</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Numero devis</span>
                      <span className="font-semibold text-slate-900">{devis.reference}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Date</span>
                      <span className="font-medium text-slate-900">{issueDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Statut</span>
                      <span className="font-medium text-slate-900">{getStatusLabel(devis.statut)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">TVA</span>
                      <span className="font-medium text-slate-900">{tauxTVA.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <section className="mt-6">
              <h1 className="text-3xl font-bold text-slate-900">Devis de travaux</h1>
              <p className="mt-1 text-sm text-slate-500">Proposition commerciale</p>
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-600">Informations client</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{getClientName(devis)}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p>{getClientAddress(devis)}</p>
                  {devis.client?.telephone && <p>{devis.client.telephone}</p>}
                  {devis.client?.email && <p>{devis.client.email}</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-600">Informations devis</p>
                <div className="mt-2 grid gap-1 text-sm text-slate-600">
                  <p>Creation: <span className="font-medium text-slate-900">{issueDate}</span></p>
                  <p>Derniere validation: <span className="font-medium text-slate-900">{validationDate}</span></p>
                  <p>Conseiller: <span className="font-medium text-slate-900">{getAdvisorName(devis)}</span></p>
                  <p>Mode validation: <span className="font-medium text-slate-900">{getModeValidationLabel(devis.modeValidation)}</span></p>
                </div>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <colgroup>
                  <col className="w-[6%]" />
                  <col className="w-[14%]" />
                  <col className="w-[29%]" />
                  <col className="w-[16%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="px-3 py-3 text-left font-semibold">N°</th>
                    <th className="px-3 py-3 text-left font-semibold">Categorie</th>
                    <th className="px-3 py-3 text-left font-semibold">Tache / Description</th>
                    <th className="px-3 py-3 text-left font-semibold">Materiaux requis</th>
                    <th className="px-3 py-3 text-right font-semibold">Qte</th>
                    <th className="px-3 py-3 text-right font-semibold">TVA</th>
                    <th className="px-3 py-3 text-right font-semibold">PU HT</th>
                    <th className="px-3 py-3 text-right font-semibold">Montant HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {lignes.length > 0 ? (
                    lignes.map((ligne, index) => {
                      const details = getLineDetails(ligne);

                      return (
                        <tr key={ligne.id || index}>
                          <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                          <td className="px-3 py-3 font-medium text-slate-700">{getLineCategory(ligne)}</td>
                          <td className="px-3 py-3 align-top">
                            <p className="font-semibold text-slate-900 break-words">{getLineTitle(ligne)}</p>
                            {details ? <p className="mt-1 text-xs text-slate-500 break-words">{details}</p> : null}
                          </td>
                          <td className="px-3 py-3 text-slate-600 break-words">{getLineMaterials(ligne)}</td>
                          <td className="px-3 py-3 text-right text-slate-700">{ligne.quantite} {ligne.unite}</td>
                          <td className="px-3 py-3 text-right text-slate-700">{tauxTVA.toFixed(2)}%</td>
                          <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(ligne.prixUnitaireVente ?? 0)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatCurrency(ligne.totalHT ?? 0)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400">
                        Aucune ligne de devis pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-3 sm:grid-cols-2">
                <TotalsCard label="Mode de validation" value={getModeValidationLabel(devis.modeValidation)} />
                <TotalsCard label="Taux TVA" value={`${tauxTVA.toFixed(2)}%`} />
                <TotalsCard label="Montant HT" value={formatCurrency(totalHT)} />
                <TotalsCard label="Montant TVA" value={formatCurrency(totalTVA)} />
              </div>

              <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white">
                <p className="text-sm font-semibold text-slate-200">Recapitulatif financier</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-slate-200">
                    <span>Total HT</span>
                    <span className="font-medium">{formatCurrency(totalHT)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-200">
                    <span>TVA</span>
                    <span className="font-medium">{formatCurrency(totalTVA)}</span>
                  </div>
                  <div className="mt-3 border-t border-slate-700 pt-3 flex items-center justify-between">
                    <span className="text-base font-semibold">Total TTC</span>
                    <span className="text-2xl font-bold">{formatCurrency(totalTTC)}</span>
                  </div>
                </div>
              </div>
            </section>

            {showGeneratedDocuments && hasGeneratedDocuments && (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Documents generes</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Facture</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                      {(devis.factures ?? []).length > 0 ? (
                        (devis.factures ?? []).map((facture) => (
                          <div key={facture.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                            <p className="font-medium text-slate-700">{facture.reference}</p>
                            <DocumentActionButton
                              label="Apercu facture"
                              onClick={onOpenFacture ? () => onOpenFacture(facture.id) : undefined}
                            />
                          </div>
                        ))
                      ) : (
                        <p>Aucune facture</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Bon de commande</p>
                    <div className="mt-2 text-sm text-slate-500">
                      {devis.bonCommande ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                          <p className="font-medium text-slate-700">{devis.bonCommande.reference}</p>
                          <DocumentActionButton label="Apercu bon de commande" onClick={onOpenBonCommande} />
                        </div>
                      ) : (
                        <p>Non genere</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Commandes fournisseur</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                      {(devis.commandesFournisseur ?? []).length > 0 ? (
                        (devis.commandesFournisseur ?? []).map((commande) => (
                          <div key={commande.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                            <p className="font-medium text-slate-700">
                              {commande.reference}
                              {commande.fournisseur?.nom ? ` - ${commande.fournisseur.nom}` : ''}
                            </p>
                            <DocumentActionButton
                              label="Apercu bon d achat"
                              onClick={
                                onOpenCommandeFournisseur
                                  ? () => onOpenCommandeFournisseur(commande.id)
                                  : undefined
                              }
                            />
                          </div>
                        ))
                      ) : (
                        <p>Aucune commande</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Modalites de paiement</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {structuredNotes.paymentTerms.split('\n').map((line, index) => (
                    <p key={`payment-${index}`}>{line}</p>
                  ))}
                  {structuredNotes.communication ? (
                    <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                      Communication structuree: {structuredNotes.communication}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Conditions generales</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {structuredNotes.generalConditions.split('\n').map((line, index) => (
                    <p key={`general-${index}`}>{line}</p>
                  ))}
                  {structuredNotes.extraNotes ? (
                    <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                      Note complementaire: {structuredNotes.extraNotes}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="border-b border-slate-200 pb-3">
                <p className="text-sm font-semibold text-slate-700">Signatures</p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-700">Signature du client</p>
                  {devis.signatureClientBase64 ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <img
                        src={devis.signatureClientBase64}
                        alt="Signature client"
                        className="h-20 w-full object-contain"
                      />
                      {devis.signatureClientDate ? (
                        <p className="mt-2 text-xs text-slate-500">Signe le {formatDate(devis.signatureClientDate)}</p>
                      ) : null}
                    </div>
                  ) : devis.statut === 'SIGNE' ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
                      <p className="text-sm font-semibold text-emerald-700">Signature orale</p>
                      {devis.signatureClientDate ? (
                        <p className="mt-1 text-xs text-slate-500">Valide le {formatDate(devis.signatureClientDate)}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-5 h-12 border-b border-dashed border-slate-300" />
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-700">Signature du conseiller</p>
                  {devis.signatureConseillerBase64 ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                      <img
                        src={devis.signatureConseillerBase64}
                        alt="Signature conseiller"
                        className="h-20 w-full object-contain"
                      />
                      {devis.signatureConseillerDate ? (
                        <p className="mt-2 text-xs text-slate-500">Signe le {formatDate(devis.signatureConseillerDate)}</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-5 h-12 border-b border-dashed border-slate-300" />
                  )}
                </div>
              </div>
            </section>

            <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
              Reference document: {devis.reference}
            </footer>
          </article>
        </div>
      </div>

      <style>{`
        @page {
          size: A4;
          margin: 8mm;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          .devis-print-root {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            display: block !important;
            background: white !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .devis-print-zone,
          .devis-print-zone * {
            visibility: visible !important;
          }

          .devis-print-zone {
            display: block !important;
            position: static !important;
            inset: auto !important;
            max-height: none !important;
            max-width: none !important;
            width: 100% !important;
            overflow: visible !important;
            height: auto !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .devis-print-scroll {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            background: white !important;
            padding: 0 !important;
          }

          .devis-print-zone article {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 6mm !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
          }

          .devis-print-zone .text-4xl {
            font-size: 28px !important;
            line-height: 1.1 !important;
          }

          .devis-print-zone .text-3xl {
            font-size: 22px !important;
            line-height: 1.15 !important;
          }

          .devis-print-zone .text-2xl {
            font-size: 18px !important;
            line-height: 1.2 !important;
          }

          .devis-print-zone .mt-8 {
            margin-top: 3mm !important;
          }

          .devis-print-zone .mt-6 {
            margin-top: 2.5mm !important;
          }

          .devis-print-zone .p-5,
          .devis-print-zone .p-6 {
            padding: 2.8mm !important;
          }

          .devis-print-zone table {
            width: 100% !important;
            break-inside: auto;
            font-size: 10px !important;
          }

          .devis-print-zone thead {
            display: table-header-group;
          }

          .devis-print-zone tr,
          .devis-print-zone td,
          .devis-print-zone th {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .devis-print-zone th,
          .devis-print-zone td {
            padding: 2mm 1.5mm !important;
            vertical-align: top;
          }

          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
