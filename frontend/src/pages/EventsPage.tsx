import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location?: string;
  imageUrl?: string;
  published: boolean;
  createdBy: {
    name: string;
  };
  createdAt: string;
}

export default function EventsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'drafts'>('upcoming');

  const isHR = user?.role?.name === 'Responsable RH' || user?.role?.name === 'Gestionnaire RH';

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events');
      // Ensure we always set an array
      const eventsData = Array.isArray(response.data) ? response.data : [];
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load events', error);
      toast.error('Erreur lors du chargement des événements');
      setEvents([]); // Ensure events is an array even on error
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.put(`/events/${id}/publish`);
      toast.success('Événement publié avec succès!');
      loadEvents();
    } catch (error) {
      console.error('Failed to publish event', error);
      toast.error('Erreur lors de la publication');
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await api.put(`/events/${id}/unpublish`);
      toast.success('Événement dépublié');
      loadEvents();
    } catch (error) {
      console.error('Failed to unpublish event', error);
      toast.error('Erreur lors de la dépublication');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${title}" ?`)) return;

    try {
      await api.delete(`/events/${id}`);
      toast.success('Événement supprimé');
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getEventStatus = (event: Event): 'upcoming' | 'past' | 'draft' => {
    if (!event.published) return 'draft';
    const now = new Date();
    const eventDate = new Date(event.eventDate);
    return eventDate > now ? 'upcoming' : 'past';
  };

  const filteredEvents = Array.isArray(events) ? events.filter((event) => {
    const status = getEventStatus(event);
    if (filter === 'all') return true;
    if (filter === 'drafts') return status === 'draft';
    return status === filter;
  }) : [];

  const getStatusBadge = (event: Event) => {
    const status = getEventStatus(event);
    if (status === 'draft') {
      return <span className="px-3 py-1 bg-gray-500 dark:bg-gray-600 text-white text-xs font-bold rounded-full">BROUILLON</span>;
    } else if (status === 'upcoming') {
      return <span className="px-3 py-1 bg-green-500 dark:bg-green-600 text-white text-xs font-bold rounded-full">🗓️ À VENIR</span>;
    } else {
      return <span className="px-3 py-1 bg-gray-400 dark:bg-gray-600 text-white text-xs font-bold rounded-full">✓ PASSÉ</span>;
    }
  };

  const getCounts = () => {
    if (!Array.isArray(events)) {
      return { upcoming: 0, past: 0, drafts: 0 };
    }
    return {
      upcoming: events.filter(e => getEventStatus(e) === 'upcoming').length,
      past: events.filter(e => getEventStatus(e) === 'past').length,
      drafts: events.filter(e => getEventStatus(e) === 'draft').length,
    };
  };

  const counts = getCounts();

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
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-biat-primary dark:text-biat-accent">Événements</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Découvrez les événements de l'entreprise</p>
          </div>
          {isHR && (
            <button
              onClick={() => navigate('/evenements/create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvel événement
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🗓️ À venir ({counts.upcoming})
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'past' ? 'bg-gray-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            ✓ Passés ({counts.past})
          </button>
          {isHR && (
            <>
              <button
                onClick={() => setFilter('drafts')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'drafts' ? 'bg-gray-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Brouillons ({counts.drafts})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all' ? 'bg-biat-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Tous
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <svg className="w-16 h-16 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucun événement</h3>
              <p className="text-gray-500 dark:text-gray-400">Les événements apparaîtront ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => navigate(`/evenements/${event.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col transform hover:scale-[1.02]"
                >
                  {event.imageUrl ? (
                    <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" />
                      <div className="absolute top-3 right-3">{getStatusBadge(event)}</div>
                    </div>
                  ) : (
                    <div className="p-3 border-b dark:border-gray-700 bg-gradient-to-r from-biat-primary to-biat-accent">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm font-bold">
                          {new Date(event.eventDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {getStatusBadge(event)}
                      </div>
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-biat-primary dark:text-biat-accent mb-3 line-clamp-2">{event.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 flex-1 line-clamp-3">{event.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 text-biat-primary dark:text-biat-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4 text-biat-primary dark:text-biat-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-auto">
                      {isHR && (
                        <div className="space-y-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/evenements/${event.id}/statistics`);
                            }}
                            className="w-full px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors font-medium"
                          >
                            📊 Statistiques
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/evenements/${event.id}/edit`);
                              }}
                              className="flex-1 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              Modifier
                            </button>
                            {event.published ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnpublish(event.id);
                                }}
                                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              >
                                Dépublier
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePublish(event.id);
                                }}
                                className="flex-1 px-3 py-2 text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                              >
                                Publier
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(event.id, event.title);
                              }}
                              className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
