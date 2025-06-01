/**
 * Study Plans Hooks
 * Reusable hooks for study plan functionality
 */
import { useCallback, useMemo } from 'react';
import { useApiQuery, useApiMutation } from './useApi';
import { 
  studyPlansAPI, 
  StudyPlan, 
  StudyGoal, 
  StudySession, 
  StudyRecommendation,
  CreateStudyPlanData,
  CreateGoalData,
  StartSessionData,
  EndSessionData,
  LogProgressData
} from '@/lib/api/endpoints/study-plans';

// ===== STUDY PLAN HOOKS =====

export function useStudyPlans(includeInactive = false) {
  return useApiQuery(
    () => studyPlansAPI.listPlans(includeInactive),
    [includeInactive],
    {
      showErrorToast: true
    }
  );
}

export function useActivePlan() {
  return useApiQuery(
    () => studyPlansAPI.getActivePlan(),
    [],
    {
      showErrorToast: false // Don't show error if no active plan
    }
  );
}

export function useStudyPlan(planId: string) {
  return useApiQuery(
    () => studyPlansAPI.getPlan(planId),
    [planId],
    {
      enabled: !!planId,
      showErrorToast: true
    }
  );
}

export function useCreateStudyPlan() {
  return useApiMutation(
    (data: CreateStudyPlanData) => studyPlansAPI.createPlan(data),
    {
      showSuccessToast: true,
      successMessage: 'Study plan created successfully!',
      showErrorToast: true
    }
  );
}

export function useUpdateStudyPlan() {
  return useApiMutation(
    ({ planId, data }: { planId: string; data: Partial<CreateStudyPlanData> }) =>
      studyPlansAPI.updatePlan(planId, data),
    {
      showSuccessToast: true,
      successMessage: 'Study plan updated successfully!',
      showErrorToast: true
    }
  );
}

// ===== STUDY GOAL HOOKS =====

export function useStudyGoals(filters?: { status?: string; priority?: string; limit?: number }) {
  return useApiQuery(
    () => studyPlansAPI.listGoals(filters),
    [filters?.status, filters?.priority, filters?.limit],
    {
      showErrorToast: true
    }
  );
}

export function useCreateGoal() {
  return useApiMutation(
    (data: CreateGoalData) => studyPlansAPI.createGoal(data),
    {
      showSuccessToast: true,
      successMessage: 'Goal created successfully!',
      showErrorToast: true
    }
  );
}

export function useLogGoalProgress() {
  return useApiMutation(
    ({ goalId, data }: { goalId: string; data: LogProgressData }) =>
      studyPlansAPI.logGoalProgress(goalId, data),
    {
      showSuccessToast: true,
      successMessage: 'Progress logged successfully!',
      showErrorToast: true
    }
  );
}

// ===== STUDY SESSION HOOKS =====

export function useStudySessions(filters?: { limit?: number; start_date?: string; end_date?: string }) {
  return useApiQuery(
    () => studyPlansAPI.listSessions(filters),
    [filters?.limit, filters?.start_date, filters?.end_date],
    {
      showErrorToast: true
    }
  );
}

export function useStartSession() {
  return useApiMutation(
    (data: StartSessionData) => studyPlansAPI.startSession(data),
    {
      showSuccessToast: true,
      successMessage: 'Study session started!',
      showErrorToast: true
    }
  );
}

export function useEndSession() {
  return useApiMutation(
    ({ sessionId, data }: { sessionId: string; data: EndSessionData }) =>
      studyPlansAPI.endSession(sessionId, data),
    {
      showSuccessToast: true,
      successMessage: 'Session completed! XP earned.',
      showErrorToast: true
    }
  );
}

// ===== RECOMMENDATION HOOKS =====

export function useStudyRecommendations(limit?: number) {
  return useApiQuery(
    () => studyPlansAPI.listRecommendations(limit),
    [limit],
    {
      showErrorToast: true
    }
  );
}

export function useApplyRecommendation() {
  return useApiMutation(
    (recId: string) => studyPlansAPI.applyRecommendation(recId),
    {
      showSuccessToast: true,
      successMessage: 'Recommendation applied!',
      showErrorToast: true
    }
  );
}

export function useUpdateGoalStatus() {
  return useApiMutation(
    ({ goalId, status }: { goalId: string; status: string }) =>
      studyPlansAPI.updateGoal(goalId, { status }),
    {
      showSuccessToast: true,
      successMessage: 'Goal updated successfully!',
      showErrorToast: true
    }
  );
}

// ===== ANALYTICS HOOKS =====

export function useStudyAnalytics(days = 30) {
  return useApiQuery(
    () => studyPlansAPI.getAnalytics(days),
    [days],
    {
      showErrorToast: true
    }
  );
}

// ===== COMPOSITE HOOKS =====

export function useStudyPlanDashboard() {
  const { data: activePlan, isLoading: planLoading, refetch: refetchPlan } = useActivePlan();
  const { data: goals, isLoading: goalsLoading, refetch: refetchGoals } = useStudyGoals({
    status: 'in_progress',
    limit: 10
  });
  const { data: recommendations, isLoading: recsLoading, refetch: refetchRecs } = useStudyRecommendations(5);
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useStudyAnalytics(7);

  const isLoading = planLoading || goalsLoading || recsLoading || analyticsLoading;

  const refetchAll = useCallback(() => {
    refetchPlan();
    refetchGoals();
    refetchRecs();
    refetchAnalytics();
  }, [refetchPlan, refetchGoals, refetchRecs, refetchAnalytics]);

  // Process data for dashboard display
  const dashboardData = useMemo(() => {
    const weeklyGoals = goals?.filter(goal => 
      goal.goal_type === 'weekly' || 
      (goal.target_date && new Date(goal.target_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    ) || [];

    const todayGoals = goals?.filter(goal => 
      goal.goal_type === 'daily' ||
      (goal.target_date && new Date(goal.target_date).toDateString() === new Date().toDateString())
    ) || [];

    const urgentGoals = goals?.filter(goal => goal.priority === 'urgent' || goal.priority === 'high') || [];

    return {
      activePlan,
      weeklyGoals,
      todayGoals,
      urgentGoals,
      recommendations: recommendations || [],
      analytics: analytics || null
    };
  }, [activePlan, goals, recommendations, analytics]);

  return {
    ...dashboardData,
    isLoading,
    refetchAll
  };
}

export function useWeeklyStudyProgress() {
  const weekStart = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  }, []);

  const weekEnd = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
  }, [weekStart]);

  const { data: sessions, isLoading, refetch } = useStudySessions({
    start_date: weekStart,
    end_date: weekEnd
  });

  const weeklyStats = useMemo(() => {
    if (!sessions) return null;

    const totalMinutes = sessions.reduce((sum, session) => sum + (session.actual_duration || 0), 0);
    const totalSessions = sessions.length;
    const avgEffectiveness = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (s.effectiveness_rating || 0), 0) / sessions.length 
      : 0;
    const studyDays = new Set(sessions.map(s => s.start_time.split('T')[0])).size;

    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      totalSessions,
      avgEffectiveness: Math.round(avgEffectiveness * 10) / 10,
      studyDays,
      weekStart,
      weekEnd
    };
  }, [sessions, weekStart, weekEnd]);

  return {
    sessions: sessions || [],
    weeklyStats,
    isLoading,
    refetch
  };
}

// Utility hook for goal priority colors and icons
export function useGoalPriority() {
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending': return 'text-gray-400';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-400';
    }
  }, []);

  return {
    getPriorityColor,
    getStatusColor
  };
}