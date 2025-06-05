'use client';

import React, { useEffect, useRef } from 'react';
import { useEngagementTracking } from '@/hooks/useEngagementTracking';

interface EngagementWrapperProps {
  contentId: string;
  contentType?: string;
  children: React.ReactNode;
  trackScroll?: boolean;
  trackInteractions?: boolean;
  trackTime?: boolean;
  onEngagementUpdate?: (metrics: any) => void;
}

/**
 * Wrapper component that automatically tracks engagement for any content
 * Simply wrap your content components with this to enable analytics
 */
export function EngagementWrapper({
  contentId,
  contentType = 'unknown',
  children,
  trackScroll = true,
  trackInteractions = true,
  trackTime = true,
  onEngagementUpdate
}: EngagementWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const { trackInteraction, trackCompletion, getCurrentMetrics } = useEngagementTracking({
    content_id: contentId,
    content_type: contentType,
    track_scroll: trackScroll,
    track_interactions: trackInteractions,
    track_time: trackTime,
    debounce_ms: 3000 // Send data every 3 seconds max
  });

  // Example of tracking completion based on scroll position
  useEffect(() => {
    if (!trackScroll) return;

    const handleScroll = () => {
      const element = wrapperRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const elementHeight = rect.height;
      
      // Calculate how much of the content is visible
      const visibleTop = Math.max(0, -rect.top);
      const visibleBottom = Math.min(elementHeight, viewportHeight - rect.top);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      
      const visibilityRatio = visibleHeight / elementHeight;
      const completionPercentage = Math.min(100, Math.max(0, visibilityRatio * 100));
      
      trackCompletion(completionPercentage);
      
      // Callback for parent components
      if (onEngagementUpdate) {
        onEngagementUpdate({
          completion_percentage: completionPercentage,
          visibility_ratio: visibilityRatio
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [trackScroll, trackCompletion, onEngagementUpdate]);

  // Track interactions within the wrapper
  const handleWrapperClick = (e: React.MouseEvent) => {
    if (trackInteractions) {
      trackInteraction('click');
    }
  };

  const handleWrapperKeyDown = (e: React.KeyboardEvent) => {
    if (trackInteractions) {
      trackInteraction('keypress');
    }
  };

  return (
    <div
      ref={wrapperRef}
      onClick={handleWrapperClick}
      onKeyDown={handleWrapperKeyDown}
      className="engagement-wrapper"
      data-content-id={contentId}
      data-content-type={contentType}
    >
      {children}
    </div>
  );
}

/**
 * Higher-order component version for easier integration
 */
export function withEngagementTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  contentIdExtractor: (props: P) => string,
  contentTypeExtractor?: (props: P) => string
) {
  return function EngagementTrackingWrapper(props: P) {
    const contentId = contentIdExtractor(props);
    const contentType = contentTypeExtractor?.(props) || 'unknown';

    return (
      <EngagementWrapper
        contentId={contentId}
        contentType={contentType}
      >
        <WrappedComponent {...props} />
      </EngagementWrapper>
    );
  };
}

/**
 * Hook for manual engagement tracking in complex components
 */
export function useManualEngagementTracking(contentId: string, contentType: string = 'unknown') {
  const tracking = useEngagementTracking({
    content_id: contentId,
    content_type: contentType,
    track_scroll: false, // Manual control
    track_interactions: false, // Manual control
    track_time: true // Keep automatic time tracking
  });

  const trackContentView = () => {
    tracking.trackInteraction('view');
  };

  const trackContentInteraction = (interactionType: string = 'interaction') => {
    tracking.trackInteraction(interactionType);
  };

  const trackContentCompletion = (percentage: number) => {
    tracking.trackCompletion(percentage);
  };

  const trackContentMilestone = (milestone: string) => {
    tracking.trackInteraction(`milestone_${milestone}`);
  };

  return {
    trackContentView,
    trackContentInteraction,
    trackContentCompletion,
    trackContentMilestone,
    flushMetrics: tracking.flushMetrics,
    getCurrentMetrics: tracking.getCurrentMetrics
  };
}