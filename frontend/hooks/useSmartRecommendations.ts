'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUserBehavior } from '@/hooks/useUserBehavior';
import { useGamification } from '@/contexts/GamificationContext';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { DashboardMode } from '@/hooks/useDashboardMode';

export interface SmartRecommendation {
  id: string;
  type: 'action' | 'insight' | 'goal' | 'tip' | 'celebration';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: {
    label: string;
    url?: string;
    callback?: () => void;
  };
  icon: string;
  color: string;
  expiresAt?: Date;
  conditions?: {
    minXP?: number;
    minStreak?: number;
    dashboardMode?: DashboardMode[];
    timeOfDay?: { start: number; end: number };
    daysOfWeek?: string[];
  };
}

export function useSmartRecommendations() {
  const { behaviorPattern, smartDefaults } = useUserBehavior();
  const { userStats } = useGamification();
  const { mode, config } = useDashboardMode();
  
  const [activeRecommendations, setActiveRecommendations] = useState<SmartRecommendation[]>([]);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);

  // Generate time-based recommendations
  const timeBasedRecommendations = useMemo((): SmartRecommendation[] => {
    const recommendations: SmartRecommendation[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });

    // Morning motivation (6 AM - 10 AM)
    if (currentHour >= 6 && currentHour < 10) {
      recommendations.push({
        id: 'morning-motivation',
        type: 'tip',
        priority: 'medium',
        title: 'Start Your Day with Learning! ☀️',
        description: 'Morning sessions have 23% higher retention rates. Perfect time to tackle challenging topics!',
        icon: '🌅',
        color: 'yellow',
        conditions: {
          timeOfDay: { start: 6, end: 10 }
        }
      });
    }

    // Lunch break reminder (12 PM - 1 PM)
    if (currentHour >= 12 && currentHour < 13) {
      recommendations.push({
        id: 'lunch-micro-session',
        type: 'action',
        priority: 'low',
        title: 'Quick 10-Minute Session? 🍽️',
        description: 'Micro-learning during breaks reinforces memory. Review your notes!',
        action: {
          label: 'Start Quick Review',
          url: '/study/quick'
        },
        icon: '⚡',
        color: 'blue',
        conditions: {
          timeOfDay: { start: 12, end: 13 }
        }
      });
    }

    // Evening wind-down (8 PM - 10 PM)
    if (currentHour >= 20 && currentHour < 22) {
      recommendations.push({
        id: 'evening-review',
        type: 'action',
        priority: 'medium',
        title: 'Evening Review Time 🌙',
        description: 'Perfect time for spaced repetition. Review today\'s materials for better retention.',
        action: {
          label: 'Review Today\'s Content',
          url: '/review'
        },
        icon: '📚',
        color: 'purple',
        conditions: {
          timeOfDay: { start: 20, end: 22 }
        }
      });
    }

    // Weekend special
    if (currentDay === 'Saturday' || currentDay === 'Sunday') {
      recommendations.push({
        id: 'weekend-challenge',
        type: 'goal',
        priority: 'medium',
        title: 'Weekend Learning Challenge! 🏆',
        description: 'Maintain your streak with a focused weekend session. Double XP available!',
        icon: '🎯',
        color: 'green',
        conditions: {
          daysOfWeek: ['Saturday', 'Sunday']
        }
      });
    }

    return recommendations;
  }, []);

  // Generate behavior-based recommendations
  const behaviorBasedRecommendations = useMemo((): SmartRecommendation[] => {
    if (!behaviorPattern || !userStats) return [];

    const recommendations: SmartRecommendation[] = [];

    // Optimal study time recommendation
    if (behaviorPattern.preferredStudyTimes.length > 0) {
      const topTime = behaviorPattern.preferredStudyTimes[0];
      const currentHour = new Date().getHours();
      
      if (Math.abs(currentHour - topTime.hour) <= 1) {
        recommendations.push({
          id: 'optimal-time-alert',
          type: 'action',
          priority: 'high',
          title: 'Your Peak Performance Time! 🚀',
          description: `You're ${topTime.effectiveness.toFixed(1)}x more effective at this hour. Start a session now!`,
          action: {
            label: 'Start Focused Session',
            url: '/study'
          },
          icon: '⏰',
          color: 'green',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });
      }
    }

    // Streak maintenance
    if (userStats.current_streak >= 3) {
      const hasStudiedToday = behaviorPattern.studySessionPatterns.frequencyPerWeek > 0; // TODO: Check actual today's sessions
      
      if (!hasStudiedToday) {
        recommendations.push({
          id: 'streak-maintenance',
          type: 'action',
          priority: 'urgent',
          title: `Don't Break Your ${userStats.current_streak}-Day Streak! 🔥`,
          description: 'Just 10 minutes to maintain your momentum. You\'ve come too far to stop now!',
          action: {
            label: 'Keep Streak Alive',
            url: '/study'
          },
          icon: '🔥',
          color: 'orange',
          conditions: {
            minStreak: 3
          }
        });
      }
    }

    // Learning style optimization
    if (behaviorPattern.learningStyle.prefersPDF && config.coursesCount > 0) {
      recommendations.push({
        id: 'content-preference',
        type: 'tip',
        priority: 'low',
        title: 'PDF Materials Available 📄',
        description: 'Based on your preferences, we\'ve highlighted PDF resources in your courses.',
        icon: '📑',
        color: 'blue'
      });
    }

    // Progress velocity insights
    if (behaviorPattern.progressVelocity.weeklyGrowthRate > 20) {
      recommendations.push({
        id: 'growth-celebration',
        type: 'celebration',
        priority: 'high',
        title: `${behaviorPattern.progressVelocity.weeklyGrowthRate.toFixed(0)}% Weekly Growth! 🎉`,
        description: 'Your learning velocity is exceptional. You\'re in the top 10% of learners!',
        icon: '🏅',
        color: 'yellow'
      });
    } else if (behaviorPattern.progressVelocity.weeklyGrowthRate < -10) {
      recommendations.push({
        id: 'velocity-boost',
        type: 'action',
        priority: 'medium',
        title: 'Boost Your Learning Momentum 📈',
        description: 'Your progress has slowed. Try shorter, more frequent sessions.',
        action: {
          label: 'View Study Tips',
          url: '/tips'
        },
        icon: '💡',
        color: 'purple'
      });
    }

    // Subject-specific recommendations
    if (behaviorPattern.coursePreferences.favoriteSubjects.length > 0) {
      const topSubject = behaviorPattern.coursePreferences.favoriteSubjects[0];
      recommendations.push({
        id: 'subject-recommendation',
        type: 'insight',
        priority: 'medium',
        title: `Excel in ${topSubject} 🌟`,
        description: `You show strong engagement with ${topSubject}. Consider advanced materials!`,
        action: {
          label: 'Explore Advanced Topics',
          url: `/courses?subject=${topSubject}&level=advanced`
        },
        icon: '🎓',
        color: 'purple'
      });
    }

    return recommendations;
  }, [behaviorPattern, userStats, config]);

  // Generate milestone-based recommendations
  const milestoneRecommendations = useMemo((): SmartRecommendation[] => {
    if (!userStats) return [];

    const recommendations: SmartRecommendation[] = [];
    const totalXP = userStats.total_xp || 0;
    const level = Math.floor(totalXP / 100);

    // Level milestone celebrations
    const xpToNextLevel = (level + 1) * 100 - totalXP;
    if (xpToNextLevel <= 10) {
      recommendations.push({
        id: 'near-level-up',
        type: 'action',
        priority: 'high',
        title: `Only ${xpToNextLevel} XP to Level ${level + 1}! 🎯`,
        description: 'You\'re so close! Complete one more session to level up.',
        action: {
          label: 'Level Up Now',
          url: '/study'
        },
        icon: '⬆️',
        color: 'green',
        conditions: {
          minXP: totalXP
        }
      });
    }

    // Streak milestones
    const streak = userStats.current_streak || 0;
    if (streak === 6) {
      recommendations.push({
        id: 'week-streak',
        type: 'goal',
        priority: 'high',
        title: 'One More Day for Weekly Streak! 📅',
        description: 'Complete today\'s session to achieve a full week of consistent learning!',
        icon: '🏆',
        color: 'yellow',
        conditions: {
          minStreak: 6
        }
      });
    } else if (streak === 29) {
      recommendations.push({
        id: 'month-streak',
        type: 'goal',
        priority: 'urgent',
        title: 'Monthly Streak Within Reach! 🌟',
        description: 'One more day to achieve the legendary 30-day streak!',
        icon: '👑',
        color: 'purple',
        conditions: {
          minStreak: 29
        }
      });
    }

    // First achievements
    if (totalXP === 0 && config.coursesCount > 0) {
      recommendations.push({
        id: 'first-xp',
        type: 'action',
        priority: 'urgent',
        title: 'Earn Your First XP! 🎈',
        description: 'Start your learning journey with a quick 10-minute session.',
        action: {
          label: 'Begin Learning',
          url: '/study'
        },
        icon: '🚀',
        color: 'blue'
      });
    }

    return recommendations;
  }, [userStats, config]);

  // Generate mode-specific recommendations
  const modeSpecificRecommendations = useMemo((): SmartRecommendation[] => {
    const recommendations: SmartRecommendation[] = [];

    switch (mode) {
      case DashboardMode.WELCOME:
        recommendations.push({
          id: 'welcome-guide',
          type: 'action',
          priority: 'high',
          title: 'Complete Your Setup 🎯',
          description: 'Finish setting up your profile to unlock personalized learning features.',
          action: {
            label: 'Complete Setup',
            url: '/onboarding'
          },
          icon: '✅',
          color: 'blue',
          conditions: {
            dashboardMode: [DashboardMode.WELCOME]
          }
        });
        break;

      case DashboardMode.GUIDED:
        if (smartDefaults.length > 0) {
          const topDefault = smartDefaults[0];
          recommendations.push({
            id: 'smart-schedule-suggestion',
            type: 'action',
            priority: 'medium',
            title: 'Personalized Schedule Ready! 📅',
            description: topDefault.reason,
            action: {
              label: 'Set Up Schedule',
              url: '/schedule/setup'
            },
            icon: '🗓️',
            color: 'green',
            conditions: {
              dashboardMode: [DashboardMode.GUIDED]
            }
          });
        }
        break;

      case DashboardMode.STANDARD:
        recommendations.push({
          id: 'explore-advanced',
          type: 'tip',
          priority: 'low',
          title: 'Unlock Advanced Features 🔓',
          description: 'You\'re close to accessing leaderboards and peer learning!',
          icon: '🎖️',
          color: 'purple',
          conditions: {
            dashboardMode: [DashboardMode.STANDARD]
          }
        });
        break;

      case DashboardMode.ADVANCED:
        recommendations.push({
          id: 'mentor-opportunity',
          type: 'action',
          priority: 'medium',
          title: 'Become a Peer Mentor 🤝',
          description: 'Share your expertise and help other learners succeed.',
          action: {
            label: 'Join Mentor Program',
            url: '/community/mentors'
          },
          icon: '🌟',
          color: 'yellow',
          conditions: {
            dashboardMode: [DashboardMode.ADVANCED]
          }
        });
        break;
    }

    return recommendations;
  }, [mode, smartDefaults]);

  // Combine and filter recommendations
  useEffect(() => {
    const allRecommendations = [
      ...timeBasedRecommendations,
      ...behaviorBasedRecommendations,
      ...milestoneRecommendations,
      ...modeSpecificRecommendations
    ];

    // Filter by conditions and remove dismissed
    const filtered = allRecommendations.filter(rec => {
      // Check if dismissed
      if (dismissedRecommendations.includes(rec.id)) return false;

      // Check expiration
      if (rec.expiresAt && new Date() > rec.expiresAt) return false;

      // Check conditions
      if (rec.conditions) {
        const { minXP, minStreak, dashboardMode, timeOfDay, daysOfWeek } = rec.conditions;
        
        if (minXP && (userStats?.total_xp || 0) < minXP) return false;
        if (minStreak && (userStats?.current_streak || 0) < minStreak) return false;
        if (dashboardMode && !dashboardMode.includes(mode)) return false;
        
        if (timeOfDay) {
          const currentHour = new Date().getHours();
          if (currentHour < timeOfDay.start || currentHour >= timeOfDay.end) return false;
        }
        
        if (daysOfWeek) {
          const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          if (!daysOfWeek.includes(currentDay)) return false;
        }
      }

      return true;
    });

    // Sort by priority
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    setActiveRecommendations(filtered);
  }, [
    timeBasedRecommendations,
    behaviorBasedRecommendations,
    milestoneRecommendations,
    modeSpecificRecommendations,
    dismissedRecommendations,
    userStats,
    mode
  ]);

  // Load dismissed recommendations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dismissedRecommendations');
    if (saved) {
      try {
        setDismissedRecommendations(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load dismissed recommendations:', error);
      }
    }
  }, []);

  const dismissRecommendation = (id: string) => {
    const updated = [...dismissedRecommendations, id];
    setDismissedRecommendations(updated);
    localStorage.setItem('dismissedRecommendations', JSON.stringify(updated));
  };

  const resetDismissed = () => {
    setDismissedRecommendations([]);
    localStorage.removeItem('dismissedRecommendations');
  };

  return {
    recommendations: activeRecommendations,
    dismissRecommendation,
    resetDismissed,
    hasUrgentRecommendations: activeRecommendations.some(r => r.priority === 'urgent'),
    topRecommendation: activeRecommendations[0] || null
  };
}