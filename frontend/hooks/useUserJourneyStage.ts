import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

export enum UserJourneyStage {
  FIRST_VISIT = 'first_visit',          // Just registered, no profile
  ONBOARDED = 'onboarded',              // Profile complete, no courses
  GETTING_STARTED = 'getting_started',   // Has 1-2 courses, minimal activity
  ACTIVE_LEARNER = 'active_learner',     // Regular activity, multiple courses
  POWER_USER = 'power_user'              // High engagement, consistent usage
}

interface UserMetrics {
  coursesCount: number;
  totalXP: number;
  tasksCompleted: number;
  studyHours: number;
  daysSinceSignup: number;
  lastActivityDays: number;
  streakDays: number;
  completedOnboarding: boolean;
  setupMissionsCompleted: number;
}

interface UserJourneyData {
  stage: UserJourneyStage;
  metrics: UserMetrics;
  isLoading: boolean;
  progressToNextStage: number; // 0-100
  nextStageRequirements: string[];
  personalizationLevel: number; // 0-100
}

export function useUserJourneyStage(): UserJourneyData {
  const [journeyData, setJourneyData] = useState<UserJourneyData>({
    stage: UserJourneyStage.FIRST_VISIT,
    metrics: {
      coursesCount: 0,
      totalXP: 0,
      tasksCompleted: 0,
      studyHours: 0,
      daysSinceSignup: 0,
      lastActivityDays: 0,
      streakDays: 0,
      completedOnboarding: false,
      setupMissionsCompleted: 0
    },
    isLoading: true,
    progressToNextStage: 0,
    nextStageRequirements: [],
    personalizationLevel: 0
  });

  useEffect(() => {
    const analyzeUserJourney = async () => {
      try {
        // Fetch user data from multiple endpoints
        const [coursesRes, dashboardRes] = await Promise.all([
          apiClient.get('/api/v2/courses').catch(() => null),
          apiClient.get('/api/v2/dashboard/overview').catch(() => null)
        ]);
        
        // Profile endpoint might not exist, use user data from auth instead
        const profileRes = null;
        
        // Mock activity response until backend endpoint is implemented
        const activityRes = {
          data: {
            last_activity: new Date().toISOString(),
            streak_days: 0,
            total_study_time: 0
          }
        };

        // Extract metrics
        const profile = profileRes?.data;
        // Fix: BaseClient already unwraps v2 responses, so coursesRes IS the array
        const courses = coursesRes || [];
        // Fix: BaseClient unwraps v2 responses, so dashboardRes IS the data
        const dashboard = dashboardRes || {};
        const activity = activityRes?.data;
        
        console.log('📊 Raw Data Debug:', {
          fullCoursesResponse: coursesRes,
          coursesArray: courses,
          coursesLength: courses.length,
          isArray: Array.isArray(courses),
          coursesResponseType: typeof coursesRes,
          sampleCourse: courses[0] || 'no courses',
          dashboardData: dashboard
        });

        // Calculate days since signup (default to 0 for new users)
        const signupDate = new Date(); // We'll use current date as fallback
        const daysSinceSignup = 0; // Default to new user

        // Calculate last activity
        const lastActivity = activity?.last_activity ? new Date(activity.last_activity) : new Date();
        const lastActivityDays = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        // Get setup missions from localStorage
        const completedMissions = JSON.parse(localStorage.getItem('completedSetupMissions') || '[]');

        const metrics: UserMetrics = {
          coursesCount: courses.length,
          totalXP: dashboard?.weekly_progress?.xp?.lifetime || 0,
          tasksCompleted: dashboard?.weekly_progress?.tasks?.lifetime_completed || 0,
          studyHours: Math.round((dashboard?.weekly_progress?.study_time?.lifetime || 0) / 60),
          daysSinceSignup,
          lastActivityDays,
          streakDays: activity?.streak_days || 0,
          // If user has courses, they must have completed onboarding (handles LMS imports)
          completedOnboarding: courses.length > 0 || localStorage.getItem('onboarding_completed') === 'true',
          setupMissionsCompleted: completedMissions.length
        };

        // Determine user stage
        const stage = determineUserStage(metrics);
        
        // Debug logging
        console.log('🔍 User Journey Debug:', {
          coursesCount: metrics.coursesCount,
          totalXP: metrics.totalXP,
          tasksCompleted: metrics.tasksCompleted,
          completedOnboarding: metrics.completedOnboarding,
          setupMissionsCompleted: metrics.setupMissionsCompleted,
          determinedStage: stage
        });
        
        // Calculate progress to next stage
        const { progress, requirements } = calculateProgressToNextStage(stage, metrics);
        
        // Calculate personalization level
        const personalizationLevel = calculatePersonalizationLevel(metrics);

        setJourneyData({
          stage,
          metrics,
          isLoading: false,
          progressToNextStage: progress,
          nextStageRequirements: requirements,
          personalizationLevel
        });

      } catch (error) {
        console.error('Error analyzing user journey:', error);
        setJourneyData(prev => ({ ...prev, isLoading: false }));
      }
    };

    analyzeUserJourney();
  }, []);

  return journeyData;
}

