import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCourseContext, courseActions } from '../context/CourseContext';
import { createModuleStructure } from '../utils/moduleStructure';
import {
  formatRelativeTime,
  getFileType,
  formatFileSize,
} from '../utils/courseHelpers';
import {
  Course,
  Material,
  AIConversation,
} from '../types/course.types';
import { useCourse, useModules, useEnrollments } from '@/lib/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';

export const useCourseData = (courseId: string) => {
  const router = useRouter();
  const { state, dispatch } = useCourseContext();
  
  // ✅ NEW: Use Supabase operations instead of API calls
  const { user, profile } = useAuth();
  const { course, loading: courseLoading, error: courseError } = useCourse(courseId);
  const { modules, loading: modulesLoading } = useModules(courseId);
  const { enrollments } = useEnrollments();

  useEffect(() => {
    if (!courseId || !user || !profile) return;

    const loadCourseData = async () => {
      try {
        dispatch(courseActions.setLoading(courseLoading || modulesLoading));

        // Set user data from auth context
        dispatch(courseActions.setUser({
          id: user.id,
          email: user.email || '',
          role: profile.role,
          profile: {
            name: profile.full_name || profile.email,
            email: profile.email
          }
        }));

        // Handle course data
        if (courseError) {
          console.error('Failed to load course:', courseError);
          toast.error('Failed to load course data');
          dispatch(courseActions.setError('Failed to load course data'));
          return;
        }

        if (course) {
          // Transform course data for context
          const transformedCourse: Course = {
            id: course.id,
            title: course.title,
            code: course.code || 'N/A',
            term: course.term || 'Current Term',
            description: course.description || 'No description available',
            instructor: profile.role === 'instructor' 
              ? profile.full_name || profile.email 
              : 'Instructor',
            studentsCount: 0, // TODO: Calculate from enrollments
            materialsCount: 0, // Will be updated when modules load
            color: 'course-blue',
            lastActivity: course.updated_at 
              ? formatRelativeTime(course.updated_at) 
              : 'Recently',
          };

          dispatch(courseActions.setCourse(transformedCourse));
        }

        // Handle modules and files
        if (modules && modules.length > 0) {
          // Transform files from modules
          const transformedMaterials: Material[] = [];
          
          modules.forEach((module: any) => {
            if (module.files && Array.isArray(module.files)) {
              module.files.forEach((file: any) => {
                transformedMaterials.push({
                  id: file.id,
                  title: file.title || 'Unknown File',
                  type: getFileType(file.file_type || ''),
                  size: formatFileSize(file.file_size || 0),
                  uploadedAt: formatRelativeTime(file.created_at || new Date().toISOString()),
                  processed: file.processed !== false,
                  moduleId: module.id,
                  moduleName: module.title,
                });
              });
            }
          });

          // Create structured module layout
          const organizedModules = createModuleStructure(
            modules,
            transformedMaterials,
            courseId,
          );
          dispatch(courseActions.setModules(organizedModules));

                     // Update course materials count
           if (course && state.course) {
             dispatch(courseActions.setCourse({
               ...state.course,
               materialsCount: transformedMaterials.length,
             }));
           }

          // Calculate progress
          const processedMaterials = transformedMaterials.filter(m => m.processed).length;
          const progressData = {
            completedMaterials: processedMaterials,
            totalMaterials: transformedMaterials.length,
            weeklyTimeMinutes: 0, // TODO: Implement time tracking
            todayTimeMinutes: 0,
            progressPercentage: transformedMaterials.length > 0 
              ? Math.round((processedMaterials / transformedMaterials.length) * 100)
              : 0,
          };
          dispatch(courseActions.updateProgress(progressData));
        }

        // Set empty conversations and quizzes for now
        // TODO: Implement these features with Supabase
        dispatch(courseActions.setConversations([]));
        dispatch(courseActions.setQuizzes([]));

      } catch (error) {
        console.error('Failed to load course data:', error);
        toast.error('Failed to load course data');
        dispatch(courseActions.setError('Failed to load course data'));
      } finally {
        dispatch(courseActions.setLoading(false));
      }
    };

    loadCourseData();
  }, [courseId, user, profile, course, modules, courseLoading, modulesLoading, courseError]);

  return {
    course: state.course,
    modules: state.modules,
    courseProgress: state.courseProgress,
    conversations: state.conversations,
    quizzes: state.quizzes,
    loading: state.loading,
    error: state.error,
    currentUser: state.currentUser,
  };
}; 
 