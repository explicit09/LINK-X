/**
 * Schedule Hooks
 * Reusable hooks for schedule functionality
 */
import { useCallback, useMemo } from 'react';
import { useApiQuery, useApiMutation } from './useApi';
import {
  scheduleAPI,
  StudySession,
  FrontendStudySession,
  UserSchedulePreferences,
  SessionAnalytics,
  AISessionSuggestion,
  ScheduleOptimizationResult,
  ScheduleDashboardAnalytics,
  CreateSessionRequest,
  UpdateSessionRequest,
  BulkUpdateSessionsRequest,
  CompleteSessionRequest,
  GetSessionsParams,
  OptimizeScheduleRequest,
  transformSessionForFrontend,
  transformSessionForBackend,
  getDefaultSchedulePreferences,
} from '@/lib/api/endpoints/schedule';

// ===== SESSION MANAGEMENT HOOKS =====

/**
 * Get user's study sessions with filtering
 */
export function useScheduleSessions(params: GetSessionsParams = {}) {
  return useApiQuery(
    () => scheduleAPI.getSessions(params),
    [JSON.stringify(params)],
    {
      showErrorToast: true,
      staleTime: 30000, // 30 seconds
    },
  );
}

/**
 * Get today's sessions
 */
export function useTodaySessions() {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  return useScheduleSessions({
    start_date: startOfDay.toISOString(),
    end_date: endOfDay.toISOString(),
  });
}

/**
 * Get week's sessions for calendar view
 */
export function useWeekSessions(weekStart?: Date) {
  const start =
    weekStart ||
    (() => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      monday.setHours(0, 0, 0, 0);
      return monday;
    })();

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return useScheduleSessions({
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  });
}

/**
 * Get sessions for specific course
 */
export function useCourseSessions(courseId: string) {
  return useScheduleSessions({
    course_id: courseId,
  });
}

/**
 * Create new study session
 */
export function useCreateSession() {
  return useApiMutation(
    (data: CreateSessionRequest) => scheduleAPI.createSession(data),
    {
      showErrorToast: true,
      showSuccessToast: true,
      successMessage: 'Session created successfully',
    },
  );
}

/**
 * Update existing session
 */
export function useUpdateSession() {
  return useApiMutation(
    ({ sessionId, data }: { sessionId: string; data: UpdateSessionRequest }) =>
      scheduleAPI.updateSession(sessionId, data),
    {
      showErrorToast: true,
      showSuccessToast: true,
      successMessage: 'Session updated successfully',
    },
  );
}

/**
 * Delete session
 */
export function useDeleteSession() {
  return useApiMutation(
    (sessionId: string) => scheduleAPI.deleteSession(sessionId),
    {
      showErrorToast: true,
      showSuccessToast: true,
      successMessage: 'Session deleted successfully',
    },
  );
}

/**
 * Bulk update sessions (for drag-and-drop)
 */
export function useBulkUpdateSessions() {
  return useApiMutation(
    (data: BulkUpdateSessionsRequest) => scheduleAPI.bulkUpdateSessions(data),
    {
      showErrorToast: true,
      showSuccessToast: false, // Avoid noise for drag operations
    },
  );
}

/**
 * Start session
 */
export function useStartSession() {
  return useApiMutation(
    (sessionId: string) => scheduleAPI.startSession(sessionId),
    {
      showErrorToast: true,
      showSuccessToast: true,
      successMessage: 'Session started! Good luck! 🚀',
    },
  );
}

/**
 * Complete session
 */
export function useCompleteSession() {
  return useApiMutation(
    ({
      sessionId,
      data,
    }: { sessionId: string; data?: CompleteSessionRequest }) =>
      scheduleAPI.completeSession(sessionId, data),
    {
      showErrorToast: true,
      showSuccessToast: true,
      successMessage: 'Session completed! Well done! 🎉',
    },
  );
}

// ===== USER PREFERENCES HOOKS =====

/**
 * Get user's schedule preferences
 */
