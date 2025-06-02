import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface UserDataStatus {
  hasCourses: boolean;
  hasActivities: boolean;
  hasTodos: boolean;
  hasCompletedMissions: boolean;
  isLoading: boolean;
  isExistingUser: boolean; // Has any historical data
  hasHistoricalMetrics: boolean; // Has metrics from before onboarding update
}

export function useHasData(): UserDataStatus {
  const [dataStatus, setDataStatus] = useState<UserDataStatus>({
    hasCourses: false,
    hasActivities: false,
    hasTodos: false,
    hasCompletedMissions: false,
    isLoading: true,
    isExistingUser: false,
    hasHistoricalMetrics: false
  });

  useEffect(() => {
    const checkUserData = async () => {
      try {
        // Check courses
        const coursesResponse = await apiClient.get('/api/v2/courses');
        const hasCourses = coursesResponse.data?.items?.length > 0;

        // Check activities from dashboard overview
        const dashboardResponse = await apiClient.get('/api/v2/dashboard/overview');
        const dashboardData = dashboardResponse.data;
        
        const hasActivities = dashboardData?.weekly_progress?.xp?.current > 0 || 
                            dashboardData?.weekly_progress?.tasks?.completed > 0 ||
                            dashboardData?.weekly_progress?.study_time?.current > 0;
        
        const hasTodos = dashboardData?.priority_actions?.length > 0;

        // Check localStorage for completed missions
        const completedMissions = JSON.parse(localStorage.getItem('completedSetupMissions') || '[]');
        const hasCompletedMissions = completedMissions.length === 3; // All 3 missions

        // Check if user has historical metrics (before onboarding update)
        const onboardingReleaseDate = new Date('2025-01-06'); // Today's date
        const hasHistoricalData = localStorage.getItem('userHasHistoricalData');
        
        // Check if user has any XP or completed tasks that indicate they're an existing user
        const isExistingUser = hasActivities || hasCourses || hasTodos || 
                             dashboardData?.weekly_progress?.xp?.target > 150 || // Custom XP target
                             dashboardData?.weekly_progress?.tasks?.total > 8; // Custom task target
        
        // If user has activities, mark them as having historical data
        if (isExistingUser && !hasHistoricalData) {
          localStorage.setItem('userHasHistoricalData', 'true');
        }
        
        const hasHistoricalMetrics = hasHistoricalData === 'true' || isExistingUser;

        setDataStatus({
          hasCourses,
          hasActivities,
          hasTodos,
          hasCompletedMissions,
          isLoading: false,
          isExistingUser,
          hasHistoricalMetrics
        });
      } catch (error) {
        console.error('Error checking user data:', error);
        setDataStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkUserData();
  }, []);

  return dataStatus;
}