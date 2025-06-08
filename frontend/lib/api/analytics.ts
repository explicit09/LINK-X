/**
 * API client for learning analytics and engagement tracking
 */

import { apiClient } from './client';

// Types
export interface EngagementData {
  event_type: 'view' | 'scroll' | 'interaction' | 'completion';
  content_id: string;
  content_type: 'file' | 'module' | 'course' | 'section';
  interaction_data: {
    scroll_depth?: number;
    time_spent?: number;
    focus_time?: number;
    actions?: string[];
    session_quality?: number;
  };
  timestamp?: string;
}

export interface StudentAnalytics {
  user_id: string;
  total_study_time: number;
  engagement_score: number;
  content_completion_rate: number;
  favorite_content_types: string[];
  peak_learning_hours: number[];
  learning_streak: number;
  recent_activity: ActivitySummary[];
  performance_trends: PerformanceTrend[];
}

export interface ProfessorInsights {
  course_id: string;
  total_students: number;
  avg_engagement_score: number;
  content_performance: ContentPerformance[];
  struggling_students: StudentSummary[];
  popular_content: PopularContent[];
  engagement_trends: EngagementTrend[];
}

export interface ActivitySummary {
  date: string;
  total_time: number;
  engagement_score: number;
  content_accessed: number;
  milestones_reached: number;
}

export interface PerformanceTrend {
  date: string;
  engagement: number;
  completion_rate: number;
  focus_score: number;
}

export interface ContentPerformance {
  content_id: string;
  content_title: string;
  avg_engagement: number;
  completion_rate: number;
  total_views: number;
  avg_time_spent: number;
}

export interface StudentSummary {
  user_id: string;
  username: string;
  engagement_score: number;
  last_active: string;
  completion_rate: number;
  needs_attention: boolean;
}

export interface PopularContent {
  content_id: string;
  title: string;
  view_count: number;
  avg_engagement: number;
  content_type: string;
}

export interface EngagementTrend {
  date: string;
  avg_engagement: number;
  active_users: number;
  total_interactions: number;
}

export interface LearningPattern {
  pattern_type: 'peak_hours' | 'content_preference' | 'session_length' | 'difficulty_progression';
  pattern_data: any;
  confidence_score: number;
  recommendations: string[];
}

// Study Time Analytics Types
export interface StudyTimeAnalytics {
  period: string;
  summary: StudyTimeSummary;
  quality_metrics: StudyQualityMetrics;
  course_breakdown: Record<string, CourseStudyTime>;
  daily_breakdown: DailyStudyTime[];
  recent_sessions: StudySessionSummary[];
}

export interface StudyTimeSummary {
  total_sessions: number;
  total_hours: number;
  total_minutes: number;
  avg_session_hours: number;
  avg_session_minutes: number;
  study_streak_days: number;
}

export interface StudyQualityMetrics {
  avg_focus_score: number | null;
  avg_effectiveness: number | null;
  total_ratings: number;
}

export interface CourseStudyTime {
  sessions: number;
  total_minutes: number;
  course_title: string;
}

export interface DailyStudyTime {
  date: string;
  sessions: number;
  total_minutes: number;
}

export interface StudySessionSummary {
  id: string;
  title: string;
  date: string;
  duration_minutes: number;
  focus_score: number | null;
  effectiveness_rating: number | null;
  course_id: string | null;
}

export interface StudySessionRequest {
  title?: string;
  course_id?: string;
  session_type?: string;
}

export interface StudySessionResponse {
  session_id: string;
  title: string;
  started_at: string;
  status: string;
}

export interface EndSessionRequest {
  focus_score?: number; // 0-10
  effectiveness_rating?: number; // 1-5
  notes?: string;
}

export interface EndSessionResponse {
  session_id: string;
  duration_minutes: number;
  xp_earned: number;
  ended_at: string;
  status: string;
}

