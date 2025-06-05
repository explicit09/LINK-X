'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Flame, Calendar, TrendingUp, AlertCircle, 
  CheckCircle2, Lock, Sparkles 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGamification } from '@/contexts/GamificationContext';

interface StreakMilestone {
  days: number;
  reward: number;
  title: string;
  icon: React.ReactNode;
}

const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, reward: 10, title: "Getting Started", icon: <Sparkles className="w-4 h-4" /> },
  { days: 7, reward: 25, title: "Week Warrior", icon: <Calendar className="w-4 h-4" /> },
  { days: 14, reward: 50, title: "Fortnight Fighter", icon: <TrendingUp className="w-4 h-4" /> },
  { days: 30, reward: 100, title: "Monthly Master", icon: <Flame className="w-4 h-4" /> },
  { days: 60, reward: 200, title: "Dedicated Learner", icon: <CheckCircle2 className="w-4 h-4" /> },
  { days: 100, reward: 500, title: "Century Champion", icon: <Lock className="w-4 h-4" /> },
];

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak?: number;
  lastActivityDate?: string;
  compact?: boolean;
  className?: string;
}

export function StreakTracker({
  currentStreak,
  longestStreak = 0,
  lastActivityDate,
  compact = false,
  className
}: StreakTrackerProps) {
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const { awardXP } = useGamification();

  // Check if streak is at risk
  useEffect(() => {
    if (!lastActivityDate) return;

    const checkStreakStatus = () => {
      const lastActivity = new Date(lastActivityDate);
      const now = new Date();
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      // Streak is at risk if more than 20 hours since last activity
      setStreakAtRisk(hoursSinceActivity > 20);
      
      // Calculate time until streak reset (24 hours)
      if (hoursSinceActivity < 24) {
        const hoursRemaining = Math.floor(24 - hoursSinceActivity);
        const minutesRemaining = Math.floor((24 - hoursSinceActivity - hoursRemaining) * 60);
        setTimeUntilReset(`${hoursRemaining}h ${minutesRemaining}m`);
      } else {
        setTimeUntilReset('Expired');
      }
    };

    checkStreakStatus();
    const interval = setInterval(checkStreakStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastActivityDate]);

  // Get next milestone
  const nextMilestone = STREAK_MILESTONES.find(m => m.days > currentStreak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const previousMilestone = [...STREAK_MILESTONES].reverse().find(m => m.days <= currentStreak);
  const progressToNextMilestone = previousMilestone 
    ? ((currentStreak - previousMilestone.days) / (nextMilestone.days - previousMilestone.days)) * 100
    : (currentStreak / nextMilestone.days) * 100;

  // Get flame color based on streak
  const getFlameColor = () => {
    if (currentStreak >= 30) return 'text-orange-500';
    if (currentStreak >= 7) return 'text-yellow-500';
    return 'text-gray-400';
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <Flame className={cn("w-5 h-5 transition-colors", getFlameColor())} />
          {currentStreak > 0 && (
            <motion.div
              className="absolute -inset-1"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Flame className={cn("w-5 h-5", getFlameColor())} />
            </motion.div>
          )}
        </div>
        <span className="font-semibold">{currentStreak}</span>
        {streakAtRisk && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Study Streak</span>
          {streakAtRisk && (
            <Badge variant="destructive" className="animate-pulse">
              At Risk!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.div
                animate={{ scale: currentStreak > 0 ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className={cn("w-12 h-12", getFlameColor())} />
              </motion.div>
              {currentStreak > 0 && (
                <motion.div
                  className="absolute inset-0"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Flame className={cn("w-12 h-12", getFlameColor())} />
                </motion.div>
              )}
            </div>
            <div>
              <div className="text-3xl font-bold">{currentStreak} days</div>
              <div className="text-sm text-gray-500">
                {currentStreak === 0 
                  ? "Start your streak today!"
                  : streakAtRisk 
                    ? `${timeUntilReset} to maintain`
                    : "Keep it going!"}
              </div>
            </div>
          </div>
          
          {longestStreak > 0 && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Longest</div>
              <div className="font-semibold">{longestStreak} days</div>
            </div>
          )}
        </div>

        {/* Milestone Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Next milestone</span>
            <span className="font-medium">{nextMilestone.days} days</span>
          </div>
          <Progress value={Math.min(progressToNextMilestone, 100)} className="h-2" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{currentStreak} days</span>
            <span>{nextMilestone.days - currentStreak} days to go</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Milestones</h4>
          <div className="grid grid-cols-3 gap-2">
            {STREAK_MILESTONES.slice(0, 6).map((milestone) => {
              const isAchieved = currentStreak >= milestone.days;
              const isNext = milestone.days === nextMilestone.days;
              
              return (
                <motion.div
                  key={milestone.days}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative p-3 rounded-lg border text-center cursor-pointer transition-all",
                    isAchieved 
                      ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                      : isNext
                        ? "bg-blue-50 border-blue-300 text-blue-800 animate-pulse"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    {milestone.icon}
                    <span className="text-xs font-medium">{milestone.days}d</span>
                    <span className="text-xs">+{milestone.reward}XP</span>
                  </div>
                  {isAchieved && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Streak Tips */}
        <AnimatePresence mode="wait">
          {streakAtRisk && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    Don't lose your streak!
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Complete any learning activity in the next {timeUntilReset} to maintain your {currentStreak}-day streak.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}