/**
 * Navigation utilities for routing users to appropriate dashboard sections
 */

export const navigateToDashboard = (isAuthenticated: boolean, fallbackUrl: string = '/login') => {
  if (typeof window === 'undefined') return fallbackUrl;
  
  if (!isAuthenticated) {
    // Not authenticated, redirect to login
    return '/login?redirect=/dashboard';
  }
  
  // User is authenticated, go to dashboard
  return '/dashboard';
};

export const getAuthenticatedRoute = (targetRoute: string, isAuthenticated: boolean) => {
  if (typeof window === 'undefined') return targetRoute;
  
  if (!isAuthenticated) {
    return `/login?redirect=${encodeURIComponent(targetRoute)}`;
  }
  
  return targetRoute;
};

export const dashboardRoutes = {
  main: '/dashboard',
  courses: '/my-courses',
  schedule: '/schedule',
  progress: '/progress',
  studyPlan: '/study-plan',
  settings: '/settings',
} as const;