import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const canAccessDocuments = ['HR Admin', 'Legal Admin'].includes(
    user?.role?.name || '',
  );
  const canAccessAdmin = ['HR Admin', 'IT Admin'].includes(user?.role?.name || '');
  const canAccessAudit = ['Legal Admin'].includes(user?.role?.name || '');
  const canAccessUsers = ['IT Admin'].includes(user?.role?.name || '');
  const isITAdmin = user?.role?.name === 'IT Admin';

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex flex-col dark:bg-gray-900">
      <header className="bg-gradient-to-r from-biat-primary to-biat-secondary text-white shadow-lg dark:from-gray-800 dark:to-gray-900">
        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-white p-1.5 md:p-2 rounded-lg">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-biat-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
              </svg>
            </div>
            <h1 className="text-base md:text-xl font-bold truncate">Assurances BIAT</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-1">
            <Link to="/" className={`px-4 py-2 rounded-lg transition-all ${isActive('/') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
              Chat
            </Link>
            {canAccessDocuments && (
              <Link to="/documents" className={`px-4 py-2 rounded-lg transition-all ${isActive('/documents') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                Documents
              </Link>
            )}
            {canAccessAdmin && (
              <Link to="/admin" className={`px-4 py-2 rounded-lg transition-all ${isActive('/admin') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                Admin
              </Link>
            )}
            {canAccessAudit && (
              <Link to="/audit" className={`px-4 py-2 rounded-lg transition-all ${isActive('/audit') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                Audit
              </Link>
            )}
            {canAccessUsers && (
              <Link to="/users" className={`px-4 py-2 rounded-lg transition-all ${isActive('/users') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                Utilisateurs
              </Link>
            )}
            {isITAdmin && (
              <Link to="/system" className={`px-4 py-2 rounded-lg transition-all ${isActive('/system') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                Système
              </Link>
            )}
          </nav>

          {/* Desktop User Menu - Dropdown */}
          <div className="hidden md:flex items-center relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-3 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all border border-white/20 hover:border-white/30"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-sm font-semibold">{user?.name}</div>
                <div className="text-xs text-white/70">{user?.role?.name}</div>
              </div>
              <svg className={`w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Paramètres
                  </Link>
                  <button
                    onClick={() => { logout(); setProfileDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-biat-secondary/50 backdrop-blur-sm">
            <nav className="px-4 py-3 space-y-1">
              <Link to="/" onClick={handleNavClick} className={`block px-4 py-2 rounded-lg transition-all ${isActive('/') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                Chat
              </Link>
              {canAccessDocuments && (
                <Link to="/documents" onClick={handleNavClick} className={`block px-4 py-2 rounded-lg transition-all ${isActive('/documents') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                  Documents
                </Link>
              )}
              {canAccessAdmin && (
                <Link to="/admin" onClick={handleNavClick} className={`block px-4 py-2 rounded-lg transition-all ${isActive('/admin') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                  Administration
                </Link>
              )}
              {canAccessAudit && (
                <Link to="/audit" onClick={handleNavClick} className={`block px-4 py-2 rounded-lg transition-all ${isActive('/audit') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                  Audit
                </Link>
              )}
              {canAccessUsers && (
                <Link to="/users" onClick={handleNavClick} className={`block px-4 py-2 rounded-lg transition-all ${isActive('/users') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                  Utilisateurs
                </Link>
              )}
              {isITAdmin && (
                <Link to="/system" onClick={handleNavClick} className={`block px-4 py-2 rounded-lg transition-all ${isActive('/system') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}`}>
                  Système
                </Link>
              )}
              <div className="pt-2 border-t border-white/20">
                <div className="px-4 py-2 text-sm">
                  <div className="font-semibold">{user?.name}</div>
                  <div className="text-white/70 text-xs">{user?.role?.name}</div>
                </div>
                <Link to="/settings" onClick={handleNavClick} className="block px-4 py-2 rounded-lg hover:bg-white/10 text-white/90">
                  Paramètres
                </Link>
                <button onClick={() => { logout(); handleNavClick(); }} className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 text-white/90">
                  Déconnexion
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
}
