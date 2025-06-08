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
import { useNoAuth as useAuth } from '@/contexts/NoAuthContext';
// User type is now directly from NoAuthContext
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
  
  // Get user data from auth provider
  const { 
    user: currentUser, 
    isAuthenticated,
    loading: authLoading 
  } = useAuth();
  
  // Use user properties directly with null check
  const displayName = currentUser?.name || 'User';
  
  // Default role to student
  const role = 'student';
  
  // Dashboard mode and data hooks
  const { mode, config, isLoading: modeLoading, userStats } = useDashboardMode();
  const { stage, isLoading: journeyLoading } = useUserJourneyStage();
  const { data: dashboardData, loading: dashboardLoading } = useDashboardOverview();
  const { data: aiData } = useAIRecommendations();
  
  // Transition management - simplified for now
  // const { isTransitioning, transitionData, triggerTransition, completeTransition } = useDashboardTransition();
  const previousMode = useRef<DashboardMode | null>(null);
  const [dashboardKey, setDashboardKey] = useState(0);
  
  // Feature flag to enable adaptive dashboard (set to true to test)
  const useAdaptiveDashboard = true;
  
  // Track mode changes and trigger re-render for smooth transitions
  useEffect(() => {
    if (previousMode.current !== null && previousMode.current !== mode && useAdaptiveDashboard) {
      setDashboardKey(prev => prev + 1); // Force re-render with new key
    }
    previousMode.current = mode;
  }, [mode, useAdaptiveDashboard]);

  // NO AUTH - Skip all auth checks
  useEffect(() => {
    console.log('[Dashboard] No auth active - skipping auth checks');
    console.log('[Dashboard] Default user:', {
      isAuthenticated: true,
      user: currentUser?.email,
      name: currentUser?.name
    });
  }, [currentUser]);

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

  // Show loading while determining dashboard mode (skip auth loading in mock mode)
  if (journeyLoading || modeLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {modeLoading ? 'Personalizing your dashboard...' : 
             'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // Debug user data
  console.log('🔍 User Data Debug:', {
    currentUser,
    displayName
  });

  // Create a simple user object for components
  const componentUser = {
    id: currentUser?.id || 'default-id',
    email: currentUser?.email || 'user@example.com',
    name: displayName,
    role: role
  };

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

// Monitor all navigation events
if (typeof window !== 'undefined') {
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
