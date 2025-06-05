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
import { useAuthUser } from '@/hooks/useAuthUser';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useDashboardOverview, useAIRecommendations } from '@/hooks/useDashboardData';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';

function DashboardContent() {
  const router = useRouter();
  
  // Use auth guard to ensure user is authenticated and registered
  const authState = useAuthGuard(true);
  
  // Use centralized auth user hook
  const { user: currentUser, isLoading: userLoading, error: userError } = useAuthUser();
  
  // Extract role from user data
  const role = (currentUser?.role as 'student' | 'instructor' | 'admin') || 'student';
  
  // New hooks for progressive dashboard
  const { stage, isLoading: journeyLoading } = useUserJourneyStage();
  const { data: dashboardData, loading: dashboardLoading } = useDashboardOverview();
  const { data: aiData } = useAIRecommendations();
  
  // Feature flag to enable new dashboard (set to true to test)
  const useProgressiveDashboard = true; // Make sure this is enabled

  // Handle user not registered case
  useEffect(() => {
    if (userError && userError.includes('404')) {
      router.push('/onboarding');
    }
  }, [userError, router]);

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

  if (authState.isLoading || journeyLoading || (authState.isRegistered && role === 'unknown')) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {authState.isLoading ? 'Verifying authentication...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // If not registered, auth guard will redirect to onboarding
  if (!authState.isRegistered) {
    return null;
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

  // Use SharedDashboardLayout with professional structure
  return (
    <SharedDashboardLayout currentUser={currentUser}>
      {/* Show first time guide only for truly new users with no courses */}
      {false && ( // Temporarily disable FirstTimeUserGuide to prevent duplicate welcome
        <FirstTimeUserGuide 
          onGuideComplete={() => {
            console.log('Guide completed');
          }}
        />
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3">
          {useProgressiveDashboard ? (
            <ProgressiveDashboard
              userName={userName}
              dashboardData={dashboardData}
              aiRecommendations={aiData?.recommendations}
              onActionClick={handleActionClick}
            />
          ) : (
            <DashboardMainContent
              onActionClick={handleActionClick}
              onCourseClick={handleCourseClick}
              onViewProgress={handleViewProgress}
            />
          )}
        </div>

        {/* Right Sidebar - 1 column (Reference & Reflection) */}
        <div className="lg:col-span-1">
          <DashboardSidebar
            onViewSchedule={handleViewSchedule}
            onMaintainRank={handleMaintainRank}
            onViewAllCourses={handleViewAllCourses}
          />
        </div>
      </div>
    </SharedDashboardLayout>
  );
}

export default function Dashboard() {
  return (
    <OnboardingGuard>
      <DashboardContent />
    </OnboardingGuard>
  );
}
