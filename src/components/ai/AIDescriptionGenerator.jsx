import React, { useState } from 'react';
import { useAIDescription } from '../../hooks/ai/useAIDescription';
import { Sparkles, RefreshCw, Copy, Check } from 'lucide-react';

export default function AIDescriptionGenerator({ listingData, onDescriptionGenerated }) {
  const [copied, setCopied] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const { loading, error, description, variants, generate, improve } = useAIDescription();

  const handleGenerate = async () => {
    const result = await generate(listingData, 3); // Generate 3 variants
    if (result && onDescriptionGenerated) {
      if (result.variants && result.variants.length > 0) {
        onDescriptionGenerated(result.variants[0].description);
      } else if (result.description) {
        onDescriptionGenerated(result.description);
      }
    }
  };

  const handleImprove = async () => {
    if (!description?.description) return;
    const result = await improve(description.description, listingData);
    if (result && onDescriptionGenerated) {
      onDescriptionGenerated(result.improved);
    }
  };

  const handleCopy = async () => {
    const text = variants.length > 0 
      ? variants[selectedVariant]?.description 
      : description?.description;
    
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectVariant = (index) => {
    setSelectedVariant(index);
    if (variants[index] && onDescriptionGenerated) {
      onDescriptionGenerated(variants[index].description);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-600 dark:text-purple-400" size={20} />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Generador de Descripción con IA
          </h3>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generar con IA
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {variants.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selecciona una variante:
          </p>
          <div className="flex gap-2">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => handleSelectVariant(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedVariant === i
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-slate-600'
                }`}
              >
                Variante {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {(description || variants.length > 0) && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
              {variants.length > 0 
                ? variants[selectedVariant]?.description 
                : description?.description}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={handleImprove}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Mejorar
            </button>
          </div>

          {description?.generation_time_ms && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Generado en {description.generation_time_ms}ms • {description.word_count} palabras
            </p>
          )}
        </div>
      )}

      {!description && !loading && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Haz clic en "Generar con IA" para crear una descripción profesional automáticamente basada en tu producto.
        </p>
      )}
    </div>
  );
}
