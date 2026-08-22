import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MOCK_DATA, mockApiCall } from '@/lib/mockData';

// Variable pour activer/désactiver le mode mock
const USE_MOCK_DATA = true; // Mettez à false quand l'API est prête

export const useDashboardData = () => {
  const fetchWithFallback = async (endpoint: string, mockData: any) => {
    if (USE_MOCK_DATA) {
      return mockApiCall(endpoint, mockData);
    }
    
    try {
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.warn(`⚠️ Erreur API pour ${endpoint}, utilisation des données mock`, error);
      return mockData;
    }
  };

  const { data: clients, refetch: refetchClients, isLoading: clientsLoading } = useQuery({ 
    queryKey: ['clients-count'], 
    queryFn: () => fetchWithFallback('/clients?page=1&limit=1', MOCK_DATA.clients),
    retry: 1,
    staleTime: 30000
  });
  
  const { data: demandes, refetch: refetchDemandes, isLoading: demandesLoading } = useQuery({ 
    queryKey: ['demandes-count'], 
    queryFn: () => fetchWithFallback('/demandes-devis?page=1&limit=1', MOCK_DATA.demandes),
    retry: 1,
    staleTime: 30000
  });
  
  const { data: devis, refetch: refetchDevis, isLoading: devisLoading } = useQuery({ 
    queryKey: ['devis-count'], 
    queryFn: () => fetchWithFallback('/devis?page=1&limit=1', MOCK_DATA.devis),
    retry: 1,
    staleTime: 30000
  });
  
  const { data: prestations, refetch: refetchPrestations, isLoading: prestationsLoading } = useQuery({ 
    queryKey: ['prestations-count'], 
    queryFn: async () => {
      const result = await fetchWithFallback('/prestations', MOCK_DATA.prestations);
      return { total: result.total || result?.data?.length || 0 };
    },
    retry: 1,
    staleTime: 30000
  });
  
  const { data: fournisseurs, refetch: refetchFournisseurs, isLoading: fournisseursLoading } = useQuery({ 
    queryKey: ['fournisseurs-count'], 
    queryFn: async () => {
      const result = await fetchWithFallback('/fournisseurs', MOCK_DATA.fournisseurs);
      return { total: result.total || result?.data?.length || 0 };
    },
    retry: 1,
    staleTime: 30000
  });
  
  const { data: chantiers, refetch: refetchChantiers, isLoading: chantiersLoading } = useQuery({ 
    queryKey: ['chantiers-count'], 
    queryFn: () => fetchWithFallback('/chantiers?page=1&limit=1', MOCK_DATA.chantiers),
    retry: 1,
    staleTime: 30000
  });

  const totalClients = clients?.meta?.total ?? MOCK_DATA.clients.meta.total;
  const totalDemandes = demandes?.meta?.total ?? MOCK_DATA.demandes.meta.total;
  const totalDevis = devis?.meta?.total ?? MOCK_DATA.devis.meta.total;
  const totalPrestations = prestations?.total ?? MOCK_DATA.prestations.total;
  const totalFournisseurs = fournisseurs?.total ?? MOCK_DATA.fournisseurs.total;
  const totalChantiers = chantiers?.meta?.total ?? MOCK_DATA.chantiers.meta.total;

  const isLoading = clientsLoading || demandesLoading || devisLoading || 
                    prestationsLoading || fournisseursLoading || chantiersLoading;

  const refetchAll = () => {
    refetchClients();
    refetchDemandes();
    refetchDevis();
    refetchPrestations();
    refetchFournisseurs();
    refetchChantiers();
  };

  return {
    // Données
    totalClients,
    totalDemandes,
    totalDevis,
    totalPrestations,
    totalFournisseurs,
    totalChantiers,
    // États
    isLoading,
    // Actions
    refetchAll,
  };
};