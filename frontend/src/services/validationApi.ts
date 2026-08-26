/**
 * Service de validation humaine — appels directs aux endpoints backend.
 *
 * Remplace validationApi.mock.ts (qui simulait un faux délai réseau).
 * Ce module appelle les vrais endpoints PATCH /api/documents/:id et
 * PATCH /api/documents/:id/statut sans délai artificiel.
 */
import type { DocumentItem } from '../types';

export async function confirmDocumentValidation(
  id: number,
  updatedFields?: Partial<DocumentItem>
): Promise<DocumentItem> {
  // Mettre à jour les champs si édités
  if (updatedFields && Object.keys(updatedFields).length > 0) {
    const patchRes = await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields),
    });
    if (!patchRes.ok) {
      throw new Error(`Erreur lors de la mise à jour des champs du document ${id}`);
    }
  }

  // Marquer le statut comme "valide"
  const res = await fetch(`/api/documents/${id}/statut`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statut: 'valide' }),
  });

  if (!res.ok) {
    throw new Error(`Échec de confirmation du document ${id}`);
  }

  return res.json();
}

export async function rejectDocumentValidation(
  id: number,
  motifRejet?: string
): Promise<DocumentItem> {
  const res = await fetch(`/api/documents/${id}/statut`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      statut: 'rejete',
      motif_rejet: motifRejet || 'Document rejeté lors de la vérification humaine',
    }),
  });

  if (!res.ok) {
    throw new Error(`Échec du rejet du document ${id}`);
  }

  return res.json();
}
