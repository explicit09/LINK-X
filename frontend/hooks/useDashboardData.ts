/**
 * Dashboard data fetching hooks
 * Provides centralized data access for dashboard components
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { courseOperations } from '@/lib/db/operations';
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch data from Supabase in parallel
      const [
        coursesData,
        userStatsData,
        todosData,
        studySessionsData
      ] = await Promise.all([
        // Get user's courses
        courseOperations.getUserCourses(),
        
        // Get user stats
        supabase
          .from('user_stats')
          .select('total_xp, weekly_xp, daily_streak')
          .eq('user_id', user.id)
          .single(),
        
        // Get todos for priority actions
        supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('due_date', { ascending: true })
          .limit(5),
        
        // Get recent study sessions
        supabase
          .from('study_sessions')
          .select('actual_duration, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Calculate weekly progress
      const weeklyStudyMinutes = studySessionsData.data?.reduce((sum, session) => 
        sum + (session.actual_duration || 0), 0) || 0;
      
      const weeklyProgress: WeeklyProgress = {
        overall: 75, // Placeholder - calculate based on actual data
        xp: { 
          current: userStatsData.data?.weekly_xp || 0, 
          target: 500 
        },
        tasks: { 
          completed: 0, // Would need to query completed tasks this week
          total: todosData.data?.length || 0 
        },
        study_time: { 
          current: Math.round(weeklyStudyMinutes / 60), 
          target: 10 
        }
      };

      // Transform todos to priority actions
      const priorityActions: PriorityAction[] = (todosData.data || []).map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description || '',
        urgency: todo.priority === 'high' ? 'urgent' : todo.priority as any,
        time_estimate: '30 mins',
        type: 'task'
      }));

      // Create dashboard overview
      const overview: DashboardOverview = {
        weekly_progress: weeklyProgress,
        priority_actions: priorityActions,
        ai_recommendations: [], // Will be handled by separate hook
        performance_pulse: {
          improvement_percentage: 15,
          current_rank: 5,
          rank_change: 2,
          average_score: 85
        },
        today_schedule: [], // Will be handled by separate hook
        courses_overview: {
          active_courses: coursesData.courses.length,
          behind_courses: 0, // Would need to calculate based on progress
          total_courses: coursesData.total
        },
        last_updated: new Date().toISOString()
      };

      setData(overview);
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
    refetch: fetchDashboardOverview,
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate week range
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (weekOffset * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Fetch data for the week
      const [statsData, tasksData, sessionsData] = await Promise.all([
        // Get user stats
        supabase
          .from('user_stats')
          .select('weekly_xp, total_xp')
          .eq('user_id', user.id)
          .single(),
        
        // Count completed tasks this week
        supabase
          .from('todos')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('updated_at', weekStart.toISOString())
          .lte('updated_at', weekEnd.toISOString()),
        
        // Get study sessions this week
        supabase
          .from('study_sessions')
          .select('actual_duration')
          .eq('user_id', user.id)
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString())
      ]);

      // Calculate weekly progress
      const weeklyXP = statsData.data?.weekly_xp || 0;
      const tasksCompleted = tasksData.count || 0;
      const studyMinutes = sessionsData.data?.reduce((sum, s) => sum + (s.actual_duration || 0), 0) || 0;
      const studyHours = studyMinutes / 60;

      // Set targets (these could be fetched from user preferences)
      const xpTarget = 500;
      const tasksTarget = 10;
      const studyTarget = 10; // hours

      const overallProgress = Math.round(
        ((weeklyXP / xpTarget) * 0.4 +
         (tasksCompleted / tasksTarget) * 0.3 +
         (studyHours / studyTarget) * 0.3) * 100
      );

      setData({
        week_range: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
        progress: {
          overall: Math.min(overallProgress, 100),
          xp: { current: weeklyXP, target: xpTarget },
          tasks: { completed: tasksCompleted, total: tasksTarget },
          study_time: { current: Math.round(studyHours * 10) / 10, target: studyTarget }
        }
      });
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
    refetch: fetchWeeklyProgress,
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

      // For now, return static recommendations
      // In production, this would call a recommendation engine or AI service
      const recommendations: AIRecommendation[] = [
        {
          id: '1',
          title: 'Start with your first module',
          description: 'Begin your learning journey by exploring the first module of your course',
          icon: 'rocket',
          action: 'start-learning',
          xp_reward: 50,
          estimated_time: '30 mins',
          confidence: 0.9,
          reasoning: 'New users benefit from structured progression'
        },
        {
          id: '2',
          title: 'Set up your study schedule',
          description: 'Create a personalized study schedule to stay on track',
          icon: 'calendar',
          action: 'create-schedule',
          xp_reward: 25,
          estimated_time: '10 mins',
          confidence: 0.85,
          reasoning: 'Scheduled learners have 3x higher completion rates'
        }
      ];

      setData({
        recommendations,
        optimal_study_time: { hour: 19, duration: 60 }, // 7 PM for 1 hour
        generated_at: new Date().toISOString()
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate recommendations');
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
    refetch: fetchRecommendations,
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch performance data from Supabase
      const [statsData, tasksData, sessionsData] = await Promise.all([
        // Get user stats
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        // Get recent task completion rate
        supabase
          .from('todos')
          .select('completed')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Get recent study sessions for average score
        supabase
          .from('study_sessions')
          .select('focus_score, effectiveness_rating')
          .eq('user_id', user.id)
          .not('focus_score', 'is', null)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Calculate metrics
      const totalTasks = tasksData.data?.length || 0;
      const completedTasks = tasksData.data?.filter(t => t.completed).length || 0;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const avgFocusScore = sessionsData.data?.length 
        ? sessionsData.data.reduce((sum, s) => sum + (s.focus_score || 0), 0) / sessionsData.data.length
        : 0;
      
      const avgScore = Math.round((completionRate * 0.5) + (avgFocusScore * 5)); // Convert to percentage

      // Simple rank calculation based on XP
      const totalXP = statsData.data?.total_xp || 0;
      const currentRank = Math.floor(totalXP / 100) + 1; // Every 100 XP = 1 rank
      
      const performanceData = {
        metrics: {
          improvement_percentage: 15, // Placeholder - would need historical data
          current_rank: currentRank,
          rank_change: 2, // Placeholder - would need historical data
          average_score: avgScore
        },
        insights: {
          strengths: ['Consistent study schedule', 'High task completion rate'],
          improvements: ['Increase focus during sessions', 'Try longer study sessions'],
          recommendations: ['Schedule study sessions at your peak hours', 'Take regular breaks']
        },
        last_updated: new Date().toISOString()
      };

      setData(performanceData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch performance pulse');
      console.error('Performance pulse error:', err);
      
      // Fallback data
      setData({
        metrics: {
          improvement_percentage: 0,
          current_rank: 1,
          rank_change: 0,
          average_score: 0
        },
        insights: {},
        last_updated: new Date().toISOString()
      });
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
    refetch: fetchPerformancePulse,
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get today's schedule items from Supabase
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: scheduleData } = await supabase
        .from('schedule_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true });

      const items: ScheduleItem[] = (scheduleData || []).map(session => ({
        time: new Date(session.start_time).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        }),
        title: session.title || 'Study Session',
        status: new Date() > new Date(session.end_time) ? 'completed' : 
                new Date() >= new Date(session.start_time) ? 'in-progress' : 'upcoming',
        is_next: false, // Will calculate below
        course_id: session.course_id,
        type: session.session_type
      }));

      // Mark the next upcoming item
      const nextIndex = items.findIndex(item => item.status === 'upcoming');
      if (nextIndex !== -1) {
        items[nextIndex].is_next = true;
      }

      setData({
        date: today.toISOString(),
        items,
        total_items: items.length,
        upcoming_items: items.filter(item => item.status === 'upcoming').length
      });
    } catch (err: any) {
      setError(err.message || "Failed to fetch today's schedule");
      console.error("Today's schedule error:", err);
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
    refetch: fetchTodaySchedule,
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

      // Use the existing course operations
      const coursesData = await courseOperations.getUserCourses();
      
      // For now, we'll consider all courses as active
      // In the future, you could add logic to determine which courses are "behind"
      const overview: CoursesOverview = {
        active_courses: coursesData.courses.length,
        behind_courses: 0, // Would need progress tracking to determine this
        total_courses: coursesData.total
      };
      
      setData(overview);
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
    refetch: fetchCoursesOverview,
  };
}

// Custom hook for activity timeline
export function useActivityTimeline(
  days: number = 7,
  page: number = 1,
  perPage: number = 20,
) {
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate date range
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // Fetch user activities from Supabase
      const { data: activities, count } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      // Calculate pagination
      const totalPages = Math.ceil((count || 0) / perPage);
      
      setData({
        activities: activities || [],
        days_range: days,
        pagination: {
          current_page: page,
          per_page: perPage,
          total_items: count || 0,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_previous: page > 1
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activity timeline');
      console.error('Activity timeline error:', err);
      
      // Fallback empty data
      setData({
        activities: [],
        days_range: days,
        pagination: {
          current_page: 1,
          per_page: perPage,
          total_items: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false
        }
      });
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
    refetch: fetchActivityTimeline,
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

      // For complex AI operations, we'll still use the backend API
      // This is one of those "complicated calculations" that should go through Flask
      const response = await apiClient.post('/api/v2/dashboard/action-plan', {
        goal,
      });

      return response.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate action plan';
      setError(errorMessage);
      console.error('Action plan generation error:', err);
      
      // Return a simple fallback plan
      return {
        goal,
        steps: [
          { step: 1, action: 'Break down your goal into smaller tasks', completed: false },
          { step: 2, action: 'Schedule dedicated study time', completed: false },
          { step: 3, action: 'Track your progress daily', completed: false }
        ],
        estimated_completion: '2 weeks',
        generated_at: new Date().toISOString()
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    generateActionPlan,
    loading,
    error,
  };
}

// Utility hook for refreshing all dashboard data
export function useDashboardRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  const refreshDashboard = useCallback(
    async (refreshFunctions: (() => Promise<void>)[]) => {
      try {
        setRefreshing(true);
        await Promise.all(refreshFunctions.map((fn) => fn()));
      } catch (error) {
        console.error('Dashboard refresh error:', error);
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

  return {
    refreshDashboard,
    refreshing,
  };
}
