'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { DashboardMainContent } from '@/components/dashboard/sections/DashboardMainContent';
import { DashboardSidebar } from '@/components/dashboard/sections/DashboardSidebar';
import { userAPI } from '@/lib/api';

export default function Dashboard() {
  const [role, setRole] = useState<
    'student' | 'instructor' | 'admin' | 'unknown'
  >('unknown');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = await userAPI.getMe();
        setRole(user.role || 'student'); // Default to student
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // For development, default to student instead of redirecting
        setRole('student');
        setCurrentUser({ name: 'Student User', email: 'student@example.com' });
      }
    };

    fetchUserRole();
  }, [router]);

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

  if (role === 'unknown') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
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
