'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGamification } from '@/contexts/GamificationContext';
import { 
  Flame, Target, Trophy, TrendingUp, 
  Sparkles, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';

interface GamificationWidgetProps {
  variant?: 'horizontal' | 'vertical' | 'minimal';
  showLabels?: boolean;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

export function GamificationWidget({
  variant = 'horizontal',
  showLabels = true,
  animated = true,
  className,
  onClick
}: GamificationWidgetProps) {
  const { userStats, isLoading } = useGamification();
  const router = useRouter();

  if (isLoading || !userStats) {
    return (
      <div className={cn(
        "animate-pulse bg-gray-200 rounded-lg",
        variant === 'horizontal' ? "h-12 w-64" : "h-32 w-32",
        className
      )}>
      </div>
    );
  }

  // Calculate level progress
  const calculateLevelXP = (level: number) => Math.floor(100 * Math.pow(level, 1.5));
  const currentLevelXP = userStats.level > 1 ? calculateLevelXP(userStats.level - 1) : 0;
  const nextLevelXP = calculateLevelXP(userStats.level);
  const xpInCurrentLevel = userStats.total_xp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const levelProgress = (xpInCurrentLevel / xpNeededForLevel) * 100;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/dashboard/gamification');
    }
  };

  // Get streak status
  const getStreakColor = () => {
    if (userStats.current_streak >= 30) return 'text-orange-500';
    if (userStats.current_streak >= 7) return 'text-yellow-500';
    if (userStats.current_streak > 0) return 'text-gray-600';
    return 'text-gray-400';
  };

  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={cn("gap-2", className)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold">Lv.{userStats.level}</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <Flame className={cn("w-4 h-4", getStreakColor())} />
            <span className="font-semibold">{userStats.current_streak}</span>
          </div>
        </div>
      </Button>
    );
  }

  if (variant === 'vertical') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={cn(
          "p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border cursor-pointer",
          "hover:shadow-md transition-all",
          className
        )}
      >
        <div className="space-y-3">
          {/* Level */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">{userStats.level}</span>
              </div>
              {animated && userStats.current_streak > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Flame className={cn("w-5 h-5", getStreakColor())} />
                </motion.div>
              )}
            </div>
            {showLabels && (
              <p className="text-xs text-gray-600 mt-1">Level {userStats.level}</p>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <Progress value={levelProgress} className="h-2" />
            <p className="text-xs text-center text-gray-600">
              {xpInCurrentLevel}/{xpNeededForLevel} XP
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <Flame className={cn("w-4 h-4 mx-auto mb-1", getStreakColor())} />
              <p className="text-xs font-semibold">{userStats.current_streak}d</p>
              {showLabels && <p className="text-xs text-gray-500">Streak</p>}
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <Target className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <p className="text-xs font-semibold">
                {Math.round((userStats.weekly_goal_progress / userStats.weekly_goal_target) * 100)}%
              </p>
              {showLabels && <p className="text-xs text-gray-500">Weekly</p>}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Horizontal variant (default)
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border",
        "cursor-pointer hover:shadow-md transition-all",
        className
      )}
    >
      {/* Level Badge */}
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold">{userStats.level}</span>
        </div>
        {animated && levelProgress > 80 && (
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </motion.div>
        )}
      </div>

      {/* Progress and Stats */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showLabels && (
              <span className="text-sm font-medium">Level {userStats.level}</span>
            )}
            <div className="flex items-center gap-2">
              <Flame className={cn("w-4 h-4", getStreakColor())} />
              <span className="text-sm font-semibold">{userStats.current_streak}d</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <TrendingUp className="w-3 h-3" />
            <span>{xpInCurrentLevel}/{xpNeededForLevel}</span>
          </div>
        </div>
        <Progress value={levelProgress} className="h-2" />
      </div>

      {/* Action */}
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </motion.div>
  );
}