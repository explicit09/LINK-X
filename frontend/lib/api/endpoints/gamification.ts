/**
 * Gamification API endpoints
 * Handles XP, levels, streaks, achievements, and weekly goals
 */

import { apiClient } from '../client';

export interface UserStats {
  currentXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  dailyStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
  weekly_goal_target: number;
  weekly_goal_progress: number;
  todayCompleted: number;
  todayXP: number;
  rank: number;
  totalXP: number;
  maxStreak: number;
  level: number;
  current_streak: number;
  total_xp: number;
}

export interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

export interface WeeklyGoalsData {
  weekly_goal_target: number;
  weekly_goal_progress: number;
  progress_percentage: number;
  days_remaining: number;
  daily_target: number;
  week_start: string;
  week_end: string;
  daily_progress: DailyProgress[];
  is_goal_achieved: boolean;
}

export interface DailyProgress {
  date: string;
  day_name: string;
  xp_earned: number;
  activities_count: number;
  is_today: boolean;
}

export interface ActivityHistoryItem {
  id: string;
  type: string;
  xp_earned: number;
  description: string;
  metadata: any;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id?: string;
  name: string;
  level: number;
  total_xp: number;
  streak: number;
  weekly_progress: number;
  rank: number;
  is_current_user: boolean;
}

export interface AwardXPRequest {
  activity_type: string;
  xp_amount: number;
  description?: string;
  metadata?: Record<string, any>;
}

export interface AwardXPResponse {
  xp_awarded: number;
  activity_type: string;
  new_total_xp: number;
  new_level: number;
  new_streak: number;
}

export const gamificationAPI = {
  /**
   * Get user's gamification stats
   */
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get('/api/v2/gamification/stats') as any;
    return response; // apiClient already unwraps the data
  },

  /**
   * Award XP to user for an activity
   */
  async awardXP(request: AwardXPRequest): Promise<AwardXPResponse> {
    const response = await apiClient.post('/api/v2/gamification/award-xp', request) as any;
    return response; // apiClient already unwraps the data
  },

  /**
   * Get user's achievements
   */
  async getAchievements(): Promise<{ achievements: Achievement[]; total_count: number }> {
    const response = await apiClient.get('/api/v2/gamification/achievements') as any;
    return response; // apiClient already unwraps the data
  },

  /**
   * Get leaderboard data
   */
  async getLeaderboard(limit = 10, offset = 0): Promise<{
    leaderboard: LeaderboardEntry[];
    current_user_rank: number;
    pagination: { limit: number; offset: number; total: number };
  }> {
    const response = await apiClient.get(`/api/v2/gamification/leaderboard?limit=${limit}&offset=${offset}`) as any;
    return response; // apiClient already unwraps the data
  },

  /**
   * Get user's activity history
   */
  async getActivityHistory(limit = 20, days = 7): Promise<{
    activities: ActivityHistoryItem[];
    period_days: number;
    total_activities: number;
  }> {
    const response = await apiClient.get(`/api/v2/gamification/activity-history?limit=${limit}&days=${days}`) as any;
    return response; // apiClient already unwraps the data
  },

  /**
   * Get weekly goals and progress
   */
  async getWeeklyGoals(): Promise<WeeklyGoalsData> {
    const response = await apiClient.get('/api/v2/gamification/weekly-goals') as any;
    return response; // apiClient already unwraps the data
  },

  /**
   * Update weekly goal target
   */
  async updateWeeklyGoal(weeklyGoalTarget: number): Promise<{
    weekly_goal_target: number;
    message: string;
  }> {
    const response = await apiClient.put('/api/v2/gamification/weekly-goals', {
      weekly_goal_target: weeklyGoalTarget
    }) as any;
    return response; // apiClient already unwraps the data
  }
};