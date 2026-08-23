import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ChatbotWidget from '@/components/ChatbotWidget';
import RealtimeEventsBridge from '@/components/RealtimeEventsBridge';
import AppLayout from '@/layouts/AppLayout';
import ChefChantierLayout from '@/layouts/ChefChantierLayout';
import SousTraitantLayout from '@/layouts/SousTraitantLayout';
import TechnicoLayout from '@/layouts/TechnicoLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Public pages
import LoginPage from '@/pages/LoginPage';
import HomeLandingPage from '@/pages/loginPage2';
import { LoginTest } from '@/pages/LoginTest';
import ClientDevisValidationPage from '@/pages/ClientDevisValidationPage';
import ClientDevisSignaturePage from '@/pages/ClientDevisSignaturePage';
import PublicDemoRequestPage from '@/pages/PublicDemoRequestPage';

// Admin and shared pages
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
import AuditPage from '@/pages/AuditPage';
import SavPage from '@/pages/SavPage';
import DemoRequestsPage from '@/pages/DemoRequestsPage';
import StockPage from '@/pages/StockPage';
import AccountSettingsPage from '@/pages/AccountSettingsPage';

// Technico pages
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

// Sous-traitant pages
import SousTraitantDashboardPage from '@/pages/sous-traitant/SousTraitantDashboardPage';
import SousTraitantChantiersPage from '@/pages/sous-traitant/SousTraitantChantiersPage';
import SousTraitantTachesPage from '@/pages/sous-traitant/SousTraitantTachesPage';
import SousTraitantDocumentsPage from '@/pages/sous-traitant/SousTraitantDocumentsPage';
import SousTraitantRapportsPhotosPage from '@/pages/sous-traitant/SousTraitantRapportsPhotosPage';

function RoleRouter() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'ASSISTANTE') return <Navigate to="/assistante" replace />;
  if (user?.role === 'TECHNICO') return <Navigate to="/technico" replace />;
  if (user?.role === 'CHEF_CHANTIER') return <Navigate to="/chef-chantier" replace />;
  if (user?.role === 'SOUS_TRAITANT') return <Navigate to="/sous-traitant" replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const showChatbotOnHome = location.pathname === '/' && !isAuthenticated;

  return (
    <>
      {showChatbotOnHome && <ChatbotWidget />}
      {isAuthenticated && <RealtimeEventsBridge />}

      <Routes>
        <Route path="/" element={isAuthenticated ? <RoleRouter /> : <HomeLandingPage />} />

        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />

        <Route path="/test-connection" element={<LoginTest />} />
        <Route path="/demo" element={<PublicDemoRequestPage />} />
        <Route path="/validation-devis" element={<ClientDevisValidationPage />} />
        <Route path="/sign/:token" element={<ClientDevisSignaturePage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="admin" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="chantiers" element={<ChantiersPage />} />
              <Route path="commandes-fournisseur" element={<CommandesFournisseurPage />} />
              <Route path="sav" element={<SavPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="demandes-devis" element={<DemandesDevisPage />} />
              <Route path="demo-requests" element={<DemoRequestsPage />} />
              <Route path="devis" element={<DevisPage />} />
              <Route path="factures" element={<FacturesPage />} />
              <Route path="factures/:id" element={<FactureDetailPage />} />
              <Route path="checklist" element={<TechnicoChecklist />} />
              <Route path="prestations" element={<PrestationsPage />} />
              <Route path="prestations-compositions" element={<PrestationCompositionsPage />} />
              <Route path="materiaux" element={<MateriauxPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="services-mo" element={<ServicesMoPage />} />
              <Route path="fournisseurs" element={<FournisseursPage />} />
              <Route path="taches-chantier" element={<TasksChantierPage />} />
              <Route path="utilisateurs" element={<UsersPage />} />
              <Route path="types-projet" element={<TypesProjetPage />} />
              <Route path="base-ia" element={<RagDocumentsPage />} />
              <Route path="parametres-chiffrage" element={<ParametresChiffragePage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ASSISTANTE']} />}>
            <Route path="assistante" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="demandes-devis" element={<DemandesDevisPage />} />
              <Route path="demo-requests" element={<DemoRequestsPage />} />
              <Route path="devis" element={<DevisPage />} />
              <Route path="factures" element={<FacturesPage />} />
              <Route path="factures/:id" element={<FactureDetailPage />} />
              <Route path="sav" element={<SavPage />} />
              <Route path="commandes-fournisseur" element={<CommandesFournisseurPage />} />
              <Route path="fournisseurs" element={<FournisseursPage />} />
              <Route path="chantiers" element={<ChantiersPage />} />
              <Route path="checklist" element={<TechnicoChecklist />} />
              <Route path="prestations" element={<PrestationsPage />} />
              <Route path="prestations-compositions" element={<PrestationCompositionsPage />} />
              <Route path="materiaux" element={<MateriauxPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="services-mo" element={<ServicesMoPage />} />
              <Route path="parametres" element={<AccountSettingsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['CHEF_CHANTIER']} />}>
            <Route path="chef-chantier" element={<ChefChantierLayout />}>
              <Route index element={<ChefDashboardPage />} />
              <Route path="chantiers" element={<ChantiersPage />} />
              <Route path="taches-chantier" element={<TasksChantierPage />} />
              <Route path="receptions" element={<CommandesFournisseurPage />} />
              <Route path="sav" element={<SavPage />} />
              <Route path="parametres" element={<AccountSettingsPage />} />
              <Route
                path="commandes-fournisseur"
                element={<Navigate to="/chef-chantier/receptions" replace />}
              />
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
              <Route path="sav" element={<SavPage />} />
              <Route path="demo-requests" element={<DemoRequestsPage />} />
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
              <Route index element={<SousTraitantDashboardPage />} />
              <Route path="chantiers" element={<SousTraitantChantiersPage />} />
              <Route path="taches" element={<SousTraitantTachesPage />} />
              <Route path="documents" element={<SousTraitantDocumentsPage />} />
              <Route path="rapports-photos" element={<SousTraitantRapportsPhotosPage />} />
              <Route path="parametres" element={<AccountSettingsPage />} />
            </Route>
            <Route
              path="fournisseur"
              element={<Navigate to="/sous-traitant" replace />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
