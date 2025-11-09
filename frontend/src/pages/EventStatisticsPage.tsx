import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Statistics {
  event: {
    id: string;
    title: string;
    eventDate: string;
  };
  summary: {
    interested: number;
    going: number;
    notGoing: number;
    total: number;
  };
  registrations: Array<{
    id: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
    status: string;
    responses: Array<{
      fieldLabel: string;
      answer: string;
    }>;
    createdAt: string;
  }>;
  fieldStatistics: Record<string, {
    label: string;
    type: string;
    counts?: Record<string, number>;
    responses?: Array<{
      userId: string;
      userName: string;
      answer: string;
    }>;
    totalResponses: number;
  }>;
}

export default function EventStatisticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'interested' | 'going' | 'not_going'>('all');

  useEffect(() => {
    loadStatistics();
  }, [id]);

  const loadStatistics = async () => {
    try {
      const response = await api.get(`/events/${id}/statistics`);
      setStatistics(response.data);
    } catch (error: any) {
      console.error('Failed to load statistics', error);
      toast.error(error.response?.data?.message || 'Erreur lors du chargement');
      navigate('/evenements');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!statistics) return;

    const headers = ['Nom', 'Email', 'Statut', 'Date d\'inscription'];
    const allFieldLabels = Object.values(statistics.fieldStatistics).map(f => f.label);
    headers.push(...allFieldLabels);

    const rows = filteredRegistrations
      .filter(reg => reg.user) // Filter out registrations without user
      .map(reg => {
        const row = [
          reg.user?.name || 'Utilisateur supprimé',
          reg.user?.email || '-',
          getStatusLabel(reg.status),
          new Date(reg.createdAt).toLocaleDateString('fr-FR'),
        ];

        allFieldLabels.forEach(label => {
          const response = reg.responses.find(r => r.fieldLabel === label);
          row.push(response?.answer || '-');
        });

        return row;
      });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `event-${statistics.event.title}-stats.csv`;
    link.click();

    toast.success('Export CSV réussi');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'interested':
        return 'Intéressé(e)';
      case 'going':
        return 'Participe';
      case 'not_going':
        return 'Ne participe pas';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'interested':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'going':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'not_going':
        return 'bg-gray-100 text-gray-800 border border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Chargement des statistiques..." />
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  const filteredRegistrations = (filter === 'all'
    ? statistics.registrations
    : statistics.registrations.filter(r => r.status === filter)
  ).filter(r => r.user); // Filter out registrations without user data

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(`/evenements/${id}`)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-biat-primary dark:hover:text-biat-accent"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-biat-primary dark:text-biat-accent">{statistics.event.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Statistiques d'inscription • {new Date(statistics.event.eventDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exporter CSV
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              onClick={() => setFilter('all')}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                filter === 'all' ? 'bg-biat-primary text-white shadow-lg' : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
            >
              <div className={`text-sm font-medium ${filter === 'all' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                Total inscriptions
              </div>
              <div className={`text-3xl font-bold mt-2 ${filter === 'all' ? 'text-white' : 'text-blue-900 dark:text-blue-300'}`}>
                {statistics.summary.total}
              </div>
            </div>

            <div
              onClick={() => setFilter('interested')}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                filter === 'interested' ? 'bg-yellow-500 text-white shadow-lg' : 'bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
              }`}
            >
              <div className={`text-sm font-medium ${filter === 'interested' ? 'text-white' : 'text-yellow-600 dark:text-yellow-400'}`}>
                ⭐ Intéressé(e)s
              </div>
              <div className={`text-3xl font-bold mt-2 ${filter === 'interested' ? 'text-white' : 'text-yellow-900 dark:text-yellow-300'}`}>
                {statistics.summary.interested}
              </div>
            </div>

            <div
              onClick={() => setFilter('going')}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                filter === 'going' ? 'bg-green-500 text-white shadow-lg' : 'bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
              }`}
            >
              <div className={`text-sm font-medium ${filter === 'going' ? 'text-white' : 'text-green-600 dark:text-green-400'}`}>
                ✓ Participants
              </div>
              <div className={`text-3xl font-bold mt-2 ${filter === 'going' ? 'text-white' : 'text-green-900 dark:text-green-300'}`}>
                {statistics.summary.going}
              </div>
            </div>

            <div
              onClick={() => setFilter('not_going')}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                filter === 'not_going' ? 'bg-gray-500 text-white shadow-lg' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className={`text-sm font-medium ${filter === 'not_going' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                ✗ Non participants
              </div>
              <div className={`text-3xl font-bold mt-2 ${filter === 'not_going' ? 'text-white' : 'text-gray-900 dark:text-gray-300'}`}>
                {statistics.summary.notGoing}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Field Statistics */}
          {Object.keys(statistics.fieldStatistics).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-biat-primary dark:text-biat-accent mb-6">Statistiques par champ</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(statistics.fieldStatistics).map(([fieldId, fieldStat]) => (
                  <div key={fieldId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{fieldStat.label}</h3>

                    {fieldStat.counts ? (
                      <div className="space-y-2">
                        {Object.entries(fieldStat.counts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([option, count]) => {
                            const percentage = (count / fieldStat.totalResponses) * 100;
                            return (
                              <div key={option}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {count} ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-biat-primary dark:bg-biat-accent h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Total: {fieldStat.totalResponses} réponse{fieldStat.totalResponses > 1 ? 's' : ''}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {fieldStat.responses?.map((resp, idx) => (
                          <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                            <div className="font-medium text-gray-700 dark:text-gray-300">{resp.userName}</div>
                            <div className="text-gray-600 dark:text-gray-400">{resp.answer}</div>
                          </div>
                        ))}
                        {fieldStat.totalResponses === 0 && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic">Aucune réponse</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registrations List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-biat-primary dark:text-biat-accent">
                Inscriptions ({filteredRegistrations.length})
              </h2>
            </div>

            {filteredRegistrations.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                Aucune inscription pour ce filtre
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      {statistics.registrations.some(r => r.responses.length > 0) && (
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Réponses
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{reg.user?.name || 'Utilisateur supprimé'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{reg.user?.email || '-'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(reg.status)}`}>
                            {getStatusLabel(reg.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {new Date(reg.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        {statistics.registrations.some(r => r.responses.length > 0) && (
                          <td className="px-6 py-4">
                            {reg.responses.length > 0 ? (
                              <div className="space-y-1">
                                {reg.responses.map((resp, idx) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{resp.fieldLabel}:</span>{' '}
                                    <span className="text-gray-600 dark:text-gray-400">{resp.answer}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 italic">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
