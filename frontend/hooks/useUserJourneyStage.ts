import { useState, useEffect } from 'react';
import { courseOperations } from '@/lib/db/operations';
import { supabase } from '@/lib/supabase';

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

export function useUserJourneyStage(): UserJourneyData & { refresh: () => void } {
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
  
  // Add caching to reduce database calls
  const [lastFetched, setLastFetched] = useState<number>(0);
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  const analyzeUserJourney = async (forceRefresh: boolean = false) => {
      try {
        // Check cache first (unless forced refresh or first load)
        const now = Date.now();
        if (!forceRefresh && lastFetched > 0 && now - lastFetched < CACHE_DURATION) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[useUserJourneyStage] Using cached data');
          }
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[useUserJourneyStage] Fetching fresh data...');
        }
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setJourneyData(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Fetch all necessary data in parallel
        const [
          coursesResponse,
          profileData,
          userStatsData,
          completedTasksData,
          studyTimeData,
          lastActivityData
        ] = await Promise.all([
          // 1. Get courses
          courseOperations.getUserCourses().catch(() => ({ courses: [], total: 0 })),
          
          // 2. Get user profile
          supabase
            .from('profiles')
            .select('onboarding_completed, onboarding_step, created_at')
            .eq('id', user.id)
            .single(),
          
          // 3. Get user stats (XP and streaks)
          supabase
            .from('user_stats')
            .select('total_xp, daily_streak, last_activity_date')
            .eq('user_id', user.id)
            .single(),
          
          // 4. Count completed tasks
          supabase
            .from('todos')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('completed', true),
          
          // 5. Calculate total study hours (skip for now - table doesn't exist)
          Promise.resolve({ data: [], error: null }),
          
          // 6. Get last activity from user_activities
          supabase
            .from('user_activities')
            .select('created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        ]);
        
        // Extract data
        const courses = coursesResponse.courses || [];
        const profile = profileData.data;
        const userStats = userStatsData.data;
        const completedTasksCount = completedTasksData.count || 0;
        
        // Calculate total study hours (skip calculation if no study sessions data)
        const totalStudyMinutes = studyTimeData.data?.length > 0 
          ? studyTimeData.data.reduce((sum: number, session: any) => 
              sum + (session.actual_duration || 0), 0) 
          : 0;
        const studyHours = Math.round(totalStudyMinutes / 60);
        
        // Calculate days since signup
        const signupDate = profile?.created_at ? new Date(profile.created_at) : new Date();
        const daysSinceSignup = Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate last activity days
        const lastActivityDate = lastActivityData.data?.created_at || 
                                 userStats?.last_activity_date || 
                                 new Date().toISOString();
        const lastActivity = new Date(lastActivityDate);
        const lastActivityDays = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get setup missions from localStorage (this should eventually move to DB)
        const completedMissions = JSON.parse(localStorage.getItem('completedSetupMissions') || '[]');
        
        // Determine if onboarding is completed
        const isOnboardingCompleted = profile?.onboarding_completed || 
                                     profile?.onboarding_step === 999 || 
                                     courses.length > 0 || 
                                     localStorage.getItem('onboarding_completed') === 'true';

        const metrics: UserMetrics = {
          coursesCount: courses.length,
          totalXP: userStats?.total_xp || 0,
          tasksCompleted: completedTasksCount,
          studyHours: studyHours,
          daysSinceSignup,
          lastActivityDays,
          streakDays: userStats?.daily_streak || 0,
          completedOnboarding: isOnboardingCompleted,
          setupMissionsCompleted: completedMissions.length
        };
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 User Journey Metrics:', {
            coursesCount: metrics.coursesCount,
            totalXP: metrics.totalXP,
            tasksCompleted: metrics.tasksCompleted,
            studyHours: metrics.studyHours,
            daysSinceSignup: metrics.daysSinceSignup,
            lastActivityDays: metrics.lastActivityDays,
            streakDays: metrics.streakDays,
            completedOnboarding: metrics.completedOnboarding,
            setupMissionsCompleted: metrics.setupMissionsCompleted
          });
        }

        // Determine user stage
        const stage = determineUserStage(metrics);
        
        // Debug logging (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 User Journey Debug:', {
            coursesCount: metrics.coursesCount,
            totalXP: metrics.totalXP,
            tasksCompleted: metrics.tasksCompleted,
            completedOnboarding: metrics.completedOnboarding,
            setupMissionsCompleted: metrics.setupMissionsCompleted,
            determinedStage: stage
          });
        }
        
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
        
        // Update cache timestamp
        setLastFetched(Date.now());

      } catch (error) {
        console.error('Error analyzing user journey:', error);
        setJourneyData(prev => ({ ...prev, isLoading: false }));
      }
  };

  useEffect(() => {
    analyzeUserJourney();
  }, []);

  // Add refresh function with force refresh
  const refresh = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useUserJourneyStage] Manual refresh triggered');
    }
    setJourneyData(prev => ({ ...prev, isLoading: true }));
    analyzeUserJourney(true); // Force refresh
  };

  return { ...journeyData, refresh };
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