/**
 * Dashboard data fetching hooks
 * Provides centralized data access for dashboard components
 */
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

// Types
interface WeeklyProgress {
  overall: number;
  xp: { current: number; target: number };
  tasks: { completed: number; total: number };
  study_time: { current: number; target: number };
}

interface PriorityAction {
  id: string;
  title: string;
  description: string;
  urgency: 'urgent' | 'high' | 'medium' | 'low';
  time_estimate: string;
  type: string;
  course?: string;
}

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
  xp_reward: number;
  estimated_time: string;
  confidence?: number;
  reasoning?: string;
}

interface PerformancePulse {
  improvement_percentage: number;
  current_rank: number;
  rank_change: number;
  average_score: number;
}

interface ScheduleItem {
  time: string;
  title: string;
  status: string;
  is_next: boolean;
  course_id?: string;
  type?: string;
}

interface CoursesOverview {
  active_courses: number;
  behind_courses: number;
  total_courses: number;
}

interface DashboardOverview {
  weekly_progress: WeeklyProgress;
  priority_actions: PriorityAction[];
  ai_recommendations: AIRecommendation[];
  performance_pulse: PerformancePulse;
  today_schedule: ScheduleItem[];
  courses_overview: CoursesOverview;
  last_updated: string;
}

// Custom hook for dashboard overview
export function useDashboardOverview() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v2/dashboard/overview');
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard overview');
      console.error('Dashboard overview error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardOverview();
  }, [fetchDashboardOverview]);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardOverview
  };
}

// Custom hook for weekly progress
export function useWeeklyProgress(weekOffset: number = 0) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyProgress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = weekOffset !== 0 ? `?week_offset=${weekOffset}` : '';
      const response = await apiClient.get(`/api/v2/dashboard/weekly-progress${params}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weekly progress');
      console.error('Weekly progress error:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    fetchWeeklyProgress();
  }, [fetchWeeklyProgress]);

  return {
    data,
    loading,
    error,
    refetch: fetchWeeklyProgress
  };
}

// Custom hook for AI recommendations
export function useAIRecommendations() {
  const [data, setData] = useState<{
    recommendations: AIRecommendation[];
    optimal_study_time: any;
    generated_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v2/dashboard/ai-recommendations');
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch AI recommendations');
      console.error('AI recommendations error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    data,
    loading,
    error,
    refetch: fetchRecommendations
  };
}

// Custom hook for performance pulse
export function usePerformancePulse() {
  const [data, setData] = useState<{
    metrics: PerformancePulse;
    insights: any;
    last_updated: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformancePulse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v2/dashboard/performance-pulse');
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch performance pulse');
      console.error('Performance pulse error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformancePulse();
  }, [fetchPerformancePulse]);

  return {
    data,
    loading,
    error,
    refetch: fetchPerformancePulse
  };
}

// Custom hook for today's schedule
export function useTodaySchedule() {
  const [data, setData] = useState<{
    date: string;
    items: ScheduleItem[];
    total_items: number;
    upcoming_items: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodaySchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v2/dashboard/schedule/today');
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch today\'s schedule');
      console.error('Today\'s schedule error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodaySchedule();
  }, [fetchTodaySchedule]);

  return {
    data,
    loading,
    error,
    refetch: fetchTodaySchedule
  };
}

// Custom hook for courses overview
export function useCoursesOverview() {
  const [data, setData] = useState<CoursesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoursesOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v2/dashboard/courses-overview');
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch courses overview');
      console.error('Courses overview error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoursesOverview();
  }, [fetchCoursesOverview]);

  return {
    data,
    loading,
    error,
    refetch: fetchCoursesOverview
  };
}

// Custom hook for activity timeline
export function useActivityTimeline(days: number = 7, page: number = 1, perPage: number = 20) {
  const [data, setData] = useState<{
    activities: any[];
    days_range: number;
    pagination: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivityTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        days: days.toString(),
        page: page.toString(),
        per_page: perPage.toString()
      });
      
      const response = await apiClient.get(`/api/v2/dashboard/activity-timeline?${params}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activity timeline');
      console.error('Activity timeline error:', err);
    } finally {
      setLoading(false);
    }
  }, [days, page, perPage]);

  useEffect(() => {
    fetchActivityTimeline();
  }, [fetchActivityTimeline]);

  return {
    data,
    loading,
    error,
    refetch: fetchActivityTimeline
  };
}

// Custom hook for generating action plans
export function useActionPlan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateActionPlan = useCallback(async (goal: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/api/v2/dashboard/action-plan', {
        goal
      });
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate action plan';
      setError(errorMessage);
      console.error('Action plan generation error:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    generateActionPlan,
    loading,
    error
  };
}

// Utility hook for refreshing all dashboard data
export function useDashboardRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  
  const refreshDashboard = useCallback(async (refreshFunctions: (() => Promise<void>)[]) => {
    try {
      setRefreshing(true);
      await Promise.all(refreshFunctions.map(fn => fn()));
    } catch (error) {
      console.error('Dashboard refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    refreshDashboard,
    refreshing
  };
}