import { useMemo } from 'react';
import { useUserJourneyStage, UserJourneyStage } from './useUserJourneyStage';
import { useGamification } from '@/contexts/GamificationContext';

export enum DashboardMode {
  WELCOME = 'welcome',           // FIRST_VISIT + ONBOARDED
  GUIDED = 'guided',             // GETTING_STARTED
  STANDARD = 'standard',         // ACTIVE_LEARNER
  ADVANCED = 'advanced'          // POWER_USER
}

interface DashboardModeConfig {
  mode: DashboardMode;
  title: string;
  description: string;
  showMetrics: boolean;
  showSetupMissions: boolean;
  showPreview: boolean;
  simplifiedView: boolean;
  showEncouragement: boolean;
  ctaFocus: string;
  availableFeatures: string[];
  sidebarItems: string[];
}

const dashboardConfigs: Record<DashboardMode, DashboardModeConfig> = {
  [DashboardMode.WELCOME]: {
    mode: DashboardMode.WELCOME,
    title: 'Welcome to Your Learning Adventure!',
    description: "Let's set up your personalized learning experience",
    showMetrics: false,
    showSetupMissions: true,
    showPreview: true,
    simplifiedView: false,
    showEncouragement: true,
    ctaFocus: 'get-started',
    availableFeatures: ['profile', 'courses', 'basic-study'],
    sidebarItems: ['Dashboard', 'Profile Setup', 'Add Course']
  },
  [DashboardMode.GUIDED]: {
    mode: DashboardMode.GUIDED,
    title: 'Great start! You\'re building momentum',
    description: 'Keep going - every session counts toward your goals',
    showMetrics: true,
    showSetupMissions: false,
    showPreview: false,
    simplifiedView: true,
    showEncouragement: true,
    ctaFocus: 'continue-building',
    availableFeatures: ['profile', 'courses', 'study', 'simple-progress'],
    sidebarItems: ['Dashboard', 'My Courses', 'Study Plan', 'Progress']
  },
  [DashboardMode.STANDARD]: {
    mode: DashboardMode.STANDARD,
    title: 'Welcome back! You\'re making great progress',
    description: 'Your personalized learning dashboard is ready',
    showMetrics: true,
    showSetupMissions: false,
    showPreview: false,
    simplifiedView: false,
    showEncouragement: false,
    ctaFocus: 'optimize-learning',
    availableFeatures: ['all-basic', 'ai-recommendations', 'analytics'],
    sidebarItems: ['Dashboard', 'My Courses', 'Study Plan', 'Schedule', 'Progress', 'Gamification']
  },
  [DashboardMode.ADVANCED]: {
    mode: DashboardMode.ADVANCED,
    title: 'Power User Dashboard',
    description: 'Advanced analytics and insights for optimal learning',
    showMetrics: true,
    showSetupMissions: false,
    showPreview: false,
    simplifiedView: false,
    showEncouragement: false,
    ctaFocus: 'advanced-optimization',
    availableFeatures: ['all-features', 'advanced-analytics', 'admin-tools'],
    sidebarItems: ['Dashboard', 'My Courses', 'Study Plan', 'Schedule', 'Progress', 'Gamification', 'Analytics', 'Community']
  }
};

export function useDashboardMode() {
  const { stage, metrics, isLoading } = useUserJourneyStage();
  const { userStats } = useGamification();

  const mode = useMemo(() => {
    if (isLoading) return DashboardMode.WELCOME;

    // Map UserJourneyStage to DashboardMode
    switch (stage) {
      case UserJourneyStage.FIRST_VISIT:
      case UserJourneyStage.ONBOARDED:
        return DashboardMode.WELCOME;
      
      case UserJourneyStage.GETTING_STARTED:
        return DashboardMode.GUIDED;
      
      case UserJourneyStage.ACTIVE_LEARNER:
        return DashboardMode.STANDARD;
      
      case UserJourneyStage.POWER_USER:
        return DashboardMode.ADVANCED;
      
      default:
        return DashboardMode.WELCOME;
    }
  }, [stage, isLoading]);

  const config = dashboardConfigs[mode];

  // Setup missions progress tracking
  const setupMissions = useMemo(() => {
    const completedMissions = JSON.parse(localStorage.getItem('completedSetupMissions') || '[]');
    
    return [
      {
        id: 'profile',
        title: 'Complete Your Profile',
        description: 'Add your learning preferences and goals',
        xp: 50,
        icon: 'user',
        completed: metrics.completedOnboarding,
        action: () => window.location.href = '/onboarding'
      },
      {
        id: 'first-course',
        title: 'Add Your First Course',
        description: 'Import from your LMS or create manually',
        xp: 100,
        icon: 'book',
        completed: metrics.coursesCount > 0,
        action: () => window.location.href = '/my-courses'
      },
      {
        id: 'first-session',
        title: 'Start Learning',
        description: 'Begin your first study session',
        xp: 150,
        icon: 'play',
        completed: (userStats?.total_xp || 0) > 0,
        action: () => {
          if (metrics.coursesCount > 0) {
            window.location.href = '/my-courses';
          } else {
            window.location.href = '/my-courses';
          }
        }
      }
    ];
  }, [metrics, userStats]);

  const completedMissionsCount = setupMissions.filter(m => m.completed).length;
  const totalMissionsXP = setupMissions.reduce((sum, mission) => sum + mission.xp, 0);
  const earnedMissionsXP = setupMissions.filter(m => m.completed).reduce((sum, mission) => sum + mission.xp, 0);

  return {
    mode,
    config,
    stage,
    metrics,
    userStats,
    isLoading,
    setupMissions,
    missionProgress: {
      completed: completedMissionsCount,
      total: setupMissions.length,
      percentage: Math.round((completedMissionsCount / setupMissions.length) * 100),
      earnedXP: earnedMissionsXP,
      totalXP: totalMissionsXP
    }
  };
}

// Helper function to check if feature is available in current mode
export function useFeatureAvailability() {
  const { config } = useDashboardMode();
  
  return {
    isFeatureAvailable: (feature: string) => {
      return config.availableFeatures.includes(feature) || 
             config.availableFeatures.includes('all-features') ||
             config.availableFeatures.includes('all-basic');
    },
    availableFeatures: config.availableFeatures
  };
}