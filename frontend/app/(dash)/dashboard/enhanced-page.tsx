'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserJourneyStage, UserJourneyStage } from '@/hooks/useUserJourneyStage';
import { useOnboardingTracking } from '@/hooks/useOnboardingTracking';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { ProgressiveDashboard } from '@/components/dashboard/sections/ProgressiveDashboard';
import { FirstTimeUserGuide } from '@/components/dashboard/FirstTimeUserGuide';
import { DashboardSidebar } from '@/components/dashboard/sections/DashboardSidebar';
import { HelpTooltip, useContextualHelp } from '@/components/ui/contextual-help';
import { 
  useDashboardOverview, 
  useAIRecommendations 
} from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';

export default function EnhancedDashboardPage() {
  const router = useRouter();
  const { loading: authLoading, authenticated, isRegistered } = useAuthGuard();
  const { user } = useAuthUser();
  const { stage, isLoading: journeyLoading } = useUserJourneyStage();
  const { trackEvent } = useOnboardingTracking();
  const { resetAllHelp } = useContextualHelp();
  
  // Dashboard data
  const { 
    data: dashboardData, 
    loading: dashboardLoading, 
    refetch: refetchDashboard 
  } = useDashboardOverview();
  const { 
    data: aiData, 
    loading: aiLoading 
  } = useAIRecommendations();

  // Redirect logic
  useEffect(() => {
    if (!authLoading) {
      if (!authenticated) {
        router.push('/login');
      } else if (!isRegistered) {
        router.push('/onboarding');
      }
    }
  }, [authLoading, authenticated, isRegistered, router]);

  // Track dashboard visit
  useEffect(() => {
    if (user && stage) {
      trackEvent('dashboard_visited', {
        user_stage: stage,
        has_courses: dashboardData?.courses_count > 0,
        total_xp: dashboardData?.weekly_progress?.xp?.lifetime || 0
      });
    }
  }, [user, stage, dashboardData, trackEvent]);

  // Handle loading states
  if (authLoading || journeyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">Loading your dashboard...</div>
      </div>
    );
  }

  // Only render if authenticated and registered
  if (!authenticated || !isRegistered) {
    return null;
  }

  const userName = user?.displayName || user?.email?.split('@')[0] || 'there';

  const handleActionClick = (action: any) => {
    console.log('Action clicked:', action);
    
    // Track action clicks
    trackEvent('dashboard_action_clicked', {
      action_type: action.type,
      action_id: action.id,
      user_stage: stage
    });

    // Handle different action types
    switch (action.type) {
      case 'add-course':
        router.push('/courses');
        break;
      case 'study-session':
        router.push(`/courses/${action.courseId}`);
        break;
      case 'view-progress':
        router.push('/progress');
        break;
      case 'schedule':
        router.push('/schedule');
        break;
      default:
        console.log('Unhandled action type:', action.type);
    }
  };

  return (
    <SharedDashboardLayout 
      mainContent={
        <>
          {/* First Time User Guide */}
          {stage === UserJourneyStage.FIRST_VISIT && (
            <FirstTimeUserGuide 
              onGuideComplete={() => {
                trackEvent('dashboard_tour_completed');
              }}
            />
          )}

          {/* Main Dashboard Content */}
          <div className="dashboard-content">
            <ProgressiveDashboard
              userName={userName}
              dashboardData={dashboardData}
              aiRecommendations={aiData?.recommendations}
              onActionClick={handleActionClick}
            />
          </div>

          {/* Development Tools (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-20 right-4 space-y-2">
              <HelpTooltip 
                content="Reset all help tooltips and guides"
                side="left"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resetAllHelp();
                    window.location.reload();
                  }}
                  className="shadow-lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Help
                </Button>
              </HelpTooltip>
              
              <HelpTooltip 
                content="View current user journey stage"
                side="left"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="shadow-lg"
                >
                  Stage: {stage}
                </Button>
              </HelpTooltip>
            </div>
          )}
        </>
      }
      sidebarContent={
        <DashboardSidebar 
          onNavigate={(path) => router.push(path)}
          currentStage={stage}
        />
      }
    />
  );
}

// Enhanced Sidebar with stage-aware features
interface EnhancedSidebarProps {
  onNavigate: (path: string) => void;
  currentStage: UserJourneyStage;
}

function EnhancedDashboardSidebar({ onNavigate, currentStage }: EnhancedSidebarProps) {
  const isFeatureLocked = (requiredStage: UserJourneyStage) => {
    const stageOrder = [
      UserJourneyStage.FIRST_VISIT,
      UserJourneyStage.ONBOARDED,
      UserJourneyStage.GETTING_STARTED,
      UserJourneyStage.ACTIVE_LEARNER,
      UserJourneyStage.POWER_USER
    ];
    
    return stageOrder.indexOf(currentStage) < stageOrder.indexOf(requiredStage);
  };

  return (
    <div className="space-y-6">
      {/* Original sidebar content */}
      <DashboardSidebar onNavigate={onNavigate} />
      
      {/* Stage-specific help */}
      {currentStage === UserJourneyStage.FIRST_VISIT && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-sm mb-2">Getting Started Tips</h4>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Complete your profile for better recommendations</li>
            <li>• Add your first course to unlock features</li>
            <li>• Earn XP by completing setup missions</li>
          </ul>
        </div>
      )}
      
      {currentStage === UserJourneyStage.GETTING_STARTED && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-sm mb-2">Next Steps</h4>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Try your first AI-powered study session</li>
            <li>• Set weekly learning goals</li>
            <li>• Explore course materials</li>
          </ul>
        </div>
      )}
    </div>
  );
}