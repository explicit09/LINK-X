import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { studentAPI, instructorAPI, userAPI } from '@/lib/api';
import { useCourseContext, courseActions } from '../context/CourseContext';
import { createModuleStructure } from '../utils/moduleStructure';
import { formatRelativeTime, getFileType, formatFileSize } from '../utils/courseHelpers';
import { Course, Module, Material, AIConversation, Quiz } from '../types/course.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const useCourseData = (courseId: string) => {
  const router = useRouter();
  const { state, dispatch } = useCourseContext();

  useEffect(() => {
    if (!courseId) return;
    
    toast.dismiss();
    
    const loadCourseData = async () => {
      try {
        dispatch(courseActions.setLoading(true));
        
        // Load user data
        let user;
        try {
          user = await userAPI.getMe();
          dispatch(courseActions.setUser(user));
        } catch (userError) {
          console.error('Failed to load user:', userError);
          toast.error('Authentication failed. Please log in again.');
          router.push('/login');
          return;
        }
        
        let courseData;
        let modulesData = [];
        let filesData: any[] = [];
        
        // Load course data based on user role
        if (user.role === "student") {
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
                  moduleName: module.title
                }))
              );
            }
          } catch (courseError) {
            console.error('Failed to load student courses:', courseError);
            toast.error('Failed to load your courses');
          }
        } else if (user.role === "instructor") {
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
                }
              );
              
              if (modulesResponse.ok) {
                const modulesApiResponse = await modulesResponse.json();
                const modulesWithFiles = modulesApiResponse.data || modulesApiResponse;
                modulesData = modulesWithFiles;
                
                filesData = modulesWithFiles.flatMap((module: any) => 
                  (module.materials || module.files || []).map((file: any) => ({
                    ...file,
                    moduleId: module.id,
                    moduleName: module.title
                  }))
                );
              } else {
                // Fallback to separate API calls
                modulesData = await instructorAPI.getCourseModules(courseId);
                
                if (Array.isArray(modulesData)) {
                  const filePromises = modulesData.map((moduleItem: any) => 
                    instructorAPI.getModuleFiles(moduleItem.id)
                      .then(files => files.map((file: any) => ({
                        ...file,
                        moduleId: moduleItem.id,
                        moduleName: moduleItem.title
                      })))
                      .catch(() => [])
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
            title: "Course Not Found",
            code: "N/A",
            term: "N/A",
            description: "No description available",
            instructor: "Unknown"
          };
        }
        
        // Transform course data
        const transformedCourse: Course = {
          id: courseData.id || courseId,
          title: courseData.title || "Unknown Course",
          code: courseData.code || "N/A",
          term: courseData.term || "Current Term",
          description: courseData.description || "No description available",
          instructor: user.role === "instructor" ? 
            user.profile?.name || user.email || "Instructor" : 
            courseData.instructor || "Instructor",
          studentsCount: courseData.students || 0,
          materialsCount: filesData.length,
          color: "course-blue",
          lastActivity: courseData.last_updated ? formatRelativeTime(courseData.last_updated) : "Recently",
        };
        
        dispatch(courseActions.setCourse(transformedCourse));
        
        // Transform materials data
        const transformedMaterials: Material[] = filesData
          .filter(file => file && file.id)
          .map((file: any) => ({
            id: file.id,
            title: file.title || file.name || "Unknown File",
            type: getFileType(file.file_type || file.type || ""),
            size: formatFileSize(file.file_size || file.size || 0),
            uploadedAt: formatRelativeTime(file.created_at || file.uploadedAt || new Date().toISOString()),
            processed: file.processed !== false,
            moduleId: file.moduleId,
            moduleName: file.moduleName,
          }));

        // Create structured module layout
        const modulesToOrganize = user.role === "student" && state.modules.length > 0 ? state.modules : modulesData;
        const organizedModules = createModuleStructure(modulesToOrganize, transformedMaterials, courseId);
        dispatch(courseActions.setModules(organizedModules));
        
        // Load conversations
        let conversations: AIConversation[] = [];
        try {
          if (user.role === "student") {
            const discussionsData = await studentAPI.getCourseDiscussions(courseId);
            if (discussionsData && Array.isArray(discussionsData)) {
              conversations = discussionsData
                .filter(discussion => discussion && discussion.id)
                .map((discussion: any) => ({
                  id: discussion.id,
                  title: discussion.title || "Conversation",
                  lastMessage: discussion.last_message || "No messages yet",
                  timestamp: formatRelativeTime(discussion.updated_at || new Date().toISOString()),
                  messageCount: discussion.message_count || 0
                }));
            }
          }
        } catch (error: any) {
          if (!error?.message?.includes('404')) {
            console.warn("Failed to load discussions:", error);
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
          progressPercentage: 0
        };
        
        try {
          if (user.role === "student") {
            const progressData = await studentAPI.getCourseProgress(courseId);
            realProgress = {
              completedMaterials: progressData.viewedMaterials || 0,
              totalMaterials: progressData.totalMaterials || transformedMaterials.length,
              weeklyTimeMinutes: progressData.weeklyTimeMinutes || 0,
              todayTimeMinutes: progressData.todayTimeMinutes || 0,
              progressPercentage: progressData.progressPercentage || 0
            };
          } else {
            const processedMaterials = transformedMaterials.filter(m => m.processed).length;
            realProgress = {
              completedMaterials: processedMaterials,
              totalMaterials: transformedMaterials.length,
              weeklyTimeMinutes: 0,
              todayTimeMinutes: 0,
              progressPercentage: transformedMaterials.length > 0 ? 
                Math.round((processedMaterials / transformedMaterials.length) * 100) : 0
            };
          }
        } catch (progressError) {
          console.warn("Failed to load real progress data:", progressError);
        }
        
        dispatch(courseActions.updateProgress(realProgress));
        
      } catch (error) {
        console.error("Failed to load course:", error);
        toast.error("Failed to load course data");
        dispatch(courseActions.setError("Failed to load course data"));
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
    currentUser: state.currentUser
  };
};