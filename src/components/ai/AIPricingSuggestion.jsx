import React, { useEffect } from 'react';
import { useAIPricing } from '../../hooks/ai/useAIPricing';
import { TrendingUp, AlertCircle, Sparkles } from 'lucide-react';

export default function AIPricingSuggestion({ listingData, onPriceSuggested }) {
  const { loading, error, suggestion, suggestPrice, clearSuggestion } = useAIPricing();

  useEffect(() => {
    if (listingData.title && listingData.category && listingData.condition) {
      suggestPrice(listingData);
    }
    return () => clearSuggestion();
  }, [listingData.title, listingData.category, listingData.condition]);

  useEffect(() => {
    if (suggestion?.suggested_price && onPriceSuggested) {
      onPriceSuggested(suggestion.suggested_price);
    }
  }, [suggestion]);

  if (loading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Analizando mercado para sugerir precio...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
              No se pudo generar sugerencia
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!suggestion) return null;

  const confidenceColor = {
    high: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    low: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-blue-600 dark:text-blue-400" size={20} />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Precio Sugerido por IA
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${confidenceColor[suggestion.confidence]}`}>
          {suggestion.confidence === 'high' && 'Alta confianza'}
          {suggestion.confidence === 'medium' && 'Confianza media'}
          {suggestion.confidence === 'low' && 'Baja confianza'}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${suggestion.suggested_price.toLocaleString()}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">MXN</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
          {suggestion.reasoning}
        </p>
      </div>

      {suggestion.market_data && Object.keys(suggestion.market_data).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Datos del mercado ({suggestion.comparables_count} listings similares)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Mínimo:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                ${suggestion.market_data.min?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Máximo:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                ${suggestion.market_data.max?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Promedio:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                ${suggestion.market_data.avg?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Mediana:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                ${suggestion.market_data.median?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
