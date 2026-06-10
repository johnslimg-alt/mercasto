import React, { useState } from 'react';
import { Bookmark, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SaveSearchButton = ({ token, filters, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchName, setSearchName] = useState('');
  const { t } = useTranslation();

  const API_BASE = import.meta.env.VITE_API_URL || 'https://mercasto.com/api';

  const generateDefaultName = () => {
    const parts = [];
    if (filters.query) parts.push(filters.query);
    if (filters.category) parts.push(filters.category);
    if (filters.city) parts.push(filters.city);
    if (filters.state) parts.push(filters.state);
    return parts.join(' - ') || t('search.saveSearch');
  };

  const handleSave = async () => {
    if (!token) {
      alert(t('errors.unauthorized'));
      return;
    }

    setShowModal(true);
    setSearchName(generateDefaultName());
  };

  const confirmSave = async () => {
    if (!searchName.trim()) {
      alert(t('search.nameRequired', { defaultValue: 'Enter a name for this search' }));
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/user/saved-searches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: searchName.trim(),
          filters: filters,
          alerts_enabled: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar búsqueda');
      }

      const data = await response.json();
      setSaved(true);
      setShowModal(false);
      
      if (onSave) {
        onSave(data.data);
      }

      // Reset after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving search:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg"
      >
        <Check className="w-4 h-4" />
        {t('common.saved', { defaultValue: 'Saved' })}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
        title={t('search.saveSearch')}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
        {t('search.saveSearch')}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {t('search.saveSearch')}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('search.searchName', { defaultValue: 'Search name' })}
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Autos en CDMX"
                autoFocus
              />
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('search.savedFilters', { defaultValue: 'Saved filters' })}:
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {filters.query && <li>• Búsqueda: "{filters.query}"</li>}
                {filters.category && <li>• Categoría: {filters.category}</li>}
                {filters.state && <li>• Estado: {filters.state}</li>}
                {filters.city && <li>• Ciudad: {filters.city}</li>}
                {(filters.min_price || filters.max_price) && (
                  <li>• Precio: ${filters.min_price || '0'} - ${filters.max_price || '∞'}</li>
                )}
              </ul>
            </div>

            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <input
                type="checkbox"
                id="alerts"
                defaultChecked
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="alerts" className="text-sm text-gray-700 dark:text-gray-300">
                {t('search.newResults')}
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SaveSearchButton;
