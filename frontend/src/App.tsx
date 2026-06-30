import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ColumnOverviewPage from './pages/ColumnOverviewPage';
import ChartSuggestionPage from './pages/ChartSuggestionPage';
import ChartDetailPage from './pages/ChartDetailPage';
import LearnPage from './pages/LearnPage';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import AdminStatsPage from './pages/admin/AdminStatsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';

import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public-only routes — redirect to /dashboard if already logged in */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected routes — redirect to /login if not authenticated */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/datasets/:id/columns" element={<ColumnOverviewPage />} />
        <Route path="/datasets/:id/charts" element={<ChartSuggestionPage />} />
        <Route path="/datasets/:id/chart" element={<ChartDetailPage />} />
        <Route path="/datasets/:id/learn" element={<LearnPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/payment/cancel" element={<PaymentCancelPage />} />
      </Route>

      {/* Admin-only routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/stats" replace />} />
          <Route path="stats" element={<AdminStatsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
