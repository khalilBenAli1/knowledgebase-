import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const canAccessDocuments = ['HR Admin', 'Legal Admin', 'IT Admin'].includes(
    user?.role?.name || '',
  );
  const canAccessAdmin = ['HR Admin', 'IT Admin'].includes(user?.role?.name || '');
  const canAccessAudit = ['IT Admin', 'Legal Admin'].includes(user?.role?.name || '');
  const canAccessUsers = ['IT Admin'].includes(user?.role?.name || '');

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gradient-to-r from-biat-primary to-biat-secondary text-white shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <svg className="w-8 h-8 text-biat-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold">Assurances BIAT</h1>
            </div>
            <nav className="flex space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg transition-all ${
                  isActive('/')
                    ? 'bg-white/20 text-white font-semibold'
                    : 'hover:bg-white/10 text-white/90'
                }`}
              >
                Chat
              </Link>
              {canAccessDocuments && (
                <Link
                  to="/documents"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    isActive('/documents')
                      ? 'bg-white/20 text-white font-semibold'
                      : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  Documents
                </Link>
              )}
              {canAccessAdmin && (
                <Link
                  to="/admin"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    isActive('/admin')
                      ? 'bg-white/20 text-white font-semibold'
                      : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  Administration
                </Link>
              )}
              {canAccessAudit && (
                <Link
                  to="/audit"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    isActive('/audit')
                      ? 'bg-white/20 text-white font-semibold'
                      : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  Audit
                </Link>
              )}
              {canAccessUsers && (
                <Link
                  to="/users"
                  className={`px-4 py-2 rounded-lg transition-all ${
                    isActive('/users')
                      ? 'bg-white/20 text-white font-semibold'
                      : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  Utilisateurs
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <div className="font-semibold">{user?.name}</div>
              <div className="text-white/70 text-xs">{user?.role?.name}</div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all border border-white/20 hover:border-white/30"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
