# 🎨 Frontend Implementation Guide

Complete specifications for all frontend components needed to support the new features.

---

## 🔔 1. Notification System

### Header Notification Bell

**Location**: `frontend/src/components/Header.tsx` or `frontend/src/components/Navbar.tsx`

**Component**: `NotificationBell.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../services/api';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    const { data } = await api.get('/notifications/unread-count');
    setUnreadCount(data.count);
  };

  const fetchNotifications = async () => {
    const { data } = await api.get('/notifications');
    setNotifications(data);
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    fetchNotifications();
    fetchUnreadCount();
  };

  const markAllAsRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative p-2 hover:bg-gray-100 rounded-full">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div>
            {notifications.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">Aucune notification</p>
            ) : (
              notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**NotificationItem Component**:

```tsx
function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.isRead) {
      onRead();
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'formation_request':
        return '📚';
      case 'manager_invitation':
        return '👥';
      case 'formation_approved':
        return '✅';
      case 'formation_declined':
        return '❌';
      case 'actuality_comment':
        return '💬';
      case 'actuality_like':
        return '❤️';
      default:
        return '🔔';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
        !notification.isRead ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getIcon()}</span>
        <div className="flex-1">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-sm text-gray-600">{notification.message}</p>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(notification.createdAt), { locale: fr })}
          </span>
        </div>
        {!notification.isRead && (
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        )}
      </div>
    </div>
  );
}
```

---

## 📚 2. Formation Request Button & Modal

### Formation Card Component Update

**File**: `frontend/src/components/FormationCard.tsx`

Add "Request Training" button:

```tsx
import { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export function FormationCard({ formation }) {
  const { user } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [hasManager, setHasManager] = useState(user?.managerId != null);

  const handleRequestClick = () => {
    if (!hasManager) {
      alert('Vous devez avoir un manager assigné pour demander une formation.');
      return;
    }
    setShowRequestModal(true);
  };

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition">
      <h3 className="text-xl font-bold mb-2">{formation.title}</h3>
      <p className="text-gray-600 mb-4">{formation.description}</p>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {new Date(formation.startDate).toLocaleDateString('fr-FR')}
        </span>
        <button
          onClick={handleRequestClick}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Demander cette formation
        </button>
      </div>

      {showRequestModal && (
        <FormationRequestModal
          formation={formation}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  );
}
```

### Formation Request Modal

**File**: `frontend/src/components/FormationRequestModal.tsx`

```tsx
import { useState } from 'react';
import { api } from '../services/api';

export function FormationRequestModal({ formation, onClose }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/formation-requests', {
        formationId: formation.id,
        requesterMessage: message,
      });

      alert('Demande envoyée avec succès! Votre manager sera notifié.');
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Demander une formation</h2>
        <p className="text-gray-600 mb-4">
          Formation: <strong>{formation.title}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Message pour votre manager (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded-lg p-2 h-32"
              placeholder="Expliquez pourquoi vous souhaitez suivre cette formation..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### My Requests Page

**File**: `frontend/src/pages/MyFormationRequests.tsx`

```tsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function MyFormationRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await api.get('/formation-requests/my-requests');
    setRequests(data);
    setLoading(false);
  };

  const handleCancel = async (requestId) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette demande?')) return;

    try {
      await api.delete(`/formation-requests/${requestId}`);
      fetchRequests();
    } catch (error) {
      alert('Erreur lors de l\'annulation');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      approved: { text: 'Approuvée', color: 'bg-green-100 text-green-800' },
      declined: { text: 'Refusée', color: 'bg-red-100 text-red-800' },
      cancelled: { text: 'Annulée', color: 'bg-gray-100 text-gray-800' },
    };

    const badge = badges[status];
    return (
      <span className={`px-3 py-1 rounded-full text-sm ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Mes demandes de formation</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">Aucune demande de formation</p>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div key={request.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{request.formation.title}</h3>
                {getStatusBadge(request.status)}
              </div>

              {request.requesterMessage && (
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Votre message:</strong> {request.requesterMessage}
                </p>
              )}

              {request.managerResponse && (
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Réponse du manager:</strong> {request.managerResponse}
                </p>
              )}

              <p className="text-xs text-gray-400">
                Demandée le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
              </p>

              {request.status === 'pending' && (
                <button
                  onClick={() => handleCancel(request.id)}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  Annuler la demande
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 👥 3. Manager Dashboard

**File**: `frontend/src/pages/ManagerDashboard.tsx`

```tsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, BookOpen, TrendingUp } from 'lucide-react';

export function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('requests');
  const [stats, setStats] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchPendingRequests();
    fetchCollaborators();
  }, []);

  const fetchStats = async () => {
    const { data } = await api.get('/formation-requests/statistics');
    setStats(data);
  };

  const fetchPendingRequests = async () => {
    const { data } = await api.get('/formation-requests/pending-reviews');
    setPendingRequests(data);
  };

  const fetchCollaborators = async () => {
    const { data } = await api.get('/manager-invitations/collaborators');
    setCollaborators(data);
  };

  const handleReview = async (requestId, status, response = '') => {
    try {
      await api.put(`/formation-requests/${requestId}/review`, {
        status,
        managerResponse: response,
      });
      fetchPendingRequests();
      fetchStats();
      alert(`Demande ${status === 'approved' ? 'approuvée' : 'refusée'} avec succès`);
    } catch (error) {
      alert('Erreur lors de la révision');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    if (!confirm('Retirer ce collaborateur de votre équipe?')) return;

    try {
      await api.delete(`/manager-invitations/collaborators/${collaboratorId}`);
      fetchCollaborators();
    } catch (error) {
      alert('Erreur lors du retrait');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Tableau de bord Manager</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Demandes en attente</p>
              <p className="text-3xl font-bold">{stats?.pending || 0}</p>
            </div>
            <BookOpen className="text-yellow-500" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total demandes</p>
              <p className="text-3xl font-bold">{stats?.total || 0}</p>
            </div>
            <TrendingUp className="text-blue-500" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Collaborateurs</p>
              <p className="text-3xl font-bold">{collaborators.length}</p>
            </div>
            <Users className="text-green-500" size={40} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-2 ${
              activeTab === 'requests'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            Demandes de formation
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-2 ${
              activeTab === 'team'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            Mon équipe
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'requests' && (
        <FormationRequestsTab
          requests={pendingRequests}
          onReview={handleReview}
        />
      )}

      {activeTab === 'team' && (
        <TeamTab
          collaborators={collaborators}
          onRemove={handleRemoveCollaborator}
          onInvite={() => setShowInviteModal(true)}
        />
      )}

      {showInviteModal && (
        <InviteCollaboratorModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            fetchCollaborators();
          }}
        />
      )}
    </div>
  );
}

function FormationRequestsTab({ requests, onReview }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  const handleApprove = (request) => {
    if (confirm(`Approuver la demande de ${request.requester.name}?`)) {
      onReview(request.id, 'approved');
    }
  };

  const handleDecline = (request) => {
    setSelectedRequest(request);
  };

  const submitDecline = () => {
    onReview(selectedRequest.id, 'declined', declineReason);
    setSelectedRequest(null);
    setDeclineReason('');
  };

  if (requests.length === 0) {
    return <p className="text-gray-500">Aucune demande en attente</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <div key={request.id} className="border rounded-lg p-4 bg-white">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold">{request.formation.title}</h3>
              <p className="text-sm text-gray-600">
                Demandé par: <strong>{request.requester.name}</strong>
              </p>
              <p className="text-xs text-gray-400">
                {new Date(request.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {request.requesterMessage && (
            <div className="mb-3 p-3 bg-gray-50 rounded">
              <p className="text-sm"><strong>Message:</strong></p>
              <p className="text-sm text-gray-700">{request.requesterMessage}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleApprove(request)}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
            >
              ✓ Approuver
            </button>
            <button
              onClick={() => handleDecline(request)}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
            >
              ✗ Refuser
            </button>
          </div>
        </div>
      ))}

      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Refuser la demande</h3>
            <p className="text-gray-600 mb-4">
              Veuillez expliquer la raison du refus à {selectedRequest.requester.name}:
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full border rounded-lg p-3 h-32 mb-4"
              placeholder="Raison du refus..."
              required
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 border rounded-lg py-2 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={submitDecline}
                disabled={!declineReason.trim()}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 disabled:opacity-50"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamTab({ collaborators, onRemove, onInvite }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Mes collaborateurs</h2>
        <button
          onClick={onInvite}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Inviter un collaborateur
        </button>
      </div>

      {collaborators.length === 0 ? (
        <p className="text-gray-500">Aucun collaborateur</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collaborators.map(collaborator => (
            <div key={collaborator.id} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{collaborator.name}</h3>
                  <p className="text-sm text-gray-600">{collaborator.email}</p>
                  <p className="text-xs text-gray-500 mt-1">{collaborator.role.name}</p>
                </div>
              </div>
              <button
                onClick={() => onRemove(collaborator.id)}
                className="text-sm text-red-600 hover:underline mt-2"
              >
                Retirer de l'équipe
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InviteCollaboratorModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/manager-invitations/invite', {
        collaboratorEmail: email,
        message,
      });
      alert('Invitation envoyée avec succès!');
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Inviter un collaborateur</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email du collaborateur</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="collaborateur@example.com"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Message (optionnel)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded-lg p-2 h-24"
              placeholder="Un message personnalisé..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg py-2 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 📰 4. Actuality Detail Page with Interactions

**File**: `frontend/src/pages/ActualityDetail.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Heart, Eye, MessageCircle } from 'lucide-react';

export function ActualityDetail() {
  const { id } = useParams();
  const [actuality, setActuality] = useState(null);
  const [stats, setStats] = useState({ views: 0, likes: 0, comments: 0 });
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    fetchActuality();
    recordView();
    fetchStats();
    fetchComments();
  }, [id]);

  const fetchActuality = async () => {
    const { data } = await api.get(`/actualities/${id}`);
    setActuality(data);
  };

  const recordView = async () => {
    await api.post(`/actualities/${id}/view`);
  };

  const fetchStats = async () => {
    const { data } = await api.get(`/actualities/${id}/stats`);
    setStats(data);
  };

  const fetchComments = async () => {
    const { data } = await api.get(`/actualities/${id}/comments`);
    setComments(data);
  };

  const handleLike = async () => {
    const { data } = await api.post(`/actualities/${id}/like`);
    setIsLiked(data.liked);
    fetchStats();
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post(`/actualities/${id}/comments`, {
        comment: newComment,
        parentCommentId: replyTo,
      });
      setNewComment('');
      setReplyTo(null);
      fetchComments();
      fetchStats();
    } catch (error) {
      alert('Erreur lors de l\'ajout du commentaire');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Supprimer ce commentaire?')) return;

    try {
      await api.delete(`/actualities/comments/${commentId}`);
      fetchComments();
      fetchStats();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  if (!actuality) return <div>Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        {actuality.imageUrl && (
          <img
            src={actuality.imageUrl}
            alt={actuality.title}
            className="w-full h-64 object-cover rounded-lg mb-4"
          />
        )}
        <h1 className="text-3xl font-bold mb-2">{actuality.title}</h1>
        <p className="text-gray-500 text-sm">
          Publié le {new Date(actuality.createdAt).toLocaleDateString('fr-FR')}
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-6 py-4 border-y mb-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Eye size={20} />
          <span>{stats.views} vues</span>
        </div>
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500`}
        >
          <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
          <span>{stats.likes} j'aime</span>
        </button>
        <div className="flex items-center gap-2 text-gray-600">
          <MessageCircle size={20} />
          <span>{stats.comments} commentaires</span>
        </div>
      </div>

      {/* Content */}
      <div className="prose max-w-none mb-8">
        {actuality.description}
      </div>

      {/* Comments Section */}
      <div className="border-t pt-6">
        <h2 className="text-2xl font-bold mb-4">Commentaires ({stats.comments})</h2>

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="mb-6">
          {replyTo && (
            <div className="mb-2 text-sm text-gray-600">
              Répondre à un commentaire
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-2 text-blue-600 hover:underline"
              >
                Annuler
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="flex-1 border rounded-lg p-3"
              rows={3}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Publier
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments
            .filter(c => !c.parentCommentId)
            .map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replies={comments.filter(c => c.parentCommentId === comment.id)}
                onReply={setReplyTo}
                onDelete={handleDeleteComment}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, replies, onReply, onDelete }) {
  const { user } = useAuth();
  const isOwner = user?.userId === comment.userId;

  return (
    <div className="border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold">{comment.user.name}</p>
          <p className="text-sm text-gray-600">{comment.comment}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(comment.createdAt), { locale: fr })}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => onDelete(comment.id)}
            className="text-red-600 text-sm hover:underline"
          >
            Supprimer
          </button>
        )}
      </div>
      <button
        onClick={() => onReply(comment.id)}
        className="text-sm text-blue-600 hover:underline mb-2"
      >
        Répondre
      </button>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-6 mt-3 space-y-3">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 📤 5. HR Catalog Upload Page

**File**: `frontend/src/pages/HRCatalogUpload.tsx`

```tsx
import { useState } from 'react';
import { api } from '../services/api';
import { Upload, FileText } from 'lucide-react';

export function HRCatalogUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
    } else {
      alert('Seuls les fichiers PDF sont acceptés');
    }
  };

  const handleExtractPreview = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/formations/catalog/extract-preview', formData);
      setPreview(data.formations);
    } catch (error) {
      alert('Erreur lors de l\'extraction');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAndImport = async () => {
    if (!file) return;

    if (!confirm(`Importer ${preview?.length || 0} formations?`)) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/formations/catalog/upload', formData);
      setResult(data);
      alert(`${data.imported} formations importées sur ${data.extracted} extraites`);
      setFile(null);
      setPreview(null);
    } catch (error) {
      alert('Erreur lors de l\'importation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Importer un catalogue de formations</h1>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 text-center">
        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-gray-600 mb-4">
          Glissez-déposez un fichier PDF ou cliquez pour sélectionner
        </p>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700"
        >
          Sélectionner un PDF
        </label>

        {file && (
          <div className="mt-4 flex items-center justify-center gap-2 text-gray-700">
            <FileText size={20} />
            <span>{file.name}</span>
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="text-red-600 hover:underline ml-2"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {file && !preview && (
        <div className="text-center">
          <button
            onClick={handleExtractPreview}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Extraction en cours...' : 'Extraire les formations'}
          </button>
        </div>
      )}

      {/* Preview Section */}
      {preview && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Formations extraites ({preview.length})
            </h2>
            <button
              onClick={handleUploadAndImport}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Importation...' : 'Importer toutes les formations'}
            </button>
          </div>

          <div className="space-y-4">
            {preview.map((formation, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white">
                <h3 className="font-semibold mb-2">{formation.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{formation.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {formation.startDate && (
                    <div>
                      <strong>Date de début:</strong> {new Date(formation.startDate).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  {formation.duration && (
                    <div>
                      <strong>Durée:</strong> {formation.duration}
                    </div>
                  )}
                  {formation.location && (
                    <div>
                      <strong>Lieu:</strong> {formation.location}
                    </div>
                  )}
                  {formation.maxParticipants && (
                    <div>
                      <strong>Places:</strong> {formation.maxParticipants}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Section */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Importation réussie!</h3>
          <p className="text-green-700">
            {result.imported} formations ont été importées sur {result.extracted} extraites.
          </p>
          <p className="text-sm text-green-600 mt-2">
            Les formations sont maintenant disponibles en mode brouillon. Vous pouvez les modifier et les publier.
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔗 Routes to Add

**File**: `frontend/src/App.tsx` or router configuration

```tsx
import { ManagerDashboard } from './pages/ManagerDashboard';
import { MyFormationRequests } from './pages/MyFormationRequests';
import { ActualityDetail } from './pages/ActualityDetail';
import { HRCatalogUpload } from './pages/HRCatalogUpload';

// Add these routes
<Route path="/manager/dashboard" element={<ManagerDashboard />} />
<Route path="/my-formation-requests" element={<MyFormationRequests />} />
<Route path="/actualities/:id" element={<ActualityDetail />} />
<Route path="/hr/catalog-upload" element={<HRCatalogUpload />} />
```

---

## 📋 Implementation Checklist

### Components
- [ ] NotificationBell component in header
- [ ] FormationRequestModal
- [ ] MyFormationRequests page
- [ ] ManagerDashboard page
- [ ] InviteCollaboratorModal
- [ ] ActualityDetail page
- [ ] HRCatalogUpload page

### Features
- [ ] Notification polling (30s interval)
- [ ] Formation request workflow
- [ ] Manager invitation workflow
- [ ] Actuality likes
- [ ] Actuality comments (with replies)
- [ ] View tracking
- [ ] PDF catalog upload

### API Integration
- [ ] All notification endpoints
- [ ] All manager invitation endpoints
- [ ] All formation request endpoints
- [ ] All actuality interaction endpoints
- [ ] Catalog upload endpoints

---

## 🎨 UI/UX Enhancements

1. **Real-time Updates**: Consider adding WebSocket support for real-time notifications
2. **Loading States**: All async operations should show loading indicators
3. **Error Handling**: Display user-friendly error messages
4. **Responsive Design**: All components should work on mobile devices
5. **Accessibility**: Add ARIA labels and keyboard navigation
6. **Animations**: Add smooth transitions for better UX

---

**Next Steps**: Implement components one by one, test thoroughly, and integrate with the backend API.