export function useSchedulePreferences() {
  return useApiQuery(() => scheduleAPI.getPreferences(), [], {
    showErrorToast: true,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Update user's schedule preferences
 */
export function useUpdateSchedulePreferences() {
  return useApiMutation(
    (data: Partial<UserSchedulePreferences>) =>
      scheduleAPI.updatePreferences(data),
    {
      showErrorToast: true,
      showSuccessToast: true,
      successMessage: 'Preferences updated successfully',
    },
  );
}

// ===== AI OPTIMIZATION HOOKS =====

/**
 * AI-powered schedule optimization
 */
export function useOptimizeSchedule() {
  return useApiMutation(
    (data: OptimizeScheduleRequest) => scheduleAPI.optimizeSchedule(data),
    {
      showErrorToast: true,
      showSuccessToast: true,
      successMessage: 'Schedule optimized! Check the suggestions.',
    },
  );
}

/**
 * Get AI suggestions
 */
export function useAISuggestions(
  params: { type?: string; status?: string; limit?: number } = {},
) {
  return useApiQuery(
    () => scheduleAPI.getAISuggestions(params),
    [JSON.stringify(params)],
    {
      showErrorToast: true,
      staleTime: 60000, // 1 minute
    },
  );
}

/**
 * Get pending AI suggestions
 */
export function usePendingAISuggestions() {
  return useAISuggestions({ status: 'pending', limit: 5 });
}

/**
 * Apply AI suggestion
 */
export function useApplyAISuggestion() {
  return useApiMutation(
    (suggestionId: string) => scheduleAPI.applyAISuggestion(suggestionId),
    {
      showErrorToast: true,
      showSuccessToast: true,
      successMessage: 'AI suggestion applied successfully',
    },
  );
}

// ===== ANALYTICS HOOKS =====

/**
 * Get schedule analytics for dashboard
 */
export function useScheduleAnalytics(daysBack: number = 30) {
  return useApiQuery(
    () => scheduleAPI.getDashboardAnalytics(daysBack),
    [daysBack],
    {
      showErrorToast: true,
      staleTime: 300000, // 5 minutes
    },
  );
}

/**
 * Get AI-powered schedule insights
 */
export function useScheduleInsights() {
  return useApiQuery(() => scheduleAPI.getScheduleInsights(), [], {
    showErrorToast: true,
    staleTime: 600000, // 10 minutes
  });
}

// ===== COMPOSITE HOOKS =====

/**
 * Complete schedule dashboard data
 */
export function useScheduleDashboard() {
  const todaySessions = useTodaySessions();
  const weekSessions = useWeekSessions();
  const preferences = useSchedulePreferences();
  const analytics = useScheduleAnalytics();
  const aiSuggestions = usePendingAISuggestions();
  const insights = useScheduleInsights();

  const isLoading =
    todaySessions.isLoading ||
    weekSessions.isLoading ||
    preferences.isLoading ||
    analytics.isLoading;

  const error =
    todaySessions.error ||
    weekSessions.error ||
    preferences.error ||
    analytics.error;

  return {
    todaySessions: todaySessions.data?.data || [],
    weekSessions: weekSessions.data?.data || [],
    preferences: preferences.data?.data || getDefaultSchedulePreferences(),
    analytics: analytics.data?.data,
    aiSuggestions: aiSuggestions.data?.data || [],
    insights: insights.data?.data,
    isLoading,
    error,
  };
}

/**
 * Calendar view data with transformation for frontend compatibility
 */
export function useCalendarData(courseMap?: Record<string, string>) {
  const weekSessions = useWeekSessions();
  const aiSuggestions = usePendingAISuggestions();

  const transformedSessions = useMemo(() => {
    if (!weekSessions.data?.data) return [];

    return weekSessions.data.data.map((session: StudySession) =>
      transformSessionForFrontend(
        session,
        courseMap?.[session.course_id || ''],
      ),
    );
  }, [weekSessions.data, courseMap]);

  const ghostSessions = useMemo(() => {
    if (!aiSuggestions.data?.data) return [];

    return aiSuggestions.data.data
      .filter((suggestion: AISessionSuggestion) => suggestion.suggested_start)
      .map(
        (suggestion: AISessionSuggestion): FrontendStudySession => ({
          id: `ghost-${suggestion.id}`,
          title: suggestion.title,
          course: 'AI Suggestion',
          duration: `${suggestion.suggested_duration || 45}min`,
          cognitiveLoad: suggestion.suggested_cognitive_load || 'medium',
          urgency: 'later',
          xpReward: 10,
          type: 'study',
          estimatedStart: new Date(
            suggestion.suggested_start!,
          ).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          }),
          isGhost: true,
        }),
      );
  }, [aiSuggestions.data]);

  return {
    sessions: transformedSessions,
    ghostSessions,
    isLoading: weekSessions.isLoading,
    error: weekSessions.error,
  };
}

/**
 * Session management operations for drag-and-drop calendar
 */
export function useSessionOperations() {
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const bulkUpdate = useBulkUpdateSessions();
  const startSession = useStartSession();
  const completeSession = useCompleteSession();

  const moveSession = useCallback(
    async (sessionId: string, newStart: Date, newDuration?: number) => {
      const newEnd = new Date(newStart);
      newEnd.setMinutes(newEnd.getMinutes() + (newDuration || 45));

      return updateSession.execute({
        sessionId,
        data: {
          scheduled_start: newStart.toISOString(),
          scheduled_end: newEnd.toISOString(),
          duration_minutes: newDuration,
        },
      });
    },
    [updateSession],
  );

  const moveBulkSessions = useCallback(
    async (
      sessions: Array<{
        id: string;
        newStart: Date;
        newDuration?: number;
      }>,
    ) => {
      const bulkData = {
        sessions: sessions.map((session) => {
          const newEnd = new Date(session.newStart);
          newEnd.setMinutes(newEnd.getMinutes() + (session.newDuration || 45));

          return {
            id: session.id,
            scheduled_start: session.newStart.toISOString(),
            scheduled_end: newEnd.toISOString(),
            duration_minutes: session.newDuration,
          };
        }),
      };

      return bulkUpdate.execute(bulkData);
    },
    [bulkUpdate],
  );

  const createSessionFromGhost = useCallback(
    async (
      ghostSession: FrontendStudySession,
      courseId?: string,
      date?: Date,
    ) => {
      const backendData = transformSessionForBackend(
        ghostSession,
        courseId,
        date,
      );
      return createSession.execute(backendData as CreateSessionRequest);
    },
    [createSession],
  );

  return {
    createSession: createSession.execute,
    updateSession: updateSession.execute,
    deleteSession: deleteSession.execute,
    startSession: startSession.execute,
    completeSession: completeSession.execute,
    moveSession,
    moveBulkSessions,
    createSessionFromGhost,
    isLoading:
      createSession.isLoading ||
      updateSession.isLoading ||
      deleteSession.isLoading ||
      bulkUpdate.isLoading ||
      startSession.isLoading ||
      completeSession.isLoading,
  };
}

/**
 * AI optimization workflow
 */
export function useAIOptimization() {
  const optimizeSchedule = useOptimizeSchedule();
  const applyAISuggestion = useApplyAISuggestion();
  const aiSuggestions = usePendingAISuggestions();

  const runOptimization = useCallback(
    async (params: OptimizeScheduleRequest = {}) => {
      const result = await optimizeSchedule.execute(params);
      // Refresh suggestions after optimization
      await aiSuggestions.refetch();
      return result;
    },
    [optimizeSchedule, aiSuggestions],
  );

  const applySuggestion = useCallback(
    async (suggestionId: string) => {
      const result = await applyAISuggestion.execute(suggestionId);
      // Refresh suggestions after applying one
      await aiSuggestions.refetch();
      return result;
    },
    [applyAISuggestion, aiSuggestions],
  );

  return {
    runOptimization,
    applySuggestion,
    suggestions: aiSuggestions.data?.data || [],
    isOptimizing: optimizeSchedule.isLoading,
    isApplying: applyAISuggestion.isLoading,
    error: optimizeSchedule.error || applyAISuggestion.error,
  };
}

// Export all hooks
export default {
  useScheduleSessions,
  useTodaySessions,
  useWeekSessions,
  useCourseSessions,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useBulkUpdateSessions,
  useStartSession,
  useCompleteSession,
  useSchedulePreferences,
  useUpdateSchedulePreferences,
  useOptimizeSchedule,
  useAISuggestions,
  usePendingAISuggestions,
  useApplyAISuggestion,
  useScheduleAnalytics,
  useScheduleInsights,
  useScheduleDashboard,
  useCalendarData,
  useSessionOperations,
  useAIOptimization,
};
