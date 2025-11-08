import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccueilPage from './pages/AccueilPage';
import ChatPage from './pages/ChatPage';
import ActualitiesPage from './pages/ActualitiesPage';
import ActualityDetailPage from './pages/ActualityDetailPage';
import FormationsPage from './pages/FormationsPage';
import DocumentsPage from './pages/DocumentsPage';
import AdminPage from './pages/AdminPage';
import AuditPage from './pages/AuditPage';
import UsersPage from './pages/UsersPage';
import SystemStatusPage from './pages/SystemStatusPage';
import SettingsPage from './pages/SettingsPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import HRCatalogUploadPage from './pages/HRCatalogUploadPage';
import HRFormationRequestsPage from './pages/HRFormationRequestsPage';
import MyFormationRequestsPage from './pages/MyFormationRequestsPage';
import FormationDetailPage from './pages/FormationDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import TeamManagementPage from './pages/TeamManagementPage';
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
                <Route path="formations" element={<FormationsPage />} />
                <Route path="formations/:id" element={<FormationDetailPage />} />
                <Route path="my-formation-requests" element={<MyFormationRequestsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="system" element={<SystemStatusPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="manager" element={<ManagerDashboardPage />} />
                <Route path="hr/catalog" element={<HRCatalogUploadPage />} />
                <Route path="hr/formations" element={<HRFormationRequestsPage />} />
                <Route path="hr/teams" element={<TeamManagementPage />} />
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
