/**
 * Schedule State Management Hook
 * Centralizes schedule state logic and reduces component complexity
 */

import { useState, useEffect } from 'react';
import { StudySession, CourseConfig, ScheduleFilters, ScheduleState } from '../types/schedule';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiClient } from '@/lib/api/client';
import { scheduleAPI, transformSessionForFrontend } from '@/lib/api/endpoints/schedule';

export function useScheduleState() {
  // Core state
  const [scheduleState, setScheduleState] = useState<ScheduleState>({
    sessions: [],
    selectedSession: null,
    activeSession: null,
    completedSessions: new Set(),
    isLoading: true,
  });

  // UI state
  const [viewMode, setViewMode] = useState<'stack' | 'calendar' | 'month'>('calendar');
  const [filters, setFilters] = useState<ScheduleFilters>({
    visibleFilters: new Set(['urgent', 'due-soon', 'completed']),
    hiddenCourses: new Set(),
    showCompressedHours: false,
  });

  // Use centralized auth user hook
  const { user: currentUser } = useAuthUser();
  
  // Course data
  const [userCourses, setUserCourses] = useState<any[]>([]);
  const [courseConfig, setCourseConfig] = useState<CourseConfig>({
    default: { color: '#6B7280', name: 'Course' },
  });

  // Local session management for immediate UI updates
  const [localSessions, setLocalSessions] = useState<StudySession[]>([]);

  // Session timing
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionProgress, setSessionProgress] = useState(0);

  // Load user and courses
  useEffect(() => {
    const loadUserAndCourses = async () => {
      try {
        setScheduleState(prev => ({ ...prev, isLoading: true }));

        // User profile is now handled by centralized auth hook

        // Load user courses
        try {
          const courses = await apiClient.getCourses();
          setUserCourses(courses || []);
          
          if (courses && courses.length > 0) {
            const courseColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#F97316', '#06B6D4'];
            const newCourseConfig: CourseConfig = {};
            
            courses.forEach((course: any, index: number) => {
              const courseCode = course.code || course.title || `Course ${index + 1}`;
              newCourseConfig[courseCode] = {
                color: courseColors[index % courseColors.length],
                name: course.title || course.name || courseCode
              };
            });
            
            setCourseConfig(newCourseConfig);
          }
          
          // Load schedule sessions
          try {
            // Get today's and upcoming sessions
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 7); // Get sessions for next 7 days
            
            const sessionsResponse = await scheduleAPI.getSessions({
              start_date: today.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              limit: '20'
            });
            
            console.log('Schedule API Response:', sessionsResponse);
            
            if (sessionsResponse?.data && Array.isArray(sessionsResponse.data) && sessionsResponse.data.length > 0) {
              // Transform backend sessions to frontend format
              const transformedSessions: StudySession[] = sessionsResponse.data.map((backendSession: any) => {
                // Find course name from our course config
                const courseName = Object.values(newCourseConfig).find(
                  (course: any) => course.name === backendSession.course_id
                )?.name || backendSession.course_id || 'Unknown Course';
                
                return transformSessionForFrontend(backendSession, courseName);
              });
              
              setScheduleState(prev => ({ ...prev, sessions: transformedSessions }));
            } else {
              // No sessions found - show empty state instead of mock data
              console.log('No sessions found from API');
              setScheduleState(prev => ({ ...prev, sessions: [] }));
            }
          } catch (error) {
            console.error('Failed to fetch schedule sessions:', error);
            // Show empty state on error - let user create their own sessions
            setScheduleState(prev => ({ ...prev, sessions: [] }));
          }
        } catch (error) {
          console.error('Failed to fetch courses:', error);
        }
      } finally {
        setScheduleState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadUserAndCourses();
  }, []);

  // Session progress timer
  useEffect(() => {
    if (!scheduleState.activeSession || !sessionStartTime) return;

    const timer = setInterval(() => {
      const now = new Date();
      const elapsed = now.getTime() - sessionStartTime.getTime();
      const totalDuration = parseDurationToMinutes(scheduleState.activeSession!.duration) * 60 * 1000;
      const progress = Math.min((elapsed / totalDuration) * 100, 100);

      setSessionProgress(progress);

      if (progress >= 100) {
        // Auto-complete session
        completeSession(scheduleState.activeSession!);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [scheduleState.activeSession, sessionStartTime]);

  // Helper functions
  const parseDurationToMinutes = (duration: string): number => {
    if (duration.includes('h')) {
      return parseFloat(duration.replace('h', '')) * 60;
    } else if (duration.includes('m')) {
      return parseInt(duration.replace('m', ''));
    }
    return 60;
  };

  const getCourseStyle = (courseName: string) => {
    return courseConfig[courseName] || courseConfig.default || { color: '#6B7280', name: 'Course' };
  };

  // Session operations
  const startSession = async (session: StudySession) => {
    try {
      // Call backend to start session
      await scheduleAPI.startSession(session.id);
      
      // Update local state
      setScheduleState(prev => ({ ...prev, activeSession: session }));
      setSessionStartTime(new Date());
      setSessionProgress(0);
      
      console.log('Session started successfully:', session.title);
    } catch (error) {
      console.error('Failed to start session:', error);
      // Still update local state for offline functionality
      setScheduleState(prev => ({ ...prev, activeSession: session }));
      setSessionStartTime(new Date());
      setSessionProgress(0);
    }
  };

  const completeSession = async (session: StudySession) => {
    try {
      // Calculate completion data
      const completionData = {
        completion_percentage: 100,
        effectiveness_rating: 4, // Default good rating
        focus_score: 80, // Default good focus score
        session_notes: 'Session completed via schedule interface'
      };
      
      // Call backend to complete session
      await scheduleAPI.completeSession(session.id, completionData);
      
      // Update local state
      setScheduleState(prev => ({
        ...prev,
        activeSession: null,
        completedSessions: new Set([...prev.completedSessions, session.id])
      }));
      setSessionStartTime(null);
      setSessionProgress(0);
      
      console.log('Session completed successfully:', session.title);
    } catch (error) {
      console.error('Failed to complete session:', error);
      // Still update local state for offline functionality
      setScheduleState(prev => ({
        ...prev,
        activeSession: null,
        completedSessions: new Set([...prev.completedSessions, session.id])
      }));
      setSessionStartTime(null);
      setSessionProgress(0);
    }
  };

  const selectSession = (session: StudySession | null) => {
    setScheduleState(prev => ({ ...prev, selectedSession: session }));
  };

  const updateFilters = (newFilters: Partial<ScheduleFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Create local session (for immediate UI feedback)
  const createLocalSession = (sessionData: {
    course: string;
    duration: string;
    timeSlot: string;
    title?: string;
  }) => {
    // Parse duration to minutes
    const parseDurationToMinutes = (duration: string): number => {
      if (duration.includes('h') && duration.includes('m')) {
        const hours = parseFloat(duration.split('h')[0]);
        const minutes = parseInt(duration.split('h')[1].replace('m', '').trim());
        return hours * 60 + minutes;
      } else if (duration.includes('h')) {
        return parseFloat(duration.replace('h', '')) * 60;
      } else if (duration.includes('m')) {
        return parseInt(duration.replace('m', ''));
      }
      return 60; // Default 1 hour
    };

    // Create today's date with selected time
    const today = new Date();
    const [time, period] = sessionData.timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : (period === 'AM' && hours === 12 ? 0 : hours);
    
    const scheduledStart = new Date(today);
    scheduledStart.setHours(adjustedHours, minutes || 0, 0, 0);
    
    const durationMinutes = parseDurationToMinutes(sessionData.duration);

    // Find the course name for display
    const selectedCourseObj = userCourses.find(course => course.id === sessionData.course);
    const courseName = selectedCourseObj?.title || selectedCourseObj?.name || 'Unknown Course';

    // Create local session object
    const newLocalSession: StudySession = {
      id: `local-${Date.now()}`,
      title: sessionData.title || `Study ${courseName}`,
      course: courseName,
      duration: sessionData.duration,
      estimatedStart: sessionData.timeSlot,
      status: 'scheduled',
      priority: 'soon',
      difficulty: 'medium',
      xpReward: Math.floor(durationMinutes / 25) * 10,
      isAISuggested: false,
      cognitiveLoad: 'medium',
      tags: [courseName],
      notes: '',
      dependencies: [],
      scheduledDate: scheduledStart.toISOString(),
      completionTime: null,
      actualDuration: null,
      focusScore: null,
      distractionCount: 0,
      energyLevel: null,
      satisfaction: null,
      sessionNotes: ''
    };

    // Add to local sessions
    setLocalSessions(prev => [...prev, newLocalSession]);
    
    // Also add to main sessions state for immediate display
    setScheduleState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newLocalSession]
    }));

    return newLocalSession;
  };

  return {
    // State
    scheduleState,
    viewMode,
    filters,
    currentUser,
    userCourses,
    courseConfig,
    sessionProgress,

    // Actions
    setViewMode,
    updateFilters,
    startSession,
    completeSession,
    selectSession,
    getCourseStyle,
    createLocalSession,

    // Computed
    filteredSessions: scheduleState.sessions.filter(
      session => !filters.hiddenCourses.has(session.course)
    ),
    isLoading: scheduleState.isLoading || userCourses.length === 0,
  };
}