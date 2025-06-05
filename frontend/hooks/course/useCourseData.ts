import { useState, useEffect } from 'react';
import { courseAPI } from '@/lib/api/courses';
import { toast } from 'sonner';

interface Instructor {
  id: string;
  name: string;
  email?: string;
}

interface CourseData {
  id: string;
  title: string;
  description?: string;
  code?: string;
  instructor?: Instructor;
  instructor_id?: string;
  creator_id?: string;
  deadline?: string;
  published?: boolean;
  created_at?: string;
  last_updated?: string;
  
  // Legacy fields for compatibility
  progress?: number;
  nextDeadline?: string;
  studyTime?: string;
  weeklyStudyTime?: number;
  targetStudyTime?: number;
  rank?: string;
  previousRank?: number;
  grade?: string;
  previousGrade?: string;
  color?: string;
  urgentTasks?: number;
  completionStreak?: number;
  efficiency?: number;
  lastActivity?: string;
}

export const useCourseData = (courseId: string) => {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch real course data
        const courseData = await courseAPI.getCourse(courseId);
        
        // Ensure we have the necessary fields
        setCourse({
          ...courseData,
          // Preserve any missing fields with defaults
          id: courseData.id,
          title: courseData.title || 'Untitled Course',
          description: courseData.description,
          code: courseData.code,
          instructor: courseData.instructor,
          instructor_id: courseData.instructor_id,
          creator_id: courseData.creator_id,
          deadline: courseData.deadline,
          published: courseData.published,
          created_at: courseData.created_at,
          last_updated: courseData.last_updated,
          
          // Add default values for legacy fields
          progress: 0,
          color: '#3B82F6',
          urgentTasks: 0,
          completionStreak: 0,
          efficiency: 0,
          lastActivity: 'Unknown',
        });

      } catch (error: any) {
        console.error('Failed to load course data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load course information';
        setError(errorMessage);
        setCourse(null);
        
        // Show user-friendly error
        if (error.response?.status === 404) {
          toast.error('Course not found');
        } else if (error.response?.status === 403) {
          toast.error('You do not have access to this course');
        }
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  return {
    course,
    loading,
    error,
    refetch: () => {
      if (courseId) {
        setLoading(true);
        // Re-trigger the effect by clearing the course
        setCourse(null);
      }
    }
  };
};