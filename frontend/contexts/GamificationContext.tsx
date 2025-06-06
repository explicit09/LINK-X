'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// XP action types with amounts and cooldowns (in seconds)
export const XP_ACTIONS = {
  FILE_VIEW: { xp: 2, cooldown: 300, message: 'Viewed a file' },
  FILE_DOWNLOAD: { xp: 1, cooldown: 0, message: 'Downloaded a file' },
  CHAT_MESSAGE: { xp: 3, cooldown: 60, message: 'Sent a message' },
  TODO_COMPLETE: { xp: 10, cooldown: 0, message: 'Completed a task' },
  MODULE_COMPLETE: { xp: 50, cooldown: 0, message: 'Completed a module!' },
  COURSE_ENROLL: { xp: 20, cooldown: 0, message: 'Enrolled in a course' },
  DAILY_LOGIN: { xp: 5, cooldown: 86400, message: 'Daily login bonus!' },
  STUDY_STREAK: { xp: 15, cooldown: 86400, message: 'Study streak bonus!' },
  QUIZ_COMPLETE: { xp: 15, cooldown: 0, message: 'Completed a quiz' },
  ASSIGNMENT_SUBMIT: { xp: 25, cooldown: 0, message: 'Submitted an assignment' },
  HELP_PEER: { xp: 5, cooldown: 300, message: 'Helped a peer' },
  RESOURCE_SHARE: { xp: 8, cooldown: 600, message: 'Shared a resource' },
  PERSONALIZE_CONTENT: { xp: 5, cooldown: 180, message: 'Personalized content' },
  COMPLETE_READING: { xp: 7, cooldown: 0, message: 'Completed reading' },
  WATCH_VIDEO: { xp: 5, cooldown: 0, message: 'Watched a video' }
} as const;

export type XPActionType = keyof typeof XP_ACTIONS;

interface UserStats {
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  weekly_goal_progress: number;
  weekly_goal_target: number;
  last_activity: string;
  achievements_count: number;
  rank?: number;
  next_level_xp: number;
  current_level_xp: number;
  longest_streak?: number;
  weekly_login_days?: number;
  weekly_help_given?: number;
  weekly_time_spent?: number;
  weekly_files_viewed?: number;
  completion_rate?: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  xp_reward: number;
}

interface XPAnimation {
  id: string;
  amount: number;
  action: string;
  timestamp: number;
}

interface GamificationContextType {
  // State
  userStats: UserStats | null;
  achievements: Achievement[];
  isLoading: boolean;
  
  // Actions
  awardXP: (action: XPActionType, metadata?: Record<string, any>) => Promise<void>;
  refreshStats: () => Promise<void>;
  checkAchievements: () => Promise<void>;
  
  // UI State
  pendingAnimations: XPAnimation[];
  clearAnimation: (id: string) => void;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

// Local storage for cooldowns
const COOLDOWN_STORAGE_KEY = 'learn-x-xp-cooldowns';

interface CooldownData {
  [key: string]: number; // action -> timestamp
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthUser();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAnimations, setPendingAnimations] = useState<XPAnimation[]>([]);
  const [cooldowns, setCooldowns] = useState<CooldownData>({});

