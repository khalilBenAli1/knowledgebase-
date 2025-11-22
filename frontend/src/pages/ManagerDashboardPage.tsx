import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface FormationRequest {
  id: string;
  formationId: string | null;
  formation: {
    title: string;
    startDate: string;
  } | null;
  customFormationTitle: string | null;
  customFormationDetails: string | null;
  customFormationLink: string | null;
  customFormationDate: string | null;
  requesterId: string;
  requester: {
    name: string;
    email: string;
  };
  status: string;
  requesterMessage: string | null;
  managerResponse: string | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    name: string;
  };
}

interface ManagerInvitation {
  id: string;
  managerId: string;
  collaboratorId: string;
  collaborator: {
    name: string;
    email: string;
  };
  status: string;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export default function ManagerDashboardPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'team' | 'invitations'>('requests');
  const [formationRequests, setFormationRequests] = useState<FormationRequest[]>([]);
  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<ManagerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null);
  const [reviewResponse, setReviewResponse] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        await loadFormationRequests();
      } else if (activeTab === 'team') {
        await loadCollaborators();
      } else if (activeTab === 'invitations') {
        await loadInvitations();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFormationRequests = async () => {
    try {
      const response = await api.get('/formation-requests/pending-reviews');
      setFormationRequests(response.data);
    } catch (error) {
      console.error('Failed to load formation requests', error);
    }
  };

  const loadCollaborators = async () => {
    try {
      const response = await api.get('/manager-invitations/collaborators');
      setCollaborators(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load collaborators', error);
      setCollaborators([]);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await api.get('/manager-invitations/sent');
      setInvitations(response.data);
    } catch (error) {
      console.error('Failed to load invitations', error);
    }
  };

  const handleReviewRequest = async (requestId: string, status: 'APPROVED' | 'DECLINED') => {
    setSubmitting(true);
    try {
      await api.put(`/formation-requests/${requestId}/review`, {
        status,
        managerResponse: reviewResponse || undefined,
      });
      alert(status === 'APPROVED' ? 'Demande approuvée!' : 'Demande refusée');
      setReviewingRequest(null);
      setReviewResponse('');
      loadFormationRequests();
    } catch (error) {
      console.error('Failed to review request', error);
      alert('Erreur lors du traitement de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Send email directly - backend will find the user
      await api.post('/manager-invitations/invite', {
        collaboratorEmail: inviteEmail,
        message: inviteMessage || undefined,
      });

      alert('Invitation envoyée avec succès!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteMessage('');
      loadInvitations();
      loadCollaborators();
    } catch (error: any) {
      console.error('Failed to send invitation', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Voulez-vous annuler cette invitation?')) return;

    try {
      await api.delete(`/manager-invitations/${invitationId}`);
      alert('Invitation annulée');
      loadInvitations();
    } catch (error) {
      console.error('Failed to cancel invitation', error);
      alert('Erreur lors de l\'annulation');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      MANAGER_APPROVED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      manager_approved: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      PENDING: 'En attente',
      MANAGER_APPROVED: 'Envoyée à RH',
      APPROVED: 'Approuvée (RH)',
      DECLINED: 'Refusée',
      CANCELLED: 'Annulée',
      pending: 'En attente',
      manager_approved: 'Envoyée à RH',
      accepted: 'Acceptée',
      declined: 'Refusée',
      cancelled: 'Annulée',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-biat-primary dark:text-biat-accent">Tableau de bord Manager</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez votre équipe et les demandes de formation</p>

          {/* Tabs */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Demandes de formation ({formationRequests.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'team'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Mon équipe ({collaborators.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'invitations'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Invitations ({invitations.filter(i => i.status === 'pending').length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Formation Requests Tab */}
          {activeTab === 'requests' && (
            <div>
              {formationRequests.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucune demande</h3>
                  <p className="text-gray-500 dark:text-gray-400">Les demandes de formation de votre équipe apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formationRequests.map((request) => {
                    const formationTitle = request.formation?.title || request.customFormationTitle || 'Formation';
                    const isCustomRequest = !request.formation;

                    return (
                    <div key={request.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-biat-primary dark:text-biat-accent">{formationTitle}</h3>
                            {isCustomRequest && (
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-xs font-bold rounded-full">
                                PERSONNALISÉE
                              </span>
                            )}
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium">{request.requester.name}</span>
                            <span className="text-gray-400 dark:text-gray-600">•</span>
                            <span className="text-sm">{request.requester.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Demandé le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>

                      {/* Custom formation details */}
                      {isCustomRequest && (
                        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 rounded-lg space-y-2">
                          <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Détails de la formation personnalisée</h4>
                          {request.customFormationDetails && (
                            <div className="text-sm text-purple-800 dark:text-purple-300">
                              <strong>Description:</strong>
                              <p className="mt-1 whitespace-pre-wrap">{request.customFormationDetails}</p>
                            </div>
                          )}
                          {request.customFormationLink && (
                            <div className="text-sm text-purple-800 dark:text-purple-300">
                              <strong>Lien:</strong>{' '}
                              <a
                                href={request.customFormationLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                {request.customFormationLink}
                              </a>
                            </div>
                          )}
                          {request.customFormationDate && (
                            <div className="text-sm text-purple-800 dark:text-purple-300">
                              <strong>Date souhaitée:</strong>{' '}
                              {new Date(request.customFormationDate).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </div>
                      )}

                      {request.requesterMessage && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/40 rounded-lg">
                          <p className="text-sm text-blue-900 dark:text-blue-300">
                            <strong>Message:</strong> {request.requesterMessage}
                          </p>
                        </div>
                      )}

                      {request.status === 'pending' ? (
                        reviewingRequest === request.id ? (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Réponse (optionnel)
                            </label>
                            <textarea
                              value={reviewResponse}
                              onChange={(e) => setReviewResponse(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="Ajoutez un commentaire..."
                            />
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleReviewRequest(request.id, 'APPROVED')}
                                disabled={submitting}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                              >
                                ✓ Approuver et envoyer à RH
                              </button>
                              <button
                                onClick={() => handleReviewRequest(request.id, 'DECLINED')}
                                disabled={submitting}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                              >
                                ✗ Refuser
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingRequest(null);
                                  setReviewResponse('');
                                }}
                                disabled={submitting}
                                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewingRequest(request.id)}
                            className="w-full px-4 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors font-medium"
                          >
                            Examiner la demande
                          </button>
                        )
                      ) : request.managerResponse ? (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Votre réponse:</strong> {request.managerResponse}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mon équipe</h2>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Inviter un collaborateur
                </button>
              </div>

              {collaborators.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucun collaborateur</h3>
                  <p className="text-gray-500 dark:text-gray-400">Invitez des collaborateurs à rejoindre votre équipe</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-biat-primary text-white rounded-full flex items-center justify-center text-lg font-bold">
                          {collaborator.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{collaborator.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{collaborator.email}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{collaborator.role.name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invitations envoyées</h2>
              </div>

              {invitations.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucune invitation</h3>
                  <p className="text-gray-500 dark:text-gray-400">Les invitations que vous envoyez apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{invitation.collaborator.name}</h3>
                            {getStatusBadge(invitation.status)}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">{invitation.collaborator.email}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Envoyée le {new Date(invitation.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                          {invitation.respondedAt && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Répondue le {new Date(invitation.respondedAt).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                          {invitation.message && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-sm text-gray-700 dark:text-gray-300">{invitation.message}</p>
                            </div>
                          )}
                        </div>
                        {invitation.status === 'pending' && (
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="ml-4 px-4 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-biat-primary dark:text-biat-accent">
                Inviter un collaborateur
              </h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteMessage('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email du collaborateur <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="collaborateur@assurances-biat.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Message (optionnel)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ajoutez un message personnalisé..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Envoi...' : 'Envoyer l\'invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteMessage('');
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
