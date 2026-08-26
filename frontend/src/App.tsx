import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ChatbotWidget from '@/components/ChatbotWidget';
import AppLayout from '@/layouts/AppLayout';
import ChefChantierLayout from '@/layouts/ChefChantierLayout';
import FournisseurLayout from '@/layouts/FournisseurLayout';
import SousTraitantLayout from '@/layouts/SousTraitantLayout';
import TechnicoLayout from '@/layouts/TechnicoLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import HomeLandingPage from '@/pages/loginPage2';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import { LoginTest } from '@/pages/LoginTest';
import ClientDevisValidationPage from '@/pages/ClientDevisValidationPage';
import ClientDevisSignaturePage from '@/pages/ClientDevisSignaturePage';
import DashboardPage from '@/pages/DashboardPage';
import ChantiersPage from '@/pages/ChantiersPage';
import ChantierDetailPage from '@/pages/ChantierDetailPage';
import ClientsPage from '@/pages/ClientsPage';
import CommandesFournisseurPage from '@/pages/CommandesFournisseurPage';
import ChefDashboardPage from '@/pages/chef/ChefDashboardPage';
import ChefChantierProfile from '@/pages/chef/ChefChantierProfile';
import DemandesDevisPage from '@/pages/DemandesDevisPage';
import DevisPage from '@/pages/DevisPage';
import FacturesPage from '@/pages/FacturesPage';
import FactureDetailPage from '@/pages/FactureDetailPage';
import PrestationsPage from '@/pages/PrestationsPage';
import PrestationCompositionsPage from '@/pages/PrestationCompositionsPage';
import MateriauxPage from '@/pages/MateriauxPage';
import ServicesMoPage from '@/pages/ServicesMoPage';
import FournisseursPage from '@/pages/FournisseursPage';
import SousTraitantsPage from '@/pages/SousTraitantsPage';
import UsersPage from '@/pages/UsersPage';
import TypesProjetPage from '@/pages/TypesProjetPage';
import ParametresChiffragePage from '@/pages/ParametresChiffragePage';
import RagDocumentsPage from '@/pages/RagDocumentsPage';
import AdminProfile from '@/pages/AdminProfile';
import TasksChantierPage from '@/pages/TasksChantierPage';
<<<<<<< HEAD
import SousTraitantsPage from '@/pages/SousTraitantsPage';
=======
import HousePlanPage from '@/pages/HousePlanPage';
>>>>>>> origin/wassim_pre-integration
// Technico pages
import TechnicoDashboard from '@/pages/technico/TechnicoDashboard';
import TechnicoClients from '@/pages/technico/TechnicoClients';
import TechnicoDemandes from '@/pages/technico/TechnicoDemandes';
import TechnicoDevis from '@/pages/technico/TechnicoDevis';
import TechnicoDevisDetail from '@/pages/technico/TechnicoDevisDetail';
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
import SousTraitantDashboard from '@/pages/sous-traitant/SousTraitantDashboard';
import SousTraitantChantiersPage from '@/pages/sous-traitant/SousTraitantChantiersPage';
import SousTraitantChantierDetailPage from '@/pages/sous-traitant/SousTraitantChantierDetailPage';
import SousTraitantTachesPage from '@/pages/sous-traitant/SousTraitantTachesPage';
import SousTraitantTacheDetailPage from '@/pages/sous-traitant/SousTraitantTacheDetailPage';
import SousTraitantProfile from '@/pages/sous-traitant/SousTraitantProfile';

function RoleRouter() {
  const { user } = useAuth();
  console.log('RoleRouter: user', user);
  console.log('RoleRouter: user.role', user?.role);

  if (user?.role === 'TECHNICO') return <Navigate to="/technico" replace />;
  if (user?.role === 'SOUS_TRAITANT') return <Navigate to="/sous-traitant" replace />;
  return <Navigate to="/admin" replace />;
}

function AdminLayoutRouter() {
  const { user } = useAuth();
  return user?.role === 'CHEF_CHANTIER' ? <ChefChantierLayout /> : <AppLayout />;
}

function AdminDashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'CHEF_CHANTIER') {
    return <ChefDashboardPage />;
  }

  return <DashboardPage />;
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const showChatbotOnHome = location.pathname === '/' && !isAuthenticated;

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

      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/reset-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ResetPasswordPage />}
      />

      <Route path="/test-connection" element={<LoginTest />} />
      <Route path="/validation-devis" element={<ClientDevisValidationPage />} />
      <Route path="/sign/:token" element={<ClientDevisSignaturePage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ASSISTANTE', 'CHEF_CHANTIER']} />}>
          <Route path="admin" element={<AdminLayoutRouter />}>
            <Route index element={<AdminDashboardRouter />} />
            <Route path="chantiers" element={<ChantiersPage />} />
            <Route path="chantiers/:id" element={<ChantierDetailPage />} />
            <Route path="chantiers/:id/plan-2d" element={<HousePlanPage />} />
            <Route path="commandes-fournisseur" element={<CommandesFournisseurPage />} />
            <Route path="profil-chef" element={<ChefChantierProfile />} />
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
              <Route path="prestations-compositions" element={<PrestationCompositionsPage />} />
              <Route path="materiaux" element={<MateriauxPage />} />
              <Route path="services-mo" element={<ServicesMoPage />} />
              <Route path="fournisseurs" element={<FournisseursPage />} />
              <Route path="sous-traitants" element={<SousTraitantsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="utilisateurs" element={<UsersPage />} />
              <Route path="types-projet" element={<TypesProjetPage />} />
              <Route path="base-ia" element={<RagDocumentsPage />} />
              <Route path="parametres-chiffrage" element={<ParametresChiffragePage />} />
              <Route path="sous-traitants" element={<SousTraitantsPage />} />
              <Route path="profil" element={<AdminProfile />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['TECHNICO']} />}>
          {/* Technico-Commercial layout */}
          <Route path="technico" element={<TechnicoLayout />}>
            <Route index element={<TechnicoDashboard />} />
            <Route path="clients" element={<TechnicoClients />} />
            <Route path="demandes" element={<TechnicoDemandes />} />
            <Route path="devis" element={<TechnicoDevis />} />
            <Route path="devis/:id" element={<TechnicoDevisDetail />} />
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
          <Route path="sous-traitant" element={<SousTraitantLayout />}>
            <Route index element={<SousTraitantDashboard />} />
            <Route path="chantiers" element={<SousTraitantChantiersPage />} />
            <Route path="chantiers/:id" element={<SousTraitantChantierDetailPage />} />
            <Route path="chantiers/:id/plan-2d" element={<HousePlanPage />} />
            <Route path="taches" element={<SousTraitantTachesPage />} />
            <Route path="taches/:id" element={<SousTraitantTacheDetailPage />} />
            <Route path="profil" element={<SousTraitantProfile />} />
          </Route>
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
