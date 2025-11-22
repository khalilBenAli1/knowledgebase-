import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface FormField {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location?: string;
  imageUrl?: string;
  published: boolean;
  formFields: FormField[];
  createdBy: {
    name: string;
  };
}

interface Registration {
  id: string;
  status: string;
  responses: Array<{
    formField: { id: string };
    answer: string;
  }>;
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [myRegistration, setMyRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'interested' | 'going' | 'not_going'>('interested');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  const isHR = user?.role?.name === 'Gestionnaire RH' || user?.role?.name === 'Gestionnaire RH';

  useEffect(() => {
    loadEvent();
    loadMyRegistration();
  }, [id]);

  const loadEvent = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);
    } catch (error: any) {
      console.error('Failed to load event', error);
      toast.error(error.response?.data?.message || 'Erreur lors du chargement');
      navigate('/evenements');
    } finally {
      setLoading(false);
    }
  };

  const loadMyRegistration = async () => {
    try {
      const response = await api.get(`/events/${id}/my-registration`);
      if (response.data) {
        setMyRegistration(response.data);
        setStatus(response.data.status);

        // Pre-fill form with existing responses
        const existingData: Record<string, string> = {};
        response.data.responses.forEach((res: any) => {
          existingData[res.formField.id] = res.answer;
        });
        setFormData(existingData);
      }
    } catch (error) {
      // No registration yet, that's okay
    }
  };

  const handleRegister = async (newStatus: 'interested' | 'going' | 'not_going') => {
    if (newStatus === 'going' && event?.formFields && event.formFields.length > 0) {
      // Show form for "going" status
      setStatus(newStatus);
      setShowForm(true);
      return;
    }

    // Direct registration for interested/not_going
    try {
      setSubmitting(true);
      await api.post(`/events/${id}/register`, {
        status: newStatus,
        responses: [],
      });
      toast.success(
        newStatus === 'interested'
          ? 'Vous êtes intéressé(e) !'
          : 'Merci pour votre réponse'
      );
      loadMyRegistration();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to register', error);
      toast.error('Erreur lors de l\'inscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) return;

    // Validate required fields
    const missingFields = event.formFields
      .filter(field => field.required && !formData[field.id])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast.error(`Veuillez remplir: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setSubmitting(true);
      const responses = Object.entries(formData).map(([formFieldId, answer]) => ({
        formFieldId,
        answer,
      }));

      await api.post(`/events/${id}/register`, {
        status,
        responses,
      });

      toast.success('Inscription confirmée !');
      setShowForm(false);
      loadMyRegistration();
    } catch (error) {
      console.error('Failed to submit form', error);
      toast.error('Erreur lors de l\'inscription');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.id] || '';

    switch (field.fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.fieldType}
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            required={field.required}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Sélectionnez...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer dark:text-gray-300">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                  required={field.required}
                  className="w-4 h-4 text-biat-primary focus:ring-biat-primary"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => {
              const selectedOptions = value ? value.split(',') : [];
              return (
                <label key={option} className="flex items-center gap-2 cursor-pointer dark:text-gray-300">
                  <input
                    type="checkbox"
                    value={option}
                    checked={selectedOptions.includes(option)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, [field.id]: [...selectedOptions, option].join(',') });
                      } else {
                        setFormData({ ...formData, [field.id]: selectedOptions.filter(o => o !== option).join(',') });
                      }
                    }}
                    className="w-4 h-4 text-biat-primary focus:ring-biat-primary rounded"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const isPast = new Date(event.eventDate) < new Date();

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      {/* Hero Section */}
      {event.imageUrl ? (
        <div className="relative h-96 bg-gray-900 dark:bg-black">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover opacity-80 dark:opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 dark:from-black/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">
                    {new Date(event.eventDate).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-biat-primary to-biat-accent text-white p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">
                  {new Date(event.eventDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-biat-primary dark:text-biat-accent mb-4">À propos de l'événement</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{event.description}</p>
              </div>

              {/* Registration Form */}
              {showForm && !isPast && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                  <h2 className="text-2xl font-bold text-biat-primary dark:text-biat-accent mb-6">Formulaire d'inscription</h2>
                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    {event.formFields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                        </label>
                        {renderFormField(field)}
                      </div>
                    ))}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 bg-biat-primary text-white px-6 py-3 rounded-lg hover:bg-biat-accent transition-colors font-semibold disabled:opacity-50"
                      >
                        {submitting ? 'Envoi...' : 'Confirmer ma participation'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sticky top-8">
                <h3 className="text-xl font-bold text-biat-primary dark:text-biat-accent mb-4">
                  {isPast ? 'Événement terminé' : 'Votre réponse'}
                </h3>

                {isHR && (
                  <button
                    onClick={() => navigate(`/evenements/${id}/statistics`)}
                    className="w-full mb-4 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium"
                  >
                    📊 Voir les statistiques
                  </button>
                )}

                {!isPast && (
                  <div className="space-y-3">
                    <button
                      onClick={() => handleRegister('interested')}
                      disabled={submitting}
                      className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                        myRegistration?.status === 'interested'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                      }`}
                    >
                      ⭐ Intéressé(e)
                    </button>

                    <button
                      onClick={() => handleRegister('going')}
                      disabled={submitting}
                      className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                        myRegistration?.status === 'going'
                          ? 'bg-green-500 text-white'
                          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
                      }`}
                    >
                      ✓ Je participe
                    </button>

                    <button
                      onClick={() => handleRegister('not_going')}
                      disabled={submitting}
                      className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                        myRegistration?.status === 'not_going'
                          ? 'bg-gray-500 text-white'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      ✗ Je ne participe pas
                    </button>
                  </div>
                )}

                {myRegistration && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-400 font-medium">
                      {myRegistration.status === 'interested' && '⭐ Vous êtes intéressé(e)'}
                      {myRegistration.status === 'going' && '✓ Vous participez'}
                      {myRegistration.status === 'not_going' && '✗ Vous ne participez pas'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
