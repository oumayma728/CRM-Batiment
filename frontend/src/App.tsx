import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import ChatbotWidget from '@/components/ChatbotWidget';
import AppLayout from '@/layouts/AppLayout';
import ChefChantierLayout from '@/layouts/ChefChantierLayout';
import FournisseurLayout from '@/layouts/FournisseurLayout';
import TechnicoLayout from '@/layouts/TechnicoLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import HomeLandingPage from '@/pages/loginPage2';
import ClientDevisValidationPage from '@/pages/ClientDevisValidationPage';
import ClientDevisSignaturePage from '@/pages/ClientDevisSignaturePage';
import DashboardPage from '@/pages/DashboardPage';
import ChantiersPage from '@/pages/ChantiersPage';
import ClientsPage from '@/pages/ClientsPage';
import CommandesFournisseurPage from '@/pages/CommandesFournisseurPage';
import ChefDashboardPage from '@/pages/chef/ChefDashboardPage';
import DemandesDevisPage from '@/pages/DemandesDevisPage';
import DevisPage from '@/pages/DevisPage';
import FacturesPage from '@/pages/FacturesPage';
import FactureDetailPage from '@/pages/FactureDetailPage';
import PrestationsPage from '@/pages/PrestationsPage';
import PrestationCompositionsPage from '@/pages/PrestationCompositionsPage';
import MateriauxPage from '@/pages/MateriauxPage';
import ServicesMoPage from '@/pages/ServicesMoPage';
import FournisseursPage from '@/pages/FournisseursPage';
import UsersPage from '@/pages/UsersPage';
import TypesProjetPage from '@/pages/TypesProjetPage';
import ParametresChiffragePage from '@/pages/ParametresChiffragePage';
import RagDocumentsPage from '@/pages/RagDocumentsPage';
import TasksChantierPage from '@/pages/TasksChantierPage';
import TechnicoDashboard from '@/pages/technico/TechnicoDashboard';
import TechnicoClients from '@/pages/technico/TechnicoClients';
import TechnicoDemandes from '@/pages/technico/TechnicoDemandes';
import TechnicoDevis from '@/pages/technico/TechnicoDevis';
import TechnicoFactures from '@/pages/technico/TechnicoFactures';
import TechnicoFactureDetail from '@/pages/technico/TechnicoFactureDetail';
import TechnicoPrestations from '@/pages/technico/TechnicoPrestations';
import TechnicoMateriaux from '@/pages/technico/TechnicoMateriaux';
import TechnicoChecklist from '@/pages/technico/TechnicoChecklist';
import TechnicoCatalogueExplorer from '@/pages/technico/TechnicoCatalogueExplorer';
import TechnicoDevisSignature from '@/pages/technico/TechnicoDevisSignature';
import TechnicoProfile from '@/pages/technico/TechnicoProfile';
import TechnicoAssistantIA from '@/pages/technico/TechnicoAssistantIA';
import FournisseurDashboard from '@/pages/fournisseur/FournisseurDashboard';
import ProfilePage from '@/pages/ProfilePage';
import { authManager } from '@/lib/auth';

function RoleRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Chargement...</div>;
  }

  if (user?.role === 'TECHNICO') {
    return <Navigate to="/technico" replace />;
  }

  if (user?.role === 'SOUS_TRAITANT') {
    return <Navigate to="/fournisseur" replace />;
  }

  return <Navigate to="/admin" replace />;
}

function AdminLayoutRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Chargement du layout...
      </div>
    );
  }

  return user?.role === 'CHEF_CHANTIER' ? <ChefChantierLayout /> : <AppLayout />;
}

function AdminDashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Chargement du dashboard...</div>;
  }

  return user?.role === 'CHEF_CHANTIER' ? <ChefDashboardPage /> : <DashboardPage />;
}

authManager.init();

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  useDarkMode();
  const showChatbotOnHome = location.pathname === '/' && !isAuthenticated;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showChatbotOnHome && <ChatbotWidget />}
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <RoleRouter /> : <HomeLandingPage />}
        />

        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="/validation-devis" element={<ClientDevisValidationPage />} />
        <Route path="/sign/:token" element={<ClientDevisSignaturePage />} />

        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ASSISTANTE', 'CHEF_CHANTIER']} />
            }
          >
            <Route path="admin" element={<AdminLayoutRouter />}>
              <Route index element={<AdminDashboardRouter />} />
              <Route path="chantiers" element={<ChantiersPage />} />
              <Route path="commandes-fournisseur" element={<CommandesFournisseurPage />} />

              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'CHEF_CHANTIER']} />}>
                <Route path="taches-chantier" element={<TasksChantierPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ASSISTANTE']} />}>
                <Route path="clients" element={<ClientsPage />} />
                <Route path="demandes-devis" element={<DemandesDevisPage />} />
                <Route path="devis" element={<DevisPage />} />
                <Route path="factures" element={<FacturesPage />} />
                <Route path="factures/:id" element={<FactureDetailPage />} />
                <Route path="checklist" element={<TechnicoChecklist />} />
                <Route path="prestations" element={<PrestationsPage />} />
                <Route
                  path="prestations-compositions"
                  element={<PrestationCompositionsPage />}
                />
                <Route path="materiaux" element={<MateriauxPage />} />
                <Route path="services-mo" element={<ServicesMoPage />} />
                <Route path="fournisseurs" element={<FournisseursPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="utilisateurs" element={<UsersPage />} />
                <Route path="types-projet" element={<TypesProjetPage />} />
                <Route path="base-ia" element={<RagDocumentsPage />} />
                <Route
                  path="parametres-chiffrage"
                  element={<ParametresChiffragePage />}
                />
              </Route>
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['TECHNICO']} />}>
            <Route path="technico" element={<TechnicoLayout />}>
              <Route index element={<TechnicoDashboard />} />
              <Route path="clients" element={<TechnicoClients />} />
              <Route path="demandes" element={<TechnicoDemandes />} />
              <Route path="devis" element={<TechnicoDevis />} />
              <Route path="factures" element={<TechnicoFactures />} />
              <Route path="factures/:id" element={<TechnicoFactureDetail />} />
              <Route path="commandes-fournisseur" element={<CommandesFournisseurPage />} />
              <Route path="devis/:id/signature" element={<TechnicoDevisSignature />} />
              <Route path="checklist" element={<TechnicoChecklist />} />
              <Route path="assistant-ia" element={<TechnicoAssistantIA />} />
              <Route path="profil" element={<TechnicoProfile />} />
              <Route path="prestations" element={<TechnicoPrestations />} />
              <Route path="materiaux" element={<TechnicoMateriaux />} />
              <Route path="catalogue" element={<TechnicoCatalogueExplorer />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SOUS_TRAITANT']} />}>
            <Route path="fournisseur" element={<FournisseurLayout />}>
              <Route index element={<FournisseurDashboard />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
