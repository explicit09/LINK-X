/**
 * Lazy-loaded component imports for code splitting
 * This reduces the initial bundle size significantly
 */
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Heavy UI components - lazy load these
export const Dialog = dynamic(() => import('./dialog').then(mod => mod.Dialog), {
  loading: LoadingSpinner,
});

export const Sheet = dynamic(() => import('./sheet').then(mod => mod.Sheet), {
  loading: LoadingSpinner,
});

export const Calendar = dynamic(() => import('./calendar').then(mod => mod.Calendar), {
  loading: LoadingSpinner,
});

export const DataTable = dynamic(() => import('./table').then(mod => mod.Table), {
  loading: LoadingSpinner,
});

export const Chart = dynamic(() => import('./chart').then(mod => mod.Chart), {
  loading: LoadingSpinner,
  ssr: false, // Charts often don&apos;t work well with SSR
});

// Course components
export const PDFViewer = dynamic(() => import('../PDFViewer'), {
  loading: LoadingSpinner,
  ssr: false,
});

export const CodeEditor = dynamic(() => import('../code-editor'), {
  loading: LoadingSpinner,
  ssr: false,
});

export const MarkdownEditor = dynamic(() => import('../editor'), {
  loading: LoadingSpinner,
  ssr: false,
});

// AI components - these are heavy
export const FloatingAIAssistant = dynamic(() => import('../ai/FloatingAIAssistant'), {
  loading: LoadingSpinner,
  ssr: false,
});

export const SmartRecommendations = dynamic(() => import('../ai/SmartRecommendations'), {
  loading: LoadingSpinner,
});

// Dashboard components
export const MarketTrends = dynamic(() => import('../dashboard/MarketTrends'), {
  loading: LoadingSpinner,
  ssr: false,
});

export const AudioUpload = dynamic(() => import('../dashboard/AudioUpload'), {
  loading: LoadingSpinner,
});

// Authentication components
export const GoogleAuthButton = dynamic(() => import('../auth/GoogleAuthButton'), {
  loading: LoadingSpinner,
  ssr: false, // Prevent hydration mismatches
});

// Performance monitoring
export const PerformanceMonitor = dynamic(() => import('../performance/PerformanceMonitor'), {
  loading: () => null, // Don't show loading for monitoring
  ssr: false,
});

// Helper function to preload components
export const preloadComponent = (component: ComponentType<unknown>) => {
  if ('preload' in component && typeof component.preload === 'function') {
    component.preload();
  }
};

// Preload critical components on idle
if (typeof window !== 'undefined') {
  const preloadOnIdle = () => {
    // Preload components that are likely to be used
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        import('./dialog');
        import('./sheet');
      });
    }
  };
  
  // Wait for initial load
  window.addEventListener('load', preloadOnIdle);
}