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
  Module,
  Material,
  AIConversation,
  Quiz,
} from '../types/course.types';
import { useCourse, useModules, useEnrollments } from '@/lib/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export const useCourseData = (courseId: string) => {
  const router = useRouter();
  const { state, dispatch } = useCourseContext();
  
  // ✅ NEW: Use Supabase hooks instead of API calls
  const { user } = useAuth();
  const { course, loading: courseLoading, error: courseError } = useCourse(courseId);
  const { modules, loading: modulesLoading } = useModules(courseId);
  const { enrollments } = useEnrollments();

  useEffect(() => {
    if (!courseId) return;

    const loadCourseData = async () => {
      try {
        dispatch(courseActions.setLoading(true));

        // Check authentication
        if (!user) {
          toast.error('Authentication required. Please log in.');
          router.push('/login');
          return;
        }

        // Set user data from auth context
        dispatch(courseActions.setUser({
          id: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'student',
          profile: {
            name: user.user_metadata?.full_name || user.email || 'User',
            email: user.email || ''
          }
        }));

        // Wait for course and modules data to load
        if (courseLoading || modulesLoading) return;

        if (courseError) {
          console.error('Course error:', courseError);
          toast.error('Failed to load course details');
          dispatch(courseActions.setError('Failed to load course data'));
          return;
        }

        if (!course) {
          console.warn('No course data found for ID:', courseId);
          dispatch(courseActions.setError('Course not found'));
          return;
        }

        // Transform course data
        const transformedCourse: Course = {
          id: course.id,
          title: course.title,
          code: course.code || 'N/A',
          term: course.term || 'Current Term',
          description: course.description || 'No description available',
          instructor: 'Instructor', // Could be enhanced to fetch instructor name from user table
          studentsCount: course.enrollment_count || 0,
          materialsCount: modules.reduce((total, module) => total + (module.files?.length || 0), 0),
          color: 'course-blue',
          lastActivity: course.updated_at ? formatRelativeTime(course.updated_at) : 'Recently',
        };

        dispatch(courseActions.setCourse(transformedCourse));

        // Transform materials data from modules
        const transformedMaterials: Material[] = modules
          .flatMap(module => 
            (module.files || []).map(file => ({
              id: file.id,
              title: file.title,
              type: getFileType(file.file_type),
              size: formatFileSize(file.file_size),
              uploadedAt: formatRelativeTime(file.created_at || new Date().toISOString()),
              processed: file.processing_status === 'completed',
              moduleId: module.id,
              moduleName: module.title,
            }))
          );

        // Create structured module layout
        const organizedModules = createModuleStructure(
          modules,
          transformedMaterials,
          courseId,
        );
        dispatch(courseActions.setModules(organizedModules));

        // Load conversations (simplified - could be enhanced later)
        const conversations: AIConversation[] = [];
        dispatch(courseActions.setConversations(conversations));

        // Load quizzes (placeholder for now)
        dispatch(courseActions.setQuizzes([]));

        // Calculate progress
        const completedMaterials = transformedMaterials.filter(m => m.processed).length;
        const totalMaterials = transformedMaterials.length;
        
        const realProgress = {
          completedMaterials,
          totalMaterials,
          weeklyTimeMinutes: 0, // Could be enhanced with actual tracking
          todayTimeMinutes: 0,   // Could be enhanced with actual tracking
          progressPercentage: totalMaterials > 0 
            ? Math.round((completedMaterials / totalMaterials) * 100) 
            : 0,
        };

        dispatch(courseActions.updateProgress(realProgress));

      } catch (error) {
        console.error('Failed to load course:', error);
        toast.error('Failed to load course data');
        dispatch(courseActions.setError('Failed to load course data'));
      } finally {
        dispatch(courseActions.setLoading(false));
      }
    };

    loadCourseData();
  }, [courseId, course, modules, courseLoading, modulesLoading, courseError, user, router, dispatch]);

  return {
    course: state.course,
    modules: state.modules,
    courseProgress: state.courseProgress,
    conversations: state.conversations,
    quizzes: state.quizzes,
    loading: state.loading || courseLoading || modulesLoading,
    error: state.error,
    currentUser: state.currentUser,
  };
};

        let courseData;
        let modulesData = [];
        let filesData: any[] = [];

        // Load course data based on user role
        if (user.role === 'student') {
          try {
            const enrolledCourses = await studentAPI.getCourses();
            courseData = enrolledCourses.find((c: any) => c.id === courseId);

            if (courseData) {
              modulesData = await studentAPI.getCourseModules(courseId);

              // Ensure modulesData is an array
              if (!Array.isArray(modulesData)) {
                console.error('Invalid modules data received:', modulesData);
                modulesData = [];
              }

              // Extract files from modules
              filesData = modulesData.flatMap((module: any) =>
                (module.materials || []).map((file: any) => ({
                  ...file,
                  moduleId: module.id,
                  moduleName: module.title,
                })),
              );
            }
          } catch (courseError) {
            console.error('Failed to load student courses:', courseError);
            toast.error('Failed to load your courses');
          }
        } else if (user.role === 'instructor') {
          try {
            courseData = await instructorAPI.getCourse(courseId);

            if (courseData) {
              // Try the optimized endpoint first
              const modulesResponse = await fetch(
                `${API_URL}/api/v2/courses/${courseId}/modules`,
                {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                },
              );

              if (modulesResponse.ok) {
                const modulesApiResponse = await modulesResponse.json();
                const modulesWithFiles =
                  modulesApiResponse.data || modulesApiResponse;
                modulesData = modulesWithFiles;

                filesData = modulesWithFiles.flatMap((module: any) =>
                  (module.materials || module.files || []).map((file: any) => ({
                    ...file,
                    moduleId: module.id,
                    moduleName: module.title,
                  })),
                );
              } else {
                // Fallback to separate API calls
                modulesData = await instructorAPI.getCourseModules(courseId);

                if (Array.isArray(modulesData)) {
                  const filePromises = modulesData.map((moduleItem: any) =>
                    instructorAPI
                      .getModuleFiles(moduleItem.id)
                      .then((files) =>
                        files.map((file: any) => ({
                          ...file,
                          moduleId: moduleItem.id,
                          moduleName: moduleItem.title,
                        })),
                      )
                      .catch(() => []),
                  );

                  const filesArrays = await Promise.all(filePromises);
                  filesData = filesArrays.flat();
                }
              }
            }
          } catch (courseError) {
            console.error('Failed to load instructor course:', courseError);
            toast.error('Failed to load course details');
          }
        }

        if (!courseData) {
          console.warn('No course data found for ID:', courseId);
          courseData = {
            id: courseId,
            title: 'Course Not Found',
            code: 'N/A',
            term: 'N/A',
            description: 'No description available',
            instructor: 'Unknown',
          };
        }

        // Transform course data
        const transformedCourse: Course = {
          id: courseData.id || courseId,
          title: courseData.title || 'Unknown Course',
          code: courseData.code || 'N/A',
          term: courseData.term || 'Current Term',
          description: courseData.description || 'No description available',
          instructor:
            user.role === 'instructor'
              ? user.profile?.name || user.email || 'Instructor'
              : courseData.instructor || 'Instructor',
          studentsCount: courseData.students || 0,
          materialsCount: filesData.length,
          color: 'course-blue',
          lastActivity: courseData.last_updated
            ? formatRelativeTime(courseData.last_updated)
            : 'Recently',
        };

        dispatch(courseActions.setCourse(transformedCourse));

        // Transform materials data
        const transformedMaterials: Material[] = filesData
          .filter((file) => file && file.id)
          .map((file: any) => ({
            id: file.id,
            title: file.title || file.name || 'Unknown File',
            type: getFileType(file.file_type || file.type || ''),
            size: formatFileSize(file.file_size || file.size || 0),
            uploadedAt: formatRelativeTime(
              file.created_at || file.uploadedAt || new Date().toISOString(),
            ),
            processed: file.processed !== false,
            moduleId: file.moduleId,
            moduleName: file.moduleName,
          }));

        // Create structured module layout
        const modulesToOrganize =
          user.role === 'student' && state.modules.length > 0
            ? state.modules
            : modulesData;
        const organizedModules = createModuleStructure(
          modulesToOrganize,
          transformedMaterials,
          courseId,
        );
        dispatch(courseActions.setModules(organizedModules));

        // Load conversations
        let conversations: AIConversation[] = [];
        try {
          if (user.role === 'student') {
            const discussionsData =
              await studentAPI.getCourseDiscussions(courseId);
            if (discussionsData && Array.isArray(discussionsData)) {
              conversations = discussionsData
                .filter((discussion) => discussion && discussion.id)
                .map((discussion: any) => ({
                  id: discussion.id,
                  title: discussion.title || 'Conversation',
                  lastMessage: discussion.last_message || 'No messages yet',
                  timestamp: formatRelativeTime(
                    discussion.updated_at || new Date().toISOString(),
                  ),
                  messageCount: discussion.message_count || 0,
                }));
            }
          }
        } catch (error: any) {
          if (!error?.message?.includes('404')) {
            console.warn('Failed to load discussions:', error);
          }
        }
        dispatch(courseActions.setConversations(conversations));

        // Load quizzes (placeholder for now)
        dispatch(courseActions.setQuizzes([]));

        // Load course progress
        let realProgress = {
          completedMaterials: 0,
          totalMaterials: transformedMaterials.length,
          weeklyTimeMinutes: 0,
          todayTimeMinutes: 0,
          progressPercentage: 0,
        };

        try {
          if (user.role === 'student') {
            const progressData = await studentAPI.getCourseProgress(courseId);
            realProgress = {
              completedMaterials: progressData.viewedMaterials || 0,
              totalMaterials:
                progressData.totalMaterials || transformedMaterials.length,
              weeklyTimeMinutes: progressData.weeklyTimeMinutes || 0,
              todayTimeMinutes: progressData.todayTimeMinutes || 0,
              progressPercentage: progressData.progressPercentage || 0,
            };
          } else {
            const processedMaterials = transformedMaterials.filter(
              (m) => m.processed,
            ).length;
            realProgress = {
              completedMaterials: processedMaterials,
              totalMaterials: transformedMaterials.length,
              weeklyTimeMinutes: 0,
              todayTimeMinutes: 0,
              progressPercentage:
                transformedMaterials.length > 0
                  ? Math.round(
                      (processedMaterials / transformedMaterials.length) * 100,
                    )
                  : 0,
            };
          }
        } catch (progressError) {
          console.warn('Failed to load real progress data:', progressError);
        }

        dispatch(courseActions.updateProgress(realProgress));
      } catch (error) {
        console.error('Failed to load course:', error);
        toast.error('Failed to load course data');
        dispatch(courseActions.setError('Failed to load course data'));
      } finally {
        dispatch(courseActions.setLoading(false));
      }
    };

    loadCourseData();
  }, [courseId, router, dispatch]);

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
