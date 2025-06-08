import { useState, useEffect } from 'react';
import { courseOperations } from '@/lib/db/operations';
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

export const useUserCourses = () => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await courseOperations.getUserCourses();
        setCourses(response.courses || []);
      } catch (error: any) {
        console.error('Failed to load courses:', error);
        setError(error.message || 'Failed to load courses');
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  return { courses, loading, error };
};

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

        // Fetch course data directly from Supabase
        const courseData = await courseOperations.getCourseDetails(courseId);
        
        if (!courseData) {
          throw new Error('Course not found');
        }
        
        // Ensure we have the necessary fields
        setCourse({
          ...courseData,
          // Preserve any missing fields with defaults
          id: courseData.id,
          title: courseData.title || 'Untitled Course',
          description: courseData.description,
          code: courseData.code,
          instructor: courseData.instructor_id ? { 
            id: courseData.instructor_id, 
            name: 'Instructor' 
          } : undefined,
          instructor_id: courseData.instructor_id,
          creator_id: courseData.creator_id,
          deadline: courseData.deadline,
          published: courseData.published,
          created_at: courseData.created_at,
          last_updated: courseData.updated_at,
          
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
        const errorMessage = error.message || 'Failed to load course information';
        setError(errorMessage);
        setCourse(null);
        
        // Show user-friendly error
        if (error.message?.includes('not found')) {
          toast.error('Course not found');
        } else if (error.message?.includes('access')) {
          toast.error('You do not have access to this course');
        }
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  const refetch = async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch course data directly from Supabase
      const courseData = await courseOperations.getCourseDetails(courseId);
      
      if (!courseData) {
        throw new Error('Course not found');
      }
      
      // Ensure we have the necessary fields
      setCourse({
        ...courseData,
        // Preserve any missing fields with defaults
        id: courseData.id,
        title: courseData.title || 'Untitled Course',
        description: courseData.description,
        code: courseData.code,
        instructor: courseData.instructor_id ? { 
          id: courseData.instructor_id, 
          name: 'Instructor' 
        } : undefined,
        instructor_id: courseData.instructor_id,
        creator_id: courseData.creator_id,
        deadline: courseData.deadline,
        published: courseData.published,
        created_at: courseData.created_at,
        last_updated: courseData.updated_at,
        
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
      const errorMessage = error.message || 'Failed to load course information';
      setError(errorMessage);
      setCourse(null);
      
      // Show user-friendly error
      if (error.message?.includes('not found')) {
        toast.error('Course not found');
      } else if (error.message?.includes('access')) {
        toast.error('You do not have access to this course');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    course,
    loading,
    error,
    refetch
  };
};