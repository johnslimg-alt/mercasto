import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Star, Lock, Zap, TrendingUp } from 'lucide-react';
import { getAchievementsTranslations } from './achievementsI18n';

const API_URL = import.meta.env.VITE_API_URL || 'https://mercasto.com/api';

const RARITY_COLORS = {
  common: 'from-slate-400 to-slate-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-amber-600',
};

const RARITY_BG = {
  common: 'bg-slate-100 dark:bg-slate-800',
  rare: 'bg-blue-50 dark:bg-blue-900/20',
  epic: 'bg-purple-50 dark:bg-purple-900/20',
  legendary: 'bg-amber-50 dark:bg-amber-900/20',
};

const RARITY_BORDER = {
  common: 'border-slate-300 dark:border-slate-600',
  rare: 'border-blue-300 dark:border-blue-700',
  epic: 'border-purple-300 dark:border-purple-700',
  legendary: 'border-amber-300 dark:border-amber-700',
};

export default function AchievementsPanel({ lang = 'es' }) {
  const tr = getAchievementsTranslations(lang);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('unlocked');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error(tr.notAuthenticated);
      }

      const response = await fetch(`${API_URL}/gamification/profile`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(tr.fetchFailed);
      }

      const data = await response.json();
      setProfile(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        {tr.errorLoading}: {error}
      </div>
    );
  }

  if (!profile) return null;

  const { level, total_xp, current_streak, longest_streak, achievements_unlocked, achievements_total, unlocked_achievements, in_progress, all_achievements, recent_xp } = profile;

  const unlocked = all_achievements.filter(a => a.unlocked);
  const locked = all_achievements.filter(a => !a.unlocked);
  const completionPercent = achievements_total > 0 ? Math.round((achievements_unlocked / achievements_total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Level & XP Card */}
      <div className="bg-gradient-to-br from-lime-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm opacity-80">{tr.level}</div>
            <div className="text-4xl font-bold flex items-center gap-2">
              {level.level} <span className="text-2xl">{level.icon}</span>
            </div>
            <div className="text-sm font-medium">{level.name}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-80">{tr.totalXp}</div>
            <div className="text-2xl font-bold">{total_xp.toLocaleString()}</div>
          </div>
        </div>

        {level.next_min_xp && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{tr.progressToLevel} {level.next_level} ({level.next_name})</span>
              <span>{level.progress}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${level.progress}%` }}
              />
            </div>
            <div className="text-sm opacity-80">
              {level.next_min_xp - total_xp} {tr.xpToNext}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center border border-slate-200 dark:border-slate-700">
          <Flame className="w-6 h-6 mx-auto mb-2 text-orange-500" />
          <div className="text-2xl font-bold">{current_streak}</div>
          <div className="text-xs text-slate-500">{tr.streakDays}</div>
          {longest_streak > 0 && (
            <div className="text-xs text-slate-400 mt-1">{tr.record}: {longest_streak}</div>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center border border-slate-200 dark:border-slate-700">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
          <div className="text-2xl font-bold">{achievements_unlocked}</div>
          <div className="text-xs text-slate-500">{tr.achievements}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center border border-slate-200 dark:border-slate-700">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
          <div className="text-2xl font-bold">{completionPercent}%</div>
          <div className="text-xs text-slate-500">{tr.completed}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('unlocked')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'unlocked'
              ? 'text-lime-600 border-b-2 border-lime-600'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {tr.unlocked} ({unlocked.length})
        </button>
        <button
          onClick={() => setActiveTab('locked')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'locked'
              ? 'text-lime-600 border-b-2 border-lime-600'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {tr.toUnlock} ({locked.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'activity'
              ? 'text-lime-600 border-b-2 border-lime-600'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {tr.activity}
        </button>
      </div>

      {activeTab === 'unlocked' && (
        <div className="space-y-3">
          {unlocked.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{tr.noUnlocked}</p>
              <p className="text-sm">{tr.noUnlockedHint}</p>
            </div>
          ) : (
            unlocked.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} unlocked tr={tr} />
            ))
          )}
        </div>
      )}

      {activeTab === 'locked' && (
        <div className="space-y-3">
          {locked.map(achievement => (
            <AchievementCard key={achievement.id} achievement={achievement} tr={tr} />
          ))}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-2">
          {recent_xp.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{tr.noActivity}</p>
            </div>
          ) : (
            recent_xp.map((tx, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <Zap className={`w-5 h-5 ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{tx.reason}</div>
                    <div className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} XP
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const RARITY_LABEL_KEYS = { common: 'rarityCommon', rare: 'rarityRare', epic: 'rarityEpic', legendary: 'rarityLegendary' };

function AchievementCard({ achievement, unlocked = false, tr }) {
  const progress = achievement.requirement_value > 0 ? Math.round((achievement.progress / achievement.requirement_value) * 100) : 0;
  
  return (
    <div className={`relative p-4 rounded-xl border-2 transition-all ${
      unlocked 
        ? `${RARITY_BG[achievement.rarity]} ${RARITY_BORDER[achievement.rarity]}`
        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-75'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`text-4xl ${!unlocked && 'grayscale opacity-50'}`}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold truncate">{achievement.name}</h3>
            {!unlocked && <Lock className="w-4 h-4 text-slate-400" />}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            {achievement.description}
          </p>
          
          <div className="flex items-center gap-3 text-xs">
            <span className={`px-2 py-1 rounded-full bg-gradient-to-r ${RARITY_COLORS[achievement.rarity]} text-white font-medium`}>
              {tr[RARITY_LABEL_KEYS[achievement.rarity]]}
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Star className="w-3 h-3" />
              +{achievement.xp_reward} XP
            </span>
            {unlocked && achievement.unlocked_at && (
              <span className="text-slate-500">
                {new Date(achievement.unlocked_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {!unlocked && progress > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{achievement.progress} / {achievement.requirement_value}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-lime-400 to-green-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
