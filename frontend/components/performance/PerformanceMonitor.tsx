'use client';

import { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production and on client side
    if (
      process.env.NODE_ENV !== 'production' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    // Track Core Web Vitals
    const trackWebVitals = () => {
      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      let clsEntries: any[] = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            entry.entryType === 'layout-shift' &&
            !(entry as any).hadRecentInput
          ) {
            clsValue += (entry as any).value;
            clsEntries.push(entry as any);
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });

      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any;
          const fid = fidEntry.processingStart - fidEntry.startTime;

          // Send to analytics if needed
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'web_vitals', {
              name: 'FID',
              value: Math.round(fid),
              event_label: 'first_input_delay',
            });
          }
        }
      }).observe({ type: 'first-input', buffered: true });

      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.startTime;

        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'web_vitals', {
            name: 'LCP',
            value: Math.round(lcp),
            event_label: 'largest_contentful_paint',
          });
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // Report CLS when page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'web_vitals', {
              name: 'CLS',
              value: Math.round(clsValue * 1000) / 1000,
              event_label: 'cumulative_layout_shift',
            });
          }
        }
      });
    };

    // Track custom performance metrics
    const trackCustomMetrics = () => {
      // Time to Interactive (TTI) approximation
      const navigationEntry = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        const tti = navigationEntry.domInteractive - navigationEntry.fetchStart;
      }

      // Resource loading performance
      const resourceEntries = performance.getEntriesByType('resource');
      const slowResources = resourceEntries.filter(
        (entry) => entry.duration > 1000,
      );

      if (slowResources.length > 0) {
        console.warn('Slow resources detected:', slowResources);
      }

      // Memory usage (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryInfo = {
          used: Math.round(memory.usedJSHeapSize / 1048576),
          total: Math.round(memory.totalJSHeapSize / 1048576),
          limit: Math.round(memory.jsHeapSizeLimit / 1048576),
        };

        // Log memory info if needed
        console.log('Memory usage:', memoryInfo);
      }
    };

    // Initialize tracking
    trackWebVitals();
    trackCustomMetrics();

    // Cleanup
    return () => {
      // Cleanup observers if needed
    };
  }, []);

  return null; // This component doesn&apos;t render anything
}

export default PerformanceMonitor;
