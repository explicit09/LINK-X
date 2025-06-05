'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGamification } from '@/contexts/GamificationContext';
import { XPBar } from './XPBar';
import { StreakTracker } from './StreakTracker';
import { WeeklyGoals } from './WeeklyGoals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Trophy, Target, Flame, BarChart3, Award,
  ChevronRight, Sparkles, TrendingUp
} from 'lucide-react';

interface GamificationDashboardProps {
  view?: 'full' | 'compact' | 'minimal';
  className?: string;
  showXPBar?: boolean;
  showStreak?: boolean;
  showGoals?: boolean;
  showStats?: boolean;
}

export function GamificationDashboard({
  view = 'full',
  className,
  showXPBar = true,
  showStreak = true,
  showGoals = true,
  showStats = true
}: GamificationDashboardProps) {
  const { userStats, isLoading } = useGamification();
  const [previousXP, setPreviousXP] = useState<number | undefined>();

  // Simulate XP gain for demo
  const simulateXPGain = () => {
    if (userStats) {
      setPreviousXP(userStats.total_xp);
      // This would normally happen through actual user actions
      // For demo, we'll just show the animation
      setTimeout(() => {
        setPreviousXP(undefined);
      }, 2000);
    }
  };

  if (isLoading || !userStats) {
    return (
      <div className={cn("space-y-4 animate-pulse", className)}>
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  // Calculate level boundaries
  const calculateLevelXP = (level: number) => Math.floor(100 * Math.pow(level, 1.5));
  const currentLevelXP = userStats.level > 1 ? calculateLevelXP(userStats.level - 1) : 0;
  const nextLevelXP = calculateLevelXP(userStats.level);
  const xpInCurrentLevel = userStats.total_xp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;

  if (view === 'minimal') {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        {showXPBar && (
          <XPBar
            currentXP={xpInCurrentLevel}
            requiredXP={xpNeededForLevel}
            level={userStats.level}
            previousXP={previousXP ? xpInCurrentLevel - (userStats.total_xp - previousXP) : undefined}
            compact
          />
        )}
        {showStreak && (
          <StreakTracker
            currentStreak={userStats.current_streak}
            lastActivityDate={userStats.last_activity}
            compact
          />
        )}
      </div>
    );
  }

  if (view === 'compact') {
    return (
      <Card className={className}>
        <CardContent className="p-4 space-y-4">
          {showXPBar && (
            <XPBar
              currentXP={xpInCurrentLevel}
              requiredXP={xpNeededForLevel}
              level={userStats.level}
              previousXP={previousXP ? xpInCurrentLevel - (userStats.total_xp - previousXP) : undefined}
            />
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {showStreak && (
              <StreakTracker
                currentStreak={userStats.current_streak}
                lastActivityDate={userStats.last_activity}
                compact
              />
            )}
            {showGoals && (
              <WeeklyGoals
                weeklyXPGoal={userStats.weekly_goal_target}
                currentWeeklyXP={userStats.weekly_goal_progress}
                compact
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <div className={cn("space-y-6", className)}>
      {/* XP and Level Progress */}
      {showXPBar && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span>Progress & Level</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={simulateXPGain}
                  className="text-xs"
                >
                  Simulate XP Gain
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <XPBar
                currentXP={xpInCurrentLevel}
                requiredXP={xpNeededForLevel}
                level={userStats.level}
                previousXP={previousXP ? xpInCurrentLevel - (userStats.total_xp - previousXP) : undefined}
                showAnimation
              />
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {userStats.total_xp.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Total XP</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    #{userStats.rank || '—'}
                  </div>
                  <div className="text-xs text-gray-600">Global Rank</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {userStats.achievements_count || 0}
                  </div>
                  <div className="text-xs text-gray-600">Achievements</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showStreak && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <StreakTracker
                  currentStreak={userStats.current_streak}
                  longestStreak={userStats.longest_streak}
                  lastActivityDate={userStats.last_activity}
                />
              </motion.div>
            )}
            
            {showGoals && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <WeeklyGoals
                  weeklyXPGoal={userStats.weekly_goal_target}
                  currentWeeklyXP={userStats.weekly_goal_progress}
                />
              </motion.div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <WeeklyGoals
            weeklyXPGoal={userStats.weekly_goal_target}
            currentWeeklyXP={userStats.weekly_goal_progress}
            customGoals={[
              {
                id: 'daily-login',
                type: 'xp',
                target: 7,
                current: userStats.weekly_login_days || 0,
                title: 'Daily Logins',
                description: 'Log in every day this week',
                icon: <Sparkles className="w-4 h-4" />,
                reward: 50
              },
              {
                id: 'help-peers',
                type: 'chats',
                target: 10,
                current: userStats.weekly_help_given || 0,
                title: 'Help Others',
                description: 'Answer questions in chat',
                icon: <Award className="w-4 h-4" />,
                reward: 75
              }
            ]}
          />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {showStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <span>Learning Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">This Week</p>
                    <p className="text-2xl font-bold">{userStats.weekly_goal_progress} XP</p>
                    <p className="text-xs text-gray-500">
                      {((userStats.weekly_goal_progress / userStats.weekly_goal_target) * 100).toFixed(0)}% of goal
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Study Time</p>
                    <p className="text-2xl font-bold">{Math.floor((userStats.weekly_time_spent || 0) / 60)}h</p>
                    <p className="text-xs text-gray-500">This week</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Files Viewed</p>
                    <p className="text-2xl font-bold">{userStats.weekly_files_viewed || 0}</p>
                    <p className="text-xs text-gray-500">This week</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold">{userStats.completion_rate || 0}%</p>
                    <p className="text-xs text-gray-500">All time</p>
                  </div>
                </div>

                {/* Weekly Activity Chart (placeholder) */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Activity</h4>
                  <div className="flex items-end justify-between gap-1 h-20">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                      const height = Math.random() * 100; // Replace with actual data
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: index * 0.1 }}
                            className="w-full bg-blue-500 rounded-t"
                          />
                          <span className="text-xs text-gray-500">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}