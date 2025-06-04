/**
 * Schedule API Endpoints - Fixed TypeScript version
 * TypeScript definitions and API methods for schedule management
 */

import { apiClient } from '../client';

// ===============================
// TYPESCRIPT INTERFACES
// ===============================

export interface StudySession {
  id: string;
  user_id: string;
  course_id?: string;
  study_plan_id?: string;
  study_goal_id?: string;

  // Session Details
  title: string;
  description?: string;
  session_type: 'study' | 'assignment' | 'meeting' | 'lab' | 'review';

  // Scheduling
  scheduled_start: string; // ISO string
  scheduled_end: string; // ISO string
  duration_minutes: number;

  // AI Optimization Fields (matching frontend expectations)
  cognitive_load: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'soon' | 'later';
  priority_score: number;

  // Session Execution
  actual_start?: string;
  actual_end?: string;
  actual_duration_minutes?: number;
  status:
    | 'scheduled'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'rescheduled';
  completion_percentage: number;

  // Rewards and Motivation (matching frontend xpReward)
  xp_reward: number;
  xp_earned: number;

  // Metadata
  is_ai_suggested: boolean;
  optimization_score?: number;
  calendar_position?: number;
  session_notes?: string;
  effectiveness_rating?: number;
  focus_score?: number;

  created_at: string;
  updated_at: string;
}

// Frontend-compatible interface (matches existing schedule page)
export interface FrontendStudySession {
  id: string;
  title: string;
  course: string;
  duration: string;
  cognitiveLoad: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'soon' | 'later';
  xpReward: number;
  type: 'assignment' | 'study' | 'meeting' | 'lab';
  dueIn?: string;
  estimatedStart: string; // Time format like "14:30"
  isGhost?: boolean;
}

export interface SessionNote {
  id: string;
  session_id: string;
  user_id: string;
  note_type: 'general' | 'reflection' | 'issue' | 'success';
  content: string;
  note_timestamp: string;
  metadata?: Record<string, any>;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSchedulePreferences {
  user_id: string;

  // Core Hours Configuration
  core_start_hour: number;
  core_end_hour: number;
  timezone: string;

  // Session Preferences
  default_session_length: number;
  default_break_length: number;
  max_daily_study_hours: number;

  // Cognitive Load Distribution
  preferred_high_cognitive_slots?: number[];
  avoided_time_slots?: number[];

  // AI Optimization Settings
  enable_ai_optimization: boolean;
  enable_ai_suggestions: boolean;
  optimization_aggressiveness: number;

  // Notification Settings
  enable_session_reminders: boolean;
  reminder_minutes_before: number;
  enable_deadline_alerts: boolean;

  // Display Preferences
  default_view: 'calendar' | 'list' | 'timeline';
  show_weekends: boolean;
  calendar_start_hour: number;
  calendar_end_hour: number;

  // Course Color Mapping
  course_colors?: Record<string, string>;

  created_at: string;
  updated_at: string;
}

export interface SessionAnalytics {
  id: string;
  user_id: string;
  session_id?: string;

  // Analytics Event Data
  event_type: string;
  event_timestamp: string;

  // Performance Metrics
  planned_vs_actual_duration?: number;
  focus_interruptions: number;
  context_switches: number;

  // AI Insights
  optimization_followed?: boolean;
  suggestion_effectiveness?: number;

  // User Behavior
  device_type?: string;
  time_to_start?: number;
  session_satisfaction?: number;

  // Contextual Data
  metadata?: Record<string, any>;

  created_at: string;
}

export interface AISessionSuggestion {
  id: string;
  user_id: string;

  // Suggestion Details
  suggestion_type:
    | 'schedule_optimization'
    | 'time_block'
    | 'break_reminder'
    | 'focus_session';
  title: string;
  description?: string;

  // Suggested Session Data
  suggested_start?: string;
  suggested_duration?: number;
  suggested_course_id?: string;
  suggested_cognitive_load?: 'high' | 'medium' | 'low';

  // AI Confidence and Reasoning
  confidence_score: number;
  reasoning?: string;
  algorithm_version: string;

  // User Response
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
  user_feedback?: string;
  applied_at?: string;

  // Metadata
  priority_score: number;
  expires_at?: string;
  suggestion_metadata?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export interface ScheduleOptimizationResult {
  optimized_sessions: StudySession[];
  suggestions: AISessionSuggestion[];
  analytics: {
    optimization_score: number;
    time_saved_minutes: number;
    cognitive_load_balance: number;
    adherence_probability: number;
  };
  reasoning: string;
}

export interface ScheduleDashboardAnalytics {
  // Daily Statistics
  today_sessions_completed: number;
  today_study_minutes: number;
  today_xp_earned: number;

