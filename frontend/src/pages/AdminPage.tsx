import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Analytics {
  users: { total: number };
  documents: { total: number; published: number };
  chat: { totalSessions: number; totalMessages: number; averageMessagesPerSession: number };
  feedback: { total: number; useful: number; notUseful: number; usefulPercentage: number };
}

// Mock data for time-series charts (in production, fetch from backend)
const generateMockTimeSeriesData = (days: number = 7) => {
  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      messages: Math.floor(Math.random() * 50) + 20,
      sessions: Math.floor(Math.random() * 15) + 5,
      documents: Math.floor(Math.random() * 3) + 1,
    });
  }
  return data;
};

const COLORS = ['#134a21', '#1a6b2e', '#2d8a45', '#4aa964'];

export default function AdminPage() {
  const { user } = useAuthStore();
  const isHRAdmin = user?.role?.name === 'Gestionnaire RH';
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeSeriesData, setTimeSeriesData] = useState(generateMockTimeSeriesData(7));
  const navigate = useNavigate();

  useEffect(() => {
    loadAnalytics();
    // Refresh data every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await api.get('/admin/analytics');
      setAnalytics(response.data);
      // In production, fetch real time-series data here
      setTimeSeriesData(generateMockTimeSeriesData(7));
    } catch (error) {
      console.error('Failed to load analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-full">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl h-32 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-full dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Aucune donnée disponible</h3>
          <p className="text-gray-500 dark:text-gray-400">Essayez de rafraîchir la page</p>
        </div>
      </div>
    );
  }

  const feedbackData = [
    { name: 'Utile', value: analytics.feedback.useful, color: COLORS[0] },
    { name: 'Pas Utile', value: analytics.feedback.notUseful, color: '#dc3545' },
  ];

  const documentData = [
    { name: 'Publiés', value: analytics.documents.published, color: COLORS[0] },
    { name: 'Non publiés', value: analytics.documents.total - analytics.documents.published, color: '#ffc107' },
  ];

  return (
    <div className="p-3 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-biat-primary dark:text-biat-300 mb-1 md:mb-2">Tableau de Bord</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">Vue d'ensemble de votre plateforme</p>
          </div>
          <button
            onClick={loadAnalytics}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors text-sm md:text-base"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Users Card */}
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Utilisateurs</div>
              <div className="p-2 md:p-3 bg-primary-50 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-biat-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-biat-primary dark:text-biat-300">
              {analytics.users.total}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
              <span className="text-green-600 dark:text-green-400">↑ 12%</span> ce mois
            </div>
          </div>

          {/* Documents Card */}
          {isHRAdmin && (
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate('/documents')}>
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Documents</div>
                <div className="p-2 md:p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                {analytics.documents.published}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                sur {analytics.documents.total} total
              </div>
            </div>
          )}

          {/* Sessions Card */}
          {isHRAdmin && (
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Sessions</div>
                <div className="p-2 md:p-3 bg-blue-50 rounded-lg">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {analytics.chat.totalSessions}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {analytics.chat.totalMessages} messages
              </div>
            </div>
          )}

          {/* Satisfaction Card */}
          {isHRAdmin && (
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Satisfaction</div>
                <div className="p-2 md:p-3 bg-green-50 rounded-lg">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                {analytics.feedback.usefulPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {analytics.feedback.useful} / {analytics.feedback.total} positifs
              </div>
            </div>
          )}

          {/* Events Card */}
          {isHRAdmin && analytics.events && (
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate('/evenements')}>
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Événements</div>
                <div className="p-2 md:p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                {analytics.events.published}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {analytics.events.totalRegistrations} inscriptions
              </div>
            </div>
          )}

          {/* Formations Card */}
          {isHRAdmin && analytics.formations && (
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate('/formations')}>
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Formations</div>
                <div className="p-2 md:p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                {analytics.formations.pending}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {analytics.formations.total} demandes totales
              </div>
            </div>
          )}
        </div>

        {/* Charts Section - HR Admin Only */}
        {isHRAdmin && (
          <>
            {/* Activity Over Time */}
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 md:mb-6">Activité des 7 derniers jours</h2>
              <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    stroke="#134a21"
                    strokeWidth={2}
                    name="Messages"
                    dot={{ fill: '#134a21', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#1a6b2e"
                    strokeWidth={2}
                    name="Sessions"
                    dot={{ fill: '#1a6b2e', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Feedback Distribution */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Répartition des Feedbacks</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={feedbackData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {feedbackData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Document Status */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Statut des Documents</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={documentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {documentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Métriques Détaillées</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary-50 dark:bg-gray-700 rounded-lg border border-primary-100 dark:border-gray-600">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Messages par session (moyenne)
                  </div>
                  <div className="text-2xl font-bold text-biat-primary dark:text-biat-300">
                    {analytics.chat.averageMessagesPerSession.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {analytics.chat.totalMessages} messages totaux
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-100 dark:border-gray-600">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Taux de satisfaction
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {analytics.feedback.usefulPercentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {analytics.feedback.total} feedbacks totaux
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Taux de publication
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {((analytics.documents.published / analytics.documents.total) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {analytics.documents.total} documents totaux
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
