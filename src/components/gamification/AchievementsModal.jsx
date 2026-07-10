import React from 'react';
import { X } from 'lucide-react';
import AchievementsPanel from './AchievementsPanel';
import { getAchievementsTranslations } from './achievementsI18n';

export default function AchievementsModal({ isOpen, onClose, lang = 'es' }) {
  if (!isOpen) return null;
  const tr = getAchievementsTranslations(lang);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold">🏆 {tr.title}</h2>
          <button
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
