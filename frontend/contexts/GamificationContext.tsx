'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { gamificationAPI, type UserStats as APIUserStats, type Achievement as APIAchievement } from '@/lib/api/endpoints/gamification';

// Simplified XP actions for 72-hour ship - only essential actions
export const XP_ACTIONS = {
  DAILY_LOGIN: { xp: 3, cooldown: 86400, message: 'Daily login bonus!' },
  CONTENT_VIEW: { xp: 5, cooldown: 86400, message: 'Viewed content' }, // Merged FILE_VIEW + WATCH_VIDEO
  QUIZ_COMPLETE: { xp: 15, cooldown: 0, message: 'Completed a quiz' },
  MODULE_COMPLETE: { xp: 40, cooldown: 86400, message: 'Completed a module!' },
  HELP_PEER: { xp: 10, cooldown: 0, message: 'Helped a peer' }, // Only when rated 4+ stars
  STREAK_BONUS: { xp: 0, cooldown: 86400, message: 'Streak bonus!' } // XP = streak_days
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
  type?: string;
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

// Helper functions for XP calculations
const calculateXPForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(level, 1.5));
};

const calculateCurrentLevelXP = (totalXP: number, currentLevel: number): number => {
  const xpForCurrentLevel = currentLevel > 1 ? calculateXPForLevel(currentLevel) : 0;
  return totalXP - xpForCurrentLevel;
};

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAnimations, setPendingAnimations] = useState<XPAnimation[]>([]);
  const [cooldowns, setCooldowns] = useState<CooldownData>({});

  // Load cooldowns from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (stored) {
        try {
          setCooldowns(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load cooldowns:', e);
        }
      }
    }
  }, []);

  // Save cooldowns to local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
    }
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
    // Only run in browser environment
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    console.log('[GamificationContext] User state:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email 
    });
    
    if (user?.id) {
      console.log('[GamificationContext] Loading stats for user:', user.id);
      refreshStats();
      checkAchievements();
      
      // Check for daily login bonus
      const lastLogin = localStorage.getItem('learn-x-last-login');
      const today = new Date().toDateString();
      if (lastLogin !== today) {
        localStorage.setItem('learn-x-last-login', today);
        awardXP('DAILY_LOGIN');
      }
    } else {
      // Clear stats when no user
      setUserStats(null);
      setAchievements([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  const refreshStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('[GamificationContext] Fetching user stats...');
      const data = await gamificationAPI.getUserStats();
      console.log('[GamificationContext] API Response:', data);
      
      // Map backend response to frontend interface (handle both camelCase and snake_case)
      const stats: UserStats = {
        user_id: user.id,
        total_xp: data.total_xp || data.totalXP || 0,
        level: data.level || data.currentLevel || 1,
        current_streak: data.current_streak || data.dailyStreak || 0,
        weekly_goal_progress: data.weekly_goal_progress || data.weeklyProgress || 0,
        weekly_goal_target: data.weekly_goal_target || data.weeklyGoal || 500,
        last_activity: data.last_activity || new Date().toISOString(),
        achievements_count: data.achievements_count || 0,
        rank: data.rank,
        next_level_xp: data.next_level_xp || data.xpToNextLevel || 100,
        current_level_xp: data.current_level_xp || data.currentXP || 0,
        longest_streak: data.longest_streak || data.maxStreak || 0,
        // Additional stats for dashboard
        weekly_login_days: 0, // TODO: Calculate from activities
        weekly_help_given: 0, // TODO: Calculate from activities
        weekly_time_spent: 0, // TODO: Calculate from activities
        weekly_files_viewed: 0, // TODO: Calculate from activities
        completion_rate: 0 // TODO: Calculate from course progress
      };
      setUserStats(stats);
      console.log('[GamificationContext] Stats updated:', stats);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      // Provide fallback default stats on any error
      setUserStats({
        user_id: user.id,
        total_xp: 0,
        level: 1,
        current_streak: 0,
        weekly_goal_progress: 0,
        weekly_goal_target: 500,
        last_activity: new Date().toISOString(),
        achievements_count: 0,
        rank: undefined,
        next_level_xp: 100,
        current_level_xp: 0,
        longest_streak: 0,
        weekly_login_days: 0,
        weekly_help_given: 0,
        weekly_time_spent: 0,
        weekly_files_viewed: 0,
        completion_rate: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const checkAchievements = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('[GamificationContext] Fetching achievements...');
      const data = await gamificationAPI.getAchievements();
      console.log('[GamificationContext] Achievements Response:', data);
      
      const achievementsData = data?.achievements || data || [];
      
      // Map backend response to frontend Achievement interface
      const mappedAchievements: Achievement[] = achievementsData.map((a: APIAchievement) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon || '🏆',
        earned_at: a.earned_at,
        type: a.type
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
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  }, [user?.id, achievements]);

  const awardXP = useCallback(async (action: XPActionType, metadata?: Record<string, any>) => {
    if (!user?.id) return;
    
    // Validate action exists
    const actionConfig = XP_ACTIONS[action];
    if (!actionConfig) {
      console.error(`Invalid XP action: ${action}`);
      return;
    }
    
    // Check cooldown
    if (isOnCooldown(action)) {
      const remaining = Math.ceil(getRemainingCooldown(action) / 1000);
      console.log(`Action ${action} on cooldown for ${remaining}s`);
      return;
    }
    
    // Special handling for streak bonus
    const xpAmount = action === 'STREAK_BONUS' 
      ? (userStats?.current_streak || 1) 
      : actionConfig.xp;
    
    // Define animation outside try block to make it accessible in catch block
    const animation: XPAnimation = {
      id: `${Date.now()}-${Math.random()}`,
      amount: xpAmount,
      action: actionConfig.message,
      timestamp: Date.now()
    };
    
    try {
      // Optimistic update
      setPendingAnimations(prev => [...prev, animation]);
      
      // Update cooldown
      if (actionConfig.cooldown > 0) {
        setCooldowns(prev => ({
          ...prev,
          [action]: Date.now()
        }));
      }
      
      // Award XP via API
      const result = await gamificationAPI.awardXP({
        activity_type: action.toLowerCase(),
        xp_amount: xpAmount,
        description: actionConfig.message,
        metadata
      });
      
      console.log('[GamificationContext] Award XP Response:', result);
      
      // Show success toast
      toast.success(`+${result.xp_awarded} XP - ${actionConfig.message}`, {
        duration: 3000,
      });
      
      // Get the previous level to check for level up
      const previousLevel = userStats?.level || 1;
      const newLevel = result.new_level || previousLevel;
      
      setUserStats(prev => {
        if (!prev) return null;
        
        const newTotalXP = result.new_total_xp || (prev.total_xp + xpAmount);
        const currentLevelXP = calculateCurrentLevelXP(newTotalXP, newLevel);
        const nextLevelXP = calculateXPForLevel(newLevel + 1);
        
        return {
          ...prev,
          total_xp: newTotalXP,
          level: newLevel,
          current_level_xp: currentLevelXP,
          next_level_xp: nextLevelXP,
          current_streak: result.new_streak || prev.current_streak,
          weekly_goal_progress: Math.min(
            (prev.weekly_goal_progress || 0) + xpAmount,
            prev.weekly_goal_target
          )
        };
      });
      
      // Check for level up
      if (newLevel > previousLevel) {
        toast.success(`🎉 Level Up! You're now Level ${newLevel}!`, {
          duration: 5000,
        });
        // Refresh achievements as level ups create new achievements
        checkAchievements();
      }
    } catch (error) {
      console.error('Failed to award XP:', error);
      // Remove animation on error (only if animation was created)
      if (animation?.id) {
        setPendingAnimations(prev => prev.filter(a => a.id !== animation.id));
      }
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