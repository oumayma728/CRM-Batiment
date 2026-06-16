// Données mock pour le développement
export const MOCK_DATA = {
  clients: { 
    meta: { total: 45 },
    data: [
      { id: 1, nom: 'Dupont', prenom: 'Jean', email: 'jean@example.com' },
      { id: 2, nom: 'Martin', prenom: 'Marie', email: 'marie@example.com' }
    ]
  },
  demandes: { 
    meta: { total: 23 },
    data: [
      { id: 1, reference: 'DEM-001', statut: 'en_attente' },
      { id: 2, reference: 'DEM-002', statut: 'en_cours' }
    ]
  },
  devis: { 
    meta: { total: 67 },
    data: [
      { id: 1, reference: 'DEV-001', montant: 15000 },
      { id: 2, reference: 'DEV-002', montant: 25000 }
    ]
  },
  prestations: { 
    total: 89,
    data: [
      { id: 1, nom: 'Rénovation complète' },
      { id: 2, nom: 'Installation électrique' }
    ]
  },
  fournisseurs: { 
    total: 34,
    data: [
      { id: 1, nom: 'Fournisseur A' },
      { id: 2, nom: 'Fournisseur B' }
    ]
  },
  chantiers: { 
    meta: { total: 18 },
    data: [
      { id: 1, nom: 'Chantier A', statut: 'en_cours' },
      { id: 2, nom: 'Chantier B', statut: 'termine' }
    ]
  }
};

// Simuler un délai réseau
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour simuler des appels API
export const mockApiCall = async (endpoint: string, mockData: any) => {
  await delay(500);
  console.log(`📡 Mock API appelé: ${endpoint}`);
  return mockData;
};