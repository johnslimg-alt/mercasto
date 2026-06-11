import React from 'react';
import { Flame, Trophy, Star } from 'lucide-react';

/**
 * Compact level/streak badge for header or dashboard
 */
export default function LevelBadge({ user, compact = false }) {
  if (!user) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Level */}
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-full text-xs font-bold">
          <Star className="w-3 h-3" />
          Lv.{user.level}
        </div>
        
        {/* Streak */}
        {user.streak_days > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full text-xs font-bold">
            <Flame className="w-3 h-3" />
            {user.streak_days}
          </div>
        )}
      </div>
    );
  }

  // Full version with XP bar
  const xpForNextLevel = user.level * user.level * 100;
  const xpForCurrentLevel = (user.level - 1) * (user.level - 1) * 100;
  const xpInLevel = user.xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progress = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center text-white font-bold">
            {user.level}
          </div>
          <div>
            <div className="text-sm font-bold">Nivel {user.level}</div>
            <div className="text-xs text-slate-500">{user.xp} XP total</div>
          </div>
        </div>
        
        {user.streak_days > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full">
            <Flame className="w-4 h-4" />
            <span className="font-bold">{user.streak_days}</span>
          </div>
        )}
      </div>

      {/* XP Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Próximo nivel</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-lime-400 to-green-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-slate-500">
          {xpNeeded - xpInLevel} XP para nivel {user.level + 1}
        </div>
      </div>

      {user.total_achievements > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-slate-600 dark:text-slate-400">
            {user.total_achievements} logros desbloqueados
          </span>
        </div>
      )}
    </div>
  );
}
