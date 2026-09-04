import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { ProtectedRoute, AdminOnlyRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/new" element={<AddCompanyPage />} />
          <Route path="/visitors" element={<VisitorsPage />} />
          <Route path="/visitors/new" element={<AddVisitorPage />} />
          <Route path="/visitors/:id" element={<VisitorDetailPage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/visits/new" element={<NewVisitPage />} />
          <Route path="/visits/:id" element={<VisitDetailPage />} />
          <Route element={<AdminOnlyRoute />}>
            <Route path="/companies/:id/edit" element={<EditCompanyPage />} />
            <Route path="/visitors/:id/edit" element={<EditVisitorPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
