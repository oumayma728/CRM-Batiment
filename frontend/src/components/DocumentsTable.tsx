import React from 'react';
import { StatusBadge } from './StatusBadge';

interface DocumentsTableProps {
  documents: any[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  sort: { column: string; direction: 'asc' | 'desc' };
  onSortChange: (column: any) => void;
  onOpenDocument: (doc: any) => void;
  typeDocument: string;
}

export const DocumentsTable: React.FC<DocumentsTableProps> = ({
  documents,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSortChange,
  onOpenDocument,
  typeDocument
}) => {
  const isAllSelected = documents.length > 0 && selectedIds.length === documents.length;

  return (
    <div className="overflow-x-auto rounded-lg border border-outline/30">
      <table className="w-full text-left text-sm text-on-surface">
        <thead className="bg-surface-container text-xs uppercase text-on-surface-variant border-b border-outline/30">
          <tr>
            <th className="p-3 w-12" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={isAllSelected} onChange={onToggleSelectAll} onClick={(e) => e.stopPropagation()} className="rounded border-outline/30 text-primary focus:ring-primary bg-surface-container" />
            </th>
            <th className="p-3 cursor-pointer hover:text-on-surface" onClick={() => onSortChange('nom_fichier')}>Fichier</th>
            {typeDocument !== 'plan' && (
              <>
                <th className="p-3 cursor-pointer hover:text-on-surface" onClick={() => onSortChange('nom_fournisseur')}>Fournisseur / Projet</th>
                <th className="p-3 cursor-pointer hover:text-on-surface" onClick={() => onSortChange('date_facture')}>Date</th>
              </>
            )}
            {typeDocument === 'facture' && (
              <th className="p-3 cursor-pointer hover:text-on-surface" onClick={() => onSortChange('montant_ttc')}>Montant TTC</th>
            )}
            {typeDocument === 'plan' && (
              <>
                <th className="p-3">Nb Pièces</th>
                <th className="p-3 cursor-pointer hover:text-on-surface" onClick={() => onSortChange('surface_totale_m2')}>Surface Totale</th>
              </>
            )}
            <th className="p-3">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline/10 bg-surface">
          {documents.map((doc) => (
            <tr key={doc.id} onClick={() => onOpenDocument(doc)} className="hover:bg-surface-variant/30 transition-colors cursor-pointer">
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => onToggleSelect(doc.id)} onClick={(e) => e.stopPropagation()} className="rounded border-outline/30 text-primary focus:ring-primary bg-surface-container" />
              </td>
              <td className="p-3 font-medium">{doc.nom_fichier}</td>
              {typeDocument !== 'plan' && (
                <>
                  <td className="p-3">{doc.nom_fournisseur || '-'}</td>
                  <td className="p-3">{doc.date_facture || '-'}</td>
                </>
              )}
              {typeDocument === 'facture' && (
                <td className="p-3 font-mono-tnum">{doc.montant_ttc ? `${doc.montant_ttc} €` : '-'}</td>
              )}
              {typeDocument === 'plan' && (
                <>
                  <td className="p-3 font-mono-tnum">{(doc.pieces || []).length}</td>
                  <td className="p-3 font-mono-tnum">{doc.surface_totale_m2 !== null && doc.surface_totale_m2 !== undefined ? `${doc.surface_totale_m2} m²` : '-'}</td>
                </>
              )}
              <td className="p-3"><StatusBadge status={doc.statut} /></td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr>
              <td colSpan={typeDocument === 'facture' ? 6 : 5} className="p-8 text-center text-on-surface-variant">
                Aucun document trouvé.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};