/**
 * Gamification hooks for XP, levels, streaks, and achievements
 */
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

// Types
interface UserStats {
  currentXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  dailyStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
  todayCompleted: number;
  todayXP: number;
  rank: number;
  totalXP: number;
  maxStreak: number;
}

interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface Activity {
  id: string;
  type: string;
  xp_earned: number;
  description: string;
  metadata: any;
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  level: number;
  total_xp: number;
  streak: number;
  weekly_progress: number;
  rank: number;
}

// Custom hook for user stats
export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v2/gamification/stats');
      setStats(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user stats');
      console.error('User stats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

// Custom hook for awarding XP
export function useAwardXP() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const awardXP = useCallback(async (
    activityType: string, 
    xpAmount: number, 
    description?: string, 
    metadata?: any
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/api/v2/gamification/award-xp', {
        activity_type: activityType,
        xp_amount: xpAmount,
        description,
        metadata
      });
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to award XP';
      setError(errorMessage);
      console.error('Award XP error:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    awardXP,
    loading,
    error
  };
}

// Custom hook for achievements
export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v2/gamification/achievements');
      setAchievements(response.data.achievements || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch achievements');
      console.error('Achievements error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    achievements,
    loading,
    error,
    refetch: fetchAchievements
  };
}

// Custom hook for leaderboard
export function useLeaderboard(limit: number = 10, offset: number = 0) {
  const [data, setData] = useState<{
    leaderboard: LeaderboardEntry[];
    current_user_rank: number | null;
    pagination: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/v2/gamification/leaderboard?limit=${limit}&offset=${offset}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard');
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    data,
    loading,
    error,
    refetch: fetchLeaderboard
  };
}

// Custom hook for activity history
export function useActivityHistory(limit: number = 20, days: number = 7) {
  const [data, setData] = useState<{
    activities: Activity[];
    period_days: number;
    total_activities: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/v2/gamification/activity-history?limit=${limit}&days=${days}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activity history');
      console.error('Activity history error:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, days]);

  useEffect(() => {
    fetchActivityHistory();
  }, [fetchActivityHistory]);

  return {
    data,
    loading,
    error,
    refetch: fetchActivityHistory
  };
}

// Utility hook for common XP actions
export function useXPActions() {
  const { awardXP } = useAwardXP();

  const awardLoginXP = useCallback(() => {
    return awardXP('login', 5, 'Daily login bonus');
  }, [awardXP]);

  const awardFileViewXP = useCallback((fileName: string) => {
    return awardXP('file_view', 2, `Viewed ${fileName}`);
  }, [awardXP]);

  const awardTodoCompleteXP = useCallback((todoTitle: string) => {
    return awardXP('todo_complete', 10, `Completed: ${todoTitle}`);
  }, [awardXP]);

  const awardChatMessageXP = useCallback(() => {
    return awardXP('chat_message', 3, 'Sent chat message');
  }, [awardXP]);

  const awardQuizCompleteXP = useCallback((score: number) => {
    return awardXP('quiz_complete', 15, `Quiz completed with ${score}% score`, { score });
  }, [awardXP]);

  const awardAssignmentCompleteXP = useCallback((assignmentName: string) => {
    return awardXP('assignment_complete', 25, `Completed assignment: ${assignmentName}`);
  }, [awardXP]);

  const awardCourseEnrollXP = useCallback((courseName: string) => {
    return awardXP('course_enroll', 20, `Enrolled in ${courseName}`);
  }, [awardXP]);

  return {
    awardLoginXP,
    awardFileViewXP,
    awardTodoCompleteXP,
    awardChatMessageXP,
    awardQuizCompleteXP,
    awardAssignmentCompleteXP,
    awardCourseEnrollXP,
    awardCustomXP: awardXP
  };
}