import { useState, useEffect } from 'react';
import { studentAPI } from '@/lib/api';

interface RecentActivity {
  id: string;
  type: "upload" | "quiz" | "ai_chat" | "completion" | "grade" | "announcement";
  course: string;
  title: string;
  timestamp: string;
}

export const useRecentActivity = (userRole: string) => {
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const loadRecentActivity = async () => {
    try {
      if (userRole === 'student') {
        const realActivities = await studentAPI.getRecentActivities();
        setRecentActivity(realActivities || []);
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.warn('Failed to load real recent activities:', error);
      setRecentActivity([]);
    }
  };

  const addActivity = async (type: RecentActivity["type"], course: string, title: string) => {
    try {
      if (userRole === 'student') {
        await studentAPI.logActivity({
          type: type,
          course: course,
          title: title
        });
        
        await loadRecentActivity();
      }
    } catch (error) {
      console.warn('Failed to log activity:', error);
    }
  };

  useEffect(() => {
    loadRecentActivity();
  }, [userRole]);

  return {
    recentActivity,
    loadRecentActivity,
    addActivity
  };
};