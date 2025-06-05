'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthUser } from './useAuthUser';

interface EngagementMetrics {
  interaction_count: number;
  scroll_depth_percentage: number;
  time_on_content_seconds: number;
  pause_count: number;
  session_duration_seconds: number;
  completion_percentage: number;
  content_type?: string;
  device_type?: string;
}

interface EngagementTrackingOptions {
  content_id: string;
  content_type?: string;
  track_scroll?: boolean;
  track_interactions?: boolean;
  track_time?: boolean;
  debounce_ms?: number;
  batch_size?: number;
}

export function useEngagementTracking(options: EngagementTrackingOptions) {
  const { user } = useAuthUser();
  const metricsRef = useRef<EngagementMetrics>({
    interaction_count: 0,
    scroll_depth_percentage: 0,
    time_on_content_seconds: 0,
    pause_count: 0,
    session_duration_seconds: 0,
    completion_percentage: 0,
    content_type: options.content_type || 'unknown',
    device_type: getDeviceType()
  });

  const timersRef = useRef({
    session_start: Date.now(),
    last_activity: Date.now(),
    content_time_start: Date.now(),
    is_active: true,
    pause_count: 0
  });

  const batchRef = useRef<EngagementMetrics[]>([]);
  const lastTrackRef = useRef(Date.now());

  const {
    content_id,
    track_scroll = true,
    track_interactions = true,
    track_time = true,
    debounce_ms = 5000, // Track every 5 seconds max
    batch_size = 5
  } = options;

  // Get device type
  function getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|ios/.test(userAgent)) return 'mobile';
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  // Calculate current metrics without sending
  const getCurrentMetrics = useCallback((): EngagementMetrics => {
    const now = Date.now();
    const sessionDuration = Math.floor((now - timersRef.current.session_start) / 1000);
    const contentTime = timersRef.current.is_active 
      ? Math.floor((now - timersRef.current.content_time_start) / 1000)
      : metricsRef.current.time_on_content_seconds;

    return {
      ...metricsRef.current,
      time_on_content_seconds: contentTime,
      session_duration_seconds: sessionDuration,
      pause_count: timersRef.current.pause_count
    };
  }, []);

  // Send metrics to backend (batched and debounced)
  const sendMetrics = useCallback(async (metrics: EngagementMetrics, force = false) => {
    if (!user) return;

    const now = Date.now();
    
    // Debounce: only send if enough time has passed or forced
    if (!force && now - lastTrackRef.current < debounce_ms) {
      batchRef.current.push(metrics);
      if (batchRef.current.length < batch_size) return;
    }

    try {
      // Use the latest metrics or batch average
      const metricsToSend = batchRef.current.length > 0 
        ? averageMetrics([...batchRef.current, metrics])
        : metrics;

      const response = await fetch('/api/v2/analytics/track/engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          event_type: 'content_interaction',
          content_id,
          interaction_data: metricsToSend
        })
      });

      if (response.ok) {
        lastTrackRef.current = now;
        batchRef.current = [];
      }
    } catch (error) {
      console.warn('Failed to track engagement:', error);
      // Fail silently to not impact user experience
    }
  }, [user, content_id, debounce_ms, batch_size]);

  // Average multiple metrics for batching
  const averageMetrics = (metricsList: EngagementMetrics[]): EngagementMetrics => {
    if (metricsList.length === 0) return metricsRef.current;
    if (metricsList.length === 1) return metricsList[0];

    const avg = metricsList.reduce((acc, metrics) => ({
      interaction_count: Math.max(acc.interaction_count, metrics.interaction_count),
      scroll_depth_percentage: Math.max(acc.scroll_depth_percentage, metrics.scroll_depth_percentage),
      time_on_content_seconds: Math.max(acc.time_on_content_seconds, metrics.time_on_content_seconds),
      pause_count: Math.max(acc.pause_count, metrics.pause_count),
      session_duration_seconds: Math.max(acc.session_duration_seconds, metrics.session_duration_seconds),
      completion_percentage: Math.max(acc.completion_percentage, metrics.completion_percentage),
      content_type: metrics.content_type,
      device_type: metrics.device_type
    }), metricsList[0]);

    return avg;
  };

  // Track user interactions
  const trackInteraction = useCallback((type: string = 'click') => {
    if (!track_interactions) return;

    metricsRef.current.interaction_count++;
    timersRef.current.last_activity = Date.now();

    // Reset content time tracking if user was paused
    if (!timersRef.current.is_active) {
      timersRef.current.is_active = true;
      timersRef.current.content_time_start = Date.now();
    }
  }, [track_interactions]);

  // Track scroll depth
  const trackScroll = useCallback(() => {
    if (!track_scroll) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100)) : 0;

    metricsRef.current.scroll_depth_percentage = Math.max(
      metricsRef.current.scroll_depth_percentage,
      scrollPercent
    );

    timersRef.current.last_activity = Date.now();
  }, [track_scroll]);

  // Track completion percentage (to be called manually)
  const trackCompletion = useCallback((percentage: number) => {
    metricsRef.current.completion_percentage = Math.max(
      metricsRef.current.completion_percentage,
      Math.min(100, Math.max(0, percentage))
    );
  }, []);

  // Manual trigger for sending current metrics
  const flushMetrics = useCallback(async () => {
    const currentMetrics = getCurrentMetrics();
    await sendMetrics(currentMetrics, true);
  }, [getCurrentMetrics, sendMetrics]);

  // Handle visibility changes (tab switching, etc.)
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    const now = Date.now();

    if (isVisible) {
      // User returned - reset content timing
      if (!timersRef.current.is_active) {
        timersRef.current.is_active = true;
        timersRef.current.content_time_start = now;
      }
    } else {
      // User left - pause content timing
      if (timersRef.current.is_active) {
        const contentTime = Math.floor((now - timersRef.current.content_time_start) / 1000);
        metricsRef.current.time_on_content_seconds += contentTime;
        timersRef.current.is_active = false;
        timersRef.current.pause_count++;
      }
    }
  }, []);

  // Handle page unload - send final metrics
  const handleBeforeUnload = useCallback(() => {
    const currentMetrics = getCurrentMetrics();
    
    // Use sendBeacon for reliability during page unload
    if (navigator.sendBeacon && user) {
      const payload = JSON.stringify({
        event_type: 'content_session_end',
        content_id,
        interaction_data: currentMetrics
      });

      navigator.sendBeacon('/api/v2/analytics/track/engagement', payload);
    }
  }, [getCurrentMetrics, content_id, user]);

  // Setup event listeners
  useEffect(() => {
    if (!track_time && !track_scroll && !track_interactions) return;

    const throttledScroll = throttle(trackScroll, 100);
    const debouncedSend = debounce(() => {
      const metrics = getCurrentMetrics();
      sendMetrics(metrics);
    }, debounce_ms);

    // Activity tracking
    if (track_interactions) {
      document.addEventListener('click', trackInteraction);
      document.addEventListener('keydown', trackInteraction);
    }

    if (track_scroll) {
      window.addEventListener('scroll', throttledScroll);
      window.addEventListener('scroll', debouncedSend);
    }

    // Visibility and unload tracking
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Periodic tracking for time spent
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - timersRef.current.last_activity;
      
      // Consider user inactive after 30 seconds
      if (timeSinceLastActivity > 30000 && timersRef.current.is_active) {
        const contentTime = Math.floor((now - timersRef.current.content_time_start) / 1000);
        metricsRef.current.time_on_content_seconds += contentTime;
        timersRef.current.is_active = false;
        timersRef.current.pause_count++;
      }

      // Send periodic updates
      debouncedSend();
    }, 10000); // Check every 10 seconds

    return () => {
      if (track_interactions) {
        document.removeEventListener('click', trackInteraction);
        document.removeEventListener('keydown', trackInteraction);
      }

      if (track_scroll) {
        window.removeEventListener('scroll', throttledScroll);
        window.removeEventListener('scroll', debouncedSend);
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);

      // Send final metrics on unmount
      const currentMetrics = getCurrentMetrics();
      sendMetrics(currentMetrics, true);
    };
  }, [
    track_interactions,
    track_scroll,
    track_time,
    trackInteraction,
    trackScroll,
    handleVisibilityChange,
    handleBeforeUnload,
    debounce_ms,
    getCurrentMetrics,
    sendMetrics
  ]);

  return {
    trackInteraction,
    trackCompletion,
    flushMetrics,
    getCurrentMetrics
  };
}

// Utility functions
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let debounceTimer: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  }) as T;