import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SalonProvider } from "@/components/SalonSelector";
import { AnsattSelectorProvider } from "@/components/AnsattSelector";
import Login from "./pages/Login";

import Onboarding from "./pages/Onboarding";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import TeamDashboard from "./pages/TeamDashboard";
import DistrictDashboard from "./pages/DistrictDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";
import KPIInput from "./pages/KPIInput";
import BatchKPIInput from "./pages/BatchKPIInput";
import Admin from "./pages/Admin";
import HistoricalImport from "./pages/HistoricalImport";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import HubSpotCallback from "./pages/HubSpotCallback";
import Announcement from "./pages/Announcement";
import Employees from "./pages/Employees";
import Budget from "./pages/Budget";
import Schedule from "./pages/Schedule";
import LeaveAbsence from "./pages/LeaveAbsence";
import Insurance from "./pages/Insurance";
import InsuranceOrder from "./pages/InsuranceOrder";
import InsuranceHealth from "./pages/InsuranceHealth";
import AdminInsurance from "./pages/AdminInsurance";
import InsuranceProspects from "./pages/InsuranceProspects";
import DistrictInsurance from "./pages/DistrictInsurance";
import DistrictInsuranceProspects from "./pages/DistrictInsuranceProspects";
import Fullmakt from "./pages/Fullmakt";
import FullmaktVerify from "./pages/FullmaktVerify";
import FullmaktSuccess from "./pages/FullmaktSuccess";
import CreateQuote from "./pages/CreateQuote";
import QuoteAccept from "./pages/QuoteAccept";
import QuoteView from "./pages/QuoteView";
import EmailTemplates from "./pages/EmailTemplates";
import EmailTemplateEditor from "./pages/EmailTemplateEditor";
import EmailTemplatePreview from "./pages/EmailTemplatePreview";
import EmployeesPage from "./pages/hr/EmployeesPage";
import PerformancePage from "./pages/hr/PerformancePage";
import UtviklingDashboard from "./pages/hr/UtviklingDashboard";
import SamtaleGjennomforing from "./pages/hr/SamtaleGjennomforing";
import { MedarbeiderForberedelse } from "./components/utvikling/MedarbeiderForberedelse";
import Sykmelding from "./pages/Sykmelding";
import Ansatte from "./pages/Ansatte";
import AnsattProfil from "./pages/AnsattProfil";
import SykmeldingDetaljer from "./pages/SykmeldingDetaljer";
import Ferie from "./pages/Ferie";
import OnboardingOffboarding from "./pages/hr/OnboardingOffboarding";
import ProspektPipeline from "./pages/ProspektPipeline";
import InnmeldingWizard from "./pages/InnmeldingWizard";
import AnsattWizard from "./pages/AnsattWizard";
import Innmeldinger from "./pages/Innmeldinger";
import BonusAdmin from "./pages/BonusAdmin";
import LeverandorAdmin from "./pages/LeverandorAdmin";
import DistrictBonus from "./pages/DistrictBonus";
import NotFound from "./pages/NotFound";

// Min Side pages
import MinSideIndex from "./pages/min-side/Index";
import MinProfil from "./pages/min-side/MinProfil";
import MineSamtaler from "./pages/min-side/MineSamtaler";
import MineMal from "./pages/min-side/MineMal";
import MinePulsundersokelser from "./pages/min-side/MinePulsundersokelser";
import MinFerieOgFravaer from "./pages/min-side/MinFerieOgFravaer";
import MinTurnus from "./pages/min-side/MinTurnus";

// Min Salong pages
import TariffPage from "./pages/min-salong/TariffPage";
import BonusPage from "./pages/min-salong/BonusPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SalonProvider>
            <AnsattSelectorProvider>
              <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/team" element={<TeamDashboard />} />
              <Route path="/district" element={<DistrictDashboard />} />
              <Route path="/supplier" element={<SupplierDashboard />} />
              <Route path="/kpi-input" element={<KPIInput />} />
              <Route path="/batch-kpi-input" element={<BatchKPIInput />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/insurance" element={<AdminInsurance />} />
              <Route path="/admin/insurance/prospects" element={<InsuranceProspects />} />
              <Route path="/admin/email-templates" element={<EmailTemplates />} />
              <Route path="/admin/email-templates/:id/preview" element={<EmailTemplatePreview />} />
              <Route path="/admin/email-templates/:id/edit" element={<EmailTemplateEditor />} />
              <Route path="/import" element={<HistoricalImport />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth/hubspot/callback" element={<HubSpotCallback />} />
              <Route path="/news/:slug" element={<Announcement />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/leave" element={<LeaveAbsence />} />
              <Route path="/ferie" element={<Ferie />} />
              <Route path="/sykmelding" element={<Sykmelding />} />
              <Route path="/sykmelding/:id" element={<SykmeldingDetaljer />} />
              <Route path="/hr/employees" element={<EmployeesPage />} />
              <Route path="/ansatte" element={<Ansatte />} />
              <Route path="/ansatte/:id" element={<AnsattProfil />} />
              <Route path="/ansatte/ny" element={<AnsattWizard />} />
              <Route path="/hr/performance" element={<PerformancePage />} />
              <Route path="/hr/utvikling" element={<UtviklingDashboard />} />
              <Route path="/hr/samtale/:samtaleId/gjennomfor" element={<SamtaleGjennomforing />} />
              <Route path="/hr/samtale/:samtaleId/forberedelse" element={<MedarbeiderForberedelse />} />
              <Route path="/hr/onboarding" element={<OnboardingOffboarding />} />
              <Route path="/prospekter" element={<ProspektPipeline />} />
              <Route path="/innmeldinger" element={<Innmeldinger />} />
              <Route path="/innmelding" element={<InnmeldingWizard />} />
              <Route path="/tariff" element={<TariffPage />} />
              <Route path="/min-salong/bonus" element={<BonusPage />} />
              <Route path="/admin/bonus" element={<BonusAdmin />} />
              <Route path="/admin/leverandorer" element={<LeverandorAdmin />} />
              <Route path="/insurance" element={<Insurance />} />
              <Route path="/insurance/order" element={<InsuranceOrder />} />
              <Route path="/insurance/health" element={<InsuranceHealth />} />
              <Route path="/district/insurance" element={<DistrictInsurance />} />
              <Route path="/district/insurance/prospects" element={<DistrictInsuranceProspects />} />
              <Route path="/district/insurance/quotes/create" element={<CreateQuote />} />
              <Route path="/district/insurance/quotes/:id" element={<QuoteView />} />
              <Route path="/district/bonus" element={<DistrictBonus />} />
              <Route path="/fullmakt" element={<Fullmakt />} />
              <Route path="/fullmakt/verify" element={<FullmaktVerify />} />
              <Route path="/fullmakt/success" element={<FullmaktSuccess />} />
              <Route path="/quote/accept/:token" element={<QuoteAccept />} />
              
              {/* Min Side - Employee self-service */}
              <Route path="/min-side" element={<MinSideIndex />} />
              <Route path="/min-side/profil" element={<MinProfil />} />
              <Route path="/min-side/samtaler" element={<MineSamtaler />} />
              <Route path="/min-side/mal" element={<MineMal />} />
              <Route path="/min-side/puls" element={<MinePulsundersokelser />} />
              <Route path="/min-side/ferie" element={<MinFerieOgFravaer />} />
              <Route path="/min-side/turnus" element={<MinTurnus />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnsattSelectorProvider>
          </SalonProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
