import { AuthAPIClient } from './auth-client';
import type { RequestConfig } from './base-client';

export interface StudyPlan {
  id: string;
  plan_name: string;
  weekly_study_hours: number;
  preferred_session_length: number;
  learning_style: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudyGoal {
  id: string;
  study_plan_id: string;
  title: string;
  goal_type: 'daily' | 'weekly' | 'monthly';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  target_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudySession {
  id: string;
  study_plan_id: string;
  session_type: string;
  duration_minutes: number;
  start_time: string;
  end_time?: string;
  notes?: string;
  completed: boolean;
}

export interface StudyRecommendation {
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface StudyAnalytics {
  total_study_time: number;
  weekly_study_time: number;
  goals_completed: number;
  current_streak: number;
  efficiency_score: number;
}

/**
 * StudyPlanAPIClient - Handles study plan and goal management
 * PRESERVE exact API patterns from working study plan page
 */
export class StudyPlanAPIClient extends AuthAPIClient {

  // Study Plan management
  async getStudyPlans(): Promise<StudyPlan[]> {
    const response = await this.authenticatedGet<any>('/api/v2/study-plans');
    return response.data || response;
  }

  async getActivePlan(): Promise<StudyPlan | null> {
    try {
      const response = await this.authenticatedGet<any>('/api/v2/study-plans/active');
      return response.data || response;
    } catch (error) {
      // Return null if no active plan found
      return null;
    }
  }

  async createStudyPlan(planData: Partial<StudyPlan>): Promise<StudyPlan> {
    const response = await this.authenticatedPost<any>('/api/v2/study-plans', planData);
    return response.data || response;
  }

  async updateStudyPlan(planId: string, updates: Partial<StudyPlan>): Promise<StudyPlan> {
    const response = await this.authenticatedPatch<any>(`/api/v2/study-plans/${planId}`, updates);
    return response.data || response;
  }

  async deleteStudyPlan(planId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/study-plans/${planId}`);
  }

  // Study Goals management
  async getStudyGoals(filters?: {
    study_plan_id?: string;
    status?: string;
    goal_type?: string;
    priority?: string;
  }): Promise<StudyGoal[]> {
    const params = filters ? Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    ) : undefined;

    const response = await this.authenticatedGet<any>('/api/v2/study-plans/goals', { params });
    return response.data || response;
  }

  async createGoal(goalData: Partial<StudyGoal>): Promise<StudyGoal> {
    const response = await this.authenticatedPost<any>('/api/v2/study-plans/goals', goalData);
    return response.data || response;
  }

  async updateGoal(goalId: string, updates: Partial<StudyGoal>): Promise<StudyGoal> {
    const response = await this.authenticatedPatch<any>(`/api/v2/study-plans/goals/${goalId}`, updates);
    return response.data || response;
  }

  async deleteGoal(goalId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/study-plans/goals/${goalId}`);
  }

  async logGoalProgress(goalId: string, progressData: any): Promise<void> {
    await this.authenticatedPost(`/api/v2/study-plans/goals/${goalId}/progress`, progressData);
  }

  // Study Sessions management
  async getStudySessions(filters?: {
    study_plan_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<StudySession[]> {
    const params = filters ? Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    ) : undefined;

    const response = await this.authenticatedGet<any>('/api/v2/study-plans/sessions', { params });
    return response.data || response;
  }

  async startStudySession(sessionData: Partial<StudySession>): Promise<StudySession> {
    const response = await this.authenticatedPost<any>('/api/v2/study-plans/sessions', sessionData);
    return response.data || response;
  }

  async endStudySession(sessionId: string, endData?: {
    notes?: string;
    actual_duration?: number;
  }): Promise<StudySession> {
    const response = await this.authenticatedPost<any>(
      `/api/v2/study-plans/sessions/${sessionId}/end`,
      endData || {}
    );
    return response.data || response;
  }

  // Study Recommendations
  async getStudyRecommendations(): Promise<StudyRecommendation[]> {
    const response = await this.authenticatedGet<any>('/api/v2/study-plans/recommendations');
    return response.data || response;
  }

  async applyRecommendation(recommendationId: string): Promise<void> {
    await this.authenticatedPost(`/api/v2/study-plans/recommendations/${recommendationId}/apply`);
  }

  async dismissRecommendation(recommendationId: string): Promise<void> {
    await this.authenticatedDelete(`/api/v2/study-plans/recommendations/${recommendationId}`);
  }

  // Study Analytics
  async getStudyAnalytics(timeframe?: 'week' | 'month' | 'year'): Promise<StudyAnalytics> {
    const params = timeframe ? { timeframe } : undefined;
    const response = await this.authenticatedGet<any>('/api/v2/study-plans/analytics', { params });
    return response.data || response;
  }

  async getDashboardStats(): Promise<{
    aiInteractions: number;
    weeklyHours: number;
    totalGoals: number;
    completedGoals: number;
    currentStreak: number;
  }> {
    const response = await this.authenticatedGet<any>('/api/v2/study-plans/dashboard-stats');
    return response.data || response;
  }
}