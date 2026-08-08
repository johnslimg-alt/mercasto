import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Trash2, Search } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { getTranslations } from '../../utils/translations';
import { formatMXN } from '../../utils/localeFormat';

const SEARCH_ALERT_SAVED_EVENT = 'mercasto:search-alert-saved';

const normalizeAlertFilters = (alert = {}) => ({
  ...(alert.filters && typeof alert.filters === 'object' ? alert.filters : {}),
  query: alert.query || '',
  category: alert.category_slug || alert.category?.slug || '',
  state: alert.state || '',
  city: alert.city || '',
  min_price: alert.min_price ?? '',
  max_price: alert.max_price ?? '',
});

const SavedSearchesPanel = ({ token: propToken, onSearchClick, onSearchSelect }) => {
  const { lang, loadedLangVersion } = useUI();
  void loadedLangVersion;
  const t = getTranslations(lang);

  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'https://mercasto.com/api';
  const token = propToken || localStorage.getItem('auth_token') || localStorage.getItem('token');
  const runSavedSearch = onSearchSelect || onSearchClick;

  const fetchSavedSearches = async () => {
    if (!token) {
      setSearches([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/user/search-alerts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) throw new Error(t.load_failed);

      const data = await response.json();
      setSearches(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedSearches();
  }, [token]);

  useEffect(() => {
    const handleSaved = (event) => {
      const created = event.detail;
      if (!created?.id) return;
      setSearches((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
      setError(null);
    };

    window.addEventListener(SEARCH_ALERT_SAVED_EVENT, handleSaved);
    return () => window.removeEventListener(SEARCH_ALERT_SAVED_EVENT, handleSaved);
  }, []);

  const toggleAlerts = async (search) => {
    const nextActive = !search.is_active;
    setSearches((previous) => previous.map((item) => (
      item.id === search.id ? { ...item, is_active: nextActive } : item
    )));

    try {
      const response = await fetch(`${API_BASE}/user/search-alerts/${search.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ is_active: nextActive }),
      });

      if (!response.ok) throw new Error(t.update_alerts_failed);

      const updated = await response.json();
      setSearches((previous) => previous.map((item) => item.id === search.id ? updated : item));
    } catch (err) {
      console.error('Error toggling alerts:', err);
      setSearches((previous) => previous.map((item) => item.id === search.id ? search : item));
      alert(t.update_alerts_failed);
    }
  };

  const deleteSearch = async (searchId) => {
    if (!confirm(t.delete_confirm)) return;

    const previous = searches;
    setSearches((items) => items.filter((item) => item.id !== searchId));

    try {
      const response = await fetch(`${API_BASE}/user/search-alerts/${searchId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) throw new Error(t.delete_failed);
    } catch (err) {
      console.error('Error deleting search:', err);
      setSearches(previous);
      alert(t.delete_failed);
    }
  };

  const formatFilters = (alert) => {
    const filters = normalizeAlertFilters(alert);
    const parts = [];
    if (filters.query) parts.push(`"${filters.query}"`);
    if (filters.category) parts.push(filters.category);
    if (filters.state) parts.push(filters.state);
    if (filters.city && filters.city !== filters.state) parts.push(filters.city);
    if (filters.min_price || filters.max_price) {
      parts.push(`${formatMXN(filters.min_price || 0, lang)} - ${filters.max_price ? formatMXN(filters.max_price, lang) : '∞'}`);
    }
    return parts.join(' • ') || t.no_filters;
  };

  const handleSearchClick = (search) => {
    runSavedSearch?.(normalizeAlertFilters(search));
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button onClick={fetchSavedSearches} className="mt-2 text-blue-500 hover:text-blue-600">
          {t.retry}
        </button>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="p-8 text-center text-sm">
        <Search className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t.no_saved_searches}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {t.no_saved_searches_desc}
        </p>
        <div className="text-sm text-gray-400 dark:text-gray-500">{t.tip}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          {t.saved_searches_title} ({searches.length})
        </h2>
      </div>

      <div className="space-y-3">
        {searches.map((search) => (
          <div
            key={search.id}
            data-testid={`saved-search-card-${search.id}`}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <button
                type="button"
                className="flex-1 min-w-0 text-left"
                onClick={() => handleSearchClick(search)}
              >
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 break-words">
                  {search.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 break-words">
                  {formatFilters(search)}
                </p>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAlerts(search)}
                  className={`min-w-11 min-h-11 p-2 rounded-lg transition-colors ${
                    search.is_active
                      ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={search.is_active ? t.deactivate_alerts : t.activate_alerts}
                  aria-label={search.is_active ? t.deactivate_alerts : t.activate_alerts}
                  data-testid={`saved-search-alert-toggle-${search.id}`}
                  aria-pressed={Boolean(search.is_active)}
                >
                  {search.is_active ? <Bell className="w-5 h-5 mx-auto" /> : <BellOff className="w-5 h-5 mx-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => deleteSearch(search.id)}
                  className="min-w-11 min-h-11 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={t.delete_search}
                  aria-label={t.delete_search}
                  data-testid={`saved-search-delete-${search.id}`}
                >
                  <Trash2 className="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedSearchesPanel;
