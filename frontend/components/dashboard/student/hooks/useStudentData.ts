import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import { Course } from '../types';
import { useCourses } from '@/lib/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';

export function useStudentData() {
  // ✅ NEW: Use Supabase hooks instead of API calls
  const { user } = useAuth();
  const { courses: supabaseCourses, loading: coursesLoading, refetch } = useCourses({
    published: true // Students only see published courses
  });
  
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
  const router = useRouter();

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Transform Supabase courses to match student interface
  const courses: Course[] = supabaseCourses.map((course, index) => ({
    id: course.id,
    title: course.title,
    code: course.code || 'N/A',
    term: course.term || 'Current',
    description: course.description || '',
    color: `course-${['blue', 'green', 'purple', 'orange', 'red', 'teal'][index % 6]}`,
    lastActivity: course.updated_at
      ? formatRelativeTime(course.updated_at)
      : 'Recently',
    materialsCount: 0, // Could be enhanced with actual count from modules
    studentsCount: 0,  // Could be enhanced with actual enrollment count
    unreadCount: Math.floor(Math.random() * 3), // TODO: Implement real unread count
  }));

  const checkOnboardingStatus = (currentUser: any) => {
    if (!currentUser) return false;
    
    const userRole = currentUser.user_metadata?.role || 'student';
    if (userRole === 'student') {
      const userName = currentUser.user_metadata?.full_name;
      if (!userName) {
        const hasCompletedOnboarding =
          localStorage.getItem(`onboarding_completed_${currentUser.id}`) === 'true';

        if (!hasCompletedOnboarding) {
          router.push('/onboarding');
          return false;
        } else {
          setShowOnboardingPrompt(true);
          return false;
        }
      } else {
        localStorage.setItem(`onboarding_completed_${currentUser.id}`, 'true');
      }
    }
    return true;
  };

  // Check onboarding when user changes
  useEffect(() => {
    if (user) {
      checkOnboardingStatus(user);
    }
  }, [user, router]);

  const handleOnboardingComplete = () => {
    if (user?.id) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
    router.push('/onboarding');
  };

  const dismissOnboardingPrompt = () => {
    setShowOnboardingPrompt(false);
  };

  return {
    courses,
    loading: coursesLoading,
    userProfile: user, // Use auth user as profile
    showOnboardingPrompt,
    handleOnboardingComplete,
    dismissOnboardingPrompt,
    reloadData: refetch, // Use refetch from hook
  };
}
