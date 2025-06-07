'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Target, Trophy, ChevronRight, Plus, Minus,
  BookOpen, FileText, MessageSquare, Clock,
  Zap, TrendingUp, Award, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/contexts/GamificationContext';
import { gamificationAPI, type WeeklyGoalsData } from '@/lib/api/endpoints/gamification';
import { toast } from 'sonner';

interface Goal {
  id: string;
  type: 'xp' | 'files' | 'time' | 'modules' | 'chats';
  target: number;
  current: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  reward: number;
}

interface WeeklyGoalsProps {
  compact?: boolean;
  className?: string;
}

export function WeeklyGoals({
  compact = false,
  className
}: WeeklyGoalsProps) {
  const { userStats, awardXP } = useGamification();
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [showAllGoals, setShowAllGoals] = useState(!compact);
  const [weeklyData, setWeeklyData] = useState<WeeklyGoalsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load weekly goals data
  useEffect(() => {
    const fetchWeeklyGoals = async () => {
      try {
        console.log('[WeeklyGoals] Fetching weekly goals data...');
        const data = await gamificationAPI.getWeeklyGoals();
        console.log('[WeeklyGoals] Weekly goals data:', data);
        setWeeklyData(data);
      } catch (error) {
        console.error('[WeeklyGoals] Failed to fetch weekly goals:', error);
        // Provide fallback data
        setWeeklyData({
          weekly_goal_target: userStats?.weekly_goal_target || 500,
          weekly_goal_progress: userStats?.weekly_goal_progress || 0,
          progress_percentage: 0,
          days_remaining: 7,
          daily_target: 71,
          week_start: new Date().toISOString(),
          week_end: new Date().toISOString(),
          daily_progress: [],
          is_goal_achieved: false
        });
      } finally {
        setLoading(false);
      }
    };

    if (userStats) {
      fetchWeeklyGoals();
    }
  }, [userStats]);

  if (loading || !weeklyData) {
    return <div className="animate-pulse bg-gray-200 rounded-lg h-48"></div>;
  }

  const daysRemaining = weeklyData.days_remaining;
  const weeklyProgress = weeklyData.progress_percentage;
  const dailyTarget = weeklyData.daily_target;
  const weeklyXPGoal = weeklyData.weekly_goal_target;
  const currentWeeklyXP = weeklyData.weekly_goal_progress;

  // Default goals if none provided
  const defaultGoals: Goal[] = [
    {
      id: 'xp',
      type: 'xp',
      target: weeklyXPGoal,
      current: currentWeeklyXP,
      title: 'Weekly XP',
      description: 'Earn XP from any activity',
      icon: <Zap className="w-4 h-4" />,
      reward: 100
    },
    {
      id: 'files',
      type: 'files',
      target: 20,
      current: userStats?.weekly_files_viewed || 0,
      title: 'Study Materials',
      description: 'View course files',
      icon: <FileText className="w-4 h-4" />,
      reward: 50
    },
    {
      id: 'time',
      type: 'time',
      target: 300, // 5 hours in minutes
      current: userStats?.weekly_time_spent || 0,
      title: 'Study Time',
      description: 'Active learning time',
      icon: <Clock className="w-4 h-4" />,
      reward: 75
    },
    {
      id: 'modules',
      type: 'modules',
      target: 3,
      current: 0, // TODO: Implement weekly_modules_completed in UserStats
      title: 'Complete Modules',
      description: 'Finish course modules',
      icon: <BookOpen className="w-4 h-4" />,
      reward: 150
    }
  ];

  const goals = defaultGoals;
  const completedGoals = goals.filter((g: Goal) => g.current >= g.target).length;
  const totalGoals = goals.length;

  // Award bonus XP for completing all goals
  useEffect(() => {
    if (completedGoals === totalGoals && totalGoals > 0) {
      const hasClaimedBonus = localStorage.getItem('weekly-goals-bonus-claimed');
      const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
      
      if (hasClaimedBonus !== weekNumber.toString()) {
        toast.success('🎉 All weekly goals completed! +200 XP Bonus!');
        awardXP('WEEKLY_GOALS_COMPLETE' as any, { bonus: true });
        localStorage.setItem('weekly-goals-bonus-claimed', weekNumber.toString());
      }
    }
  }, [completedGoals, totalGoals, awardXP]);

  const adjustGoal = async (goalId: string, adjustment: number) => {
    if (goalId === 'xp') {
      // Update weekly XP goal
      const newTarget = Math.max(100, weeklyXPGoal + adjustment);
      try {
        await gamificationAPI.updateWeeklyGoal(newTarget);
        // Refresh the data
        const updatedData = await gamificationAPI.getWeeklyGoals();
        setWeeklyData(updatedData);
        toast.success(`Weekly XP goal updated to ${newTarget}`);
      } catch (error) {
        console.error('Failed to update weekly goal:', error);
        toast.error('Failed to update goal');
      }
    }
    // Other goals are placeholders for now
  };

  if (compact) {
    return (
      <div 
        className={cn("bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow", className)}
        onClick={() => setShowAllGoals(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-purple-500" />
            <div>
              <div className="font-medium">Weekly Goals</div>
              <div className="text-sm text-gray-500">
                {completedGoals}/{totalGoals} completed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(completedGoals / totalGoals) * 100} className="w-20 h-2" />
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            <span>Weekly Goals</span>
          </div>
          <Badge variant={daysRemaining <= 1 ? "destructive" : "secondary"}>
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold text-purple-600">
              {completedGoals}/{totalGoals} Goals
            </span>
          </div>
          <Progress 
            value={(completedGoals / totalGoals) * 100} 
            className="h-3 bg-purple-100" 
          />
          {completedGoals === totalGoals && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-center gap-2 text-sm text-purple-600 font-medium"
            >
              <Trophy className="w-4 h-4" />
              All goals completed! +200 XP Bonus!
            </motion.div>
          )}
        </div>

        {/* Individual Goals */}
        <div className="space-y-3">
          {goals.map((goal: Goal) => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            const isCompleted = goal.current >= goal.target;
            const isEditing = editingGoal === goal.id;

            return (
              <motion.div
                key={goal.id}
                layout
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  isCompleted 
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20" 
                    : "bg-gray-50 border-gray-200 dark:bg-gray-800"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                    )}>
                      {goal.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{goal.title}</h4>
                      <p className="text-xs text-gray-500">{goal.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      +{goal.reward} XP
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {goal.current}/{goal.target} {goal.type === 'time' ? 'min' : ''}
                    </span>
                    {goal.id === 'xp' && !isCompleted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setEditingGoal(isEditing ? null : goal.id)}
                      >
                        {isEditing ? 'Done' : 'Adjust'}
                      </Button>
                    )}
                  </div>
                  
                  <Progress value={progress} className="h-2" />
                  
                  {/* Goal Editor */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-center gap-2 pt-2"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => adjustGoal(goal.id, -5)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-16 text-center">
                          {goal.target}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => adjustGoal(goal.id, 5)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Daily Target Suggestion */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <div className="text-sm">
              <span className="font-medium text-blue-700">Daily Target: </span>
              <span className="text-blue-600">
                Earn {dailyTarget} XP per day to reach your weekly goal
              </span>
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        {daysRemaining <= 2 && completedGoals < totalGoals && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <p className="text-sm text-amber-700">
                Final push! Complete {totalGoals - completedGoals} more goal{totalGoals - completedGoals > 1 ? 's' : ''} for the weekly bonus!
              </p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}