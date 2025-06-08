import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface RecentActivity {
  id: string;
  type: 'upload' | 'quiz' | 'ai_chat' | 'completion' | 'grade' | 'announcement';
  course: string;
  title: string;
  timestamp: string;
}

export const useRecentActivity = (userRole: string) => {
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const { user } = useAuth();

  const loadRecentActivity = async () => {
    try {
      if (userRole === 'student' && user) {
        // ✅ NEW: Query user activities directly from Supabase
        const { data: activities, error } = await supabase
          .from('user_activities')
          .select(`
            id,
            activity_type,
            course_name,
            title,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          throw error;
        }

        // Transform to match interface
        const transformedActivities: RecentActivity[] = (activities || []).map(activity => ({
          id: activity.id,
          type: activity.activity_type as RecentActivity['type'],
          course: activity.course_name || 'Unknown Course',
          title: activity.title,
          timestamp: activity.created_at,
        }));

        setRecentActivity(transformedActivities);
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.warn('Failed to load recent activities:', error);
      setRecentActivity([]);
    }
  };

  const addActivity = async (
    type: RecentActivity['type'],
    course: string,
    title: string,
  ) => {
    try {
      if (userRole === 'student' && user) {
        // ✅ NEW: Log activity directly to Supabase
        const { error } = await supabase
          .from('user_activities')
          .insert({
            user_id: user.id,
            activity_type: type,
            course_name: course,
            title: title,
            created_at: new Date().toISOString(),
          });

        if (error) {
          throw error;
        }

        // Refresh activities
        await loadRecentActivity();
      }
    } catch (error) {
      console.warn('Failed to log activity:', error);
    }
  };

  useEffect(() => {
    loadRecentActivity();
  }, [userRole, user]);

  return {
    recentActivity,
    loadRecentActivity,
    addActivity,
  };
};
