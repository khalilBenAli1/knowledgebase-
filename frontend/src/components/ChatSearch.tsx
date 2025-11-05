import React, { useState } from 'react';
import api from '../services/api';
import { showError } from '../utils/toast';
import LoadingSpinner from './LoadingSpinner';

interface SearchResult {
  id: string;
  content: string;
  role: string;
  createdAt: string;
  session: { id: string; title: string };
}

interface ChatSearchProps {
  onResultClick?: (sessionId: string, messageId: string) => void;
}

const ChatSearch: React.FC<ChatSearchProps> = ({ onResultClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.length < 3) {
      showError('Veuillez saisir au moins 3 caractères');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await api.get(`/chat/search?q=${encodeURIComponent(query)}`);
      setResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      showError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 text-gray-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Rechercher dans les conversations
        </h2>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans les messages..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary500 focus:border-transparent"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <button
            type="submit"
            disabled={loading || query.length < 3}
            className="px-6 py-2 bg-biat-primary600 text-white rounded-lg hover:bg-biat-primary700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>

        {query.length > 0 && query.length < 3 && (
          <p className="mt-2 text-sm text-gray-500">
            Minimum 3 caractères requis
          </p>
        )}
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" text="Recherche en cours..." />
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-8">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg font-medium">Aucun résultat trouvé</p>
            <p className="text-gray-400 text-sm mt-2">
              Essayez d'autres mots-clés
            </p>
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="text-center py-8 text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p>Saisissez une recherche pour commencer</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">
              {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
            </p>

            {results.map((result) => (
              <div
                key={result.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onResultClick?.(result.session.id, result.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        result.role === 'user'
                          ? 'bg-biat-primary100 text-biat-primary700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {result.role === 'user' ? 'Vous' : 'Assistant'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {result.session.title}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(result.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <div className="text-sm text-gray-700 line-clamp-3">
                  {highlightText(result.content, query)}
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs text-biat-primary600">
                  <span>Voir la conversation</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSearch;
