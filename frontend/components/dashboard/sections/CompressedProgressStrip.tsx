'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Flame, Trophy, Target, TrendingUp } from 'lucide-react';
import { useGamification } from '@/contexts/GamificationContext';

interface CompressedProgressStripProps {
  onStreakClick?: () => void;
  onLevelClick?: () => void;
}

export function CompressedProgressStrip({ 
  onStreakClick, 
  onLevelClick 
}: CompressedProgressStripProps) {
  const { userStats, isLoading } = useGamification();

  if (isLoading || !userStats) {
    return (
      <div className="bg-white border-b border-gray-200 px-6 py-3 mb-6">
        <div className="flex items-center justify-between gap-6 animate-pulse">
          <div className="h-10 w-20 bg-gray-200 rounded-lg" />
          <div className="h-10 flex-1 max-w-sm bg-gray-200 rounded-lg" />
          <div className="h-10 w-20 bg-gray-200 rounded-lg" />
          <div className="h-10 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  // Show setup message if user has no XP and is at level 1 (likely default values)
  const isDefaultStats = userStats.total_xp === 0 && userStats.level === 1;

  // Calculate level boundaries
  const calculateLevelXP = (level: number) => Math.floor(100 * Math.pow(level, 1.5));
  const currentLevelXP = userStats.level > 1 ? calculateLevelXP(userStats.level - 1) : 0;
  const nextLevelXP = calculateLevelXP(userStats.level);
  const xpInCurrentLevel = userStats.total_xp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const xpProgress = (xpInCurrentLevel / xpNeededForLevel) * 100;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 mb-6">
      {isDefaultStats && (
        <div className="mb-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          🚀 Gamification system ready! Start learning to earn XP and level up.
        </div>
      )}
      <div className="flex items-center justify-between gap-6">
        {/* Streak */}
        <button
          onClick={onStreakClick}
          className="flex items-center gap-2 hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors"
        >
          <Flame className="h-5 w-5 text-orange-500" />
          <div className="text-left">
            <p className="text-xs text-gray-500">Streak</p>
            <p className="text-sm font-semibold">{userStats.current_streak} days</p>
          </div>
        </button>

        {/* Level Progress */}
        <button
          onClick={onLevelClick}
          className="flex items-center gap-3 hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors flex-1 max-w-sm"
        >
          <Trophy className="h-5 w-5 text-yellow-500" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-gray-500">Level {userStats.level}</p>
              <p className="text-xs text-gray-500">{xpNeededForLevel - xpInCurrentLevel} XP to next</p>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all"
                style={{ width: `${Math.min(100, xpProgress)}%` }}
              />
            </div>
          </div>
        </button>

        {/* Weekly Goal */}
        <div className="flex items-center gap-2 px-3">
          <Target className="h-5 w-5 text-blue-500" />
          <div className="text-left">
            <p className="text-xs text-gray-500">Weekly Goal</p>
            <p className="text-sm font-semibold">
              {Math.round((userStats.weekly_goal_progress / userStats.weekly_goal_target) * 100)}%
            </p>
          </div>
        </div>

        {/* Rank */}
        <div className="flex items-center gap-2 px-3">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <div className="text-left">
            <p className="text-xs text-gray-500">Rank</p>
            <p className="text-sm font-semibold">#{userStats.rank || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}