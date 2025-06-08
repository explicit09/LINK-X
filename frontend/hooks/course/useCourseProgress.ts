import { useState, useEffect } from 'react';
import { courseOperations, moduleOperations } from '@/lib/db/operations';

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

        // Get modules to calculate progress
        const modules = await moduleOperations.getCourseModules(courseId);
        
        // Calculate progress based on module files and engagement
        let totalFiles = 0;
        let viewedFiles = 0;
        
        modules.forEach((module: any) => {
          if (module.files) {
            totalFiles += module.files.length;
            module.files.forEach((file: any) => {
              if (file.view_count_raw > 0 || file.chat_count > 0) {
                viewedFiles++;
              }
            });
          }
        });
        
        const completionPercentage = totalFiles > 0 ? Math.round((viewedFiles / totalFiles) * 100) : 0;
        
        // Create progress object
        const enhancedProgress: CourseProgress = {
          course_id: courseId,
          user_id: 'current-user', // This will be replaced by actual user ID from auth
          completion_percentage: completionPercentage,
          modules_completed: modules.filter((m: any) => {
            // Consider a module completed if all its files have been viewed
            if (!m.files || m.files.length === 0) return false;
            return m.files.every((f: any) => f.view_count_raw > 0);
          }).length,
          total_modules: modules.length,
          last_accessed: new Date().toISOString(),
          weekly_progress_change: Math.floor(Math.random() * 15) + 1, // Placeholder
          trend: 'improving' as const // Placeholder
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