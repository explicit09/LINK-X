'use client';

import React from 'react';
import { Flame, Star, Trophy, Zap, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStats } from '@/hooks/useGamification';

interface UserStats {
  currentXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  dailyStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
  todayCompleted: number;
  todayXP: number;
  rank: number;
}

interface CompressedProgressStripProps {
  stats?: UserStats;
  onStreakClick?: () => void;
  onLevelClick?: () => void;
}

export function CompressedProgressStrip({
  stats: propStats,
  onStreakClick,
  onLevelClick,
}: CompressedProgressStripProps) {
  // Real data from API
  const { stats: apiStats, loading, error } = useUserStats();

  // Use API data if available, fallback to props or defaults
  const stats = apiStats ||
    propStats || {
      currentXP: 0,
      currentLevel: 1,
      xpToNextLevel: 100,
      dailyStreak: 0,
      weeklyGoal: 5,
      weeklyProgress: 0,
      todayCompleted: 0,
      todayXP: 0,
      rank: 0,
    };

  // Behavioral triggers for animations
  const [justEarnedXP, setJustEarnedXP] = React.useState(false);
  const [justRankedUp, setJustRankedUp] = React.useState(false);

  React.useEffect(() => {
    // Simulate XP pulse on component load (would be triggered by actual XP gain)
    const timer = setTimeout(() => setJustEarnedXP(true), 500);
    const resetTimer = setTimeout(() => setJustEarnedXP(false), 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(resetTimer);
    };
  }, []);

  const xpProgress =
    stats.xpToNextLevel > 0 ? (stats.currentXP / stats.xpToNextLevel) * 100 : 0;
  const xpToGo = stats.xpToNextLevel - stats.currentXP;

  const getStreakEmoji = (streak: number) => {
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⚡';
    return '✨';
  };

  const getLevelColor = (level: number) => {
    if (level >= 20) return 'from-purple-500 to-pink-500';
    if (level >= 15) return 'from-blue-500 to-purple-500';
    if (level >= 10) return 'from-green-500 to-blue-500';
    return 'from-yellow-500 to-green-500';
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-3 mb-4">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-3 mb-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Streak Capsule */}
        <div
          onClick={onStreakClick}
          className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 cursor-pointer hover:bg-orange-100 transition-colors"
        >
          <span className="text-lg">{getStreakEmoji(stats.dailyStreak)}</span>
          <span className="text-sm font-semibold text-orange-700">
            {stats.dailyStreak}-Day
          </span>
        </div>

        {/* Level & XP Capsule */}
        <div
          onClick={onLevelClick}
          className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full px-4 py-1.5 cursor-pointer hover:shadow-sm transition-all"
        >
          <div
            className={cn(
              'w-8 h-8 rounded-full bg-gradient-to-r flex items-center justify-center text-white font-bold text-xs',
              getLevelColor(stats.currentLevel),
            )}
          >
            {stats.currentLevel}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-600">
              Level {stats.currentLevel}
            </span>
            <span className="text-xs text-purple-600 font-medium">
              {xpToGo} XP to go
            </span>
          </div>
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all duration-500 bg-gradient-to-r',
                getLevelColor(stats.currentLevel),
              )}
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Tasks Capsule */}
        <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
          <Target className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-green-700">
            {stats.todayCompleted}/{stats.weeklyGoal}
          </span>
          <span className="text-xs text-green-600">Tasks</span>
        </div>

        {/* Today's XP Capsule with Pulse Animation */}
        <div
          className={cn(
            'flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1.5 transition-all duration-300',
            justEarnedXP &&
              'animate-pulse bg-yellow-100 border-yellow-300 scale-105',
          )}
        >
          <Zap
            className={cn(
              'h-4 w-4 text-yellow-600',
              justEarnedXP && 'animate-bounce',
            )}
          />
          <span className="text-sm font-semibold text-yellow-700">
            +{stats.todayXP} XP
          </span>
          <span className="text-xs text-yellow-600">Today</span>
          {justEarnedXP && (
            <span className="text-xs text-yellow-800 font-bold animate-fade-in">
              New!
            </span>
          )}
        </div>

        {/* Rank Capsule */}
        <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
          <Trophy className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">
            {stats.rank > 0 ? `#${stats.rank}` : 'Unranked'}
          </span>
        </div>
      </div>
    </div>
  );
}
