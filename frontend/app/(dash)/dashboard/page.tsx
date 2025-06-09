'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { DashboardMainContent } from '@/components/dashboard/sections/DashboardMainContent';
import { DashboardSidebar } from '@/components/dashboard/sections/DashboardSidebar';
import { FirstTimeUserGuide } from '@/components/dashboard/FirstTimeUserGuide';
import { useUserJourneyStage, UserJourneyStage } from '@/hooks/useUserJourneyStage';
import { useDashboardOverview, useAIRecommendations } from '@/hooks/useDashboardData';
import { useAuth } from '@/hooks/useAuth';
import { toComponentUser, type ComponentUser } from '@/types/auth';
import { useDashboardMode, DashboardMode } from '@/hooks/useDashboardMode';
// import { DashboardTransition, useDashboardTransition } from '@/components/dashboard/transitions/DashboardTransition'; // TODO: Re-enable after framer-motion is installed
import { FadeInCard } from '@/components/dashboard/animations/CSSAnimations';
import { 
  WelcomeDashboard, 
  GuidedDashboard, 
  ProgressiveDashboard, 
  AdvancedDashboard 
} from '@/components/dashboard/modes';

function DashboardContent() {
  const router = useRouter();
  
  // Use enhanced SimpleAuth with profile data
  const { 
    user: currentUser, 
    profile,
    isAuthenticated,
    needsOnboarding,
    loading: authLoading 
  } = useAuth();
  
  // Get display name from profile or user
  const displayName = profile?.full_name || currentUser?.email?.split('@')[0] || 'User';
  
  // Get role from profile or default to student
  const role = profile?.role || 'student';
  
  // Dashboard mode and data hooks
  const { mode, config, isLoading: modeLoading, userStats, refresh: refreshDashboardMode } = useDashboardMode();
  const { stage, isLoading: journeyLoading } = useUserJourneyStage();
  const { data: dashboardData, loading: dashboardLoading } = useDashboardOverview();
  const { data: aiData } = useAIRecommendations();
  
  // Add timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Transition management - simplified for now
  // const { isTransitioning, transitionData, triggerTransition, completeTransition } = useDashboardTransition();
  const previousMode = useRef<DashboardMode | null>(null);
  const [dashboardKey, setDashboardKey] = useState(0);
  
  // Feature flag to enable adaptive dashboard (set to true to test)
  const useAdaptiveDashboard = true;
  
  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('[Dashboard] Loading timeout reached, forcing render');
      setLoadingTimeout(true);
    }, 10000); // 10 second timeout
    
    // Clear timeout if loading finishes
    if (!authLoading && !journeyLoading && !modeLoading) {
      clearTimeout(timeout);
    }
    
    return () => clearTimeout(timeout);
  }, [authLoading, journeyLoading, modeLoading]);
  
  // Track mode changes and trigger re-render for smooth transitions
  useEffect(() => {
    if (previousMode.current !== null && previousMode.current !== mode && useAdaptiveDashboard) {
      setDashboardKey(prev => prev + 1); // Force re-render with new key
    }
    previousMode.current = mode;
  }, [mode, useAdaptiveDashboard]);
  
  // Refresh dashboard when page becomes visible (e.g., returning from course creation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !modeLoading) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Dashboard] Page became visible, refreshing dashboard mode');
        }
        refreshDashboardMode?.();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh on focus
    const handleFocus = () => {
      if (!modeLoading) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Dashboard] Window focused, refreshing dashboard mode');
        }
        refreshDashboardMode?.();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshDashboardMode, modeLoading]);

  // ENHANCED AUTH CHECK - authentication and onboarding
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dashboard] Auth status:', {
        isAuthenticated,
        needsOnboarding,
        user: currentUser?.email,
        profile: profile?.full_name
      });
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Dashboard] Not authenticated, redirecting to login');
      }
      router.replace('/login');
      return;
    }

    // If needs onboarding, redirect to onboarding
    if (needsOnboarding) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Dashboard] User needs onboarding, redirecting');
      }
      router.replace('/onboarding');
      return;
    }

    // All checks passed - user is authenticated and onboarded
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dashboard] All auth checks passed, allowing access');
    }
  }, [authLoading, isAuthenticated, needsOnboarding, router, currentUser, profile]);

  // Debug loading states (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dashboard] Loading states:', {
        authLoading,
        journeyLoading,
        modeLoading,
        loadingTimeout
      });
    }
  }, [authLoading, journeyLoading, modeLoading, loadingTimeout]);

  // Unified handler functions for narrative flow
  const handleActionClick = (action: any) => {
    sonnerToast.success(`🎯 Starting: ${action.title}`);

    // Route based on action type
    if (action.course) {
      router.push(`/courses/${action.course.toLowerCase()}`);
    } else if (action.id === 'focus-session') {
      sonnerToast.success('🧠 Entering Focus Mode!');
    } else if (action.id === 'quick-tutorial') {
      sonnerToast.success('⚡ Opening tutorial!');
    }
  };

  const handleCourseClick = (courseId: string) => {
    router.push(`/courses/${courseId}`);
  };

  const handleViewProgress = () => {
    router.push('/progress');
  };

  const handleMaintainRank = () => {
    sonnerToast.success('🎯 Opening your personalized action plan!');
    router.push('/study-plan');
  };

  const handleViewAllCourses = () => {
    router.push('/my-courses');
  };

  const handleViewSchedule = () => {
    router.push('/schedule');
  };

  // Show loading while checking auth or determining dashboard mode (with timeout)
  if ((authLoading || journeyLoading || modeLoading) && !loadingTimeout) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {authLoading ? 'Verifying authentication...' : 
             modeLoading ? 'Personalizing your dashboard...' : 
             'Loading your dashboard...'}
          </p>

        </div>
      </div>
    );
  }

  // Force render if timeout reached
  if (loadingTimeout && process.env.NODE_ENV === 'development') {
    console.warn('[Dashboard] Forcing render due to timeout');
  }

  // Debug user data (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 User Data Debug:', {
      currentUser,
      profile,
      displayName
    });
  }

  // Create a properly shaped user object for components using the helper
  const componentUser = toComponentUser(profile, currentUser);

  // Render appropriate dashboard mode
  const renderDashboardContent = () => {
    if (!useAdaptiveDashboard) {
      // Fallback to original layout
      return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <DashboardMainContent
              onActionClick={handleActionClick}
              onCourseClick={handleCourseClick}
              onViewProgress={handleViewProgress}
            />
          </div>
          <div className="lg:col-span-1">
            <DashboardSidebar
              onViewSchedule={handleViewSchedule}
              onMaintainRank={handleMaintainRank}
              onViewAllCourses={handleViewAllCourses}
            />
          </div>
        </div>
      );
    }

    // Simple fade transition between modes
    return (
      <FadeInCard key={dashboardKey} delay={0.1}>
        {renderModeContent()}
      </FadeInCard>
    );
  };
  
  const renderModeContent = () => {
    // Adaptive dashboard modes
    switch (mode) {
      case DashboardMode.WELCOME:
        return (
          <WelcomeDashboard
            userName={displayName}
            onActionClick={handleActionClick}
          />
        );

      case DashboardMode.GUIDED:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <GuidedDashboard
                userName={displayName}
                onActionClick={handleActionClick}
              />
            </div>
            <div className="lg:col-span-1">
              <DashboardSidebar
                onViewSchedule={handleViewSchedule}
                onMaintainRank={handleMaintainRank}
                onViewAllCourses={handleViewAllCourses}
              />
            </div>
          </div>
        );

      case DashboardMode.STANDARD:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <ProgressiveDashboard
                userName={displayName}
                dashboardData={dashboardData}
                aiRecommendations={aiData?.recommendations}
                onActionClick={handleActionClick}
              />
            </div>
            <div className="lg:col-span-1">
              <DashboardSidebar
                onViewSchedule={handleViewSchedule}
                onMaintainRank={handleMaintainRank}
                onViewAllCourses={handleViewAllCourses}
              />
            </div>
          </div>
        );

      case DashboardMode.ADVANCED:
        return (
          <AdvancedDashboard
            userName={displayName}
            dashboardData={dashboardData}
            aiRecommendations={aiData?.recommendations}
            onActionClick={handleActionClick}
          />
        );

      default:
        return (
          <WelcomeDashboard
            userName={displayName}
            onActionClick={handleActionClick}
          />
        );
    }
  };

  // Use SharedDashboardLayout with properly shaped user
  return (
    <SharedDashboardLayout currentUser={componentUser}>
      <div className="transition-all duration-500 ease-in-out">
        {renderDashboardContent()}
        
        {/* Show FirstTimeUserGuide only for WELCOME mode */}
        {mode === DashboardMode.WELCOME && (
          <FadeInCard delay={0.5}>
            <FirstTimeUserGuide onGuideComplete={() => console.log('Guide completed')} />
          </FadeInCard>
        )}
      </div>
    </SharedDashboardLayout>
  );
}

export default function Dashboard() {
  // Remove OnboardingGuard - handle auth directly in component
  return <DashboardContent />;
}

// Monitor all navigation events (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    console.log('[Navigation] pushState to:', args[2]);
    return originalPushState.apply(this, args);
  };

  history.replaceState = function(...args) {
    console.log('[Navigation] replaceState to:', args[2]);
    return originalReplaceState.apply(this, args);
  };

  window.addEventListener('beforeunload', () => {
    console.log('[Navigation] Page unloading');
  });
  
  window.addEventListener('popstate', () => {
    console.log('[Navigation] popstate event');
  });
}
