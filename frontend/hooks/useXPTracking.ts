import { useEffect, useCallback, useRef } from 'react';
import { useGamification, XPActionType } from '@/contexts/GamificationContext';
import { useMetrics } from '@/services/metricsService';

interface UseXPTrackingOptions {
  action: XPActionType;
  metadata?: Record<string, any>;
  autoTrigger?: boolean;
  triggerDelay?: number;
  requireInteraction?: boolean;
}

export function useXPTracking({
  action,
  metadata = {},
  autoTrigger = false,
  triggerDelay = 0,
  requireInteraction = false
}: UseXPTrackingOptions) {
  const { awardXP } = useGamification();
  const { recordEvent } = useMetrics();
  const hasTriggered = useRef(false);
  const interactionRef = useRef(false);

  const trigger = useCallback(async () => {
    if (hasTriggered.current) return;
    if (requireInteraction && !interactionRef.current) return;

    hasTriggered.current = true;
    
    // Award XP
    await awardXP(action, metadata);
    
    // Record metric
    recordEvent('xp_awarded', {
      action,
      amount: metadata.xp || 0,
      ...metadata
    });
  }, [action, metadata, awardXP, recordEvent, requireInteraction]);

  // Handle auto-trigger
  useEffect(() => {
    if (autoTrigger && !requireInteraction) {
      const timer = setTimeout(trigger, triggerDelay);
      return () => clearTimeout(timer);
    }
  }, [autoTrigger, triggerDelay, trigger, requireInteraction]);

  // Handle interaction tracking
  const trackInteraction = useCallback(() => {
    interactionRef.current = true;
    if (requireInteraction && autoTrigger) {
      trigger();
    }
  }, [requireInteraction, autoTrigger, trigger]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      hasTriggered.current = false;
      interactionRef.current = false;
    };
  }, []);

  return {
    trigger,
    trackInteraction,
    hasTriggered: hasTriggered.current
  };
}

// Specific hooks for simplified XP actions

export function useDailyLoginXP() {
  return useXPTracking({
    action: 'DAILY_LOGIN',
    metadata: { timestamp: new Date().toISOString() },
    autoTrigger: true,
    triggerDelay: 1000 // Award after 1 second of being logged in
  });
}

export function useContentViewXP(contentId: string, metadata?: Record<string, any>) {
  return useXPTracking({
    action: 'CONTENT_VIEW',
    metadata: { contentId, ...metadata },
    autoTrigger: true,
    triggerDelay: 3000, // Award after 3 seconds
    requireInteraction: true // Require scroll or click
  });
}

export function useQuizCompleteXP(quizId: string, score: number, metadata?: Record<string, any>) {
  return useXPTracking({
    action: 'QUIZ_COMPLETE',
    metadata: { quizId, score, ...metadata },
    autoTrigger: false // Manual trigger on quiz submit
  });
}

export function useModuleCompleteXP(moduleId: string, metadata?: Record<string, any>) {
  return useXPTracking({
    action: 'MODULE_COMPLETE',
    metadata: { moduleId, ...metadata },
    autoTrigger: false // Manual trigger when all content viewed
  });
}

export function useHelpPeerXP(helpId: string, rating: number, metadata?: Record<string, any>) {
  const { trigger } = useXPTracking({
    action: 'HELP_PEER',
    metadata: { helpId, rating, ...metadata },
    autoTrigger: false
  });

  // Only award XP if peer rates 4+ stars
  const awardIfHighRating = useCallback(() => {
    if (rating >= 4) {
      trigger();
    }
  }, [rating, trigger]);

  return { awardIfHighRating };
}