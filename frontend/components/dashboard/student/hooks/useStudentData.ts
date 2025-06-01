import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { studentAPI, userAPI } from '@/lib/api';
import { toast as sonnerToast } from 'sonner';
import { Course } from '../types';

export function useStudentData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
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

  const transformCourseData = (coursesData: any[]) => {
    return coursesData.map((course: any, index: number) => ({
      id: course.id,
      title: course.title,
      code: course.code || 'N/A',
      term: course.term || 'Current',
      description: course.description || '',
      color: `course-${['blue', 'green', 'purple', 'orange', 'red', 'teal'][index % 6]}`,
      lastActivity: course.last_updated
        ? formatRelativeTime(course.last_updated)
        : 'Recently',
      materialsCount: course.modules?.length || 0,
      studentsCount: course.students || 0,
      unreadCount: Math.floor(Math.random() * 3), // TODO: Implement real unread count
    }));
  };

  const checkOnboardingStatus = (user: any) => {
    if (user.role === 'student') {
      if (!user.profile || !user.profile.name) {
        const hasCompletedOnboarding =
          localStorage.getItem(`onboarding_completed_${user.id}`) === 'true';

        if (!hasCompletedOnboarding) {
          router.push('/onboarding');
          return false;
        } else {
          setShowOnboardingPrompt(true);
          return false;
        }
      } else {
        localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      }
    }
    return true;
  };

  const loadStudentData = async () => {
    try {
      setLoading(true);

      const [user, coursesData] = await Promise.all([
        userAPI.getMe(),
        studentAPI.getCourses(),
      ]);

      setUserProfile(user);

      if (!checkOnboardingStatus(user)) {
        return;
      }

      const transformedCourses = transformCourseData(coursesData);
      setCourses(transformedCourses);
    } catch (error) {
      console.error('Failed to load student data:', error);
      sonnerToast.error('Failed to load courses. Please try again.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [router]);

  const handleOnboardingComplete = () => {
    if (userProfile?.id) {
      localStorage.setItem(`onboarding_completed_${userProfile.id}`, 'true');
    }
    router.push('/onboarding');
  };

  const dismissOnboardingPrompt = () => {
    setShowOnboardingPrompt(false);
  };

  return {
    courses,
    loading,
    userProfile,
    showOnboardingPrompt,
    handleOnboardingComplete,
    dismissOnboardingPrompt,
    reloadData: loadStudentData,
  };
}
