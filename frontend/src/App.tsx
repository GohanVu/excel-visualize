import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ColumnOverviewPage from './pages/ColumnOverviewPage';
import ChartSuggestionPage from './pages/ChartSuggestionPage';
import ChartDetailPage from './pages/ChartDetailPage';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';

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
        <Route
          path="/datasets/:id/learn"
          element={
            <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
              🎴 Học — flashcard/quiz đang xây dựng (P1.6-T2)
            </div>
          }
        />
        <Route
          path="/admin/*"
          element={
            <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
              Admin panel — coming soon
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
