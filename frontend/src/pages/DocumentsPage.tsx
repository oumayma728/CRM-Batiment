import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDocuments } from '../services/documentsApi';
import type { DocumentItem, DocumentFilterState, TableSortState, DocumentType } from '../types';
import { DocumentsTable } from '../components/DocumentsTable';
import { ExportBar } from '../components/ExportBar';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State
  const [filters, setFilters] = useState<DocumentFilterState>({
    typeDocument: 'facture',
    search: '',
    statut: 'all',
    dateDebut: '',
    dateFin: '',
    montantMin: '',
    montantMax: '',
    montantType: 'ttc',
  });

  // Sort State
  const [sort, setSort] = useState<TableSortState>({
    column: 'date_traitement',
    direction: 'desc',
  });

  useEffect(() => {
    loadDocuments();
  }, [filters.typeDocument, filters.statut, filters.dateDebut, filters.dateFin, filters.montantMin, filters.montantMax, sort]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDocuments(filters, sort);
      setDocuments(data);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeToggle = (newType: DocumentType) => {
    if (newType === filters.typeDocument) return;
    setSelectedIds([]);
    setFilters((prev) => ({
      ...prev,
      typeDocument: newType,
      search: '',
      statut: 'all',
    }));
  };

  const filteredDocuments = useMemo(() => {
    if (!filters.search.trim()) return documents;
    const q = filters.search.toLowerCase().trim();
    return documents.filter((d) => {
      const nomMatch = d.nom_fichier && d.nom_fichier.toLowerCase().includes(q);
      const fournMatch = d.nom_fournisseur && d.nom_fournisseur.toLowerCase().includes(q);
      const numMatch = d.numero_facture && d.numero_facture.toLowerCase().includes(q);
      const pieceMatch = d.pieces && d.pieces.some((p) => p.nom.toLowerCase().includes(q));
      return nomMatch || fournMatch || numMatch || pieceMatch;
    });
  }, [documents, filters.search]);

  const selectedDocuments = useMemo(() => {
    return filteredDocuments.filter((d) => selectedIds.includes(d.id));
  }, [filteredDocuments, selectedIds]);

  const handleSortChange = (column: keyof DocumentItem) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredDocuments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDocuments.map((d) => d.id));
    }
  };

  const isPlan = filters.typeDocument === 'plan';

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Tableau des Documents Extraits</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Consultez, filtrez, triez et exportez l'ensemble des factures et plans architecturaux traités.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs Toggle: Factures vs Plans */}
          <div className="glass-panel border border-white/10 rounded-lg p-1 flex gap-1">
            <button
              onClick={() => handleTypeToggle('facture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                !isPlan
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Factures</span>
            </button>

            <button
              onClick={() => handleTypeToggle('plan')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                isPlan
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">architecture</span>
              <span>Plans Architecturaux</span>
            </button>
          </div>

          <button
            onClick={loadDocuments}
            className="p-2 rounded-lg glass-panel border border-white/10 text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
            title="Actualiser la liste"
          >
            <span className={`material-symbols-outlined text-[18px] w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel border border-white/10 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Text Search */}
          <div className="md:col-span-4 relative">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 top-2">search</span>
            <input
              type="text"
              placeholder={isPlan ? 'Recherche plan, pièce (ex: Salon)...' : 'Recherche fournisseur, n° facture...'}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-[#09090b] border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              className="w-full bg-[#09090b] border border-white/10 rounded-md px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente de validation</option>
              <option value="valide">Validés</option>
              <option value="rejete">Rejetés</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="md:col-span-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">calendar_month</span>
            <input
              type="date"
              value={filters.dateDebut}
              onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })}
              className="w-full bg-[#09090b] border border-white/10 rounded-md px-2 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
            <span className="text-xs text-on-surface-variant">à</span>
            <input
              type="date"
              value={filters.dateFin}
              onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })}
              className="w-full bg-[#09090b] border border-white/10 rounded-md px-2 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Financial Amount Range (Only shown for Factures) */}
        {!isPlan && (
          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">euro</span>
            <span className="text-xs text-on-surface-variant">Montant ({filters.montantType.toUpperCase()}) :</span>

            <input
              type="number"
              placeholder="Min €"
              value={filters.montantMin}
              onChange={(e) => setFilters({ ...filters, montantMin: e.target.value })}
              className="w-24 bg-[#09090b] border border-white/10 rounded-md px-2 py-1 text-xs text-on-surface font-mono-tnum focus:outline-none focus:border-primary"
            />
            <span className="text-xs text-on-surface-variant">-</span>
            <input
              type="number"
              placeholder="Max €"
              value={filters.montantMax}
              onChange={(e) => setFilters({ ...filters, montantMax: e.target.value })}
              className="w-24 bg-[#09090b] border border-white/10 rounded-md px-2 py-1 text-xs text-on-surface font-mono-tnum focus:outline-none focus:border-primary"
            />

            {(filters.search || filters.statut !== 'all' || filters.dateDebut || filters.dateFin || filters.montantMin || filters.montantMax) && (
              <button
                onClick={() =>
                  setFilters({
                    typeDocument: filters.typeDocument,
                    search: '',
                    statut: 'all',
                    dateDebut: '',
                    dateFin: '',
                    montantMin: '',
                    montantMax: '',
                    montantType: 'ttc',
                  })
                }
                className="text-xs text-primary hover:underline ml-auto"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Export Bar */}
      <ExportBar
        allDocuments={filteredDocuments}
        selectedDocuments={selectedDocuments}
        typeDocument={filters.typeDocument}
      />

      {/* Documents Table */}
      <DocumentsTable
        documents={filteredDocuments}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        sort={sort}
        onSortChange={handleSortChange}
        onOpenDocument={(doc) => navigate(`/validation/${doc.id}`)}
        typeDocument={filters.typeDocument}
      />
    </div>
  );
};
