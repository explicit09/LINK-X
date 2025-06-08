import { useState, useEffect } from 'react';
import { useCourses } from '@/lib/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

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
  // ✅ NEW: Use Supabase hooks instead of API calls
  const { user } = useAuth();
  const { courses, loading: coursesLoading, refetch: refetchCourses } = useCourses({
    published: userRole === 'student' ? true : undefined // Students only see published courses
  });
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    aiInteractions: 0,
    weeklyHours: 0,
    loading: true
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

  // Transform courses data to match dashboard interface
  const realCourses: Course[] = courses.map((course, index) => ({
    id: course.id,
    title: course.title,
    code: course.code || "N/A",
    term: course.term || "Current",
    description: course.description || "",
    published: course.published,
    color: `course-${["blue", "green", "purple", "orange", "red", "teal"][index % 6]}`,
    lastActivity: course.updated_at ? formatRelativeTime(course.updated_at) : "Recently",
    materialsCount: 0, // Could be enhanced with actual count from modules
    studentsCount: 0,  // Could be enhanced with actual enrollment count
    unreadCount: Math.floor(Math.random() * 5), // Placeholder for notifications
  }));

  const loadDashboardStats = async () => {
    try {
      setDashboardStats(prev => ({ ...prev, loading: true }));
      
      // ✅ NEW: Query Supabase for dashboard stats
      if (userRole === 'student' && user) {
        try {
          // Get AI interactions count (could query processing_queue or chat logs)
          const { count: aiInteractions } = await supabase
            .from('processing_queue')
            .select('*', { count: 'exact', head: true })
            .eq('payload->user_id', user.id);

          // Get weekly hours (placeholder - could be enhanced with actual time tracking)
          const weeklyHours = 0; // Could query actual time tracking data

          setDashboardStats({
            aiInteractions: aiInteractions || 0,
            weeklyHours,
            loading: false
          });
        } catch (error) {
          console.warn("Failed to load dashboard stats:", error);
          setDashboardStats({
            aiInteractions: 0,
            weeklyHours: 0,
            loading: false
          });
        }
      } else {
        // For instructors/admins, show basic stats
        setDashboardStats({
          aiInteractions: 0,
          weeklyHours: 0,
          loading: false
        });
      }
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
      setDashboardStats({
        aiInteractions: 0,
        weeklyHours: 0,
        loading: false
      });
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, [userRole, user]);

  return {
    loading: coursesLoading,
    realCourses,
    userProfile: user, // Use auth user as profile
    dashboardStats,
    loadCourses: refetchCourses, // Use refetch from hook
    loadDashboardStats,
    setRealCourses: () => {}, // Not needed with real-time updates
  };
};