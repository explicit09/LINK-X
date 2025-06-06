'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Flame, Trophy, Target, TrendingUp } from 'lucide-react';

interface CompressedProgressStripProps {
  onStreakClick?: () => void;
  onLevelClick?: () => void;
}

export function CompressedProgressStrip({ 
  onStreakClick, 
  onLevelClick 
}: CompressedProgressStripProps) {
  // Sample data - in a real app, this would come from props or API
  const stats = {
    streak: 7,
    level: 12,
    xpToNext: 160,
    xpCurrent: 340,
    xpTotal: 500,
    weeklyGoal: 75,
    rank: 15
  };

  const xpProgress = (stats.xpCurrent / stats.xpTotal) * 100;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 mb-6">
      <div className="flex items-center justify-between gap-6">
        {/* Streak */}
        <button
          onClick={onStreakClick}
          className="flex items-center gap-2 hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors"
        >
          <Flame className="h-5 w-5 text-orange-500" />
          <div className="text-left">
            <p className="text-xs text-gray-500">Streak</p>
            <p className="text-sm font-semibold">{stats.streak} days</p>
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
              <p className="text-xs text-gray-500">Level {stats.level}</p>
              <p className="text-xs text-gray-500">{stats.xpToNext} XP to next</p>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </button>

        {/* Weekly Goal */}
        <div className="flex items-center gap-2 px-3">
          <Target className="h-5 w-5 text-blue-500" />
          <div className="text-left">
            <p className="text-xs text-gray-500">Weekly Goal</p>
            <p className="text-sm font-semibold">{stats.weeklyGoal}%</p>
          </div>
        </div>

        {/* Rank */}
        <div className="flex items-center gap-2 px-3">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <div className="text-left">
            <p className="text-xs text-gray-500">Rank</p>
            <p className="text-sm font-semibold">#{stats.rank}</p>
          </div>
        </div>
      </div>
    </div>
  );
}