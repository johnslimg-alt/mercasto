import React from 'react';
import { X } from 'lucide-react';
import AchievementsPanel from './AchievementsPanel';
import { getAchievementsTranslations } from './achievementsI18n';

export default function AchievementsModal({ isOpen, onClose, lang = 'es' }) {
  if (!isOpen) return null;
  const tr = getAchievementsTranslations(lang);
  const closeLabel = {
    es: 'Cerrar', en: 'Close', pt: 'Fechar', fr: 'Fermer', zh: '关闭', ko: '닫기',
    de: 'Schließen', it: 'Chiudi', ar: 'إغلاق', ru: 'Закрыть', ja: '閉じる',
  }[lang] || 'Close';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      {/* Backdrop */}
      <div
        data-pointer-dismiss-surface
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-labelledby="achievements-title" className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 id="achievements-title" className="text-2xl font-bold">🏆 {tr.title}</h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AchievementsPanel lang={lang} />
        </div>
      </div>
    </div>
  );
}
