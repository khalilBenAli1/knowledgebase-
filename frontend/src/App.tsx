import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerificationRequiredPage from './pages/VerificationRequiredPage';
import RequestPasswordResetPage from './pages/RequestPasswordResetPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AccueilPage from './pages/AccueilPage';
import ChatPage from './pages/ChatPage';
import ActualitiesPage from './pages/ActualitiesPage';
import ActualityDetailPage from './pages/ActualityDetailPage';
import SettingsPage from './pages/SettingsPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import FormationDetailPage from './pages/FormationDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import HRFormationsConsolidatedPage from './pages/HRFormationsConsolidatedPage';
import ConsolidatedAdminPage from './pages/ConsolidatedAdminPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import EventCreateEditPage from './pages/EventCreateEditPage';
import EventStatisticsPage from './pages/EventStatisticsPage';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/verification-required" element={<VerificationRequiredPage />} />
              <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route index element={<AccueilPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="actualites" element={<ActualitiesPage />} />
                <Route path="actualites/:id" element={<ActualityDetailPage />} />
                <Route path="formations" element={<HRFormationsConsolidatedPage />} />
                <Route path="formations/:id" element={<FormationDetailPage />} />
                <Route path="evenements" element={<EventsPage />} />
                <Route path="evenements/create" element={<EventCreateEditPage />} />
                <Route path="evenements/:id" element={<EventDetailPage />} />
                <Route path="evenements/:id/edit" element={<EventCreateEditPage />} />
                <Route path="evenements/:id/statistics" element={<EventStatisticsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="admin" element={<ConsolidatedAdminPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="manager" element={<ManagerDashboardPage />} />
              </Route>
            </Routes>

            {/* Toast notifications */}
            <Toaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#134a21',
                  border: '1px solid #1a6b2e',
                  padding: '16px',
                  borderRadius: '8px',
                },
              }}
            />
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