  // Load cooldowns from local storage
  useEffect(() => {
    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (stored) {
      try {
        setCooldowns(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load cooldowns:', e);
      }
    }
  }, []);

  // Save cooldowns to local storage
  useEffect(() => {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
  }, [cooldowns]);

  // Check if action is on cooldown
  const isOnCooldown = useCallback((action: XPActionType): boolean => {
    const actionConfig = XP_ACTIONS[action];
    if (!actionConfig.cooldown) return false;
    
    const lastUsed = cooldowns[action];
    if (!lastUsed) return false;
    
    const now = Date.now();
    const cooldownEnd = lastUsed + (actionConfig.cooldown * 1000);
    return now < cooldownEnd;
  }, [cooldowns]);

  // Get remaining cooldown time
  const getRemainingCooldown = useCallback((action: XPActionType): number => {
    const actionConfig = XP_ACTIONS[action];
    if (!actionConfig.cooldown) return 0;
    
    const lastUsed = cooldowns[action];
    if (!lastUsed) return 0;
    
    const now = Date.now();
    const cooldownEnd = lastUsed + (actionConfig.cooldown * 1000);
    return Math.max(0, cooldownEnd - now);
  }, [cooldowns]);

  // Load initial stats
  useEffect(() => {
    if (user?.id) {
      refreshStats();
      checkAchievements();
      
      // Check for daily login bonus
      const lastLogin = localStorage.getItem('learn-x-last-login');
      const today = new Date().toDateString();
      if (lastLogin !== today) {
        localStorage.setItem('learn-x-last-login', today);
        awardXP('DAILY_LOGIN');
      }
    }
  }, [user?.id]);

  const refreshStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await api.get('/api/v2/gamification/stats');
      if (response.data.status === 'success') {
        const data = response.data.data;
        // Map backend response to frontend interface
        const stats: UserStats = {
          user_id: user.id,
          total_xp: data.totalXP || data.total_xp || 0,
          level: data.currentLevel || data.current_level || 1,
          current_streak: data.dailyStreak || data.daily_streak || 0,
          weekly_goal_progress: data.weeklyProgress || data.weekly_progress || 0,
          weekly_goal_target: data.weeklyGoal || data.weekly_goal || 500,
          last_activity: new Date().toISOString(), // Backend doesn't return this yet
          achievements_count: 0, // Will be set from achievements endpoint
          rank: data.rank,
          next_level_xp: data.xpToNextLevel || data.xp_to_next_level || 100,
          current_level_xp: data.currentXP || data.current_xp || 0,
          longest_streak: data.maxStreak || data.max_streak || 0,
          // Additional stats for dashboard
          weekly_login_days: 0, // TODO: Calculate from activities
          weekly_help_given: 0, // TODO: Calculate from activities
          weekly_time_spent: 0, // TODO: Calculate from activities
          weekly_files_viewed: 0, // TODO: Calculate from activities
          completion_rate: 0 // TODO: Calculate from course progress
        };
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const checkAchievements = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await api.get('/api/v2/gamification/achievements');
      if (response.data.status === 'success') {
        const achievementsData = response.data.data.achievements || response.data.data || [];
        
        // Map backend response to frontend Achievement interface
        const mappedAchievements: Achievement[] = achievementsData.map((a: any) => ({
          id: a.id,
          name: a.name || a.achievement_name,
          description: a.description,
          icon: a.icon || '🏆',
          earned_at: a.earned_at,
          xp_reward: a.xp_reward || 0
        }));
        
        // Find new achievements
        const newAchievements = mappedAchievements.filter(
          (achievement: Achievement) => !achievements.find(a => a.id === achievement.id)
        );
        
        // Show notifications for new achievements
        newAchievements.forEach((achievement: Achievement) => {
          toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
            description: achievement.description,
            duration: 5000,
          });
        });
        
        setAchievements(mappedAchievements);
        
        // Update achievement count in stats
        setUserStats(prev => prev ? { ...prev, achievements_count: mappedAchievements.length } : null);
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  }, [user?.id, achievements]);

  const awardXP = useCallback(async (action: XPActionType, metadata?: Record<string, any>) => {
    if (!user?.id) return;
    
    // Check cooldown
    if (isOnCooldown(action)) {
      const remaining = Math.ceil(getRemainingCooldown(action) / 1000);
      console.log(`Action ${action} on cooldown for ${remaining}s`);
      return;
    }
    
    const actionConfig = XP_ACTIONS[action];
    
    try {
      // Optimistic update
      const animation: XPAnimation = {
        id: `${Date.now()}-${Math.random()}`,
        amount: actionConfig.xp,
        action: actionConfig.message,
        timestamp: Date.now()
      };
      setPendingAnimations(prev => [...prev, animation]);
      
      // Update cooldown
      if (actionConfig.cooldown > 0) {
        setCooldowns(prev => ({
          ...prev,
          [action]: Date.now()
        }));
      }
      
      // Award XP via API
      const response = await api.post('/api/v2/gamification/award-xp', {
        activity_type: action.toLowerCase(),
        xp_amount: actionConfig.xp,
        metadata
      });
      
      if (response.data.status === 'success') {
        // Update stats with new values
        const result = response.data.data;
        setUserStats(prev => prev ? {
          ...prev,
          total_xp: result.new_total_xp,
          level: result.new_level,
          current_streak: result.streak || prev.current_streak,
          weekly_goal_progress: result.weekly_progress || prev.weekly_goal_progress
        } : null);
        
        // Check for level up
        if (result.level_up) {
          toast.success(`🎉 Level Up! You're now Level ${result.new_level}!`, {
            duration: 5000,
          });
        }
        
        // Check for new achievements
        if (result.achievements && result.achievements.length > 0) {
          result.achievements.forEach((achievement: any) => {
            toast.success(`🏆 ${achievement.name}`, {
              description: achievement.description,
              duration: 5000,
            });
          });
          checkAchievements();
        }
      }
    } catch (error) {
      console.error('Failed to award XP:', error);
      // Remove animation on error
      setPendingAnimations(prev => prev.filter(a => a.id !== animation.id));
      toast.error('Failed to record XP');
    }
  }, [user?.id, isOnCooldown, getRemainingCooldown, checkAchievements]);

  const clearAnimation = useCallback((id: string) => {
    setPendingAnimations(prev => prev.filter(a => a.id !== id));
  }, []);

  const value: GamificationContextType = {
    userStats,
    achievements,
    isLoading,
    awardXP,
    refreshStats,
    checkAchievements,
    pendingAnimations,
    clearAnimation
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

// HOC for tracking XP actions
export function withXPTracking<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  action: XPActionType,
  getMetadata?: (props: T) => Record<string, any>
) {
  return React.forwardRef<any, T>((props, ref) => {
    const { awardXP } = useGamification();
    
    // Wrap the original handler
    const originalHandler = props.onClick || props.onComplete || props.onView;
    
    const wrappedHandler = useCallback(async (...args: any[]) => {
      // Call original handler
      const result = originalHandler?.(...args);
      
      // Award XP
      const metadata = getMetadata?.(props) || {};
      await awardXP(action, metadata);
      
      return result;
    }, [originalHandler, props]);
    
    // Determine which prop to override
    const handlerProp = props.onClick ? 'onClick' : 
                       props.onComplete ? 'onComplete' : 
                       props.onView ? 'onView' : 'onClick';
    
    return <Component {...props} {...{ [handlerProp]: wrappedHandler }} ref={ref} />;
  });
}