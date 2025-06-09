/**
 * Hook for managing study time analytics and session tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { type StudyTimeAnalytics, type StudySessionResponse } from '@/lib/api/analytics';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('[useStudyTime] Fetching study time data from Supabase...');
      
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(0); // All time
      }
      
      // Fetch study sessions from Supabase
      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      // Handle missing table gracefully
      if (sessionsError) {
        console.warn('[useStudyTime] study_sessions table not available:', sessionsError.message);
        // Return empty data instead of throwing
        const emptyData: StudyTimeAnalytics = {
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
        };
        setStudyTime(emptyData);
        setIsLoading(false);
        return;
      }
      
      // Calculate summary metrics
      const totalSessions = sessions?.length || 0;
      const totalMinutes = sessions?.reduce((sum, session) => 
        sum + (session.actual_duration || 0), 0) || 0;
      const totalHours = totalMinutes / 60;
      const avgSessionMinutes = totalSessions > 0 ? totalMinutes / totalSessions : 0;
      const avgSessionHours = avgSessionMinutes / 60;
      
      // Calculate study streak (simplified - consecutive days with sessions)
      const studyDays = new Set(
        sessions?.map(s => new Date(s.created_at).toDateString()) || []
      );
      const studyStreak = studyDays.size; // Simplified - actual streak logic would be more complex
      
      // Calculate quality metrics
      const ratedSessions = sessions?.filter(s => s.focus_score !== null || s.effectiveness_rating !== null) || [];
      const avgFocusScore = ratedSessions.length > 0
        ? ratedSessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / ratedSessions.length
        : null;
      const avgEffectiveness = ratedSessions.length > 0
        ? ratedSessions.reduce((sum, s) => sum + (s.effectiveness_rating || 0), 0) / ratedSessions.length
        : null;
      
      // Group by course
      const courseBreakdown: Record<string, any> = {};
      for (const session of sessions || []) {
        if (session.course_id) {
          if (!courseBreakdown[session.course_id]) {
            courseBreakdown[session.course_id] = {
              sessions: 0,
              total_minutes: 0,
              course_title: session.course_id // We'd need to join with courses table for actual title
            };
          }
          courseBreakdown[session.course_id].sessions++;
          courseBreakdown[session.course_id].total_minutes += session.actual_duration || 0;
        }
      }
      
      // Group by day
      const dailyBreakdown: any[] = [];
      const dailyMap = new Map<string, { sessions: number; total_minutes: number }>();
      
      for (const session of sessions || []) {
        const date = new Date(session.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { sessions: 0, total_minutes: 0 };
        existing.sessions++;
        existing.total_minutes += session.actual_duration || 0;
        dailyMap.set(date, existing);
      }
      
      dailyMap.forEach((value, date) => {
        dailyBreakdown.push({ date, ...value });
      });
      
      // Recent sessions
      const recentSessions = (sessions || []).slice(0, 5).map(session => ({
        id: session.id,
        title: session.title || 'Study Session',
        date: session.created_at,
        duration_minutes: session.actual_duration || 0,
        focus_score: session.focus_score,
        effectiveness_rating: session.effectiveness_rating,
        course_id: session.course_id
      }));
      
      // Set the study time data
      const studyTimeData: StudyTimeAnalytics = {
        period: period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time',
        summary: {
          total_sessions: totalSessions,
          total_hours: Math.round(totalHours * 10) / 10,
          total_minutes: totalMinutes,
          avg_session_hours: Math.round(avgSessionHours * 10) / 10,
          avg_session_minutes: Math.round(avgSessionMinutes),
          study_streak_days: studyStreak
        },
        quality_metrics: {
          avg_focus_score: avgFocusScore,
          avg_effectiveness: avgEffectiveness,
          total_ratings: ratedSessions.length
        },
        course_breakdown: courseBreakdown,
        daily_breakdown: dailyBreakdown,
        recent_sessions: recentSessions
      };
      
      console.log('[useStudyTime] Study time data:', studyTimeData);
      setStudyTime(studyTimeData);
      
    } catch (err: any) {
      console.error('[useStudyTime] Error fetching study time:', err);
      setError('Failed to load study time data');
      
      // Provide fallback data
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
      console.log('[useStudyTime] Starting study session in Supabase...');
      
      // Check if there's already an active session (gracefully handle missing table)
      const { data: existingSession, error: checkError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('end_time', null)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('[useStudyTime] study_sessions table not available for session check');
        toast.error('Study session tracking not available');
        return false;
      }
      
      if (existingSession) {
        toast.error('You already have an active study session');
        return false;
      }
      
      // Create new session (gracefully handle missing table)
      const { data: newSession, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          title: title || 'Study Session',
          course_id: courseId,
          session_type: 'study',
          start_time: new Date().toISOString(),
          planned_duration: 60, // Default 60 minutes
          status: 'active'
        })
        .select()
        .single();
      
      if (error) {
        console.warn('[useStudyTime] study_sessions table not available for session creation');
        toast.error('Study session tracking not available');
        return false;
      }
      
      const sessionResponse: StudySessionResponse = {
        session_id: newSession.id,
        title: newSession.title,
        started_at: newSession.start_time,
        status: 'active'
      };
      
      console.log('[useStudyTime] Session started:', sessionResponse);
      setActiveSession(sessionResponse);
      
      toast.success('Study session started!', {
        description: 'Your study time is now being tracked.',
        duration: 3000
      });
      
      return true;
    } catch (err: any) {
      console.error('[useStudyTime] Failed to start session:', err);
      toast.error('Failed to start study session');
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
      console.log('[useStudyTime] Ending study session in Supabase...');
      
      const endTime = new Date();
      const startTime = new Date(activeSession.started_at);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      // Update the session in Supabase
      const { error } = await supabase
        .from('study_sessions')
        .update({
          end_time: endTime.toISOString(),
          actual_duration: durationMinutes,
          focus_score: rating?.focus_score,
          effectiveness_rating: rating?.effectiveness_rating,
          notes: rating?.notes,
          status: 'completed'
        })
        .eq('id', activeSession.session_id);
      
      if (error) throw error;
      
      // Calculate XP earned (simple formula: 1 XP per minute + bonuses)
      let xpEarned = durationMinutes;
      if (rating?.focus_score && rating.focus_score >= 8) xpEarned += 10;
      if (rating?.effectiveness_rating && rating.effectiveness_rating >= 4) xpEarned += 5;
      
      // Create an activity record for XP earning
      // This will trigger the database to update all metrics automatically
      await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: 'study_session',
          xp_earned: xpEarned,
          metadata: {
            session_id: activeSession.session_id,
            duration_minutes: durationMinutes,
            focus_score: rating?.focus_score,
            effectiveness_rating: rating?.effectiveness_rating
          }
        });
      
      // The database triggers will automatically update:
      // - total_xp in user_stats
      // - weekly_xp in user_stats  
      // - monthly_xp in user_stats
      // - study time metrics
      
      console.log('[useStudyTime] Session ended successfully');
      setActiveSession(null);
      
      // Refresh study time data
      await refreshStudyTime();
      
      toast.success(`Study session completed! +${xpEarned} XP`, {
        description: `You studied for ${durationMinutes} minutes.`,
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