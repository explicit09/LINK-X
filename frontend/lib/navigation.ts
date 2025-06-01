/**
 * Navigation utilities for routing users to appropriate dashboard sections
 */

import { auth } from '@/firebaseconfig';

export const navigateToDashboard = (fallbackUrl: string = '/login') => {
  if (typeof window === 'undefined') return fallbackUrl;
  
  const user = auth.currentUser;
  
  if (!user) {
    // Not authenticated, redirect to login
    return '/login?redirect=/dashboard';
  }
  
  // User is authenticated, go to dashboard
  return '/dashboard';
};

export const getAuthenticatedRoute = (targetRoute: string) => {
  if (typeof window === 'undefined') return targetRoute;
  
  const user = auth.currentUser;
  
  if (!user) {
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