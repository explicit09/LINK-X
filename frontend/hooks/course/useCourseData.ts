import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';

interface CourseData {
  id: string;
  title: string;
  code: string;
  instructor: string;
  progress: number;
  nextDeadline: string;
  studyTime: string;
  weeklyStudyTime: number;
  targetStudyTime: number;
  rank: string;
  previousRank: number;
  grade: string;
  previousGrade: string;
  color: string;
  urgentTasks: number;
  completionStreak: number;
  efficiency: number;
  lastActivity: string;
}

interface User {
  name: string;
  email: string;
  role: string;
  level: string;
  streak: number;
  xp: number;
}

export const useCourseData = (courseId: string) => {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        setError(null);

        // COPY EXACT API patterns from working dashboard
        // Try to get user profile first
        try {
          const userResponse = await authAPI.v2.getProfile();
          const userData = userResponse.data || userResponse; // Handle wrapped responses
          
          setCurrentUser({
            name: userData.profile?.name || userData.email?.split('@')[0] || 'User',
            email: userData.email || '',
            role: userData.role || 'student',
            level: 'Intermediate',
            streak: 7,
            xp: 2450,
          });
        } catch (userError) {
          console.warn('Failed to load user profile:', userError);
          // Graceful fallback for user data
          setCurrentUser({
            name: 'Student User',
            email: 'student@example.com',
            role: 'student',
            level: 'Intermediate',
            streak: 7,
            xp: 2450,
          });
        }

        // For now, use mock course data (preserve existing functionality)
        // TODO: Replace with real API call when course API is ready
        const mockCourse: CourseData = {
          id: courseId,
          title: 'CS229: Machine Learning',
          code: 'CS229',
          instructor: 'Dr. Andrew Ng',
          progress: 68,
          nextDeadline: 'Neural Networks Assignment - Due in 3 days',
          studyTime: '45.2h total',
          weeklyStudyTime: 8.5,
          targetStudyTime: 12,
          rank: '#3 of 156 students',
          previousRank: 5,
          grade: 'A-',
          previousGrade: 'B+',
          color: '#3B82F6',
          urgentTasks: 2,
          completionStreak: 4,
          efficiency: 73,
          lastActivity: '2 hours ago',
        };

        setCourse(mockCourse);

      } catch (error) {
        console.error('Failed to load course data:', error);
        setError('Failed to load course information');
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  return {
    course,
    currentUser,
    loading,
    error,
    refetch: () => {
      if (courseId) {
        setLoading(true);
        // Re-trigger the effect
        setCourse(null);
        setCurrentUser(null);
      }
    }
  };
};