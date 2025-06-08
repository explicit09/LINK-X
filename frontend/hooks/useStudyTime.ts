/**
 * Hook for managing study time analytics and session tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI, type StudyTimeAnalytics, type StudySessionResponse } from '@/lib/api/analytics';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { apiCircuitBreaker } from '@/lib/utils/apiCircuitBreaker';

export interface UseStudyTimeReturn {
  // Data
  studyTime: StudyTimeAnalytics | null;
  activeSession: StudySessionResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshStudyTime: () => Promise<void>;
  startSession: (title?: string, courseId?: string) => Promise<boolean>;
  endSession: (rating?: { focus_score?: number; effectiveness_rating?: number; notes?: string }) => Promise<boolean>;
  
  // Computed values
  weeklyStudyHours: number;
  avgSessionLength: number;
  studyStreak: number;
}

export function useStudyTime(period: 'week' | 'month' | 'all' = 'week'): UseStudyTimeReturn {
  const { user } = useAuth();
  const [studyTime, setStudyTime] = useState<StudyTimeAnalytics | null>(null);
  const [activeSession, setActiveSession] = useState<StudySessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStudyTime = useCallback(async () => {
    if (!user) return;
    
    const endpoint = '/api/v2/analytics/study-time';
    
    // Check circuit breaker before making request
    if (!apiCircuitBreaker.shouldAllowRequest(endpoint)) {
      const status = apiCircuitBreaker.getStatus(endpoint);
      console.log(`[useStudyTime] Circuit breaker is open for ${endpoint}, retry in ${status.retryIn}s`);
      setError(`Study time service temporarily unavailable (retry in ${status.retryIn}s)`);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useStudyTime] Fetching study time data...');
      
      const data = await analyticsAPI.getStudyTime(period);
      console.log('[useStudyTime] Study time data:', data);
      setStudyTime(data);
      
      // Record success
      apiCircuitBreaker.recordSuccess(endpoint);
      
    } catch (err: any) {
      console.warn('[useStudyTime] API temporarily unavailable, using fallback data');
      
      // Record failure
      apiCircuitBreaker.recordFailure(endpoint);
      
      // Check if it's a server error (500) and provide user-friendly message
      const isServerError = err.message?.includes('500') || err.message?.includes('Internal Server Error');
      if (isServerError) {
        setError('Study time data temporarily unavailable');
      } else {
        setError('Failed to load study time data');
      }
      
      // Provide comprehensive fallback data
      setStudyTime({
        period: period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time',
        summary: {
          total_sessions: 0,
          total_hours: 0,
          total_minutes: 0,
          avg_session_hours: 0,
          avg_session_minutes: 0,
          study_streak_days: 0
        },
        quality_metrics: {
          avg_focus_score: null,
          avg_effectiveness: null,
          total_ratings: 0
        },
        course_breakdown: {},
        daily_breakdown: [],
        recent_sessions: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, period]);

  const startSession = useCallback(async (title?: string, courseId?: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      console.log('[useStudyTime] Starting study session...');
      
      const sessionData = await analyticsAPI.startStudySession({
        title: title || 'Study Session',
        course_id: courseId,
        session_type: 'study'
      });
      
      console.log('[useStudyTime] Session started:', sessionData);
      setActiveSession(sessionData);
      
      toast.success('Study session started!', {
        description: 'Your study time is now being tracked.',
        duration: 3000
      });
      
      return true;
    } catch (err: any) {
      console.error('[useStudyTime] Failed to start session:', err);
      // Only show error toast if it's not the "already have active session" error
      if (!err.message?.includes('already have an active session')) {
        toast.error('Failed to start study session');
      }
      return false;
    }
  }, [user]);

  const endSession = useCallback(async (rating?: { 
    focus_score?: number; 
    effectiveness_rating?: number; 
    notes?: string; 
  }): Promise<boolean> => {
    if (!user || !activeSession) return false;
    
    try {
      console.log('[useStudyTime] Ending study session...');
      
      const result = await analyticsAPI.endStudySession(activeSession.session_id, rating);
      
      console.log('[useStudyTime] Session ended:', result);
      setActiveSession(null);
      
      // Refresh study time data
      await refreshStudyTime();
      
      toast.success(`Study session completed! +${result.xp_earned} XP`, {
        description: `You studied for ${Math.round(result.duration_minutes)} minutes.`,
        duration: 5000
      });
      
      return true;
    } catch (err) {
      console.error('[useStudyTime] Failed to end session:', err);
      toast.error('Failed to end study session');
      return false;
    }
  }, [user, activeSession, refreshStudyTime]);

  // Load study time data when component mounts or user changes
  useEffect(() => {
    if (user) {
      refreshStudyTime();
    }
  }, [user, refreshStudyTime]);

  // Check for active session on mount (in case of page refresh)
  useEffect(() => {
    // Load active session from localStorage as fallback
    const savedSession = localStorage.getItem('activeStudySession');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        setActiveSession(sessionData);
      } catch (err) {
        console.error('Failed to parse saved session:', err);
        localStorage.removeItem('activeStudySession');
      }
    }
  }, []);

  // Save active session to localStorage
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('activeStudySession', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('activeStudySession');
    }
  }, [activeSession]);

  // Computed values
  const weeklyStudyHours = studyTime?.summary.total_hours || 0;
  const avgSessionLength = studyTime?.summary.avg_session_minutes || 0;
  const studyStreak = studyTime?.summary.study_streak_days || 0;

  return {
    studyTime,
    activeSession,
    isLoading,
    error,
    refreshStudyTime,
    startSession,
    endSession,
    weeklyStudyHours,
    avgSessionLength,
    studyStreak
  };
}