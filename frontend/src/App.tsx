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
import FormationsPage from './pages/FormationsPage';
import DocumentsPage from './pages/DocumentsPage';
import AdminPage from './pages/AdminPage';
import AuditPage from './pages/AuditPage';
import UsersPage from './pages/UsersPage';
import SystemStatusPage from './pages/SystemStatusPage';
import SettingsPage from './pages/SettingsPage';
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
                <Route path="formations" element={<FormationsPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="system" element={<SystemStatusPage />} />
                <Route path="settings" element={<SettingsPage />} />
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
