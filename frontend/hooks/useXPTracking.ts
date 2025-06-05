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

// Specific hooks for common actions

export function useFileViewXP(fileId: string, metadata?: Record<string, any>) {
  return useXPTracking({
    action: 'FILE_VIEW',
    metadata: { fileId, ...metadata },
    autoTrigger: true,
    triggerDelay: 3000, // Award after 3 seconds
    requireInteraction: true // Require scroll or click
  });
}

export function useChatMessageXP(metadata?: Record<string, any>) {
  return useXPTracking({
    action: 'CHAT_MESSAGE',
    metadata,
    autoTrigger: false // Manual trigger on send
  });
}

export function useTodoCompleteXP(todoId: string, metadata?: Record<string, any>) {
  return useXPTracking({
    action: 'TODO_COMPLETE',
    metadata: { todoId, ...metadata },
    autoTrigger: false // Manual trigger on complete
  });
}

export function useModuleCompleteXP(moduleId: string, metadata?: Record<string, any>) {
  return useXPTracking({
    action: 'MODULE_COMPLETE',
    metadata: { moduleId, ...metadata },
    autoTrigger: false // Manual trigger when all files viewed
  });
}

export function useVideoWatchXP(videoId: string, metadata?: Record<string, any>) {
  const progressRef = useRef(0);
  const { trigger } = useXPTracking({
    action: 'WATCH_VIDEO',
    metadata: { videoId, ...metadata },
    autoTrigger: false
  });

  const updateProgress = useCallback((progress: number) => {
    progressRef.current = progress;
    // Award XP when video is 80% complete
    if (progress >= 80 && progressRef.current < 80) {
      trigger();
    }
  }, [trigger]);

  return { updateProgress };
}