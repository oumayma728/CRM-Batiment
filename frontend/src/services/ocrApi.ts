import type { FactureExtractionResult, PlanResponse } from '../types';

export async function extractFacture(file: File, technology: string): Promise<FactureExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `/api/ia/ocr-facture?technology=${encodeURIComponent(technology)}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Erreur réseau lors de l\'extraction.' }));
    throw new Error(errorData.detail || `Erreur serveur ${response.status}`);
  }

  return response.json();
}

export async function extractPlan(file: File, technology: string): Promise<PlanResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `/api/ia/devis-from-plan?technology=${encodeURIComponent(technology)}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Erreur réseau lors de l\'extraction du plan.' }));
    throw new Error(errorData.detail || `Erreur serveur ${response.status}`);
  }

  return response.json();
}
