/**
 * Optimized Dashboard Data Hook
 * Replaces 15+ individual database queries with 1 unified backend API call
 * Uses the new /api/v2/dashboard/unified endpoint for maximum performance
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UnifiedDashboardData {
  user: {
    id: string;
    email: string;
    full_name?: string;
    role: string;
    onboarding_step?: string;
  };
  stats: {
    current_level: number;
    total_xp: number;
    streak_days: number;
    badges_earned: number;
  };
  weekly_progress: {
    xp: { current: number; target: number };
    tasks: { completed: number; total: number };
    study_time: { current: number; target: number };
  };
  recent_activities: Array<{
    activity_type: string;
    xp_earned: number;
    created_at: string;
    metadata?: any;
  }>;
  courses: {
    enrolled: Array<{
      id: string;
      title: string;
      description?: string;
      published: boolean;
      enrolled_at: string;
      enrollment_role: string;
    }>;
    active_count: number;
    total_count: number;
  };
  todos: {
    urgent: Array<{
      id: string;
      title: string;
      description?: string;
      priority: string;
      due_date?: string;
    }>;
    upcoming: Array<any>;
    completed_today: Array<any>;
  };
  today_schedule: Array<{
    time: string;
    title: string;
    status: string;
    urgency: string;
    type: string;
    id?: string;
  }>;
  achievements: Array<{
    achievement_id: string;
    earned_at: string;
  }>;
  performance_pulse: {
    improvement_percentage: number;
    current_rank: number;
    rank_change: number;
    average_score: number;
  };
  ai_recommendations: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    action: string;
    xp_reward: number;
    estimated_time: string;
  }>;
  last_updated: string;
  optimized: boolean;
  data_freshness: string;
  error?: string;
}

interface UseDashboardDataReturn {
  data: UnifiedDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  
  // Legacy compatibility - extract specific data for existing components
  userJourney: {
    currentLevel: number;
    totalXP: number;
    weeklyXP: number;
    targetXP: number;
  };
  dashboardOverview: {
    weeklyProgress: any;
    priorityActions: any[];
    todaySchedule: any[];
    coursesOverview: any;
  };
  gamification: {
    currentLevel: number;
    totalXP: number;
    recentActivities: any[];
    achievements: any[];
  };
  performancePulse: {
    improvement: number;
    rank: number;
    rankChange: number;
    averageScore: number;
  };
}

export function useDashboardData(): UseDashboardDataReturn {
  const [data, setData] = useState<UnifiedDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Starting dashboard data fetch...');
      }

      // Get current session with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session fetch timeout')), 10000)
      );
      
      const { data: { session }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('No session found - user may need to log in');
      }
      
      if (!session.access_token) {
        throw new Error('No authentication token available - session may be expired');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Got session:', {
          hasUser: !!session.user,
          hasToken: !!session.access_token,
          userEmail: session.user?.email,
          tokenLength: session.access_token?.length,
          expiresAt: new Date(session.expires_at! * 1000).toISOString()
        });
      }

      // Use the correct backend URL (localhost:8000)
      const backendURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const fullURL = `${backendURL}/api/v2/dashboard/unified`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🌐 Making request to:', fullURL);
      }

      const response = await fetch(fullURL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Response Error:', errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed - please try logging in again');
        } else if (response.status === 404) {
          throw new Error('Dashboard endpoint not found - please check backend service');
        } else {
          throw new Error(`Dashboard API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const result = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📦 Raw API Response:', result);
        console.log('🔍 Response structure check:', {
          hasStatus: 'status' in result,
          status: result.status,
          hasData: 'data' in result,
          dataKeys: result.data ? Object.keys(result.data) : 'no data',
          message: result.message
        });
      }
      
      if (result.status !== 'success') {
        console.error('❌ API returned non-success status:', result.status, result.message);
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }

      if (!result.data) {
        console.error('❌ API response has no data field:', result);
        throw new Error('No data received from dashboard API');
      }

      // Log the actual data structure before setting it
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Dashboard data structure:', {
          user: result.data.user,
          stats: result.data.stats,
          activities_count: result.data.recent_activities?.length || 0,
          courses_count: result.data.courses?.enrolled?.length || 0,
          todos_count: result.data.todos?.upcoming?.length || 0,
          hasError: !!result.data.error,
          dataFreshness: result.data.data_freshness
        });
      }

      setData(result.data);

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Unified Dashboard Data loaded successfully!', {
          userEmail: result.data.user?.email,
          courses: result.data.courses?.total_count,
          activities: result.data.recent_activities?.length,
          optimized: result.data.optimized
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Dashboard Data Error:', errorMessage);
        console.error('🔍 Full error object:', err);
      }

      // Provide fallback data structure for graceful degradation
      setData({
        user: { id: '', email: '', role: 'student' },
        stats: { current_level: 1, total_xp: 0, streak_days: 0, badges_earned: 0 },
        weekly_progress: {
          xp: { current: 0, target: 150 },
          tasks: { completed: 0, total: 8 },
          study_time: { current: 0, target: 12 }
        },
        recent_activities: [],
        courses: { enrolled: [], active_count: 0, total_count: 0 },
        todos: { urgent: [], upcoming: [], completed_today: [] },
        today_schedule: [],
        achievements: [],
        performance_pulse: { improvement_percentage: 0, current_rank: 0, rank_change: 0, average_score: 0 },
        ai_recommendations: [],
        last_updated: new Date().toISOString(),
        optimized: true,
        data_freshness: 'fallback',
        error: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Legacy compatibility extractors for existing components
  const userJourney = data ? {
    currentLevel: data.stats.current_level,
    totalXP: data.stats.total_xp,
    weeklyXP: data.weekly_progress.xp.current,
    targetXP: data.weekly_progress.xp.target,
  } : {
    currentLevel: 1,
    totalXP: 0,
    weeklyXP: 0,
    targetXP: 150,
  };

  const dashboardOverview = data ? {
    weeklyProgress: data.weekly_progress,
    priorityActions: data.todos.urgent.slice(0, 5),
    todaySchedule: data.today_schedule,
    coursesOverview: {
      activeCourses: data.courses.active_count,
      totalCourses: data.courses.total_count,
      behindCourses: Math.max(0, data.courses.total_count - data.courses.active_count),
    },
  } : {
    weeklyProgress: { xp: { current: 0, target: 150 } },
    priorityActions: [],
    todaySchedule: [],
    coursesOverview: { activeCourses: 0, totalCourses: 0, behindCourses: 0 },
  };

  const gamification = data ? {
    currentLevel: data.stats.current_level,
    totalXP: data.stats.total_xp,
    recentActivities: data.recent_activities,
    achievements: data.achievements,
  } : {
    currentLevel: 1,
    totalXP: 0,
    recentActivities: [],
    achievements: [],
  };

  const performancePulse = data ? {
    improvement: data.performance_pulse.improvement_percentage,
    rank: data.performance_pulse.current_rank,
    rankChange: data.performance_pulse.rank_change,
    averageScore: data.performance_pulse.average_score,
  } : {
    improvement: 0,
    rank: 0,
    rankChange: 0,
    averageScore: 0,
  };

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboardData,
    
    // Legacy compatibility
    userJourney,
    dashboardOverview,
    gamification,
    performancePulse,
  };
}

// LEGACY COMPATIBILITY HOOKS
// These hooks now use the unified data but maintain the same interface for existing components

export function useAIRecommendations() {
  const { data, isLoading, error } = useDashboardData();

  const recommendations = data?.ai_recommendations || [
    {
      id: '1',
      title: 'Start with your first module',
      description: 'Begin your learning journey by exploring the first module of your course',
      icon: 'rocket',
      action: 'start-learning',
      xp_reward: 50,
      estimated_time: '30 mins'
    }
  ];

  return {
    data: {
      recommendations,
      optimal_study_time: { hour: 19, duration: 60 },
      generated_at: data?.last_updated || new Date().toISOString()
    },
    loading: isLoading,
    error,
    refetch: () => Promise.resolve()
  };
}

export function useTodaySchedule() {
  const { data, isLoading, error } = useDashboardData();

  return {
    data: data?.today_schedule || [],
    loading: isLoading,
    error,
    refetch: () => Promise.resolve()
  };
}

export function useWeeklyProgress(weekOffset: number = 0) {
  const { data, isLoading, error } = useDashboardData();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (weekOffset * 7));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    data: {
      week_range: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
      progress: data?.weekly_progress || {
        overall: 0,
        xp: { current: 0, target: 150 },
        tasks: { completed: 0, total: 8 },
        study_time: { current: 0, target: 12 }
      }
    },
    loading: isLoading,
    error,
    refetch: () => Promise.resolve()
  };
}

export function usePerformancePulse() {
  const { data, isLoading, error } = useDashboardData();

  return {
    data: {
      metrics: data?.performance_pulse || {
        improvement_percentage: 0,
        current_rank: 0,
        rank_change: 0,
        average_score: 0
      },
      insights: [],
      last_updated: data?.last_updated || new Date().toISOString()
    },
    loading: isLoading,
    error,
    refetch: () => Promise.resolve()
  };
}

export function useCoursesOverview() {
  const { data, isLoading, error } = useDashboardData();

  return {
    data: {
      active_courses: data?.courses?.active_count || 0,
      behind_courses: Math.max(0, (data?.courses?.total_count || 0) - (data?.courses?.active_count || 0)),
      total_courses: data?.courses?.total_count || 0,
      enrolled_courses: data?.courses?.enrolled || []
    },
    loading: isLoading,
    error,
    refetch: () => Promise.resolve()
  };
}

export function useActivityTimeline(days: number = 7, page: number = 1, perPage: number = 20) {
  const { data, isLoading, error } = useDashboardData();

  const activities = (data?.recent_activities || []).slice(0, perPage);

  return {
    data: {
      activities,
      days_range: days,
      pagination: {
        page,
        per_page: perPage,
        total: activities.length,
        pages: Math.ceil(activities.length / perPage)
      }
    },
    loading: isLoading,
    error,
    refetch: () => Promise.resolve()
  };
}

// For backward compatibility, export the main hook with the old name too
export const useDashboardOverview = useDashboardData; 