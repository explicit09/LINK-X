import { supabase } from '@/lib/supabase';

export interface MetricEvent {
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  context?: {
    courseId?: string;
    moduleId?: string;
    fileId?: string;
    userId?: string;
  };
  deviceInfo?: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    platform: string;
  };
}

export interface LearningMetrics {
  timeSpent: number;
  scrollDepth: number;
  interactionCount: number;
  completionRate: number;
  engagementScore: number;
}

class MetricsService {
  private sessionId: string;
  private eventQueue: MetricEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private pageStartTime: number = Date.now();
  private lastActivityTime: number = Date.now();
  private scrollDepths: Map<string, number> = new Map();
  private interactions: Map<string, number> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startBatchProcessor();
    this.setupEventListeners();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      platform: navigator.platform
    };
  }

  private startBatchProcessor() {
    // Process events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000);

    // Also flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushEvents();
      });
    }
  }

  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // ✅ NEW: Store metrics directly in Supabase for better performance
      const metricsData = events.map(event => ({
        session_id: this.sessionId,
        event_type: event.eventType,
        event_data: event.eventData,
        timestamp: event.timestamp.toISOString(),
        context: event.context || {},
        device_info: event.deviceInfo || {},
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_metrics')
        .insert(metricsData);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to send metrics:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordEvent('page_hidden', {
          timeSpent: Date.now() - this.pageStartTime
        });
      } else {
        this.pageStartTime = Date.now();
        this.recordEvent('page_visible', {});
      }
    });

    // Track user activity
    let activityTimer: NodeJS.Timeout;
    const trackActivity = () => {
      clearTimeout(activityTimer);
      this.lastActivityTime = Date.now();
      
      activityTimer = setTimeout(() => {
        this.recordEvent('user_idle', {
          idleTime: Date.now() - this.lastActivityTime
        });
      }, 60000); // 1 minute of inactivity
    };

    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    // Track scroll depth
    let scrollTimer: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollDepth = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
        
        const currentPath = window.location.pathname;
        const currentDepth = this.scrollDepths.get(currentPath) || 0;
        
        if (scrollDepth > currentDepth) {
          this.scrollDepths.set(currentPath, scrollDepth);
          this.recordEvent('scroll_depth', {
            path: currentPath,
            depth: Math.round(scrollDepth)
          });
        }
      }, 500);
    }, { passive: true });
  }

  // Public methods for recording specific events
  recordEvent(eventType: string, eventData: Record<string, any>, context?: MetricEvent['context']) {
    const event: MetricEvent = {
      eventType,
      eventData,
      timestamp: new Date(),
      sessionId: this.sessionId,
      context,
      deviceInfo: this.getDeviceInfo()
    };

    this.eventQueue.push(event);

    // Flush immediately for critical events
    if (['error', 'crash', 'payment'].includes(eventType)) {
      this.flushEvents();
    }
  }

  // Learning-specific metrics
  recordLearningEvent(type: 'start' | 'pause' | 'resume' | 'complete', fileId: string, context?: MetricEvent['context']) {
    this.recordEvent(`learning_${type}`, {
      fileId,
      timestamp: Date.now()
    }, context);
  }

  recordInteraction(type: string, target: string, context?: MetricEvent['context']) {
    const key = `${type}-${target}`;
    const count = (this.interactions.get(key) || 0) + 1;
    this.interactions.set(key, count);

    this.recordEvent('user_interaction', {
      type,
      target,
      count
    }, context);
  }

  recordError(error: Error, context?: MetricEvent['context']) {
    this.recordEvent('error', {
      message: error.message,
      stack: error.stack,
      name: error.name
    }, context);
  }

  recordPerformance(metric: string, value: number, context?: MetricEvent['context']) {
    this.recordEvent('performance', {
      metric,
      value,
      unit: 'ms'
    }, context);
  }

  // Get aggregated metrics for current session
  getSessionMetrics(): Record<string, any> {
    const now = Date.now();
    const sessionDuration = now - parseInt(this.sessionId.split('-')[0]);
    const activeTime = now - this.pageStartTime;
    
    return {
      sessionId: this.sessionId,
      sessionDuration,
      activeTime,
      eventCount: this.eventQueue.length,
      maxScrollDepth: Math.max(...Array.from(this.scrollDepths.values()), 0),
      interactionCount: Array.from(this.interactions.values()).reduce((a, b) => a + b, 0)
    };
  }

  // Calculate engagement score
  calculateEngagementScore(timeSpent: number, interactions: number, scrollDepth: number): number {
    // Weighted formula for engagement
    const timeWeight = 0.3;
    const interactionWeight = 0.4;
    const scrollWeight = 0.3;

    // Normalize values
    const normalizedTime = Math.min(timeSpent / 300000, 1); // 5 minutes = 100%
    const normalizedInteractions = Math.min(interactions / 50, 1); // 50 interactions = 100%
    const normalizedScroll = scrollDepth / 100;

    return Math.round(
      (normalizedTime * timeWeight + 
       normalizedInteractions * interactionWeight + 
       normalizedScroll * scrollWeight) * 100
    );
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushEvents();
  }
}

// Singleton instance
let metricsInstance: MetricsService | null = null;

export function getMetricsService(): MetricsService {
  if (!metricsInstance && typeof window !== 'undefined') {
    metricsInstance = new MetricsService();
  }
  return metricsInstance!;
}

// React hook for metrics
export function useMetrics(context?: MetricEvent['context']) {
  const metrics = getMetricsService();

  return {
    recordEvent: (eventType: string, eventData: Record<string, any>) => 
      metrics.recordEvent(eventType, eventData, context),
    recordLearningEvent: (type: 'start' | 'pause' | 'resume' | 'complete', fileId: string) =>
      metrics.recordLearningEvent(type, fileId, context),
    recordInteraction: (type: string, target: string) =>
      metrics.recordInteraction(type, target, context),
    recordError: (error: Error) =>
      metrics.recordError(error, context),
    recordPerformance: (metric: string, value: number) =>
      metrics.recordPerformance(metric, value, context),
    getSessionMetrics: () => metrics.getSessionMetrics(),
    calculateEngagementScore: metrics.calculateEngagementScore
  };
}