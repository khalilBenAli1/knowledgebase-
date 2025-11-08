import { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface FormationRequest {
  id: string;
  formationId: string;
  formation: {
    title: string;
    startDate: string;
  };
  requesterId: string;
  requester: {
    name: string;
    email: string;
  };
  manager: {
    name: string;
  };
  status: string;
  requesterMessage: string | null;
  managerResponse: string | null;
  hrResponse: string | null;
  createdAt: string;
  reviewedAt: string;
}

export default function HRFormationRequestsPage() {
  const [requests, setRequests] = useState<FormationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null);
  const [hrResponse, setHrResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/formation-requests/hr/pending');
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load HR formation requests', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHRReview = async (requestId: string, status: 'APPROVED' | 'DECLINED') => {
    if (status === 'DECLINED' && !hrResponse.trim()) {
      alert('Veuillez fournir un motif de refus');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/formation-requests/${requestId}/hr-review`, {
        status,
        hrResponse: hrResponse || undefined,
      });
      alert(status === 'APPROVED' ? 'Demande approuvée!' : 'Demande refusée');
      setReviewingRequest(null);
      setHrResponse('');
      loadRequests();
    } catch (error) {
      console.error('Failed to review request', error);
      alert('Erreur lors du traitement de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      manager_approved: 'bg-blue-100 text-blue-800',
      MANAGER_APPROVED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
    };

    const labels = {
      manager_approved: 'En attente RH',
      MANAGER_APPROVED: 'En attente RH',
      APPROVED: 'Approuvée',
      DECLINED: 'Refusée',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-biat-primary">Validation RH - Formations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Demandes approuvées par les managers en attente de validation RH
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto">
          {requests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Aucune demande</h3>
              <p className="text-sm text-gray-500">Aucune demande en attente de validation RH</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-biat-primary">{request.formation.title}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{request.requester.name}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs">{request.requester.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Manager: {request.manager.name}</span>
                        <span className="text-gray-400">•</span>
                        <span>Approuvé le {new Date(request.reviewedAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Requester Message */}
                  {request.requesterMessage && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <p className="text-blue-900">
                        <strong>Message employé:</strong> {request.requesterMessage}
                      </p>
                    </div>
                  )}

                  {/* Manager Response */}
                  {request.managerResponse && (
                    <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <p className="text-green-900">
                        <strong>Commentaire manager:</strong> {request.managerResponse}
                      </p>
                    </div>
                  )}

                  {/* HR Review Section */}
                  {reviewingRequest === request.id ? (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Réponse / Motif *
                      </label>
                      <textarea
                        value={hrResponse}
                        onChange={(e) => setHrResponse(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-biat-primary focus:border-transparent resize-none"
                        placeholder="Ajoutez un commentaire ou motif de refus..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleHRReview(request.id, 'APPROVED')}
                          disabled={submitting}
                          className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                        >
                          ✓ Approuver
                        </button>
                        <button
                          onClick={() => handleHRReview(request.id, 'DECLINED')}
                          disabled={submitting}
                          className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                        >
                          ✗ Refuser
                        </button>
                        <button
                          onClick={() => {
                            setReviewingRequest(null);
                            setHrResponse('');
                          }}
                          disabled={submitting}
                          className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReviewingRequest(request.id)}
                      className="w-full px-3 py-2 text-sm bg-biat-primary text-white rounded hover:bg-biat-accent transition-colors font-medium"
                    >
                      Examiner la demande
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
