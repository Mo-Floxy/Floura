import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/Calendar';
import SymptomsPage from './pages/Symptoms';
import MoodsPage from './pages/Moods';
import WellnessPage from './pages/Wellness';
import InsightsPage from './pages/Insights';
import LearnPage from './pages/Learn';
import RemindersPage from './pages/Reminders';
import SettingsPage from './pages/Settings';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-loader"><Spinner label="Welcome to FLOURA…" /></div>;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-loader"><Spinner label="Opening your space…" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/symptoms" element={<SymptomsPage />} />
        <Route path="/moods" element={<MoodsPage />} />
        <Route path="/wellness" element={<WellnessPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/reminders" element={<RemindersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
