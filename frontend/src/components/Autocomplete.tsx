import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Posez votre question...',
  className = '',
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [popularQuestions, setPopularQuestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load popular questions on mount
  useEffect(() => {
    loadPopularQuestions();
  }, []);

  // Fetch suggestions when value changes
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (value.length >= 3) {
      debounceTimeout.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300); // 300ms debounce
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPopularQuestions = async () => {
    try {
      const response = await api.get('/suggestions/popular?limit=5');
      setPopularQuestions(response.data);
    } catch (error) {
      console.error('Failed to load popular questions', error);
    }
  };

  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/suggestions/related?q=${encodeURIComponent(query)}&limit=5`);
      setSuggestions(response.data);
      setShowSuggestions(response.data.length > 0);
    } catch (error) {
      console.error('Failed to fetch suggestions', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (value.length === 0 && popularQuestions.length > 0) {
      setShowSuggestions(true);
    } else if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentList = value.length >= 3 ? suggestions : popularQuestions;

    if (!showSuggestions || currentList.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < currentList.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < currentList.length) {
          e.preventDefault();
          handleSuggestionClick(currentList[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const displayList = value.length >= 3 ? suggestions : popularQuestions;
  const showList = showSuggestions && displayList.length > 0 && !disabled;

  // Extract flex-1 from className to apply to wrapper, keep rest for input
  const hasFlexOne = className.includes('flex-1');
  const inputClassName = className.replace('flex-1', '').trim();

  return (
    <div className={`relative w-full ${hasFlexOne ? 'flex-1' : ''}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full ${inputClassName}`}
        disabled={disabled}
      />

      {showList && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          {value.length < 3 && popularQuestions.length > 0 && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              Questions populaires
            </div>
          )}

          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-biat-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Recherche de suggestions...
            </div>
          )}

          {!loading && displayList.map((suggestion, index) => (
            <div
              key={index}
              className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                selectedIndex === index
                  ? 'bg-biat-50 dark:bg-biat-900/50 text-biat-primary dark:text-biat-300'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start gap-2">
                <svg
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    selectedIndex === index ? 'text-biat-primary dark:text-biat-300' : 'text-gray-400 dark:text-gray-500'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">{suggestion}</span>
              </div>
            </div>
          ))}

          {!loading && value.length >= 3 && displayList.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              Aucune suggestion trouvée
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Autocomplete;
