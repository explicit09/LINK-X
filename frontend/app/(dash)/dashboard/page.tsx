'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { DashboardMainContent } from '@/components/dashboard/sections/DashboardMainContent';
import { DashboardSidebar } from '@/components/dashboard/sections/DashboardSidebar';
import { authAPI } from '@/lib/api';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function Dashboard() {
  const [role, setRole] = useState<
    'student' | 'instructor' | 'admin' | 'unknown'
  >('unknown');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  
  // Use auth guard to ensure user is authenticated and registered
  const authState = useAuthGuard(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await authAPI.v2.getProfile();
        console.log('Raw API response:', response);
        
        // The backend returns { success: true, data: {...}, message: "Success", timestamp: "..." }
        // So we need to extract the data field
        const userData = response.data;
        
        if (!userData) {
          throw new Error('No user data in response');
        }
        
        console.log('User data from backend:', userData);
        console.log('Profile data:', userData.profile);
        
        // Extract role from the response
        const userRole = userData.role || 'student';
        setRole(userRole as 'student' | 'instructor' | 'admin');
        
        // Extract user info and include name from profile
        const userInfo = {
          id: userData.id,
          email: userData.email,
          name: userData.profile?.name || userData.email?.split('@')[0] || 'User',
          role: userRole,
          avatar: userData.avatar,
          ...userData
        };
        
        console.log('Extracted user info:', userInfo);
        
        setCurrentUser(userInfo);
      } catch (error: any) {
        console.error('Failed to fetch user:', error);
        
        // If user is not registered (404), redirect to onboarding
        if (error?.status === 404 || error?.response?.status === 404) {
          router.push('/onboarding');
          return;
        }
        
        // For other errors in development, show a message
        setRole('student');
        setCurrentUser({ name: 'Loading...', email: 'Please wait...' });
      }
    };

    // Only fetch if user is authenticated and registered
    if (authState.isRegistered && !authState.isLoading) {
      fetchUserRole();
    }
  }, [router, authState.isRegistered, authState.isLoading]);

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

  if (authState.isLoading || (authState.isRegistered && role === 'unknown')) {
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

  // Use SharedDashboardLayout with professional structure
  return (
    <SharedDashboardLayout currentUser={currentUser}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3">
          <DashboardMainContent
            onActionClick={handleActionClick}
            onCourseClick={handleCourseClick}
            onViewProgress={handleViewProgress}
          />
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
