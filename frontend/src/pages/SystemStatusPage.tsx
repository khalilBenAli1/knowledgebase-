import { useState, useEffect } from 'react';
import api from '../services/api';

interface SystemStatus {
  database: {
    users: { total: number; active: number };
    documents: { total: number; published: number };
    chunks: number;
    sessions: number;
    messages: number;
    auditLogs: number;
  };
  llm: {
    status: string;
    url: string;
    models: Array<{
      name: string;
      size: number;
      modified: string;
    }>;
  };
  performance: {
    recentMessagesCount: number;
    timestamp: string;
  };
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await api.get('/admin/system/status');
      setStatus(response.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load system status', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  if (!status) {
    return <div className="p-8 text-red-600">Erreur lors du chargement du statut système</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-biat-primary">Statut du Système</h1>
            <p className="text-gray-600 mt-2">
              Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
            </p>
          </div>
          <button
            onClick={loadStatus}
            className="bg-biat-primary text-white px-6 py-3 rounded-lg hover:bg-biat-accent transition-all shadow-sm hover:shadow-md flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualiser</span>
          </button>
        </div>

        {/* LLM Status */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-biat-secondary flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Statut du LLM (Ollama)
            </h2>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              status.llm.status === 'online'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {status.llm.status === 'online' ? '● En ligne' : '● Hors ligne'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">URL Ollama</p>
              <p className="font-mono text-sm text-biat-primary">{status.llm.url}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Modèles chargés</p>
              <p className="text-2xl font-bold text-biat-primary">{status.llm.models.length}</p>
            </div>
          </div>

          {status.llm.models.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Modèles disponibles:</h3>
              <div className="space-y-2">
                {status.llm.models.map((model, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-biat-secondary">{model.name}</p>
                      <p className="text-xs text-gray-500">
                        Modifié: {new Date(model.modified).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <span className="text-sm font-mono text-gray-600">{formatBytes(model.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Database Statistics */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-biat-secondary mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Statistiques de la Base de Données
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Utilisateurs</p>
              <p className="text-3xl font-bold text-blue-900">{status.database.users.total}</p>
              <p className="text-xs text-blue-600 mt-1">{status.database.users.active} actifs</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Documents</p>
              <p className="text-3xl font-bold text-green-900">{status.database.documents.total}</p>
              <p className="text-xs text-green-600 mt-1">{status.database.documents.published} publiés</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 font-medium">Chunks (RAG)</p>
              <p className="text-3xl font-bold text-purple-900">{status.database.chunks.toLocaleString()}</p>
              <p className="text-xs text-purple-600 mt-1">vecteurs indexés</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700 font-medium">Sessions de Chat</p>
              <p className="text-3xl font-bold text-yellow-900">{status.database.sessions}</p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
              <p className="text-sm text-pink-700 font-medium">Messages</p>
              <p className="text-3xl font-bold text-pink-900">{status.database.messages.toLocaleString()}</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-700 font-medium">Logs d'Audit</p>
              <p className="text-3xl font-bold text-indigo-900">{status.database.auditLogs.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-biat-secondary mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Performance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Messages récents (1h)</p>
              <p className="text-2xl font-bold text-biat-primary">{status.performance.recentMessagesCount}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Horodatage</p>
              <p className="text-sm font-mono text-biat-primary">
                {new Date(status.performance.timestamp).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
