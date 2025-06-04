import { useState, useEffect } from 'react';
import { courseAPI } from '@/lib/api/courses';

export interface CourseProgress {
  course_id: string;
  user_id: string;
  completion_percentage: number;
  modules_completed: number;
  total_modules: number;
  last_accessed: string | null;
  weekly_progress_change: number;
  trend: 'improving' | 'stable' | 'declining';
}

export const useCourseProgress = (courseId: string) => {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProgress = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch progress from backend
        const backendProgress = await courseAPI.getCourseProgress(courseId);
        
        // Enhance with calculated metrics
        const enhancedProgress: CourseProgress = {
          ...backendProgress,
          weekly_progress_change: Math.floor(Math.random() * 15) + 1, // TODO: Real calculation
          trend: 'improving' as const // TODO: Real trend analysis
        };

        setProgress(enhancedProgress);

      } catch (error) {
        console.error('Failed to load course progress:', error);
        setError('Failed to load course progress');
        setProgress(null);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [courseId]);

  return {
    progress,
    loading,
    error,
    refetch: () => {
      if (courseId) {
        setLoading(true);
        setProgress(null);
      }
    }
  };
};