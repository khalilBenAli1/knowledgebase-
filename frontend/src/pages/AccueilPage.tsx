import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

interface Actuality {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
}

interface Formation {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
}

export default function AccueilPage() {
  const { user } = useAuthStore();
  const [recentActualities, setRecentActualities] = useState<Actuality[]>([]);
  const [upcomingFormations, setUpcomingFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccessDocuments = ['Gestionnaire RH', 'Gestionnaire RH'].includes(
    user?.role?.name || '',
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load recent actualités (published only)
      const actualitiesRes = await api.get('/actualities', {
        params: { published: true }
      });
      setRecentActualities(actualitiesRes.data.slice(0, 3)); // Get latest 3

      // Load upcoming formations (published only)
      const formationsRes = await api.get('/formations', {
        params: { published: true }
      });

      // Filter to get upcoming and active formations
      const now = new Date();
      const relevantFormations = formationsRes.data
        .filter((f: Formation) => {
          const endDate = f.endDate ? new Date(f.endDate) : null;
          return !endDate || now <= endDate; // Not completed
        })
        .slice(0, 3);

      setUpcomingFormations(relevantFormations);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const getFormationStatus = (formation: Formation) => {
    const now = new Date();
    const start = new Date(formation.startDate);
    const end = formation.endDate ? new Date(formation.endDate) : null;

    if (end && now > end) {
      return { text: 'Terminée', color: 'text-red-600' };
    } else if (now < start) {
      return { text: 'À venir', color: 'text-blue-600' };
    } else {
      return { text: 'Active', color: 'text-green-600' };
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-gray-50 to-biat-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-6 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-16">
          <div className="inline-block bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-lg mb-4 md:mb-6">
            <svg className="w-16 h-16 md:w-20 md:h-20 text-biat-primary dark:text-biat-300 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C10.9 2 10 2.9 10 4V5H8C6.9 5 6 5.9 6 7V9C4.9 9 4 9.9 4 11V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V11C20 9.9 19.1 9 18 9V7C18 5.9 17.1 5 16 5H14V4C14 2.9 13.1 2 12 2M10 7H14V9H10V7M9 11C9.6 11 10 11.4 10 12C10 12.6 9.6 13 9 13C8.4 13 8 12.6 8 12C8 11.4 8.4 11 9 11M15 11C15.6 11 16 11.4 16 12C16 12.6 15.6 13 15 13C14.4 13 14 12.6 14 12C14 11.4 14.4 11 15 11M8.5 15H15.5C15.8 15 16 15.2 16 15.5C16 16.9 14.4 18 12 18C9.6 18 8 16.9 8 15.5C8 15.2 8.2 15 8.5 15Z"/>
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-biat-primary dark:text-biat-300 mb-3 md:mb-4 px-2">
            Bienvenue sur la plateforme RH
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-biat-secondary dark:text-gray-300 mb-6">
            Assurances BIAT
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Votre espace centralisé pour accéder aux informations RH, poser vos questions sur le règlement intérieur,
            consulter les actualités de l'entreprise et découvrir les formations disponibles. Notre assistant intelligent
            est là pour vous aider à trouver rapidement les réponses dont vous avez besoin.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {/* Assistant RH Card */}
          <Link
            to="/chat"
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all p-6 md:p-8 border-2 border-transparent hover:border-biat-primary dark:hover:border-biat-400"
          >
            <div className="bg-biat-100 dark:bg-biat-900 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-biat-primary dark:text-biat-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-biat-primary dark:text-biat-300 mb-2">Assistant RH</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Posez vos questions sur le règlement intérieur et obtenez des réponses instantanées grâce à notre assistant intelligent.
            </p>
            <div className="flex items-center text-biat-primary dark:text-biat-300 font-semibold group-hover:gap-2 transition-all">
              <span>Démarrer une conversation</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Actualités Card */}
          <Link
            to="/actualites"
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all p-6 md:p-8 border-2 border-transparent hover:border-biat-primary dark:hover:border-biat-400"
          >
            <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-2">Les Actualités</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Restez informé des dernières nouvelles, annonces et événements de l'entreprise.
            </p>
            <div className="flex items-center text-blue-700 dark:text-blue-400 font-semibold group-hover:gap-2 transition-all">
              <span>Voir les actualités</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Formations Card */}
          <Link
            to="/formations"
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all p-6 md:p-8 border-2 border-transparent hover:border-biat-primary dark:hover:border-biat-400"
          >
            <div className="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">Les Formations</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Découvrez les formations disponibles pour développer vos compétences et évoluer dans votre carrière.
            </p>
            <div className="flex items-center text-green-700 dark:text-green-400 font-semibold group-hover:gap-2 transition-all">
              <span>Explorer les formations</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Recent Actualités Section */}
        {!loading && recentActualities.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Actualités Récentes</h2>
              <Link to="/actualites" className="text-biat-primary dark:text-biat-300 font-semibold hover:text-biat-accent dark:hover:text-biat-400 flex items-center gap-1">
                Voir tout
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentActualities.map((actuality) => (
                <div key={actuality.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                  {actuality.imageUrl && (
                    <img src={actuality.imageUrl} alt={actuality.title} className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-biat-primary dark:text-biat-300 mb-2 line-clamp-2">{actuality.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-3">{actuality.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(actuality.createdAt).toLocaleDateString('fr-FR')}</span>
                      <Link to="/actualites" className="text-biat-primary dark:text-biat-300 font-semibold hover:text-biat-accent dark:hover:text-biat-400">
                        Lire plus →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Formations Section */}
        {!loading && upcomingFormations.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Formations Disponibles</h2>
              <Link to="/formations" className="text-biat-primary dark:text-biat-300 font-semibold hover:text-biat-accent dark:hover:text-biat-400 flex items-center gap-1">
                Voir tout
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingFormations.map((formation) => {
                const status = getFormationStatus(formation);
                return (
                  <div key={formation.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                    {formation.imageUrl && (
                      <img src={formation.imageUrl} alt={formation.title} className="w-full h-40 object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg text-biat-primary dark:text-biat-300 line-clamp-1">{formation.title}</h3>
                        <span className={`text-xs font-semibold ${status.color}`}>{status.text}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">{formation.description}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Début: {new Date(formation.startDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {formation.endDate && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Fin: {new Date(formation.endDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                      <Link to="/formations" className="mt-3 inline-block text-biat-primary dark:text-biat-300 text-sm font-semibold hover:text-biat-accent dark:hover:text-biat-400">
                        En savoir plus →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Access Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-biat-primary dark:text-biat-300 mb-6">Accès rapide</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              to="/chat"
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-biat-50 dark:hover:bg-gray-600 transition-colors group"
            >
              <svg className="w-5 h-5 text-biat-primary dark:text-biat-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-biat-primary dark:group-hover:text-biat-300">Poser une question</span>
            </Link>
            {canAccessDocuments && (
              <Link
                to="/documents"
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-biat-50 dark:hover:bg-gray-600 transition-colors group"
              >
                <svg className="w-5 h-5 text-biat-primary dark:text-biat-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-biat-primary dark:group-hover:text-biat-300">Consulter les documents</span>
              </Link>
            )}
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-biat-50 dark:hover:bg-gray-600 transition-colors group"
            >
              <svg className="w-5 h-5 text-biat-primary dark:text-biat-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-biat-primary dark:group-hover:text-biat-300">Paramètres</span>
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">
            Pour toute question ou assistance, n'hésitez pas à utiliser notre Assistant RH
          </p>
        </div>
      </div>
    </div>
  );
}
