import { formatCurrency, formatDate } from '@/lib/utils';
import type { Devis, Facture, LigneDevis } from '@/types';
import { getClientDisplayName, getChantierAddress } from '@/lib/documentBuilders';
import { parseStructuredDevisNotes } from '@/lib/devisStructuredNotes';
import { PrintDocumentModal } from './PrintDocumentModal';

interface FactureDocumentProps {
  devis: Devis;
  facture: Facture;
  onClose: () => void;
  onPrint: () => void;
}

function getLineTitle(ligne: LigneDevis) {
  return ligne.description?.trim() || ligne.prestation?.nom || 'Ligne facture';
}

function getLineDetails(ligne: LigneDevis) {
  const details = [
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

export function FactureDocument({
  devis,
  facture,
  onClose,
  onPrint,
}: FactureDocumentProps) {
  const lignes = [...(devis.lignes ?? [])].sort((a, b) => a.ordre - b.ordre);
  const structuredNotes = parseStructuredDevisNotes(devis.notes);
  const tauxTVA = devis.tauxTVA ?? 20;
  const paymentLabel = structuredNotes.paymentTerms.split('\n')[0] || 'Paiement a reception de facture.';

  return (
    <PrintDocumentModal
      title="Facture"
      subtitle="Document comptable pret a l'impression"
      onClose={onClose}
      onPrint={onPrint}
    >
      <article className="mx-auto w-full max-w-[920px] rounded-[30px] bg-white p-6 text-slate-800 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:p-10">
        <div className="flex flex-col gap-8 border-b border-slate-200 pb-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">BATIFLOW</p>
            <p className="text-sm text-slate-500">Facturation travaux & renovation</p>
            <div className="mt-4 space-y-1 text-sm text-slate-500">
              <p>contact@crm-batiment.fr</p>
              <p>+33 1 23 45 67 89</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl bg-slate-50 p-5 md:min-w-[290px]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Facture</span>
              <span className="font-semibold text-slate-900">{facture.reference}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-900">{formatDate(facture.date)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Devis source</span>
              <span className="font-medium text-slate-900">{devis.reference}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Statut</span>
              <span className="font-medium text-slate-900">{facture.statut}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Facturer a
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {getClientDisplayName(devis)}
            </p>
            <div className="mt-2 space-y-1 text-sm text-slate-500">
              <p>{getChantierAddress(devis)}</p>
              {devis.client?.email ? <p>{devis.client.email}</p> : null}
              {devis.client?.telephone ? <p>{devis.client.telephone}</p> : null}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 px-6 py-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Total a payer
            </p>
            <p className="mt-4 text-4xl font-bold">
              {formatCurrency(facture.montantTTC)}
            </p>
            <div className="mt-5 grid gap-2 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Total HT</span>
                <span className="font-medium text-white">
                  {formatCurrency(facture.montantHT)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>TVA</span>
                <span className="font-medium text-white">
                  {formatCurrency(facture.montantTVA)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-left text-sm text-white">
                <th className="px-4 py-3 font-semibold md:px-5">N°</th>
                <th className="px-4 py-3 font-semibold md:px-5">Description</th>
                <th className="px-4 py-3 font-semibold md:px-5">Date</th>
                <th className="px-4 py-3 font-semibold md:px-5">Categorie</th>
                <th className="px-4 py-3 text-right font-semibold md:px-5">Quantite</th>
                <th className="px-4 py-3 text-right font-semibold md:px-5">Prix U.</th>
                <th className="px-4 py-3 text-right font-semibold md:px-5">TVA</th>
                <th className="px-4 py-3 text-right font-semibold md:px-5">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {lignes.map((ligne, index) => (
                <tr key={ligne.id || index}>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-500 md:px-5">{index + 1}</td>
                  <td className="px-4 py-4 md:px-5">
                    <p className="text-sm font-semibold text-slate-900">{getLineTitle(ligne)}</p>
                    {getLineDetails(ligne) ? (
                      <p className="mt-1 text-xs text-slate-500">{getLineDetails(ligne)}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700 md:px-5">{formatDate(facture.date)}</td>
                  <td className="px-4 py-4 text-sm text-slate-700 md:px-5">{getLineCategory(ligne)}</td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700 md:px-5">
                    {ligne.quantite} {ligne.unite}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700 md:px-5">
                    {formatCurrency(ligne.prixUnitaireVente ?? 0)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700 md:px-5">{tauxTVA.toFixed(2)}%</td>
                  <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900 md:px-5">
                    {formatCurrency(ligne.totalHT ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total HT</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(facture.montantHT)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">TVA</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(facture.montantTVA)}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-amber-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total TTC</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(facture.montantTTC)}</p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          <p className="font-semibold text-slate-900">Conditions de paiement: {paymentLabel}</p>
          {structuredNotes.communication ? (
            <p>Communication structuree: {structuredNotes.communication}</p>
          ) : null}
          {structuredNotes.generalConditions.split('\n').map((line, index) => (
            <p key={`facture-general-${index}`}>{line}</p>
          ))}
          <p>Document genere automatiquement a partir du devis valide {devis.reference}.</p>
        </div>
      </article>
    </PrintDocumentModal>
  );
}
