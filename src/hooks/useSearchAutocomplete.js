import { useState, useEffect, useRef, useCallback } from 'react';

const RECENT_SEARCHES_KEY = 'mercasto_recent_searches';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 300;

/**
 * Хук для умного автодополнения поиска
 * @param {string} query - текущий поисковый запрос
 * @param {string} token - auth token (опционально, для персональных suggestions)
 * @returns {Object} - suggestions, recentSearches, loading, и функции управления
 */
export default function useSearchAutocomplete(query = '', token = null) {
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Загрузка недавних поисков из localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load recent searches:', e);
    }
  }, []);

  // Запрос suggestions с debounce
  useEffect(() => {
    // Очистка предыдущего таймера
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Если query слишком короткий - очищаем
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);

    // Debounce
    debounceTimerRef.current = setTimeout(async () => {
      // Отмена предыдущего запроса
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const headers = {
          'Accept': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(query)}`,
          {
            headers,
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (Array.isArray(data)) {
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Failed to fetch suggestions:', error);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, token]);

  // Добавление поиска в историю
  const addToRecent = useCallback((searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) return;

    const trimmed = searchTerm.trim();
    
    setRecentSearches(prev => {
      // Удаляем дубликаты и добавляем в начало
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
      
      // Сохраняем в localStorage
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save recent searches:', e);
      }
      
      return updated;
    });
  }, []);

  // Очистка истории
  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      console.warn('Failed to clear recent searches:', e);
    }
  }, []);

  // Показать/скрыть suggestions
  const toggleSuggestions = useCallback((show) => {
    setShowSuggestions(show);
  }, []);

  return {
    suggestions,
    recentSearches,
    loading,
    showSuggestions,
    addToRecent,
    clearRecent,
    toggleSuggestions,
  };
}