function determineUserStage(metrics: UserMetrics): UserJourneyStage {
  // IMPORTANT: Users with courses should NEVER be treated as first-time visitors
  // This handles LMS imports and existing users
  
  // Stage 5: Power User (500+ XP, 50+ tasks, 20+ study hours, 7+ day streak)
  if (
    metrics.totalXP >= 500 && 
    metrics.tasksCompleted >= 50 && 
    metrics.studyHours >= 20 &&
    metrics.streakDays >= 7
  ) {
    return UserJourneyStage.POWER_USER;
  }

  // Stage 4: Active Learner (3+ courses OR 100+ XP OR 10+ tasks OR 5+ study hours)
  if (
    metrics.coursesCount >= 3 || 
    metrics.totalXP >= 100 || 
    metrics.tasksCompleted >= 10 ||
    metrics.studyHours >= 5
  ) {
    return UserJourneyStage.ACTIVE_LEARNER;
  }

  // Stage 3: Getting Started (has courses but limited activity)
  if (metrics.coursesCount > 0) {
    return UserJourneyStage.GETTING_STARTED;
  }

  // Stage 2: Onboarded but no courses
  if (metrics.completedOnboarding || metrics.setupMissionsCompleted > 0) {
    return UserJourneyStage.ONBOARDED;
  }

  // Stage 1: First Visit (truly new users with no courses and no onboarding)
  return UserJourneyStage.FIRST_VISIT;
}

function calculateProgressToNextStage(
  stage: UserJourneyStage, 
  metrics: UserMetrics
): { progress: number; requirements: string[] } {
  switch (stage) {
    case UserJourneyStage.FIRST_VISIT:
      const onboardingProgress = metrics.completedOnboarding ? 50 : 0;
      const missionsProgress = (metrics.setupMissionsCompleted / 3) * 50;
      return {
        progress: onboardingProgress + missionsProgress,
        requirements: [
          !metrics.completedOnboarding && 'Complete your profile',
          metrics.setupMissionsCompleted < 3 && `Complete ${3 - metrics.setupMissionsCompleted} more setup missions`
        ].filter(Boolean) as string[]
      };

    case UserJourneyStage.ONBOARDED:
      return {
        progress: 0,
        requirements: ['Add your first course']
      };

    case UserJourneyStage.GETTING_STARTED:
      const xpProgress = Math.min(metrics.totalXP / 100, 1) * 33;
      const taskProgress = Math.min(metrics.tasksCompleted / 5, 1) * 33;
      const courseProgress = Math.min(metrics.coursesCount / 3, 1) * 34;
      return {
        progress: Math.round(xpProgress + taskProgress + courseProgress),
        requirements: [
          metrics.totalXP < 100 && `Earn ${100 - metrics.totalXP} more XP`,
          metrics.tasksCompleted < 5 && `Complete ${5 - metrics.tasksCompleted} more tasks`,
          metrics.coursesCount < 3 && `Add ${3 - metrics.coursesCount} more courses`
        ].filter(Boolean) as string[]
      };

    case UserJourneyStage.ACTIVE_LEARNER:
      const powerXpProgress = Math.min(metrics.totalXP / 500, 1) * 25;
      const powerTaskProgress = Math.min(metrics.tasksCompleted / 50, 1) * 25;
      const powerStudyProgress = Math.min(metrics.studyHours / 20, 1) * 25;
      const powerStreakProgress = Math.min(metrics.streakDays / 7, 1) * 25;
      return {
        progress: Math.round(powerXpProgress + powerTaskProgress + powerStudyProgress + powerStreakProgress),
        requirements: [
          metrics.totalXP < 500 && `Reach 500 XP (${500 - metrics.totalXP} to go)`,
          metrics.tasksCompleted < 50 && `Complete 50 tasks (${50 - metrics.tasksCompleted} to go)`,
          metrics.studyHours < 20 && `Study for 20 hours (${20 - metrics.studyHours} to go)`,
          metrics.streakDays < 7 && `Build a 7-day streak (${7 - metrics.streakDays} days to go)`
        ].filter(Boolean) as string[]
      };

    case UserJourneyStage.POWER_USER:
      return {
        progress: 100,
        requirements: ['Keep up the amazing work! 🎉']
      };

    default:
      return { progress: 0, requirements: [] };
  }
}

function calculatePersonalizationLevel(metrics: UserMetrics): number {
  // Calculate how personalized the experience is based on user data
  let level = 0;
  
  // Profile completion (20%)
  if (metrics.completedOnboarding) level += 20;
  
  // Course data (20%)
  level += Math.min(metrics.coursesCount * 5, 20);
  
  // Activity data (30%)
  if (metrics.totalXP > 0) level += 10;
  if (metrics.tasksCompleted > 0) level += 10;
  if (metrics.studyHours > 0) level += 10;
  
  // Engagement (30%)
  if (metrics.streakDays > 0) level += 10;
  if (metrics.lastActivityDays < 7) level += 10;
  if (metrics.daysSinceSignup > 7) level += 10;
  
  return Math.min(level, 100);
}