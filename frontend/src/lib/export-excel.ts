import ExcelJS from 'exceljs';
import type { DocumentItem, DocumentType } from '../types';

const HEADER_BG_COLOR = 'FF7030A0';
const HEADER_FONT_COLOR = 'FFFFFFFF';
const ROW_ALT_BG_COLOR = 'FFE6E0EC';

function applyStylesToWorksheet(worksheet: ExcelJS.Worksheet) {
  if (worksheet.rowCount === 0) return;

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columns.length }
  };

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG_COLOR }
    };
    cell.font = {
      color: { argb: HEADER_FONT_COLOR },
      bold: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    };
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
        };
        if (rowNumber % 2 !== 0) {
           cell.fill = {
             type: 'pattern',
             pattern: 'solid',
             fgColor: { argb: ROW_ALT_BG_COLOR }
           };
        }
      });
    }
  });
}

async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportDocumentsToExcel(
  documents: DocumentItem[],
  typeDocument: DocumentType = 'facture',
  filename?: string
): Promise<void> {
  if (!documents || documents.length === 0) return;

  const actualType = (typeDocument === 'tous' as any) ? (documents[0]?.type_document || 'facture') : typeDocument;
  const targetDocs = documents.filter((d) => (d.type_document || 'facture') === actualType && d.statut === 'valide');
  
  if (targetDocs.length === 0) {
    console.warn("Aucun document validé à exporter.");
    return;
  }

  const defaultFilename = actualType === 'plan' ? 'export_plans_valides.xlsx' : 'export_factures_validees.xlsx';
  const finalFilename = filename || defaultFilename;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(actualType === 'plan' ? 'Pièces (Plans)' : 'Lignes Factures');

  if (actualType === 'plan') {
    worksheet.columns = [
      { header: 'Document', key: 'document', width: 25 },
      { header: 'Niveau', key: 'niveau', width: 15 },
      { header: 'Nom / espace', key: 'nom', width: 35 },
      { header: 'Cotes', key: 'cotes', width: 20 },
      { header: 'Dimensions', key: 'dimensions', width: 20 },
      { header: 'Surface', key: 'surface', width: 15 },
    ];

    targetDocs.forEach((doc) => {
      const pieces = doc.pieces || [];
      if (pieces.length === 0) {
        worksheet.addRow({
          document: doc.nom_fichier, niveau: '-', nom: 'Aucune pièce détectée'
        });
      } else {
        pieces.forEach((p) => {
          worksheet.addRow({
            document: doc.nom_fichier,
            niveau: p.niveau || '-',
            nom: p.nom,
            cotes: (p.cotes_originales || p.cotes || []).join('; '),
            dimensions: (p.longueur_m && p.largeur_m) ? `${p.longueur_m}m x ${p.largeur_m}m` : '',
            surface: p.surface_m2 !== null && p.surface_m2 !== undefined ? p.surface_m2 : '',
          });
        });
      }
    });
  } else {
    worksheet.columns = [
      { header: 'Fichier source', key: 'fichier', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Numéro de facture', key: 'numero', width: 20 },
      { header: 'Fournisseur', key: 'fournisseur', width: 30 },
      { header: 'Montant HT', key: 'ht', width: 15 },
      { header: 'TVA', key: 'tva', width: 15 },
      { header: 'Montant TTC', key: 'ttc', width: 15 },
      { header: 'Références produits', key: 'produits', width: 40 },
    ];

    targetDocs.forEach((doc) => {
      const produits = doc.produits || [];
      const baseRow = {
        fichier: doc.nom_fichier,
        date: doc.date_facture || '',
        numero: doc.numero_facture || '',
        fournisseur: doc.nom_fournisseur || '',
        ht: doc.montant_ht !== null && doc.montant_ht !== undefined ? doc.montant_ht : '',
        tva: doc.montant_tva !== null && doc.montant_tva !== undefined ? doc.montant_tva : '',
        ttc: doc.montant_ttc !== null && doc.montant_ttc !== undefined ? doc.montant_ttc : '',
      };

      if (produits.length === 0) {
        worksheet.addRow({ ...baseRow, produits: 'Aucun produit détecté' });
      } else {
        produits.forEach((prod) => {
          worksheet.addRow({ ...baseRow, produits: prod });
        });
      }
    });
  }

  applyStylesToWorksheet(worksheet);
  await saveWorkbook(workbook, finalFilename);
}

export async function exportSinglePlanToExcel(doc: DocumentItem): Promise<void> {
  if (!doc || doc.type_document !== 'plan') return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pièces du Plan');
  const pieces = doc.pieces || [];

  worksheet.columns = [
    { header: 'Niveau', key: 'niveau', width: 15 },
    { header: 'Nom / espace', key: 'nom', width: 35 },
    { header: 'Cotes', key: 'cotes', width: 20 },
    { header: 'Dimensions', key: 'dimensions', width: 20 },
    { header: 'Surface', key: 'surface', width: 15 },
  ];

  if (pieces.length === 0) {
    worksheet.addRow({ niveau: '-', nom: 'Aucune pièce détectée' });
  } else {
    pieces.forEach((p) => {
      worksheet.addRow({
        niveau: p.niveau || '-',
        nom: p.nom,
        cotes: (p.cotes_originales || p.cotes || []).join('; '),
        dimensions: (p.longueur_m && p.largeur_m) ? `${p.longueur_m}m x ${p.largeur_m}m` : '',
        surface: p.surface_m2 !== null && p.surface_m2 !== undefined ? p.surface_m2 : '',
      });
    });
  }

  applyStylesToWorksheet(worksheet);
  const baseName = doc.nom_fichier ? doc.nom_fichier.replace(/\.[^/.]+$/, "") : `Plan_${doc.id}`;
  await saveWorkbook(workbook, `Export_${baseName}.xlsx`);
}

export async function exportSingleFactureToExcel(doc: DocumentItem): Promise<void> {
  if (!doc || doc.type_document !== 'facture') return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Détails Facture');
  const produits = doc.produits || [];

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Numéro de facture', key: 'numero', width: 20 },
    { header: 'Fournisseur', key: 'fournisseur', width: 30 },
    { header: 'Montant HT', key: 'ht', width: 15 },
    { header: 'TVA', key: 'tva', width: 15 },
    { header: 'Montant TTC', key: 'ttc', width: 15 },
    { header: 'Références produits', key: 'produits', width: 40 },
  ];

  const baseRow = {
    date: doc.date_facture || '',
    numero: doc.numero_facture || '',
    fournisseur: doc.nom_fournisseur || '',
    ht: doc.montant_ht !== null && doc.montant_ht !== undefined ? doc.montant_ht : '',
    tva: doc.montant_tva !== null && doc.montant_tva !== undefined ? doc.montant_tva : '',
    ttc: doc.montant_ttc !== null && doc.montant_ttc !== undefined ? doc.montant_ttc : '',
  };

  if (produits.length === 0) {
    worksheet.addRow({ ...baseRow, produits: 'Aucun produit détecté' });
  } else {
    produits.forEach((prod) => {
      worksheet.addRow({ ...baseRow, produits: prod });
    });
  }

  applyStylesToWorksheet(worksheet);
  const baseName = doc.nom_fichier ? doc.nom_fichier.replace(/\.[^/.]+$/, "") : `Facture_${doc.id}`;
  await saveWorkbook(workbook, `Export_${baseName}.xlsx`);
}
