'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface AnalyticsData {
  overview: {
    this_week_activities: number;
    this_week_avg_duration: number;
    this_week_engagement: number;
    monthly_activities: number;
    avg_completion_rate: number;
    avg_engagement_score: number;
    current_xp: number;
    current_level: number;
    daily_streak: number;
  };
  engagement_trends: Array<{
    date: string;
    avg_engagement: number;
    session_count: number;
    avg_time_on_content: number;
  }>;
  learning_patterns: Record<string, any>;
  content_performance: Array<{
    file_id: string;
    title: string;
    avg_completion: number;
    avg_duration: number;
    access_count: number;
    last_accessed: string;
  }>;
  study_insights: {
    avg_session_length: number;
    avg_effectiveness: number;
    avg_focus_score: number;
    completed_sessions: number;
    missed_sessions: number;
    total_xp_earned: number;
  };
  generated_at: string;
}

interface CourseInsights {
  course_summary: {
    total_students: number;
    week_avg_engagement: number;
    week_total_sessions: number;
    week_active_students: number;
  };
  insights: Record<string, any>;
  module_completion: Array<{
    module_id: string;
    title: string;
    ordering: number;
    total_files: number;
    avg_completion_rate: number;
    avg_engagement_score: number;
  }>;
  generated_at: string;
}

interface EngagementSummary {
  period_days: number;
  summary: {
    total_sessions: number;
    avg_engagement: number;
    total_time_minutes: number;
    avg_interactions: number;
    active_days: number;
  };
  top_content: Array<{
    content_id: string;
    avg_engagement: number;
    session_count: number;
  }>;
  generated_at: string;
}

interface AnalyticsAPI {
  // Student Analytics
  getStudentDashboard: (days?: number) => Promise<AnalyticsData>;
  getEngagementSummary: (days?: number) => Promise<EngagementSummary>;
  detectPatterns: () => Promise<any>;
  getRecommendations: () => Promise<any>;
  
  // Professor Analytics
  getCourseInsights: (courseId: string) => Promise<CourseInsights>;
  
  // Engagement Tracking
  trackEngagement: (eventType: string, contentId: string, metrics: any) => Promise<any>;
}

export function useAnalytics(): {
  api: AnalyticsAPI;
  loading: boolean;
  error: string | null;
} {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    'Content-Type': 'application/json'
  }), []);

  const handleApiCall = useCallback(async <T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        return result.data;
      } else {
        throw new Error(result.message || 'API call failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const api: AnalyticsAPI = {
    // Student Analytics
    getStudentDashboard: useCallback(async (days = 30) => {
      return handleApiCall<AnalyticsData>(`/api/v2/analytics/student/dashboard?days=${days}`);
    }, [handleApiCall]),

    getEngagementSummary: useCallback(async (days = 7) => {
      return handleApiCall<EngagementSummary>(`/api/v2/analytics/engagement/summary?days=${days}`);
    }, [handleApiCall]),

    detectPatterns: useCallback(async () => {
      return handleApiCall(`/api/v2/analytics/patterns/detect`, {
        method: 'POST'
      });
    }, [handleApiCall]),

    getRecommendations: useCallback(async () => {
      return handleApiCall(`/api/v2/analytics/recommendations`);
    }, [handleApiCall]),

    // Professor Analytics
    getCourseInsights: useCallback(async (courseId: string) => {
      return handleApiCall<CourseInsights>(`/api/v2/analytics/professor/course/${courseId}/insights`);
    }, [handleApiCall]),

    // Engagement Tracking
    trackEngagement: useCallback(async (eventType: string, contentId: string, metrics: any) => {
      return handleApiCall(`/api/v2/analytics/track/engagement`, {
        method: 'POST',
        body: JSON.stringify({
          event_type: eventType,
          content_id: contentId,
          interaction_data: metrics
        })
      });
    }, [handleApiCall])
  };

  return {
    api,
    loading,
    error
  };
}

// Hook for tracking engagement on specific content
export function useContentEngagement(contentId: string, contentType: string = 'unknown') {
  const { api } = useAnalytics();
  const [isTracking, setIsTracking] = useState(false);

  const trackEvent = useCallback(async (
    eventType: string,
    metrics: {
      interaction_count?: number;
      scroll_depth_percentage?: number;
      time_on_content_seconds?: number;
      pause_count?: number;
      session_duration_seconds?: number;
      completion_percentage?: number;
      device_type?: string;
    }
  ) => {
    if (!contentId || isTracking) return;

    setIsTracking(true);
    try {
      await api.trackEngagement(eventType, contentId, {
        content_type: contentType,
        device_type: getDeviceType(),
        ...metrics
      });
    } catch (error) {
      console.warn('Failed to track engagement:', error);
      // Fail silently to not impact user experience
    } finally {
      setIsTracking(false);
    }
  }, [api, contentId, contentType, isTracking]);

  return {
    trackEvent,
    isTracking
  };
}

// Utility function to detect device type
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|ios/.test(userAgent)) return 'mobile';
  if (/tablet|ipad/.test(userAgent)) return 'tablet';
  return 'desktop';
}

// Hook for caching analytics data
export function useCachedAnalytics(cacheKey: string, fetcher: () => Promise<any>, ttl = 300000) { // 5 minutes TTL
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    const shouldFetch = force || !data || (now - lastFetch) > ttl;

    if (!shouldFetch) return data;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      setLastFetch(now);
      
      // Cache in localStorage for persistence
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: now
        }));
      } catch {
        // Ignore localStorage errors
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fetch failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [data, lastFetch, ttl, fetcher, cacheKey]);

  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        
        if (age < ttl) {
          setData(parsed.data);
          setLastFetch(parsed.timestamp);
        }
      }
    } catch {
      // Ignore cache errors
    }
  }, [cacheKey, ttl]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isStale: data && (Date.now() - lastFetch) > ttl * 0.8 // Consider stale at 80% of TTL
  };
}