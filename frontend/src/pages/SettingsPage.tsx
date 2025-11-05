import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { showSuccess, showError } from '../utils/toast';
import { validatePassword } from '../utils/errorHandler';
import LoadingSpinner from '../components/LoadingSpinner';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences'>('profile');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Preferences
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    chatHistory: true,
    theme: 'light' as 'light' | 'dark',
    language: 'fr' as 'fr' | 'ar',
  });

  useEffect(() => {
    fetchUserProfile();

    // Load preferences from localStorage
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Failed to parse preferences:', error);
      }
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/profile');
      setUserProfile(response.data);
      setProfileForm({
        name: response.data.name,
        email: response.data.email,
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.patch('/auth/profile', profileForm);

      // Update auth store with new user data
      if (user && token && response.data) {
        const updatedUser = {
          ...user,
          name: response.data.name || profileForm.name,
          email: response.data.email || profileForm.email,
        };
        login(token, updatedUser);
      }

      showSuccess('Profil mis à jour avec succès');
      fetchUserProfile();
    } catch (error) {
      showError('Échec de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate new password
    const validation = validatePassword(passwordForm.newPassword);
    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      showError('Le mot de passe ne respecte pas les exigences');
      return;
    }

    // Check if passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showSuccess('Mot de passe modifié avec succès');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors([]);
    } catch (error: any) {
      if (error.response?.status === 401) {
        showError('Mot de passe actuel incorrect');
      } else {
        showError('Échec du changement de mot de passe');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = () => {
    // Save preferences to localStorage for now
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    showSuccess('Préférences enregistrées');
  };

  if (loading && !userProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres</h1>
      <p className="text-gray-600 mb-6">Gérez vos informations personnelles et préférences</p>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'profile'
              ? 'text-biat-primary border-b-2 border-biat-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Profil
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'password'
              ? 'text-biat-primary border-b-2 border-biat-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Mot de passe
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'preferences'
              ? 'text-biat-primary border-b-2 border-biat-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Préférences
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Informations du profil
          </h2>

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-biat-100 flex items-center justify-center text-2xl font-bold text-biat-primary">
                {profileForm.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <button
                  type="button"
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Changer l'avatar
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG ou GIF. Max 2MB.
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
              />
            </div>

            {/* Role (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle
              </label>
              <input
                type="text"
                value={userProfile?.role.name || user?.role || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Member since */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Membre depuis
              </label>
              <input
                type="text"
                value={
                  userProfile?.createdAt
                    ? new Date(userProfile.createdAt).toLocaleDateString('fr-FR')
                    : '-'
                }
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
              <button
                type="button"
                onClick={fetchUserProfile}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Modifier le mot de passe
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
                required
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => {
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                  const validation = validatePassword(e.target.value);
                  setPasswordErrors(validation.errors);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
                required
              />
              {passwordErrors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  <p className="font-medium">Le mot de passe doit contenir :</p>
                  <ul className="list-disc list-inside">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || passwordErrors.length > 0}
                className="px-6 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Préférences</h2>

          <div className="space-y-6">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Notifications par email</h3>
                <p className="text-sm text-gray-500">
                  Recevoir des notifications pour les mises à jour importantes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, emailNotifications: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-biat-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-biat-primary"></div>
              </label>
            </div>

            {/* Chat History */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Historique des conversations</h3>
                <p className="text-sm text-gray-500">
                  Conserver l'historique de vos conversations
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.chatHistory}
                  onChange={(e) =>
                    setPreferences({ ...preferences, chatHistory: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-biat-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-biat-primary"></div>
              </label>
            </div>

            {/* Theme */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Thème</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    preferences.theme === 'light'
                      ? 'border-biat-primary bg-biat-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="block font-medium">Clair</span>
                  <span className="text-sm text-gray-500">Mode jour</span>
                </button>
                <button
                  onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    preferences.theme === 'dark'
                      ? 'border-biat-primary bg-biat-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="block font-medium">Sombre</span>
                  <span className="text-sm text-gray-500">Mode nuit</span>
                </button>
              </div>
            </div>

            {/* Language */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Langue</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setPreferences({ ...preferences, language: 'fr' })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    preferences.language === 'fr'
                      ? 'border-biat-primary bg-biat-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="block font-medium">Français</span>
                </button>
                <button
                  onClick={() => setPreferences({ ...preferences, language: 'ar' })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                    preferences.language === 'ar'
                      ? 'border-biat-primary bg-biat-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="block font-medium">العربية</span>
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handlePreferencesSave}
                className="px-6 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors"
              >
                Enregistrer les préférences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
