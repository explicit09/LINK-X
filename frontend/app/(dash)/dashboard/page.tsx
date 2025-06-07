'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { DashboardMainContent } from '@/components/dashboard/sections/DashboardMainContent';
import { DashboardSidebar } from '@/components/dashboard/sections/DashboardSidebar';
import { ProgressiveDashboard } from '@/components/dashboard/sections/ProgressiveDashboard';
import { FirstTimeUserGuide } from '@/components/dashboard/FirstTimeUserGuide';
import { useUserJourneyStage, UserJourneyStage } from '@/hooks/useUserJourneyStage';
import { useDashboardOverview, useAIRecommendations } from '@/hooks/useDashboardData';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useDashboardMode, DashboardMode } from '@/hooks/useDashboardMode';
import { 
  WelcomeDashboard, 
  GuidedDashboard, 
  ProgressiveDashboard, 
  AdvancedDashboard 
} from '@/components/dashboard/modes';

function DashboardContent() {
  const router = useRouter();
  
  // Use ONLY unified auth system - removed duplicate auth hooks
  const { 
    user: currentUser, 
    session, 
    isAuthenticated, 
    isRegistered, 
    needsOnboarding,
    loading: authLoading 
  } = useUnifiedAuth();
  
  // Extract role from session data
  const role = (session?.user?.role as 'student' | 'instructor' | 'admin') || 'student';
  
  // Dashboard mode and data hooks
  const { mode, config, isLoading: modeLoading } = useDashboardMode();
  const { stage, isLoading: journeyLoading } = useUserJourneyStage();
  const { data: dashboardData, loading: dashboardLoading } = useDashboardOverview();
  const { data: aiData } = useAIRecommendations();
  
  // Feature flag to enable adaptive dashboard (set to true to test)
  const useAdaptiveDashboard = true;

  // SIMPLE AUTH CHECK using unified auth
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    console.log('[Dashboard] Auth status:', {
      isAuthenticated,
      isRegistered,
      needsOnboarding,
      user: session?.user?.email
    });

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      console.log('[Dashboard] Not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }

    // If not registered or onboarding needed, redirect to onboarding
    if (!isRegistered || needsOnboarding) {
      console.log('[Dashboard] Not registered or onboarding incomplete, redirecting to onboarding');
      router.replace('/onboarding');
      return;
    }

    // If we reach here, user is authenticated, registered, and onboarded
    console.log('[Dashboard] All auth conditions met, allowing access');
  }, [authLoading, isAuthenticated, isRegistered, needsOnboarding, router, session]);

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

  // Show loading while checking auth or determining dashboard mode
  if (authLoading || journeyLoading || modeLoading) {
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

  // Debug user data
  console.log('🔍 User Data Debug:', {
    currentUser,
    displayName: currentUser?.displayName,
    email: currentUser?.email,
    firstName: currentUser?.firstName,
    lastName: currentUser?.lastName,
    name: currentUser?.name
  });
  
  // Improved user name resolution
  const userName = currentUser?.displayName || 
                   currentUser?.name || 
                   (currentUser?.firstName && currentUser?.lastName ? 
                     `${currentUser.firstName} ${currentUser.lastName}` : 
                     null) ||
                   currentUser?.email?.split('@')[0] || 
                   'there';

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

    // Adaptive dashboard modes
    switch (mode) {
      case DashboardMode.WELCOME:
        return (
          <WelcomeDashboard
            userName={userName}
            onActionClick={handleActionClick}
          />
        );

      case DashboardMode.GUIDED:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <GuidedDashboard
                userName={userName}
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
                userName={userName}
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
            userName={userName}
            dashboardData={dashboardData}
            aiRecommendations={aiData?.recommendations}
            onActionClick={handleActionClick}
          />
        );

      default:
        return (
          <WelcomeDashboard
            userName={userName}
            onActionClick={handleActionClick}
          />
        );
    }
  };

  // Use SharedDashboardLayout with adaptive structure
  return (
    <SharedDashboardLayout currentUser={currentUser}>
      {renderDashboardContent()}
      
      {/* Show FirstTimeUserGuide only for WELCOME mode */}
      {mode === DashboardMode.WELCOME && (
        <FirstTimeUserGuide onGuideComplete={() => console.log('Guide completed')} />
      )}
    </SharedDashboardLayout>
  );
}

export default function Dashboard() {
  // Remove OnboardingGuard - handle auth directly in component
  return <DashboardContent />;
}

// Monitor all navigation events
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
