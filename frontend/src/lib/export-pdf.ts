import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DocumentItem, DocumentType } from '../types';

export function exportDocumentsToPdf(
  documents: DocumentItem[],
  typeDocument: DocumentType = 'facture',
  filename?: string
): void {
  if (!documents || documents.length === 0) return;

  const targetDocs = documents.filter((d) => (d.type_document || 'facture') === typeDocument);
  if (targetDocs.length === 0) return;

  const isPlan = typeDocument === 'plan';
  const defaultFilename = isPlan ? 'rapport_plans.pdf' : 'rapport_factures.pdf';
  const finalFilename = filename || defaultFilename;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const exportDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFontSize(16);
  doc.setTextColor(31, 168, 179);
  doc.text(isPlan ? 'RAPPORT EXTRACTION PLANS ARCHITECTURAUX' : 'RAPPORT DE TRAITEMENT OCR FACTURES', 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(139, 147, 163);
  doc.text(`Généré le : ${exportDate} | Nombre de documents : ${targetDocs.length}`, 14, 21);

  doc.setDrawColor(46, 54, 70);
  doc.setLineWidth(0.5);
  doc.line(14, 24, 283, 24);

  if (isPlan) {
    const tableData = targetDocs.map((d) => {
      const piecesSummary = (d.pieces || [])
        .map((p) => {
          const surf = p.surface_m2 !== null && p.surface_m2 !== undefined ? ` (${p.surface_m2}m²)` : '';
          return `${p.nom}${surf}`;
        })
        .join(', ');
      return [
        d.nom_fichier,
        `${(d.pieces || []).length} pièce(s) : ${piecesSummary}`,
        d.surface_totale_m2 !== null && d.surface_totale_m2 !== undefined ? `${d.surface_totale_m2.toFixed(2)} m²` : '-',
        d.statut === 'valide' ? 'Validé' : d.statut === 'rejete' ? 'Rejeté' : 'En attente',
        d.technologie,
        d.date_traitement ? new Date(d.date_traitement).toLocaleDateString('fr-FR') : '-',
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['Plan / Fichier', 'Pièces Détectées & Surfaces', 'Surface Totale', 'Statut', 'Techno', 'Traitement']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [232, 234, 237],
        fillColor: [26, 31, 43],
        lineColor: [46, 54, 70],
      },
      headStyles: {
        fillColor: [16, 19, 26],
        textColor: [31, 168, 179],
        fontStyle: 'bold',
      },
      columnStyles: {
        2: { halign: 'right', font: 'courier' },
      },
    });
  } else {
    const tableData = targetDocs.map((d) => [
      d.date_facture || '-',
      d.numero_facture || '-',
      d.nom_fournisseur || '-',
      d.montant_ht !== null ? `${d.montant_ht.toFixed(2)} €` : '-',
      d.montant_tva !== null ? `${d.montant_tva.toFixed(2)} €` : '-',
      d.montant_ttc !== null ? `${d.montant_ttc.toFixed(2)} €` : '-',
      d.statut === 'valide' ? 'Validé' : d.statut === 'rejete' ? 'Rejeté' : 'En attente',
      d.technologie,
      d.date_traitement ? new Date(d.date_traitement).toLocaleDateString('fr-FR') : '-',
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Date', 'N° Facture', 'Fournisseur', 'Montant HT', 'Montant TVA', 'Montant TTC', 'Statut', 'Techno', 'Traitement']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [232, 234, 237],
        fillColor: [26, 31, 43],
        lineColor: [46, 54, 70],
      },
      headStyles: {
        fillColor: [16, 19, 26],
        textColor: [31, 168, 179],
        fontStyle: 'bold',
      },
      columnStyles: {
        3: { halign: 'right', font: 'courier' },
        4: { halign: 'right', font: 'courier' },
        5: { halign: 'right', font: 'courier' },
      },
    });
  }

  doc.save(finalFilename);
}
