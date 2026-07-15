// DashboardPage.tsx - Version avec Dark Mode, tri, recherche et fonctionnalités avancées
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Users, FileText, FileSpreadsheet, Clock, CheckCircle, ArrowRight,
  Building2, BookOpen, Truck, HardHat, Euro, Target, Zap,
  UserPlus, FilePlus, TrendingUp, Bell, Calendar, Activity,
  AlertTriangle, Trophy, Wallet, MapPin, Sparkles, Rocket,
  MessageCircle, Plus, Search, X, RefreshCw, Download,
  TrendingDown, Star, Settings, Loader2, Filter, SortAsc, SortDesc,
  Grid3x3, List, Eye, EyeOff, Maximize2, Minimize2, Menu,
  Moon, Sun
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // État pour le mode sombre
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // États pour la recherche et le filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all'); // all, modules, kpis, tasks
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // États pour le tri
  const [sortBy, setSortBy] = useState('value'); // value, label, trend
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  
  // États pour l'affichage
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [visibleSections, setVisibleSections] = useState({
    kpiCards: true,
    modules: true,
    tasks: true,
    messages: true,
    stats: true
  });
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  
  // États pour les favoris
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('dashboard_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  // États pour les notifications
  const [notifications, setNotifications] = useState([
    { id: 1, title: '3 devis en attente de validation', type: 'warning', read: false, date: new Date() },
    { id: 2, title: 'Chantier "Rénovation Salle de bain" en retard', type: 'error', read: false, date: new Date() },
    { id: 3, title: 'Nouveau message de Jean Dupont', type: 'info', read: false, date: new Date() },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // États pour les statistiques supplémentaires
  const [showStats, setShowStats] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // week, month, year
  
  // État pour le mode plein écran
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gestion du dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Récupération des données réelles depuis l'API avec gestion d'erreur
  const { data: clients, refetch: refetchClients, isLoading: loadingClients } = useQuery({
    queryKey: ['clients-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/clients', { params: { page: 1, limit: 1 } });
        return response.data;
      } catch (error) {
        console.error('Erreur chargement clients:', error);
        return { meta: { total: 0 } };
      }
    }
  });

  const { data: demandes, refetch: refetchDemandes, isLoading: loadingDemandes } = useQuery({
    queryKey: ['demandes-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/demandes-devis', { params: { page: 1, limit: 1 } });
        return response.data;
      } catch (error) {
        console.error('Erreur chargement demandes:', error);
        return { meta: { total: 0 } };
      }
    }
  });

  const { data: devis, refetch: refetchDevis, isLoading: loadingDevis } = useQuery({
    queryKey: ['devis-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/devis', { params: { page: 1, limit: 1 } });
        return response.data;
      } catch (error) {
        console.error('Erreur chargement devis:', error);
        return { meta: { total: 0 } };
      }
    }
  });

  const { data: chantiers, refetch: refetchChantiers, isLoading: loadingChantiers } = useQuery({
    queryKey: ['chantiers-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/chantiers', { params: { page: 1, limit: 1 } });
        return response.data;
      } catch (error) {
        console.error('Erreur chargement chantiers:', error);
        return { meta: { total: 0 } };
      }
    }
  });

  const { data: prestations, isLoading: loadingPrestations } = useQuery({
    queryKey: ['prestations-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/prestations');
        const data = response.data?.data ?? response.data ?? [];
        return { total: Array.isArray(data) ? data.length : 0 };
      } catch (error) {
        console.error('Erreur chargement prestations:', error);
        return { total: 0 };
      }
    }
  });

  const { data: fournisseurs, isLoading: loadingFournisseurs } = useQuery({
    queryKey: ['fournisseurs-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/fournisseurs');
        const data = response.data?.data ?? response.data ?? [];
        return { total: Array.isArray(data) ? data.length : 0 };
      } catch (error) {
        // Silently handle 403 - role may not have access
        return { total: 0 };
      }
    }
  });

  const isLoading = loadingClients || loadingDemandes || loadingDevis || loadingChantiers || loadingPrestations || loadingFournisseurs;

  // Totaux réels depuis l'API
  const totalClients = clients?.meta?.total ?? 0;
  const totalDemandes = demandes?.meta?.total ?? 0;
  const totalDevis = devis?.meta?.total ?? 0;
  const totalChantiers = chantiers?.meta?.total ?? 0;
  const totalPrestations = prestations?.total ?? 0;
  const totalFournisseurs = fournisseurs?.total ?? 0;

  // Sauvegarde des favoris
  useEffect(() => {
    localStorage.setItem('dashboard_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Gestion du plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleFavorite = (itemId: number, itemType: string) => {
    const favoriteKey = `${itemType}_${itemId}`;
    if (favorites.includes(favoriteKey)) {
      setFavorites(favorites.filter((f: string) => f !== favoriteKey));
    } else {
      setFavorites([...favorites, favoriteKey]);
    }
  };

  const isFavorite = (itemId: number, itemType: string) => {
    return favorites.includes(`${itemType}_${itemId}`);
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications(notifications.map((notif: any) => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const kpiCards = [
    {
      id: 1,
      label: 'Clients',
      value: totalClients,
      icon: <Users size={18} />,
      iconBg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trend: '+12%',
      trendUp: true,
      description: 'Clients actifs',
      onClick: () => navigate('/admin/clients'),
      details: { total: totalClients, actif: Math.floor(totalClients * 0.85), nouveau: Math.floor(totalClients * 0.15) }
    },
    {
      id: 2,
      label: 'Demandes',
      value: totalDemandes,
      icon: <FileText size={18} />,
      iconBg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      trend: '+8%',
      trendUp: true,
      description: 'À traiter',
      onClick: () => navigate('/admin/demandes-devis'),
      details: { total: totalDemandes, enCours: Math.floor(totalDemandes * 0.6), traite: Math.floor(totalDemandes * 0.4) }
    },
    {
      id: 3,
      label: 'Devis',
      value: totalDevis,
      icon: <FileSpreadsheet size={18} />,
      iconBg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: '+15%',
      trendUp: true,
      description: 'En cours',
      onClick: () => navigate('/admin/devis'),
      details: { total: totalDevis, acceptes: Math.floor(totalDevis * 0.4), refus: Math.floor(totalDevis * 0.1) }
    },
    {
      id: 4,
      label: 'Chantiers',
      value: totalChantiers,
      icon: <HardHat size={18} />,
      iconBg: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30',
      iconColor: 'text-yellow-700 dark:text-yellow-500',
      trend: '+5%',
      trendUp: true,
      description: 'En cours',
      onClick: () => navigate('/admin/chantiers'),
      details: { total: totalChantiers, enCours: Math.floor(totalChantiers * 0.6), termines: Math.floor(totalChantiers * 0.4) }
    },
    {
      id: 5,
      label: 'CA Mensuel',
      value: formatCurrency(145000),
      icon: <Euro size={18} />,
      iconBg: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      trend: '+22.3%',
      trendUp: true,
      description: 'vs mois dernier',
      onClick: () => console.log('CA details'),
      details: { total: 145000, objectif: 120000, reste: 25000 }
    },
    {
      id: 6,
      label: 'Conversion',
      value: '44%',
      icon: <Target size={18} />,
      iconBg: 'bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      trend: '+6.2%',
      trendUp: true,
      description: 'Devis → Chantier',
      onClick: () => console.log('Conversion details'),
      details: { taux: 44, objectif: 50, ecart: -6 }
    },
  ];

  // Tri des KPI
  const sortedKPIs = [...kpiCards].sort((a, b) => {
    let aVal: any = a[sortBy as keyof typeof a];
    let bVal: any = b[sortBy as keyof typeof b];
    if (sortBy === 'value') {
      aVal = typeof a.value === 'string' ? parseFloat(a.value) : a.value;
      bVal = typeof b.value === 'string' ? parseFloat(b.value) : b.value;
    }
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Filtrage des KPI
  const filteredKPIs = sortedKPIs.filter(kpi => {
    if (searchFilter !== 'all' && searchFilter !== 'kpis') return false;
    if (!searchQuery) return true;
    return kpi.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
           kpi.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const modules = [
    {
      id: 1,
      title: 'Clients & Devis',
      description: 'Gérez vos clients, demandes et devis commerciaux',
      icon: <Building2 size={20} />,
      accent: 'bg-[#185FA5]',
      iconBg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
      iconColor: 'text-[#185FA5] dark:text-blue-400',
      stats: [
        { label: 'Clients', value: totalClients },
        { label: 'Demandes', value: totalDemandes },
        { label: 'Devis', value: totalDevis }
      ],
      href: '/admin/clients',
    },
    {
      id: 2,
      title: 'Bibliothèque prix',
      description: "Catalogue de prestations, matériaux et main d'œuvre",
      icon: <BookOpen size={20} />,
      accent: 'bg-[#1D9E75]',
      iconBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30',
      iconColor: 'text-[#0F6E56] dark:text-emerald-400',
      stats: [
        { label: 'Prestations', value: totalPrestations },
        { label: 'Catégories', value: '10+' }
      ],
      href: '/admin/prestations',
    },
    {
      id: 3,
      title: 'Fournisseurs',
      description: 'Gestion des fournisseurs et commandes',
      icon: <Truck size={20} />,
      accent: 'bg-[#534AB7]',
      iconBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30',
      iconColor: 'text-[#534AB7] dark:text-indigo-400',
      stats: [
        { label: 'Fournisseurs', value: totalFournisseurs },
        { label: 'Commandes', value: 12 }
      ],
      href: '/admin/fournisseurs',
    },
    {
      id: 4,
      title: 'Chantier & Planning',
      description: 'Suivi des chantiers, tâches et planning',
      icon: <HardHat size={20} />,
      accent: 'bg-[#BA7517]',
      iconBg: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30',
      iconColor: 'text-[#854F0B] dark:text-amber-400',
      stats: [
        { label: 'Chantiers', value: totalChantiers },
        { label: 'En cours', value: Math.floor(totalChantiers * 0.6) }
      ],
      href: '/admin/chantiers',
    },
  ];

  // Tri des modules
  const sortedModules = [...modules].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.title.localeCompare(b.title);
    } else {
      return b.title.localeCompare(a.title);
    }
  });

  // Filtrage des modules
  const filteredModules = sortedModules.filter(mod => {
    if (searchFilter !== 'all' && searchFilter !== 'modules') return false;
    if (!searchQuery) return true;
    return mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           mod.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const quickActions = [
    { icon: <UserPlus size={16} />, label: 'Nouveau client', action: () => navigate('/admin/clients'), color: 'blue', shortcut: '⌘+C' },
    { icon: <FilePlus size={16} />, label: 'Nouveau devis', action: () => navigate('/admin/devis'), color: 'green', shortcut: '⌘+D' },
    { icon: <MessageCircle size={16} />, label: 'Message rapide', action: () => console.log('Message rapide'), color: 'purple', shortcut: '⌘+M' },
    { icon: <Calendar size={16} />, label: 'Planifier réunion', action: () => console.log('Planifier réunion'), color: 'orange', shortcut: '⌘+R' },
    { icon: <Download size={16} />, label: 'Exporter rapport', action: () => exportDashboard(), color: 'gray', shortcut: '⌘+E' },
    { icon: <Settings size={16} />, label: 'Paramètres', action: () => navigate('/admin/parametres-chiffrage'), color: 'gray', shortcut: '⌘+P' },
  ];

  // Fonction d'export du dashboard
  const exportDashboard = () => {
    const data = {
      kpis: kpiCards,
      modules: modules,
      tasks: tasks,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_export_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tasks = [
    { id: 1, title: 'Finaliser devis client SARL Martin', project: 'Projet Rénovation', due: '2024-12-10', priority: 'high', status: 'pending', assignee: 'Jean', progress: 75 },
    { id: 2, title: 'Appeler fournisseur matériaux', project: 'Chantier A', due: '2024-12-11', priority: 'medium', status: 'in-progress', assignee: 'Marie', progress: 40 },
    { id: 3, title: 'Préparer rapport mensuel', project: 'Administration', due: '2024-12-12', priority: 'high', status: 'pending', assignee: 'Pierre', progress: 20 },
    { id: 4, title: 'Réunion client', project: 'Projet Neuf', due: '2024-12-13', priority: 'high', status: 'scheduled', assignee: 'Sophie', progress: 0 },
    { id: 5, title: 'Mise à jour catalogue', project: 'Bibliothèque', due: '2024-12-14', priority: 'low', status: 'pending', assignee: 'Lucas', progress: 10 },
  ];

  // Filtrage et tri des tâches
  const filteredTasks = tasks.filter(task => {
    if (searchFilter !== 'all' && searchFilter !== 'tasks') return false;
    if (!searchQuery) return true;
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.project.toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      return sortOrder === 'asc' ? aPriority - bPriority : bPriority - aPriority;
    }
    if (sortBy === 'due') {
      return sortOrder === 'asc' 
        ? new Date(a.due).getTime() - new Date(b.due).getTime()
        : new Date(b.due).getTime() - new Date(a.due).getTime();
    }
    return 0;
  });

  const messages = [
    { id: 1, sender: 'Jean Dupont', avatar: 'JD', message: 'Bonjour, concernant le devis...', time: '10:30', unread: true, status: 'important' },
    { id: 2, sender: 'Mme Martin', avatar: 'MM', message: 'Merci pour l\'envoi du document', time: '09:45', unread: false, status: 'normal' },
    { id: 3, sender: 'Pierre Durand', avatar: 'PD', message: 'La réunion est confirmée pour demain', time: 'Hier', unread: false, status: 'urgent' },
  ];

  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const weekDay = now.toLocaleDateString('fr-FR', { weekday: 'long' });

  const handleRefresh = () => {
    refetchClients();
    refetchDemandes();
    refetchDevis();
    refetchChantiers();
  };

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch(e.key) {
          case 'c':
            e.preventDefault();
            navigate('/admin/clients');
            break;
          case 'd':
            e.preventDefault();
            navigate('/admin/devis');
            break;
          case 'm':
            e.preventDefault();
            setShowQuickActions(true);
            setTimeout(() => setShowQuickActions(false), 3000);
            break;
          case 'r':
            e.preventDefault();
            handleRefresh();
            break;
          case 'e':
            e.preventDefault();
            exportDashboard();
            break;
          case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#185FA5] dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen transition-colors duration-300 ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}>
      {/* En-tête avec barre d'outils avancée */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-xl shadow-sm z-40 transition-colors duration-300">
        <div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Bienvenue, {user?.prenom || 'Utilisateur'} {user?.nom || ''}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Bouton Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} className="text-gray-600" />}
          </button>

          {/* Recherche avancée */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 w-64 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#185FA5] dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <X size={16} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
              </button>
            )}
          </div>

          {/* Filtre de recherche */}
          <select
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#185FA5] dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Tous</option>
            <option value="kpis">Indicateurs</option>
            <option value="modules">Modules</option>
            <option value="tasks">Tâches</option>
          </select>

          {/* Options de tri */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#185FA5] dark:bg-gray-700 dark:text-white"
          >
            <option value="value">Trier par valeur</option>
            <option value="label">Trier par nom</option>
            <option value="trend">Trier par tendance</option>
            <option value="priority">Trier par priorité</option>
            <option value="due">Trier par échéance</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {sortOrder === 'asc' ? <SortAsc size={16} className="text-gray-600 dark:text-gray-300" /> : <SortDesc size={16} className="text-gray-600 dark:text-gray-300" />}
          </button>

          {/* Vue en grille/liste */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {viewMode === 'grid' ? <List size={16} className="text-gray-600 dark:text-gray-300" /> : <Grid3x3 size={16} className="text-gray-600 dark:text-gray-300" />}
          </button>

          {/* Plein écran */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} className="text-gray-600 dark:text-gray-300" /> : <Maximize2 size={16} className="text-gray-600 dark:text-gray-300" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Bell size={16} className="text-gray-600 dark:text-gray-300" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
                <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Notifications</h4>
                  <button onClick={clearAllNotifications} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    Tout effacer
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">Aucune notification</div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className={`p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{notif.date.toLocaleTimeString()}</p>
                          </div>
                          {!notif.read && (
                            <button
                              onClick={() => markNotificationAsRead(notif.id)}
                              className="text-xs text-blue-600 dark:text-blue-400"
                            >
                              Marquer lu
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={16} />
            Actualiser
          </button>

          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="flex items-center gap-2 px-4 py-2 bg-[#185FA5] text-white rounded-lg hover:bg-[#0F4780] transition-colors"
            >
              <Plus size={16} />
              Actions
            </button>
            
            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
                <div className="p-2">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        action.action();
                        setShowQuickActions(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-${action.color}-600 dark:text-${action.color}-400`}>{action.icon}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{action.label}</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{action.shortcut}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contrôles d'affichage des sections */}
      <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 transition-colors duration-300">
        <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Afficher :</span>
        {Object.entries(visibleSections).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setVisibleSections({ ...visibleSections, [key]: !value })}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
              value 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {value ? <Eye size={12} /> : <EyeOff size={12} />}
            {key === 'kpiCards' && 'KPI'}
            {key === 'modules' && 'Modules'}
            {key === 'tasks' && 'Tâches'}
            {key === 'messages' && 'Messages'}
            {key === 'stats' && 'Stats'}
          </button>
        ))}
      </div>

      {/* Banner avec statistiques */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#042C53] to-[#0A3D6E] dark:from-[#021526] dark:to-[#051E35] rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <div className="absolute w-96 h-96 rounded-full bg-white/5 blur-3xl -top-48 -right-48" />
        <div className="absolute w-64 h-64 rounded-full bg-white/5 blur-2xl -bottom-32 -left-32" />
        
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                  <span className="text-xs font-medium text-[#5DCAA5]">Performance</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-white/60">Objectif: 85%</span>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white">
                Bonjour, {user?.prenom || 'Utilisateur'} ! 👋
              </h2>
              
              <p className="text-white/70 text-sm max-w-md">
                Vous avez {totalDemandes} demande{totalDemandes > 1 ? 's' : ''} à traiter et {totalChantiers} chantier{totalChantiers > 1 ? 's' : ''} en cours.
                Belle progression ce mois-ci !
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">85%</div>
                <div className="text-xs text-white/60">Objectif mensuel</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-right space-y-1">
                <div className="text-4xl font-bold text-white">{day}</div>
                <div className="text-sm text-white/60 capitalize">{weekDay}</div>
                <div className="text-xs text-white/40">{month}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards avec tri et recherche */}
      {visibleSections.kpiCards && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Indicateurs clés ({filteredKPIs.length}/{kpiCards.length})
            </h3>
          </div>
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-1'} gap-4`}>
            {filteredKPIs.map((k) => (
              <div 
                key={k.label} 
                onClick={k.onClick}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-lg transition-all cursor-pointer group relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(k.id, 'kpi');
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star size={14} className={isFavorite(k.id, 'kpi') ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
                </button>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.iconBg} ${k.iconColor} group-hover:scale-110 transition-transform`}>
                  {k.icon}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{k.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{k.label}</div>
                <div className={`text-xs mt-1 ${k.trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {k.trendUp ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}
                  {k.trend}
                </div>
                {expandedCards[k.id] && k.details && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs">
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(k.details).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-gray-500 dark:text-gray-400">{key}:</span>{' '}
                          <span className="font-medium text-gray-700 dark:text-gray-300">{typeof val === 'number' && key !== 'taux' && key !== 'ecart' ? 
                            (key === 'total' ? val : (key === 'objectif' ? formatCurrency(val) : val)) : 
                            (key === 'taux' ? `${val}%` : (key === 'ecart' ? `${val}%` : val))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCards({ ...expandedCards, [k.id]: !expandedCards[k.id] });
                  }}
                  className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {expandedCards[k.id] ? '▼' : '▲'}
                </button>
              </div>
            ))}
          </div>
          {filteredKPIs.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucun indicateur trouvé pour "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Modules avec tri et recherche */}
      {visibleSections.modules && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Modules principaux ({filteredModules.length}/{modules.length})
          </h3>
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
            {filteredModules.map((mod) => (
              <div
                key={mod.title}
                onClick={() => navigate(mod.href)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 text-left group hover:shadow-lg transition-all relative overflow-hidden cursor-pointer"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(mod.id, 'module');
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star size={14} className={isFavorite(mod.id, 'module') ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
                </button>
                <div className={`absolute top-0 left-0 right-0 h-1 ${mod.accent}`} />
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mod.iconBg} ${mod.iconColor}`}>
                    {mod.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">{mod.title}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{mod.description}</div>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {mod.stats.map((s) => (
                    <div key={s.label}>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {filteredModules.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucun module trouvé pour "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Section Tâches et Activités avec tri et recherche */}
      {visibleSections.tasks && visibleSections.messages && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tâches récentes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Tâches récentes</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">({filteredTasks.length})</span>
              </div>
              <div className="flex gap-2">
                <select
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  <option value="priority">Priorité</option>
                  <option value="due">Échéance</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              {filteredTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 focus:ring-[#185FA5] dark:bg-gray-700" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{task.title}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{task.project} • Assigné à: {task.assignee}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                      <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                      task.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Échéance: {new Date(task.due).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-t border-gray-100 dark:border-gray-700 pt-3 transition-colors">
              + Ajouter une tâche
            </button>
          </div>

          {/* Messages récents */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={18} className="text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Messages récents</h3>
            </div>
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors ${msg.unread ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                    {msg.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{msg.sender}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{msg.time}</div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{msg.message}</div>
                    {msg.status === 'urgent' && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">⚠️ Urgent</div>
                    )}
                  </div>
                  {msg.unread && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-t border-gray-100 dark:border-gray-700 pt-3 transition-colors">
              Voir tous les messages
            </button>
          </div>
        </div>
      )}

      {/* Statistiques supplémentaires */}
      {visibleSections.stats && showStats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Statistiques avancées</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPeriod('week')}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedPeriod === 'week' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setSelectedPeriod('month')}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedPeriod === 'month' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setSelectedPeriod('year')}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedPeriod === 'year' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Année
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">85%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Taux de satisfaction</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">12</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Jours sans incident</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">24h</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse moyen</div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton pour afficher/masquer les stats */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="fixed bottom-6 right-6 bg-[#185FA5] dark:bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-[#0F4780] dark:hover:bg-blue-700 transition-colors z-50"
      >
        <Activity size={20} />
      </button>
    </div>
  );
}