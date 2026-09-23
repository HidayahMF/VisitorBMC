import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './security/security.css';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { AddCompanyPage } from './pages/AddCompanyPage';
import { EditCompanyPage } from './pages/EditCompanyPage';
import { VisitorsPage } from './pages/VisitorsPage';
import { AddVisitorPage } from './pages/AddVisitorPage';
import { VisitorDetailPage } from './pages/VisitorDetailPage';
import { EditVisitorPage } from './pages/EditVisitorPage';
import { VisitsPage } from './pages/VisitsPage';
import { VisitDetailPage } from './pages/VisitDetailPage';
import { NewVisitPage } from './pages/NewVisitPage';
import { ActiveVisitsPage } from './pages/ActiveVisitsPage';
import { SafetyInductionPage } from './pages/SafetyInductionPage';
import { SafetyInductionManagementPage } from './pages/SafetyInductionManagementPage';
import { ProtectedRoute, AdminOnlyRoute, ReportsAccessRoute, CompanyEditRoute } from './components/ProtectedRoute';
import { AuditLogPage } from './pages/AuditLogPage';
import { ReportsPage } from './pages/ReportsPage';
import { SafetyConfigurationPage } from './pages/SafetyConfigurationPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { PublicVisitRegistrationPage } from './pages/PublicVisitRegistrationPage';
import { SecurityGate, SecurityShell } from './security/shell';
import { SecurityDashboardPage } from './security/pages/dashboard';
import { SecurityTravelPage } from './security/pages/travel';
import { SecurityIzinPage } from './security/pages/izin';
import { SecurityKembaliPage } from './security/pages/kembali';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/security" element={<SecurityGate />}>
          <Route index element={<Navigate to="/security/dashboard" replace />} />
          <Route element={<SecurityShell />}>
            <Route path="dashboard" element={<SecurityDashboardPage />} />
            <Route path="tugas-luar" element={<SecurityTravelPage />} />
            <Route path="izin" element={<SecurityIzinPage />} />
            <Route path="kembali" element={<SecurityKembaliPage />} />
          </Route>
        </Route>
         <Route path="/safety-induction/:token" element={<SafetyInductionPage />} />
         <Route path="/visitor/register" element={<PublicVisitRegistrationPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/new" element={<AddCompanyPage />} />
          <Route path="/visitors" element={<VisitorsPage />} />
          <Route path="/visitors/new" element={<AddVisitorPage />} />
          <Route path="/visitors/:id" element={<VisitorDetailPage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/visits/new" element={<NewVisitPage />} />
          <Route path="/visits/active" element={<ActiveVisitsPage />} />
           <Route path="/visits/:id" element={<VisitDetailPage />} />
           <Route path="/safety-inductions/manage" element={<SafetyInductionManagementPage />} />
           <Route element={<ReportsAccessRoute />}>
             <Route path="/reports" element={<ReportsPage />} />
           </Route>
           <Route element={<CompanyEditRoute />}>
             <Route path="/companies/:id/edit" element={<EditCompanyPage />} />
           </Route>
           <Route element={<AdminOnlyRoute />}>
           <Route path="/audit-log" element={<AuditLogPage />} />
             <Route path="/safety-inductions/config" element={<SafetyConfigurationPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/visitors/:id/edit" element={<EditVisitorPage />} />
          </Route>
        </Route>
         <Route path="/" element={<Navigate to="/visitor/register" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
