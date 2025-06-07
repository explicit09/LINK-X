'use client';

import { useState, useEffect } from 'react';
import { useGamification } from '@/contexts/GamificationContext';
import { useStudyTime } from '@/hooks/useStudyTime';
import { useDashboardOverview } from '@/hooks/useDashboardData';
import { DashboardMode } from '@/hooks/useDashboardMode';

export interface ContextualTip {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'celebration';
  icon: string;
  priority: 'low' | 'medium' | 'high';
  triggers: string[];
  dismissible: boolean;
  actionText?: string;
  actionUrl?: string;
}

export function useContextualHelp(dashboardMode: DashboardMode, userJourneyStage?: string) {
  const { userStats } = useGamification();
  const { weeklyStudyHours } = useStudyTime('week');
  const { data: dashboardData } = useDashboardOverview();
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);

  // Generate smart contextual tips based on user state
  const generateContextualTips = (): ContextualTip[] => {
    const tips: ContextualTip[] = [];
    const totalXP = userStats?.total_xp || 0;
    const courseCount = dashboardData?.totalCourses || 0;
    const currentStreak = userStats?.current_streak || 0;

    // Welcome Mode Tips
    if (dashboardMode === DashboardMode.WELCOME) {
      if (courseCount === 0) {
        tips.push({
          id: 'first-course-tip',
          title: 'Start with Your First Course',
          content: 'Adding a course unlocks AI-powered content suggestions and personalized study plans.',
          type: 'info',
          icon: '📚',
          priority: 'high',
          triggers: ['no_courses'],
          dismissible: true,
          actionText: 'Add Course',
          actionUrl: '/my-courses'
        });
      }

      if (totalXP === 0 && courseCount > 0) {
        tips.push({
          id: 'first-session-tip',
          title: 'Start Your Learning Journey',
          content: 'Begin with a 15-minute study session to earn your first XP and start building momentum!',
          type: 'info',
          icon: '🚀',
          priority: 'high',
          triggers: ['has_courses_no_xp'],
          dismissible: true,
          actionText: 'Start Session',
          actionUrl: '/study'
        });
      }
    }

    // Guided Mode Tips
    if (dashboardMode === DashboardMode.GUIDED) {
      if (currentStreak >= 3 && currentStreak < 7) {
        tips.push({
          id: 'streak-momentum-tip',
          title: 'Great Streak Building!',
          content: `You're on a ${currentStreak}-day streak! Keep going to unlock community features at 7 days.`,
          type: 'success',
          icon: '🔥',
          priority: 'medium',
          triggers: ['good_streak'],
          dismissible: true
        });
      }

      if (weeklyStudyHours >= 2 && weeklyStudyHours < 5) {
        tips.push({
          id: 'study-time-progress-tip',
          title: 'Steady Progress!',
          content: `You've studied ${weeklyStudyHours.toFixed(1)} hours this week. Reach 5 hours to unlock smart scheduling.`,
          type: 'info',
          icon: '⏰',
          priority: 'medium',
          triggers: ['moderate_study_time'],
          dismissible: true
        });
      }

      if (totalXP >= 50 && totalXP < 100) {
        tips.push({
          id: 'xp-milestone-tip',
          title: 'Halfway to AI Features!',
          content: `You've earned ${totalXP} XP! Just ${100 - totalXP} more to unlock AI study recommendations.`,
          type: 'info',
          icon: '🧠',
          priority: 'medium',
          triggers: ['halfway_to_ai'],
          dismissible: true
        });
      }
    }

    // Standard Mode Tips
    if (dashboardMode === DashboardMode.STANDARD) {
      if (totalXP >= 100 && weeklyStudyHours < 3) {
        tips.push({
          id: 'consistency-focus-tip',
          title: 'Focus on Consistency',
          content: 'You have great XP momentum! Try increasing study time consistency for better retention.',
          type: 'info',
          icon: '🎯',
          priority: 'medium',
          triggers: ['high_xp_low_time'],
          dismissible: true
        });
      }

      if (currentStreak >= 7) {
        tips.push({
          id: 'streak-master-tip',
          title: 'Streak Master!',
          content: `Amazing ${currentStreak}-day streak! You've unlocked all community features. Keep it up!`,
          type: 'celebration',
          icon: '🏆',
          priority: 'high',
          triggers: ['streak_master'],
          dismissible: true,
          actionText: 'View Community',
          actionUrl: '/community'
        });
      }
    }

    // Advanced Mode Tips
    if (dashboardMode === DashboardMode.ADVANCED) {
      const efficiency = totalXP / Math.max(weeklyStudyHours, 1);
      if (efficiency > 20) {
        tips.push({
          id: 'efficiency-master-tip',
          title: 'Efficiency Expert!',
          content: 'Your XP per hour is exceptional! Consider sharing your techniques with the community.',
          type: 'celebration',
          icon: '⚡',
          priority: 'medium',
          triggers: ['high_efficiency'],
          dismissible: true
        });
      }

      if (totalXP >= 500) {
        tips.push({
          id: 'expert-level-tip',
          title: 'Expert Level Achieved!',
          content: 'You\'ve reached expert status! Explore advanced features like peer mentoring and research mode.',
          type: 'celebration',
          icon: '👑',
          priority: 'high',
          triggers: ['expert_level'],
          dismissible: true,
          actionText: 'Explore Advanced',
          actionUrl: '/advanced-features'
        });
      }
    }

    // Time-based tips
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 11 && weeklyStudyHours === 0) {
      tips.push({
        id: 'morning-motivation-tip',
        title: 'Perfect Time to Start!',
        content: 'Morning study sessions often have the highest retention rates. Ready to begin?',
        type: 'info',
        icon: '🌅',
        priority: 'low',
        triggers: ['morning_no_study'],
        dismissible: true
      });
    }

    // Filter out dismissed tips
    return tips.filter(tip => !dismissedTips.includes(tip.id));
  };

  const dismissTip = (tipId: string) => {
    setDismissedTips(prev => [...prev, tipId]);
    // Store in localStorage for persistence
    const stored = localStorage.getItem('dismissedTips');
    const existing = stored ? JSON.parse(stored) : [];
    localStorage.setItem('dismissedTips', JSON.stringify([...existing, tipId]));
  };

  const resetDismissedTips = () => {
    setDismissedTips([]);
    localStorage.removeItem('dismissedTips');
  };

  // Load dismissed tips from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('dismissedTips');
    if (stored) {
      setDismissedTips(JSON.parse(stored));
    }
  }, []);

  const contextualTips = generateContextualTips();

  return {
    contextualTips,
    dismissTip,
    resetDismissedTips,
    hasActiveTips: contextualTips.length > 0,
    highPriorityTips: contextualTips.filter(tip => tip.priority === 'high'),
    celebrationTips: contextualTips.filter(tip => tip.type === 'celebration')
  };
}