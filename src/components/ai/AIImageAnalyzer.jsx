import React, { useState } from 'react';
import { useAIImageRecognition } from '../../hooks/ai/useAIImageRecognition';
import { Camera, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AIImageAnalyzer({ imagePath, title, onCategorySuggested }) {
  const [analyzed, setAnalyzed] = useState(false);
  const { loading, error, analysis, analyzeImage, clear } = useAIImageRecognition();

  const handleAnalyze = async () => {
    const result = await analyzeImage(imagePath, title);
    if (result?.suggested_category && onCategorySuggested) {
      onCategorySuggested(result.suggested_category, result.suggested_subcategory);
    }
    setAnalyzed(true);
  };

  if (!imagePath) return null;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="text-green-600 dark:text-green-400" size={20} />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Análisis de Imagen con IA
          </h3>
        </div>
        {!analyzed && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Analizando...
              </>
            ) : (
              <>
                <Camera size={16} />
                Analizar Imagen
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={16} className="text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoría Sugerida
              </p>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                analysis.confidence === 'high' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : analysis.confidence === 'medium'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              }`}>
                {analysis.confidence === 'high' && 'Alta confianza'}
                {analysis.confidence === 'medium' && 'Confianza media'}
                {analysis.confidence === 'low' && 'Baja confianza'}
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {analysis.suggested_category}
            </p>
            {analysis.suggested_subcategory && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Subcategoría: {analysis.suggested_subcategory}
              </p>
            )}
          </div>

          {analysis.keywords && analysis.keywords.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Palabras clave detectadas:
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.source && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircle2 size={14} />
              <span>
                Fuente: {analysis.source === 'ai_analysis' ? 'Análisis IA' : 'Análisis de archivo'}
              </span>
            </div>
          )}
        </div>
      )}

      {!analysis && !loading && !analyzed && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Haz clic en "Analizar Imagen" para detectar automáticamente la categoría del producto.
        </p>
      )}

      {analyzed && !analysis && !loading && (
        <button
          onClick={() => {
            setAnalyzed(false);
            clear();
          }}
          className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
