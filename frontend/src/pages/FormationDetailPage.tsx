import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';
import FormationRequestModal from '../components/FormationRequestModal';

interface Formation {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  duration?: string;
  location?: string;
  maxParticipants?: number;
  imageUrl?: string;
  published: boolean;
  createdBy: { id: string; name: string };
}

export default function FormationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [formation, setFormation] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const isAdmin = ['Gestionnaire RH', 'Responsable RH', 'IT Admin'].includes(user?.role?.name || '');

  useEffect(() => {
    loadFormation();
  }, [id]);

  const loadFormation = async () => {
    try {
      const response = await api.get(`/formations/${id}`);
      setFormation(response.data);
    } catch (error) {
      console.error('Failed to load formation', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (formation: Formation): 'active' | 'upcoming' | 'completed' => {
    const now = new Date();
    const start = new Date(formation.startDate);
    const end = formation.endDate ? new Date(formation.endDate) : start;

    if (now >= start && now <= end) return 'active';
    if (now < start) return 'upcoming';
    return 'completed';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700 border-green-300',
      upcoming: 'bg-blue-100 text-blue-700 border-blue-300',
      completed: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    const labels = {
      active: 'En cours',
      upcoming: 'À venir',
      completed: 'Terminée',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!formation) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Formation non trouvée</h2>
          <button
            onClick={() => navigate('/formations')}
            className="text-biat-primary hover:text-biat-accent"
          >
            ← Retour aux formations
          </button>
        </div>
      </div>
    );
  }

  const status = getStatus(formation);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/formations')}
        className="flex items-center gap-2 text-biat-primary hover:text-biat-accent mb-6 font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux formations
      </button>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Image */}
        {formation.imageUrl && (
          <div className="relative h-80 bg-gray-200">
            <img
              src={formation.imageUrl}
              alt={formation.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4">
              {getStatusBadge(status)}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {/* Title and Status */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-biat-primary mb-4">{formation.title}</h1>
            {!formation.imageUrl && (
              <div className="mb-4">
                {getStatusBadge(status)}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
              {formation.description}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-gray-900">Date de début</h3>
              </div>
              <p className="text-gray-700 text-lg">
                {new Date(formation.startDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            {formation.endDate && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">Date de fin</h3>
                </div>
                <p className="text-gray-700 text-lg">
                  {new Date(formation.endDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}

            {formation.duration && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">Durée</h3>
                </div>
                <p className="text-gray-700 text-lg">{formation.duration}</p>
              </div>
            )}

            {formation.location && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">Lieu</h3>
                </div>
                <p className="text-gray-700 text-lg">{formation.location}</p>
              </div>
            )}

            {formation.maxParticipants && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">Places disponibles</h3>
                </div>
                <p className="text-gray-700 text-lg">{formation.maxParticipants} participants max</p>
              </div>
            )}

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="font-bold text-gray-900">Créé par</h3>
              </div>
              <p className="text-gray-700 text-lg">{formation.createdBy.name}</p>
            </div>
          </div>

          {/* Action Buttons */}
          {!isAdmin && formation.published && status !== 'completed' && (
            <div className="border-t border-gray-200 pt-6">
              <button
                onClick={() => setShowRequestModal(true)}
                className="w-full md:w-auto px-8 py-4 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                Demander cette formation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && formation && (
        <FormationRequestModal
          formationId={formation.id}
          formationTitle={formation.title}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            alert('Demande envoyée avec succès!');
          }}
        />
      )}
    </div>
  );
}
