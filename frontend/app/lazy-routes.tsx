/**
 * Lazy-loaded route components for better code splitting
 */
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Loading component for routes
const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Lazy load heavy route components
export const DashboardPage = dynamic(() => import('./(dash)/dashboard/page'), {
  loading: RouteLoader,
});

export const CoursePage = dynamic(() => import('./courses/[courseId]/page'), {
  loading: RouteLoader,
});

export const LearnPage = dynamic(() => import('./(learn)/learn/[id]/page'), {
  loading: RouteLoader,
});

export const StreamingPage = dynamic(
  () => import('./(learn)/learn/streaming/[id]/page'),
  {
    loading: RouteLoader,
  },
);

export const SettingsPage = dynamic(
  () => import('./(settings)/settings/page'),
  {
    loading: RouteLoader,
  },
);

export const OnboardingPage = dynamic(() => import('./onboarding/page'), {
  loading: RouteLoader,
});

// Wrapper component for lazy routes
export function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

// Preload function for critical routes
export function preloadRoute(routeName: string) {
  switch (routeName) {
    case 'dashboard':
      import('./(dash)/dashboard/page');
      break;
    case 'courses':
      import('./courses/[courseId]/page');
      break;
    case 'learn':
      import('./(learn)/learn/[id]/page');
      break;
    default:
      break;
  }
}

// Intersection Observer for preloading on hover/visibility
if (typeof window !== 'undefined') {
  const observerOptions = {
    rootMargin: '50px',
  };

  const linkObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const link = entry.target as HTMLAnchorElement;
        const href = link.getAttribute('href');

        if (href?.includes('/dashboard')) {
          preloadRoute('dashboard');
        } else if (href?.includes('/courses')) {
          preloadRoute('courses');
        } else if (href?.includes('/learn')) {
          preloadRoute('learn');
        }

        linkObserver.unobserve(link);
      }
    });
  }, observerOptions);

  // Observe navigation links
  document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a[href^="/"]');
    links.forEach((link) => linkObserver.observe(link));
  });
}
