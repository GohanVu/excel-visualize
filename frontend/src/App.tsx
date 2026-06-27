import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
            Dashboard — coming soon
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
    </Routes>
  );
}
