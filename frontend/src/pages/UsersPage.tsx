import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  role?: {
    id: string;
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { user: currentUser, logout } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; roleId: string; userName: string; roleName: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await api.get('/admin/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to load roles', error);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    const targetUser = users.find(u => u.id === userId);
    const targetRole = roles.find(r => r.id === roleId);

    if (!targetUser || !targetRole) return;

    // Show confirmation modal with user and role info
    setPendingRoleChange({
      userId,
      roleId,
      userName: targetUser.name,
      roleName: targetRole.name
    });
    setShowConfirmModal(true);
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    try {
      await api.patch(`/admin/users/${pendingRoleChange.userId}/role`, { roleId: pendingRoleChange.roleId });

      // Check if admin changed their own role
      const isChangingOwnRole = pendingRoleChange.userId === currentUser?.id;

      if (isChangingOwnRole) {
        alert('Votre rôle a été modifié. Vous allez être déconnecté.');
        setTimeout(() => {
          logout();
        }, 1000);
      } else {
        loadUsers();
      }

      setShowConfirmModal(false);
      setPendingRoleChange(null);
    } catch (error) {
      console.error('Failed to update user role', error);
      alert('Erreur lors de la mise à jour du rôle');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !isActive });
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName || !inviteRole) return;

    setInviting(true);
    try {
      await api.post('/admin/users/invite', {
        email: inviteEmail,
        name: inviteName,
        roleId: inviteRole,
      });
      alert('Invitation envoyée avec succès!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('');
      loadUsers();
    } catch (error: any) {
      console.error('Failed to invite user', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 dark:bg-gray-900 dark:text-gray-100">Chargement...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-biat-primary">Gestion des Utilisateurs</h1>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-biat-primary text-white px-6 py-3 rounded-lg hover:bg-biat-accent transition-all shadow-sm hover:shadow-md flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Inviter un utilisateur</span>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, email ou rôle..."
                className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              />
              <svg
                className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-4 top-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-biat-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Date d'inscription
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-biat-100 dark:bg-biat-900 rounded-full flex items-center justify-center">
                        <span className="text-biat-primary dark:text-biat-300 font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-biat-secondary dark:text-gray-200">{user.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role?.id || ''}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-biat-primary dark:bg-gray-700 dark:text-gray-100"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                        user.isActive
                          ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                      }`}
                    >
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir réinitialiser le mot de passe?')) {
                          // TODO: Implement password reset
                          alert('Fonctionnalité à implémenter');
                        }
                      }}
                      className="text-biat-primary hover:text-biat-accent font-medium transition-colors"
                    >
                      Réinitialiser MDP
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-biat-primary dark:text-biat-300">Inviter un utilisateur</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-biat-secondary dark:text-gray-300 mb-2">Nom complet</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Ex: Mohamed Ali"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-biat-secondary dark:text-gray-300 mb-2">Adresse e-mail</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="utilisateur@biat.com.tn"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-biat-secondary dark:text-gray-300 mb-2">Rôle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  required
                >
                  <option value="">Sélectionner un rôle</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 bg-biat-primary text-white px-4 py-3 rounded-lg hover:bg-biat-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Envoi...' : 'Envoyer l\'invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      {showConfirmModal && pendingRoleChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-biat-secondary dark:text-gray-200 text-center mb-2">Confirmer le changement de rôle</h2>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Êtes-vous sûr de vouloir changer le rôle de <span className="font-semibold">{pendingRoleChange.userName}</span> en <span className="font-semibold text-biat-primary dark:text-biat-300">{pendingRoleChange.roleName}</span> ?
              </p>
              {pendingRoleChange.userId === currentUser?.id && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    ⚠️ Attention : Vous modifiez votre propre rôle. Vous serez déconnecté après cette action.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingRoleChange(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={confirmRoleChange}
                className="flex-1 bg-biat-primary text-white px-4 py-3 rounded-lg hover:bg-biat-accent transition-all"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
