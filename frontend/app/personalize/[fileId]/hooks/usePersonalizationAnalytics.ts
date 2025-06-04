import { useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api/client';

interface AnalyticsEvent {
  event_type: 'section_view' | 'section_complete' | 'feedback' | 'session_complete' | 'error';
  file_id: string;
  section_id?: string;
  data?: Record<string, any>;
  timestamp: number;
}

interface SectionMetrics {
  sectionId: string;
  startTime: number;
  endTime?: number;
  scrollDepth: number;
  interactions: number;
}

export const usePersonalizationAnalytics = (fileId: string) => {
  const sectionMetricsRef = useRef<Map<string, SectionMetrics>>(new Map());
  const sessionStartRef = useRef<number>(Date.now());
  const eventsQueueRef = useRef<AnalyticsEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout>();

  // Track section view
  const trackSectionView = useCallback((sectionId: string) => {
    if (!sectionMetricsRef.current.has(sectionId)) {
      sectionMetricsRef.current.set(sectionId, {
        sectionId,
        startTime: Date.now(),
        scrollDepth: 0,
        interactions: 0,
      });

      const event: AnalyticsEvent = {
        event_type: 'section_view',
        file_id: fileId,
        section_id: sectionId,
        timestamp: Date.now(),
        data: {
          session_duration: Date.now() - sessionStartRef.current,
        },
      };

      queueEvent(event);
    }
  }, [fileId]);

  // Track section completion
  const trackSectionComplete = useCallback((sectionId: string, completionData?: any) => {
    const metrics = sectionMetricsRef.current.get(sectionId);
    if (metrics && !metrics.endTime) {
      metrics.endTime = Date.now();
      const timeSpent = metrics.endTime - metrics.startTime;

      const event: AnalyticsEvent = {
        event_type: 'section_complete',
        file_id: fileId,
        section_id: sectionId,
        timestamp: Date.now(),
        data: {
          time_spent_ms: timeSpent,
          scroll_depth: metrics.scrollDepth,
          interactions: metrics.interactions,
          ...completionData,
        },
      };

      queueEvent(event);
    }
  }, [fileId]);

  // Track user feedback
  const trackFeedback = useCallback((sectionId: string, feedbackType: string, feedbackData?: any) => {
    const event: AnalyticsEvent = {
      event_type: 'feedback',
      file_id: fileId,
      section_id: sectionId,
      timestamp: Date.now(),
      data: {
        feedback_type: feedbackType,
        ...feedbackData,
      },
    };

    queueEvent(event);
  }, [fileId]);

  // Track session completion
  const trackSessionComplete = useCallback((completionData?: any) => {
    const sessionDuration = Date.now() - sessionStartRef.current;
    const completedSections = Array.from(sectionMetricsRef.current.values())
      .filter(m => m.endTime)
      .length;
    const totalSections = sectionMetricsRef.current.size;

    const event: AnalyticsEvent = {
      event_type: 'session_complete',
      file_id: fileId,
      timestamp: Date.now(),
      data: {
        session_duration_ms: sessionDuration,
        completed_sections: completedSections,
        total_sections: totalSections,
        completion_rate: totalSections > 0 ? completedSections / totalSections : 0,
        ...completionData,
      },
    };

    queueEvent(event);
    flushEvents(); // Flush immediately on session complete
  }, [fileId]);

  // Track errors
  const trackError = useCallback((error: string, errorData?: any) => {
    const event: AnalyticsEvent = {
      event_type: 'error',
      file_id: fileId,
      timestamp: Date.now(),
      data: {
        error_message: error,
        session_duration: Date.now() - sessionStartRef.current,
        ...errorData,
      },
    };

    queueEvent(event);
  }, [fileId]);

  // Track scroll depth for active section
  const updateScrollDepth = useCallback((sectionId: string, scrollPercentage: number) => {
    const metrics = sectionMetricsRef.current.get(sectionId);
    if (metrics) {
      metrics.scrollDepth = Math.max(metrics.scrollDepth, scrollPercentage);
    }
  }, []);

  // Track interactions
  const trackInteraction = useCallback((sectionId: string, interactionType: string) => {
    const metrics = sectionMetricsRef.current.get(sectionId);
    if (metrics) {
      metrics.interactions++;
    }
  }, []);

  // Queue event for batching
  const queueEvent = useCallback((event: AnalyticsEvent) => {
    eventsQueueRef.current.push(event);

    // Clear existing timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    // Set new timeout to flush events after 5 seconds
    flushTimeoutRef.current = setTimeout(() => {
      flushEvents();
    }, 5000);
  }, []);

  // Flush events to backend
  const flushEvents = useCallback(async () => {
    if (eventsQueueRef.current.length === 0) return;

    const events = [...eventsQueueRef.current];
    eventsQueueRef.current = [];

    try {
      await apiClient.post('/api/personalization/v2/analytics', {
        events,
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
      // Re-queue events on failure
      eventsQueueRef.current.unshift(...events);
    }
  }, []);

  // Flush events before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (eventsQueueRef.current.length > 0) {
        // Use sendBeacon for reliability
        const data = JSON.stringify({
          events: eventsQueueRef.current,
          user_agent: navigator.userAgent,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
        });
        
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        navigator.sendBeacon(`${baseURL}/api/personalization/v2/analytics`, data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flushEvents(); // Final flush on unmount
    };
  }, [flushEvents]);

  // Calculate engagement score
  const getEngagementScore = useCallback(() => {
    const metrics = Array.from(sectionMetricsRef.current.values());
    if (metrics.length === 0) return 0;

    const avgTimeSpent = metrics
      .filter(m => m.endTime)
      .reduce((sum, m) => sum + (m.endTime! - m.startTime), 0) / metrics.length;

    const avgScrollDepth = metrics.reduce((sum, m) => sum + m.scrollDepth, 0) / metrics.length;
    const avgInteractions = metrics.reduce((sum, m) => sum + m.interactions, 0) / metrics.length;

    // Weighted score: 40% time, 30% scroll, 30% interactions
    const timeScore = Math.min(avgTimeSpent / 60000, 1) * 0.4; // Cap at 1 minute
    const scrollScore = avgScrollDepth * 0.3;
    const interactionScore = Math.min(avgInteractions / 5, 1) * 0.3; // Cap at 5 interactions

    return (timeScore + scrollScore + interactionScore) * 100;
  }, []);

  return {
    trackSectionView,
    trackSectionComplete,
    trackFeedback,
    trackSessionComplete,
    trackError,
    updateScrollDepth,
    trackInteraction,
    getEngagementScore,
    flushEvents,
  };
};