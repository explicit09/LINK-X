/**
 * Study Plans API Endpoints
 */
import { apiClient } from '../client';

// Type definitions
export interface StudyPlan {
  id: string;
  plan_name: string;
  weekly_study_hours: number;
  preferred_session_length: number;
  break_length: number;
  peak_hours?: number[];
  learning_style?: string;
  difficulty_preference: string;
  reminder_enabled: boolean;
  reminder_time?: string;
  is_active: boolean;
  goals?: StudyGoal[];
  analytics?: StudyPlanAnalytics;
  created_at: string;
  updated_at: string;
}

export interface StudyGoal {
  id: string;
  title: string;
  description?: string;
  goal_type: 'daily' | 'weekly' | 'assignment' | 'review' | 'practice';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_hours?: number;
  target_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completion_percentage: number;
  xp_reward: number;
  course_id?: string;
  module_id?: string;
  file_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  goal_id?: string;
  course_id?: string;
  session_type: string;
  start_time: string;
  end_time?: string;
  planned_duration?: number;
  actual_duration?: number;
  effectiveness_rating?: number;
  focus_score?: number;
  xp_earned: number;
  notes?: string;
}

export interface StudyRecommendation {
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  action_text?: string;
  priority_score: number;
  confidence_score: number;
  reasoning?: string;
  suggested_time?: string;
  estimated_impact?: string;
  xp_reward: number;
  status: 'active' | 'applied' | 'dismissed' | 'expired';
  created_at: string;
}

export interface StudyPlanAnalytics {
  plan_id: string;
  plan_name: string;
  total_goals: number;
  completed_goals: number;
  active_goals: number;
  pending_goals: number;
  avg_completion: number;
  total_study_minutes: number;
  total_study_hours: number;
  study_days: number;
  avg_effectiveness: number;
  avg_focus_score: number;
}

export interface CreateStudyPlanData {
  plan_name?: string;
  weekly_study_hours?: number;
  preferred_session_length?: number;
  break_length?: number;
  peak_hours?: number[];
  learning_style?: string;
  difficulty_preference?: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  is_active?: boolean;
  initial_goals?: Partial<StudyGoal>[];
}

export interface CreateGoalData {
  study_plan_id: string;
  title: string;
  description?: string;
  goal_type?: string;
  priority?: string;
  estimated_hours?: number;
  target_date?: string;
  course_id?: string;
  module_id?: string;
  file_id?: string;
  xp_reward?: number;
}

export interface StartSessionData {
  goal_id?: string;
  course_id?: string;
  session_type?: string;
  planned_duration?: number;
  metadata?: Record<string, any>;
}

export interface EndSessionData {
  actual_duration?: number;
  effectiveness_rating?: number;
  focus_score?: number;
  notes?: string;
}

export interface LogProgressData {
  time_spent_minutes?: number;
  tasks_completed?: number;
  notes?: string;
  mood_rating?: number;
  difficulty_rating?: number;
  progress_date?: string;
}

// Study Plans API
export const studyPlansAPI = {
  // Study Plan endpoints
  listPlans: async (includeInactive = false) => {
    try {
      const response = await apiClient.get<any>(
        `/api/v2/study-plans?include_inactive=${includeInactive}`,
      );
      console.log('Study Plans API - listPlans response:', response);
      return response.data || response;
    } catch (error) {
      console.error('Study Plans API - listPlans error:', error);
      throw error;
    }
  },

  createPlan: (data: CreateStudyPlanData) =>
    apiClient.post<StudyPlan>('/api/v2/study-plans', data),

  getPlan: (planId: string) =>
    apiClient.get<StudyPlan>(`/api/v2/study-plans/${planId}`),

  updatePlan: (planId: string, data: Partial<CreateStudyPlanData>) =>
    apiClient.patch<StudyPlan>(`/api/v2/study-plans/${planId}`, data),

  getActivePlan: async () => {
    try {
      const response = await apiClient.get<any>('/api/v2/study-plans/active');
      console.log('Study Plans API - getActivePlan response:', response);
      return response.data || response;
    } catch (error: any) {
      // Don't log 404 errors as they're expected for new users
      if (error?.response?.status !== 404) {
        console.error('Study Plans API - getActivePlan error:', error);
      }
      // Return null instead of throwing to avoid breaking the UI
      return null;
    }
  },

  // Goal endpoints
  listGoals: async (params?: {
    status?: string;
    priority?: string;
    limit?: number;
  }) => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.priority) searchParams.set('priority', params.priority);
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const query = searchParams.toString();
      const response = await apiClient.get<any>(
        `/api/v2/study-plans/goals${query ? `?${query}` : ''}`,
      );
      console.log('Study Plans API - listGoals response:', response);
      // Handle wrapped response
      return response.data || response;
    } catch (error) {
      console.error('Study Plans API - listGoals error:', error);
      // Return empty array instead of throwing to avoid breaking the UI
      return [];
    }
  },

  createGoal: (data: CreateGoalData) =>
    apiClient.post<StudyGoal>('/api/v2/study-plans/goals', data),

  updateGoal: (goalId: string, data: Partial<StudyGoal>) =>
    apiClient.patch<StudyGoal>(`/api/v2/study-plans/goals/${goalId}`, data),

  logGoalProgress: (goalId: string, data: LogProgressData) =>
    apiClient.post(`/api/v2/study-plans/goals/${goalId}/progress`, data),

  // Session endpoints
  listSessions: async (params?: {
    limit?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.start_date) searchParams.set('start_date', params.start_date);
      if (params?.end_date) searchParams.set('end_date', params.end_date);

      const query = searchParams.toString();
      const response = await apiClient.get<StudySession[]>(
        `/api/v2/study-plans/sessions${query ? `?${query}` : ''}`,
      );
      console.log('Study Plans API - listSessions response:', response);
      return response.data || response;
    } catch (error) {
      console.error('Study Plans API - listSessions error:', error);
      return [];
    }
  },

  startSession: (data: StartSessionData) =>
    apiClient.post<StudySession>('/api/v2/study-plans/sessions', data),

  endSession: (sessionId: string, data: EndSessionData) =>
    apiClient.post<StudySession>(
      `/api/v2/study-plans/sessions/${sessionId}/end`,
      data,
    ),

  // Recommendation endpoints
  listRecommendations: async (limit?: number) => {
    try {
      const query = limit ? `?limit=${limit}` : '';
      const response = await apiClient.get<any>(
        `/api/v2/study-plans/recommendations${query}`,
      );
      console.log('Study Plans API - listRecommendations response:', response);
      return response.data || response;
    } catch (error) {
      console.error('Study Plans API - listRecommendations error:', error);
      // Return empty array instead of throwing
      return [];
    }
  },

  applyRecommendation: (recId: string) =>
    apiClient.post(`/api/v2/study-plans/recommendations/${recId}/apply`),

  dismissRecommendation: (recId: string) =>
    apiClient.post(`/api/v2/study-plans/recommendations/${recId}/dismiss`),

  // Analytics
  getAnalytics: async (days = 30) => {
    try {
      const response = await apiClient.get<any>(`/api/v2/study-plans/analytics?days=${days}`);
      console.log('Study Plans API - getAnalytics response:', response);
      return response.data || response;
    } catch (error) {
      console.error('Study Plans API - getAnalytics error:', error);
      // Return null instead of throwing
      return null;
    }
  },
};
