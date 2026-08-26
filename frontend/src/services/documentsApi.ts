import type { DocumentItem, DocumentFilterState, TableSortState } from '../types';

export async function fetchDocuments(
  filters?: Partial<DocumentFilterState>,
  sort?: TableSortState
): Promise<DocumentItem[]> {
  const params = new URLSearchParams();

  if (filters?.typeDocument) {
    params.append('type_document', filters.typeDocument);
  }
  if (filters?.statut && filters.statut !== 'all') {
    params.append('statut', filters.statut);
  }
  if (filters?.search) {
    params.append('fournisseur', filters.search);
  }
  if (filters?.dateDebut) {
    params.append('date_debut', filters.dateDebut);
  }
  if (filters?.dateFin) {
    params.append('date_fin', filters.dateFin);
  }
  if (filters?.montantMin) {
    params.append('montant_min', filters.montantMin);
  }
  if (filters?.montantMax) {
    params.append('montant_max', filters.montantMax);
  }
  if (sort) {
    params.append('sort_by', sort.column);
    params.append('sort_dir', sort.direction);
  }

  const response = await fetch(`/api/documents/?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Erreur récupération documents (${response.status})`);
  }
  return response.json();
}

export async function fetchDocumentById(id: number): Promise<DocumentItem> {
  const response = await fetch(`/api/documents/${id}`);
  if (!response.ok) {
    throw new Error(`Document ${id} introuvable`);
  }
  return response.json();
}

export async function updateDocumentFields(
  id: number,
  fields: Partial<DocumentItem>
): Promise<DocumentItem> {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    throw new Error(`Erreur mise à jour document ${id}`);
  }
  return response.json();
}

export function getDocumentFileUrl(id: number): string {
  return `/api/documents/${id}/fichier`;
}
