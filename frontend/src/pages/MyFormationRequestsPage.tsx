import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface FormationRequest {
  id: string;
  formationId: string | null;
  formation: {
    title: string;
    startDate: string;
    endDate: string;
    imageUrl?: string;
  } | null;
  customFormationTitle: string | null;
  customFormationDetails: string | null;
  customFormationLink: string | null;
  customFormationDate: string | null;
  status: string;
  requesterMessage: string | null;
  managerResponse: string | null;
  hrResponse: string | null;
  createdAt: string;
  reviewedAt: string | null;
  hrReviewedAt: string | null;
}

export default function MyFormationRequestsPage() {
  const [requests, setRequests] = useState<FormationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/formation-requests/my-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load formation requests', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: string; description: string }> = {
      pending: {
        label: 'En attente manager',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
        icon: '⏳',
        description: 'Votre manager n\'a pas encore examiné cette demande',
      },
      PENDING: {
        label: 'En attente manager',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
        icon: '⏳',
        description: 'Votre manager n\'a pas encore examiné cette demande',
      },
      manager_approved: {
        label: 'En attente RH',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
        icon: '📋',
        description: 'Approuvée par votre manager, en attente de validation RH',
      },
      MANAGER_APPROVED: {
        label: 'En attente RH',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
        icon: '📋',
        description: 'Approuvée par votre manager, en attente de validation RH',
      },
      approved: {
        label: 'Approuvée',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
        icon: '✓',
        description: 'Votre demande a été approuvée',
      },
      APPROVED: {
        label: 'Approuvée',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
        icon: '✓',
        description: 'Votre demande a été approuvée',
      },
      declined: {
        label: 'Refusée',
        color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
        icon: '✗',
        description: 'Votre demande a été refusée',
      },
      DECLINED: {
        label: 'Refusée',
        color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
        icon: '✗',
        description: 'Votre demande a été refusée',
      },
      cancelled: {
        label: 'Annulée',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        icon: '⊘',
        description: 'Vous avez annulé cette demande',
      },
      CANCELLED: {
        label: 'Annulée',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        icon: '⊘',
        description: 'Vous avez annulé cette demande',
      },
    };

    return statusMap[status] || {
      label: status,
      color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
      icon: '?',
      description: '',
    };
  };

  const filteredRequests = requests.filter((request) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return request.status === 'PENDING' || request.status === 'pending';
    if (filter === 'approved') return request.status === 'APPROVED' || request.status === 'approved';
    if (filter === 'declined') return request.status === 'DECLINED' || request.status === 'declined';
    return true;
  });

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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-biat-primary">Mes Demandes de Formation</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Suivez l'état de vos demandes de formation</p>

          {/* Filter Buttons */}
          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Tout ({requests.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              En attente ({requests.filter(r => r.status === 'PENDING' || r.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Approuvées ({requests.filter(r => r.status === 'APPROVED' || r.status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('declined')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === 'declined'
                  ? 'bg-biat-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Refusées ({requests.filter(r => r.status === 'DECLINED' || r.status === 'declined').length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {filter === 'all' ? 'Aucune demande' : 'Aucune demande trouvée'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filter === 'all'
                  ? 'Vous n\'avez pas encore fait de demande de formation'
                  : `Aucune demande ${filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvée' : 'refusée'}`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const statusInfo = getStatusInfo(request.status);
                return (
                  <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-biat-primary">
                            {request.formation?.title || request.customFormationTitle || 'Formation'}
                          </h3>
                          {!request.formation && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">
                              PERSONNALISÉE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {request.formation ? (
                            <span>
                              {new Date(request.formation.startDate).toLocaleDateString('fr-FR')} - {new Date(request.formation.endDate).toLocaleDateString('fr-FR')}
                            </span>
                          ) : request.customFormationDate ? (
                            <span>
                              Date souhaitée: {new Date(request.customFormationDate).toLocaleDateString('fr-FR')}
                            </span>
                          ) : null}
                          {(request.formation || request.customFormationDate) && <span className="text-gray-400">•</span>}
                          <span>Demandée le {new Date(request.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold mb-3 ${statusInfo.color}`}>
                      <span>{statusInfo.icon}</span>
                      <span>{statusInfo.label}</span>
                    </div>

                    {/* Status Description */}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{statusInfo.description}</p>

                    {/* My Message */}
                    {request.requesterMessage && (
                      <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-xs">
                        <p className="text-blue-900 dark:text-blue-300">
                          <strong>Votre message:</strong> {request.requesterMessage}
                        </p>
                      </div>
                    )}

                    {/* Manager Response */}
                    {request.managerResponse && (
                      <div className="mb-2 p-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded text-xs">
                        <p className="text-purple-900 dark:text-purple-300">
                          <strong>Réponse manager:</strong> {request.managerResponse}
                        </p>
                      </div>
                    )}

                    {/* HR Response */}
                    {request.hrResponse && (
                      <div className={`mb-2 p-2 rounded text-xs ${
                        request.status === 'APPROVED' || request.status === 'approved'
                          ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
                      }`}>
                        <p className={request.status === 'APPROVED' || request.status === 'approved' ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}>
                          <strong>Réponse RH:</strong> {request.hrResponse}
                        </p>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600 dark:text-gray-400">Demandée</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            request.reviewedAt ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}></div>
                          <span className="text-gray-600 dark:text-gray-400">Manager</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            request.hrReviewedAt ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}></div>
                          <span className="text-gray-600 dark:text-gray-400">RH</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