  // Weekly Overview
  week_sessions_planned: number;
  week_sessions_completed: number;
  week_completion_rate: number;
  week_study_hours: number;

  // Monthly Trends
  month_average_daily_hours: number;
  month_most_productive_time: string;
  month_completion_streak: number;

  // Performance Insights
  avg_session_effectiveness: number;
  avg_focus_score: number;
  optimal_session_length: number;
  peak_productivity_hours: number[];

  // AI Insights
  ai_suggestions_followed: number;
  ai_suggestions_effectiveness: number;
  optimization_improvement: number;
}

// ===============================
// API REQUEST/RESPONSE TYPES
// ===============================

export interface CreateSessionRequest {
  title: string;
  description?: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  course_id?: string;
  study_plan_id?: string;
  study_goal_id?: string;
  session_type?: string;
  cognitive_load?: 'high' | 'medium' | 'low';
  urgency?: 'urgent' | 'soon' | 'later';
  priority_score?: number;
  xp_reward?: number;
  is_ai_suggested?: boolean;
  calendar_position?: number;
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  duration_minutes?: number;
  course_id?: string;
  study_plan_id?: string;
  study_goal_id?: string;
  session_type?: string;
  cognitive_load?: 'high' | 'medium' | 'low';
  urgency?: 'urgent' | 'soon' | 'later';
  priority_score?: number;
  xp_reward?: number;
  calendar_position?: number;
  session_notes?: string;
}

export interface BulkUpdateSessionsRequest {
  sessions: Array<{
    id: string;
    scheduled_start?: string;
    scheduled_end?: string;
    duration_minutes?: number;
    calendar_position?: number;
  }>;
}

export interface CompleteSessionRequest {
  completion_percentage?: number;
  effectiveness_rating?: number;
  focus_score?: number;
  session_notes?: string;
}

export interface GetSessionsParams {
  start_date?: string;
  end_date?: string;
  course_id?: string;
  status?: string;
  session_type?: string;
  limit?: string;
  offset?: string;
}

export interface OptimizeScheduleRequest {
  start_date?: string;
  days_ahead?: number;
  params?: {
    prioritize_deadlines?: boolean;
    balance_cognitive_load?: boolean;
    respect_preferences?: boolean;
    max_daily_hours?: number;
  };
}

// ===============================
// API METHODS
// ===============================

export const scheduleAPI = {
  // ===== SESSION MANAGEMENT =====

  /**
   * Get user's study sessions with filtering
   */
  async getSessions(params: GetSessionsParams = {}) {
    // Convert params to Record<string, string> for API client
    const queryParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = String(value);
      }
    });
    
    const response = await apiClient.get('/api/v2/schedule/sessions', {
      params: queryParams,
    });
    return response;
  },

  /**
   * Create a new study session
   */
  async createSession(data: CreateSessionRequest) {
    const response = await apiClient.post('/api/v2/schedule/sessions', data);
    return response;
  },

  /**
   * Update an existing session
   */
  async updateSession(sessionId: string, data: UpdateSessionRequest) {
    const response = await apiClient.put(
      `/api/v2/schedule/sessions/${sessionId}`,
      data,
    );
    return response;
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string) {
    const response = await apiClient.delete(
      `/api/v2/schedule/sessions/${sessionId}`,
    );
    return response;
  },

  /**
   * Bulk update sessions (for drag-and-drop operations)
   */
  async bulkUpdateSessions(data: BulkUpdateSessionsRequest) {
    const response = await apiClient.put(
      '/api/v2/schedule/sessions/bulk',
      data,
    );
    return response;
  },

  /**
   * Start a study session
   */
  async startSession(sessionId: string) {
    const response = await apiClient.post(
      `/api/v2/schedule/sessions/${sessionId}/start`,
    );
    return response;
  },

  /**
   * Complete a study session
   */
  async completeSession(sessionId: string, data: CompleteSessionRequest = {}) {
    const response = await apiClient.post(
      `/api/v2/schedule/sessions/${sessionId}/complete`,
      data,
    );
    return response;
  },

  // ===== USER PREFERENCES =====

  /**
   * Get user's schedule preferences
   */
  async getPreferences(): Promise<UserSchedulePreferences> {
    const response = await apiClient.get('/api/v2/schedule/preferences');
    return response;
  },

  /**
   * Update user's schedule preferences
   */
  async updatePreferences(data: Partial<UserSchedulePreferences>) {
    const response = await apiClient.put('/api/v2/schedule/preferences', data);
    return response;
  },

  // ===== AI OPTIMIZATION =====

  /**
   * AI-powered schedule optimization
   */
  async optimizeSchedule(
    data: OptimizeScheduleRequest = {},
  ): Promise<ScheduleOptimizationResult> {
    const response = await apiClient.post('/api/v2/schedule/ai/optimize', data);
    return response;
  },

  /**
   * Get AI-generated schedule suggestions
   */
  async getAISuggestions(
    params: { type?: string; status?: string; limit?: number } = {},
  ) {
    const response = await apiClient.get('/api/v2/schedule/ai/suggestions', {
      params: {
        type: params.type || '',
        status: params.status || '',
        limit: params.limit?.toString() || '',
      },
    });
    return response;
  },

  /**
   * Apply an AI suggestion
   */
  async applyAISuggestion(suggestionId: string) {
    const response = await apiClient.post(
      `/api/v2/schedule/ai/suggestions/${suggestionId}/apply`,
    );
    return response;
  },

  // ===== ANALYTICS =====

  /**
   * Get comprehensive schedule analytics for dashboard
   */
  async getDashboardAnalytics(
    daysBack: number = 30,
  ): Promise<ScheduleDashboardAnalytics> {
    const response = await apiClient.get(
      '/api/v2/schedule/analytics/dashboard',
      {
        params: { days_back: daysBack.toString() },
      },
    );
    return response;
  },

  /**
   * Get AI-powered schedule insights and recommendations
   */
  async getScheduleInsights() {
    const response = await apiClient.get('/api/v2/schedule/analytics/insights');
    return response;
  },
};

