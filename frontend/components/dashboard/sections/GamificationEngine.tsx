'use client';

import React from 'react';
import { Flame, Star, Trophy, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserStats {
  currentXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  dailyStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
  todayCompleted: number;
  rank: number;
}

interface GamificationEngineProps {
  stats?: UserStats;
  onStreakClick?: () => void;
  onLevelClick?: () => void;
}

export function GamificationEngine({
  stats = {
    currentXP: 2340,
    currentLevel: 12,
    xpToNextLevel: 2500,
    dailyStreak: 5,
    weeklyGoal: 15,
    weeklyProgress: 11,
    todayCompleted: 3,
    rank: 3,
  },
  onStreakClick,
  onLevelClick,
}: GamificationEngineProps) {
  const xpProgress = (stats.currentXP / stats.xpToNextLevel) * 100;
  const weeklyProgress = (stats.weeklyProgress / stats.weeklyGoal) * 100;

  const getStreakEmoji = (streak: number) => {
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⚡';
    return '✨';
  };

  const getLevelColor = (level: number) => {
    if (level >= 20) return 'from-purple-600 to-pink-600';
    if (level >= 15) return 'from-blue-600 to-purple-600';
    if (level >= 10) return 'from-green-600 to-blue-600';
    return 'from-yellow-600 to-green-600';
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="space-y-4">
        {/* Level and XP Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              onClick={onLevelClick}
              className={cn(
                'w-12 h-12 rounded-full bg-gradient-to-r flex items-center justify-center cursor-pointer hover:scale-105 transition-transform',
                getLevelColor(stats.currentLevel),
              )}
            >
              <span className="text-white font-bold text-sm">
                {stats.currentLevel}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Level {stats.currentLevel}
              </div>
              <div className="text-xs text-gray-500">
                {stats.currentXP} / {stats.xpToNextLevel} XP
              </div>
            </div>
          </div>

          {/* Rank Badge */}
          <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
            <Trophy className="h-3 w-3 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700">
              #{stats.rank}
            </span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-500 bg-gradient-to-r',
                getLevelColor(stats.currentLevel),
              )}
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 text-right">
            {stats.xpToNextLevel - stats.currentXP} XP to level{' '}
            {stats.currentLevel + 1}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Daily Streak */}
          <div
            onClick={onStreakClick}
            className="text-center p-2 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center justify-center mb-1">
              <span className="text-lg">
                {getStreakEmoji(stats.dailyStreak)}
              </span>
            </div>
            <div className="text-sm font-semibold text-orange-700">
              {stats.dailyStreak}
            </div>
            <div className="text-xs text-orange-600">Day Streak</div>
          </div>

          {/* Today Completed */}
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-sm font-semibold text-green-700">
              {stats.todayCompleted}
            </div>
            <div className="text-xs text-green-600">Completed</div>
          </div>

          {/* Weekly Progress */}
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Star className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm font-semibold text-blue-700">
              {stats.weeklyProgress}/{stats.weeklyGoal}
            </div>
            <div className="text-xs text-blue-600">This Week</div>
          </div>
        </div>

        {/* Weekly Goal Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">
              Weekly Goal
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(weeklyProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
        </div>

        {/* Quick Achievement */}
        {stats.todayCompleted >= 3 && (
          <div className="bg-gradient-to-r from-yellow-50 to-green-50 border border-yellow-200 rounded-lg p-2">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-xs font-medium text-yellow-700">
                  Daily Goal Smashed! 🎉
                </div>
                <div className="text-xs text-yellow-600">
                  +50 XP bonus earned
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
