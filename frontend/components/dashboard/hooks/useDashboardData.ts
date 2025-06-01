import { useState, useEffect } from 'react';
import { instructorAPI, studentAPI } from '@/lib/api';

interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  published?: boolean;
  color?: string;
  lastActivity?: string;
  unreadCount?: number;
  materialsCount?: number;
  studentsCount?: number;
}

interface DashboardStats {
  aiInteractions: number;
  weeklyHours: number;
  loading: boolean;
}

export const useDashboardData = (userRole: string) => {
  const [loading, setLoading] = useState(true);
  const [realCourses, setRealCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    aiInteractions: 0,
    weeklyHours: 0,
    loading: true,
  });

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

  const loadCourses = async () => {
    try {
      setLoading(true);

      // Load courses based on user role
      let coursesData = [];
      if (userRole === 'student') {
        coursesData = await studentAPI.getCourses();
      } else if (userRole === 'instructor') {
        coursesData = await instructorAPI.getCourses();
      } else if (userRole === 'admin') {
        coursesData = await instructorAPI.getCourses(); // Admin uses instructor API for courses
      }

      // Transform API data to match our interface
      const transformedCourses = coursesData.map(
        (course: any, index: number) => ({
          id: course.id,
          title: course.title,
          code: course.code || 'N/A',
          term: course.term || 'Current',
          description: course.description || '',
          published: course.published,
          color: `course-${['blue', 'green', 'purple', 'orange', 'red', 'teal'][index % 6]}`,
          lastActivity: course.last_updated
            ? formatRelativeTime(course.last_updated)
            : 'Recently',
          materialsCount: course.modules?.length || 0,
          studentsCount: course.students || 0,
          unreadCount: Math.floor(Math.random() * 5),
        }),
      );

      setRealCourses(transformedCourses);

      // Load user profile
      const user = await studentAPI.getProfile();
      setUserProfile(user);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setRealCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setDashboardStats((prev) => ({ ...prev, loading: true }));

      if (userRole === 'student') {
        try {
          const apiStats = await studentAPI.getDashboardStats();
          setDashboardStats({
            aiInteractions: apiStats.aiInteractions || 0,
            weeklyHours: apiStats.weeklyHours || 0,
            loading: false,
          });
          return;
        } catch (apiError) {
          console.warn('Failed to load real dashboard stats:', apiError);
          setDashboardStats({
            aiInteractions: 0,
            weeklyHours: 0,
            loading: false,
          });
          return;
        }
      }

      // For instructors/admins, show basic stats
      setDashboardStats({
        aiInteractions: 0,
        weeklyHours: 0,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      setDashboardStats({
        aiInteractions: 0,
        weeklyHours: 0,
        loading: false,
      });
    }
  };

  useEffect(() => {
    loadCourses();
  }, [userRole]);

  return {
    loading,
    realCourses,
    userProfile,
    dashboardStats,
    loadCourses,
    loadDashboardStats,
    setRealCourses,
  };
};