// ===============================
// UTILITY FUNCTIONS
// ===============================

/**
 * Convert backend StudySession to frontend-compatible format
 */
export function transformSessionForFrontend(
  session: StudySession,
  courseName?: string,
): FrontendStudySession {
  // Extract time from ISO datetime
  const startTime = new Date(session.scheduled_start).toLocaleTimeString(
    'en-US',
    {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    },
  );

  return {
    id: session.id,
    title: session.title,
    course: courseName || session.course_id || 'Unknown Course',
    duration: `${session.duration_minutes}min`,
    cognitiveLoad: session.cognitive_load,
    urgency: session.urgency,
    xpReward: session.xp_reward,
    type: session.session_type as FrontendStudySession['type'],
    estimatedStart: startTime,
    isGhost: session.is_ai_suggested,
  };
}

/**
 * Convert frontend session data to backend format
 */
export function transformSessionForBackend(
  frontendSession: Partial<FrontendStudySession>,
  courseId?: string,
  date?: Date,
): Partial<CreateSessionRequest> {
  const baseDate = date || new Date();

  // Parse time and create full datetime
  let scheduledStart: Date | undefined;
  let scheduledEnd: Date | undefined;

  if (frontendSession.estimatedStart) {
    const [hours, minutes] = frontendSession.estimatedStart
      .split(':')
      .map(Number);
    scheduledStart = new Date(baseDate);
    scheduledStart.setHours(hours, minutes, 0, 0);

    const durationMinutes = frontendSession.duration
      ? parseInt(frontendSession.duration.replace('min', ''))
      : 45;

    scheduledEnd = new Date(scheduledStart);
    scheduledEnd.setMinutes(scheduledEnd.getMinutes() + durationMinutes);
  }

  return {
    title: frontendSession.title,
    course_id: courseId,
    scheduled_start: scheduledStart?.toISOString(),
    scheduled_end: scheduledEnd?.toISOString(),
    duration_minutes: frontendSession.duration
      ? parseInt(frontendSession.duration.replace('min', ''))
      : undefined,
    cognitive_load: frontendSession.cognitiveLoad,
    urgency: frontendSession.urgency,
    xp_reward: frontendSession.xpReward,
    session_type: frontendSession.type,
    is_ai_suggested: frontendSession.isGhost || false,
  };
}

/**
 * Generate default preferences for new users
 */
export function getDefaultSchedulePreferences(): Partial<UserSchedulePreferences> {
  return {
    core_start_hour: 8,
    core_end_hour: 18,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    default_session_length: 45,
    default_break_length: 15,
    max_daily_study_hours: 8,
    enable_ai_optimization: true,
    enable_ai_suggestions: true,
    optimization_aggressiveness: 5.0,
    enable_session_reminders: true,
    reminder_minutes_before: 15,
    enable_deadline_alerts: true,
    default_view: 'calendar',
    show_weekends: false,
    calendar_start_hour: 6,
    calendar_end_hour: 22,
  };
}

export default scheduleAPI;