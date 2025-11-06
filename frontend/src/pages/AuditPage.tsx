import { useState, useEffect } from 'react';
import api from '../services/api';

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  timestamp: string;
  actor?: { name: string; email: string };
  payload?: any;
}

interface FilterOptions {
  searchTerm: string;
  actionFilter: string;
  typeFilter: string;
  userFilter: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    actionFilter: '',
    typeFilter: '',
    userFilter: '',
  });
  const [sortField, setSortField] = useState<'timestamp' | 'action' | 'targetType'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const pageSize = 20;

  useEffect(() => {
    loadLogs();
  }, [page, sortField, sortOrder]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/audit', {
        params: {
          page,
          pageSize,
          sortField,
          sortOrder,
        },
      });
      setLogs(response.data.logs || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to load audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('login')) return 'bg-biat-100 text-biat-700 border border-biat-300';
    if (action.includes('delete')) return 'bg-red-100 text-red-700 border border-red-300';
    if (action.includes('approve') || action.includes('publish'))
      return 'bg-green-100 text-green-700 border border-green-300';
    return 'bg-gray-100 text-gray-700 border border-gray-300';
  };

  const handleSort = (field: 'timestamp' | 'action' | 'targetType') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      filters.searchTerm === '' ||
      log.action.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      log.actor?.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      log.actor?.email.toLowerCase().includes(filters.searchTerm.toLowerCase());

    const matchesAction = filters.actionFilter === '' || log.action.includes(filters.actionFilter);
    const matchesType = filters.typeFilter === '' || log.targetType === filters.typeFilter;
    const matchesUser = filters.userFilter === '' || log.actor?.email === filters.userFilter;

    return matchesSearch && matchesAction && matchesType && matchesUser;
  });

  // Get unique values for filters
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));
  const uniqueTypes = Array.from(new Set(logs.map((log) => log.targetType)));
  const uniqueUsers = Array.from(
    new Set(logs.map((log) => log.actor?.email).filter(Boolean))
  ) as string[];

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-biat-primary">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-biat-primary mb-4 md:mb-8">Journal d'Audit</h1>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-semibold text-biat-primary mb-3 md:mb-4">Filtres et Recherche</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={filters.actionFilter}
                onChange={(e) => handleFilterChange('actionFilter', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary"
              >
                <option value="">Toutes les actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.typeFilter}
                onChange={(e) => handleFilterChange('typeFilter', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary"
              >
                <option value="">Tous les types</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
              <select
                value={filters.userFilter}
                onChange={(e) => handleFilterChange('userFilter', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-biat-primary"
              >
                <option value="">Tous les utilisateurs</option>
                {uniqueUsers.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {filteredLogs.length} résultat{filteredLogs.length > 1 ? 's' : ''} trouvé
              {filteredLogs.length > 1 ? 's' : ''}
            </div>
            <button
              onClick={() => {
                setFilters({ searchTerm: '', actionFilter: '', typeFilter: '', userFilter: '' });
                setPage(1);
              }}
              className="text-sm text-biat-primary hover:text-biat-accent font-medium"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="overflow-x-auto max-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-biat-50">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary uppercase tracking-wider cursor-pointer hover:bg-biat-100 transition-colors"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date/Heure</span>
                      {sortField === 'timestamp' && (
                        <svg
                          className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary uppercase tracking-wider cursor-pointer hover:bg-biat-100 transition-colors"
                    onClick={() => handleSort('action')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Action</span>
                      {sortField === 'action' && (
                        <svg
                          className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary uppercase tracking-wider cursor-pointer hover:bg-biat-100 transition-colors"
                    onClick={() => handleSort('targetType')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Type</span>
                      {sortField === 'targetType' && (
                        <svg
                          className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-biat-secondary uppercase tracking-wider">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Aucun résultat trouvé
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-biat-secondary">
                          {log.actor?.name || 'Système'}
                        </div>
                        <div className="text-xs text-gray-500">{log.actor?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.targetType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.payload && (
                          <details className="cursor-pointer">
                            <summary className="text-biat-primary hover:text-biat-accent font-medium">
                              Voir détails
                            </summary>
                            <pre className="text-xs bg-gray-50 p-2 mt-2 rounded border border-gray-200 overflow-x-auto">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {page} sur {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Précédent
                </button>
                <div className="flex space-x-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          page === pageNum
                            ? 'bg-biat-primary text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