export const analyticsAPI = {
  /**
   * Track user engagement events
   */
  async trackEngagement(data: EngagementData): Promise<void> {
    try {
      await apiClient.post('/api/v2/analytics/track/engagement', data);
    } catch (error) {
      // Silent fail for analytics - don't disrupt user experience
      console.warn('Analytics tracking failed:', error);
    }
  },

  /**
   * Get student analytics dashboard data
   */
  async getStudentDashboard(userId?: string, timeRange: string = '30d'): Promise<StudentAnalytics> {
    const params = { time_range: timeRange };
    const endpoint = userId ? `/api/v2/analytics/student/${userId}/dashboard` : '/api/v2/analytics/student/dashboard';
    const response = await apiClient.get(endpoint, { params });
    return response.data.data;
  },

  /**
   * Get professor course insights
   */
  async getProfessorInsights(courseId: string, timeRange: string = '30d'): Promise<ProfessorInsights> {
    const response = await apiClient.get(`/api/v2/analytics/professor/course/${courseId}/insights`, {
      params: { time_range: timeRange }
    });
    return response.data.data;
  },

  /**
   * Get engagement summary for quick overview
   */
  async getEngagementSummary(userId?: string, timeRange: string = '7d'): Promise<any> {
    const params = { time_range: timeRange };
    const endpoint = userId ? `/api/v2/analytics/engagement/${userId}/summary` : '/api/v2/analytics/engagement/summary';
    const response = await apiClient.get(endpoint, { params });
    return response.data.data;
  },

  /**
   * Detect learning patterns using AI
   */
  async detectLearningPatterns(userId?: string, analysisType: string = 'comprehensive'): Promise<LearningPattern[]> {
    const data = { 
      user_id: userId,
      analysis_type: analysisType 
    };
    const response = await apiClient.post('/api/v2/analytics/patterns/detect', data);
    return response.data.data;
  },

  /**
   * Get content analytics for a specific file/module
   */
  async getContentAnalytics(contentId: string, contentType: string = 'file'): Promise<ContentPerformance> {
    const response = await apiClient.get(`/api/v2/analytics/content/${contentType}/${contentId}`);
    return response.data.data;
  },

  /**
   * Get course-level analytics summary
   */
  async getCourseAnalytics(courseId: string, timeRange: string = '30d'): Promise<any> {
    const response = await apiClient.get(`/api/v2/analytics/course/${courseId}`, {
      params: { time_range: timeRange }
    });
    return response.data.data;
  },

  /**
   * Export analytics data (for professors)
   */
  async exportAnalytics(courseId: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await apiClient.get(`/api/v2/analytics/export/course/${courseId}`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  // Study Time Analytics Methods

  /**
   * Get study time analytics for the user
   */
  async getStudyTime(period: 'week' | 'month' | 'all' = 'week', courseId?: string): Promise<StudyTimeAnalytics> {
    try {
      const params: any = { period };
      if (courseId) params.course_id = courseId;
      
      const response = await apiClient.get('/api/v2/analytics/study-time', { params }) as any;
      return response.data;
    } catch (error: any) {
      // Log the error but throw a more user-friendly message
      console.warn('Analytics API Error:', error.message);
      
      // Check if it's a specific type of error
      if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        throw new Error('Study time service temporarily unavailable');
      } else if (error.message?.includes('Network Error')) {
        throw new Error('Unable to connect to server');
      } else {
        throw new Error('An error occurred fetching study time data');
      }
    }
  },

  /**
   * Start a new study session
   */
  async startStudySession(data: StudySessionRequest): Promise<StudySessionResponse> {
    const response = await apiClient.post('/api/v2/analytics/study-time/session', data) as any;
    return response.data;
  },

  /**
   * End an active study session
   */
  async endStudySession(sessionId: string, data?: EndSessionRequest): Promise<EndSessionResponse> {
    const response = await apiClient.put(`/api/v2/analytics/study-time/session/${sessionId}/end`, data || {}) as any;
    return response.data;
  }
};