'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { CanvasCourseHeader } from '@/components/course/canvas/CanvasCourseHeader';
import { CanvasCourseTabs } from '@/components/course/canvas/CanvasCourseTabs';
import { CanvasModuleList } from '@/components/course/canvas/CanvasModuleList';
import { CanvasAssignments } from '@/components/course/canvas/CanvasAssignments';
import { CanvasGrades } from '@/components/course/canvas/CanvasGrades';
import { CanvasFiles } from '@/components/course/canvas/CanvasFiles';
import { CanvasDiscussions } from '@/components/course/canvas/CanvasDiscussions';
import { CanvasSyllabus } from '@/components/course/canvas/CanvasSyllabus';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useCourseData } from '@/hooks/course/useCourseData';
import { useCourseModules } from '@/hooks/course/useCourseModules';
import { useCourseProgress } from '@/hooks/course/useCourseProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, Clock, Calendar, User, Plus, Upload, 
  AlertCircle, FileText, PlayCircle, CheckCircle, 
  Sparkles, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { ModuleForm } from '@/components/course/ModuleForm';
import { EnhancedFileUpload } from '@/components/course/EnhancedFileUpload';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Types for better type safety
interface CourseMetrics {
  totalModules: number;
  completedModules: number;
  totalFiles: number;
  totalDuration: number;
  overallProgress: number;
  deadline?: Date;
  daysRemaining?: number;
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  
  const { user: currentUser } = useAuthUser();
  const { course, loading: courseLoading, error: courseError, refetch: refetchCourse } = useCourseData(courseId);
  const { modules, loading: modulesLoading, error: modulesError, refetch: refetchModules } = useCourseModules(courseId);
  const { progress: courseProgress, loading: progressLoading, refetch: refetchProgress } = useCourseProgress(courseId);
  
  // Determine user role for tabs
  const userRole = currentUser?.role as 'student' | 'instructor' | 'admin' || 'student';
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState<CourseMetrics | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [uploadingToModule, setUploadingToModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');

  // Refresh data function
  const refreshCourseData = async () => {
    try {
      await Promise.all([
        refetchModules?.(),
        refetchCourse?.(),
        refetchProgress?.()
      ]);
    } catch (error) {
      console.error('Failed to refresh course data:', error);
    }
  };

  // Determine active tab based on URL and listen for tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('home');
    }

    // Listen for tab change events from the tabs component
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail.tabId);
    };

    window.addEventListener('tabChange', handleTabChange as EventListener);
    
    return () => {
      window.removeEventListener('tabChange', handleTabChange as EventListener);
    };
  }, [courseId]);

  // Calculate course metrics from real data
  useEffect(() => {
    if (course && modules) {
      const totalFiles = modules.reduce((sum, m) => sum + (m.materials_list?.length || 0), 0);
      const completedModules = modules.filter(m => m.progress >= 100).length;
      
      // Calculate total duration (assuming each file takes ~30 minutes average)
      const totalDuration = totalFiles * 30;
      
      // Calculate overall progress
      let overallProgress = 0;
      if (courseProgress?.completion_percentage) {
        overallProgress = courseProgress.completion_percentage;
      } else if (modules.length > 0) {
        const totalProgress = modules.reduce((sum, m) => sum + (m.progress || 0), 0);
        overallProgress = Math.round(totalProgress / modules.length);
      }

      // Calculate days remaining if deadline exists
      let daysRemaining = undefined;
      if (course.deadline) {
        const deadline = new Date(course.deadline);
        const now = new Date();
        daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      setMetrics({
        totalModules: modules.length,
        completedModules,
        totalFiles,
        totalDuration,
        overallProgress,
        deadline: course.deadline ? new Date(course.deadline) : undefined,
        daysRemaining
      });
    }
  }, [course, modules, courseProgress]);

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const isOwner = currentUser && course && (
    course.creator_id === currentUser.id || 
    course.instructor_id === currentUser.id ||
    currentUser.role === 'admin'
  );

  // Check if this is a student-created course (personal course)
  const isStudentCreatedCourse = course && course.creator_id && (!course.instructor_id || course.creator_id === course.instructor_id);
  
  // Debug logging
  console.log('Course Debug:', {
    course: course?.title,
    creator_id: course?.creator_id,
    instructor_id: course?.instructor_id,
    currentUser_id: currentUser?.id,
    isOwner,
    isStudentCreatedCourse,
    currentUserRole: currentUser?.role
  });

  const loading = courseLoading || modulesLoading || progressLoading;
  const error = courseError || modulesError;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white">
          <div className="h-12 bg-gray-100 animate-pulse" />
          <div className="h-48 bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse" />
          <div className="h-16 bg-gray-50 animate-pulse" />
          <div className="h-12 bg-white border-b animate-pulse" />
        </div>
        
        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Content skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            
            {/* Modules skeleton */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-4xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error === 'Access denied' || error === 'You do not have access to this course' 
                ? 'You do not have access to this course. Please ensure you are enrolled or contact your instructor.'
                : error === 'Course not found'
                ? 'This course could not be found. It may have been removed or the link may be incorrect.'
                : 'Failed to load course. Please try again or contact support.'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => router.back()} 
            variant="outline" 
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Empty course state (no modules)
  const isEmptyCourse = !modules || modules.length === 0;

  // Get next action based on progress
  const getNextAction = () => {
    if (isEmptyCourse) return null;
    
    // Find first incomplete module
    const incompleteModule = modules.find(m => m.progress < 100);
    if (incompleteModule) {
      const incompleteFile = incompleteModule.materials_list.find(f => !f.completed);
      return {
        type: 'continue',
        module: incompleteModule,
        file: incompleteFile,
        message: incompleteFile 
          ? `Continue: ${incompleteFile.title}`
          : `Complete Module: ${incompleteModule.title}`
      };
    }
    
    return {
      type: 'completed',
      message: 'Course completed! Review materials or take the final assessment.'
    };
  };

  const nextAction = getNextAction();

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeContent();
      case 'modules':
        return renderModulesContent();
      case 'assignments':
        return renderAssignmentsContent();
      case 'grades':
        return renderGradesContent();
      case 'files':
        return renderFilesContent();
      case 'discussions':
        return renderDiscussionsContent();
      case 'syllabus':
        return renderSyllabusContent();
      default:
        return renderHomeContent();
    }
  };

  const renderAssignmentsContent = () => (
    <CanvasAssignments
      courseId={courseId}
      isOwner={isOwner}
      userRole={userRole}
    />
  );

  const renderGradesContent = () => (
    <CanvasGrades
      courseId={courseId}
      userRole={userRole}
    />
  );

  const renderFilesContent = () => (
    <CanvasFiles
      courseId={courseId}
      isOwner={isOwner}
      userRole={userRole}
    />
  );

  const renderDiscussionsContent = () => (
    <CanvasDiscussions
      courseId={courseId}
      isOwner={isOwner}
      userRole={userRole}
    />
  );

  const renderSyllabusContent = () => (
    <CanvasSyllabus
      courseId={courseId}
      isOwner={isOwner}
      userRole={userRole}
    />
  );

  const renderModulesContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Course Modules</h2>
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowModuleForm(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Module
          </Button>
        )}
      </div>
      
      <CanvasModuleList
        modules={modules || []}
        expandedModules={expandedModules}
        onToggleModule={toggleModuleExpansion}
        onFileClick={(moduleId, fileId) => {
          router.push(`/personalize/${fileId}?courseId=${courseId}&moduleId=${moduleId}`);
        }}
        isOwner={isOwner}
        onAddModule={() => setShowModuleForm(true)}
        onUploadFile={(moduleId) => setUploadingToModule(moduleId)}
        loading={modulesLoading}
      />
      
      {/* Canvas-style File Upload Section */}
      {uploadingToModule && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Adding Content to Module
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadingToModule(null)}
            >
              Cancel Upload
            </Button>
          </div>
          
          <EnhancedFileUpload
            courseId={courseId}
            moduleId={uploadingToModule}
            userRole={currentUser?.role || 'student'}
            onUploadComplete={() => {
              setUploadingToModule(null);
              // Refresh modules to show new files
              refreshCourseData();
            }}
          />
        </div>
      )}
    </div>
  );

  const renderHomeContent = () => (
    <>
      {/* Progress Overview - Only show if there's content */}
      {!isEmptyCourse && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-xl font-bold text-gray-900">{metrics.overallProgress}%</span>
              </div>
              <Progress value={metrics.overallProgress} className="h-2" />
              {metrics.overallProgress === 100 && (
                <p className="text-xs text-green-600 mt-2 font-medium">Completed!</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Modules Completed</span>
                <span className="text-xl font-bold text-gray-900">
                  {metrics.completedModules}/{metrics.totalModules}
                </span>
              </div>
              <Progress 
                value={metrics.totalModules > 0 ? (metrics.completedModules / metrics.totalModules) * 100 : 0} 
                className="h-2" 
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Time Status</span>
                <span className={cn(
                  "text-xl font-bold",
                  metrics.daysRemaining !== undefined && metrics.daysRemaining < 7 
                    ? "text-red-600" 
                    : "text-gray-900"
                )}>
                  {metrics.daysRemaining !== undefined 
                    ? `${metrics.daysRemaining}d left` 
                    : 'Self-paced'}
                </span>
              </div>
              {metrics.daysRemaining !== undefined && (
                <Progress 
                  value={Math.max(0, Math.min(100, (metrics.daysRemaining / 30) * 100))} 
                  className="h-2" 
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {isEmptyCourse ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isOwner ? 'Start Building Your Course' : 'No Content Available Yet'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {isOwner 
                ? isStudentCreatedCourse 
                  ? 'Add modules to organize your personal study materials and track your progress.'
                  : 'Add modules to organize your course content and help students learn effectively.'
                : isStudentCreatedCourse
                  ? 'This personal course doesn\'t have any content yet.'
                  : 'This course doesn\'t have any content yet. Check back later or contact your instructor.'}
            </p>
            {isOwner && (
              <Button onClick={() => setShowModuleForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Module
              </Button>
            )}
            {!isOwner && !isStudentCreatedCourse && (
              <Alert className="mt-6 max-w-md">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your instructor will add course materials soon. You'll be notified when new content is available.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Canvas-style Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Primary Action - Smart suggestion based on progress */}
            {nextAction && (
              <Card className={cn(
                "border-2 hover:shadow-md transition-shadow",
                nextAction.type === 'completed' ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {nextAction.type === 'completed' ? 'Course Complete!' : 'Continue Learning'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {nextAction.message}
                      </p>
                    </div>
                    {nextAction.type === 'completed' ? (
                      <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0 ml-2" />
                    ) : (
                      <PlayCircle className="w-7 h-7 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <Button 
                    className="w-full"
                    variant={nextAction.type === 'completed' ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => {
                      if (nextAction.type === 'continue' && nextAction.module) {
                        if (nextAction.file) {
                          router.push(`/courses/${courseId}/modules/${nextAction.module.id}/files/${nextAction.file.id}`);
                        } else {
                          router.push(`/courses/${courseId}/modules/${nextAction.module.id}`);
                        }
                      } else {
                        toast.info('Final assessment coming soon!');
                      }
                    }}
                  >
                    {nextAction.type === 'completed' ? 'Review Course' : 'Continue'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* AI Study Assistant Card */}
            <Card className="hover:shadow-md transition-shadow border-purple-200 bg-purple-50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      AI Study Assistant
                    </h3>
                    <p className="text-sm text-gray-600">
                      Get personalized help with course material
                    </p>
                  </div>
                  <Sparkles className="w-7 h-7 text-purple-600 flex-shrink-0 ml-2" />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
                  onClick={() => {
                    if (modules && modules.length > 0 && modules[0].materials_list.length > 0) {
                      const firstFile = modules[0].materials_list[0];
                      router.push(`/personalize/${firstFile.id}?courseId=${courseId}&moduleId=${modules[0].id}`);
                    } else {
                      toast.info('Add course materials first to use AI assistance');
                    }
                  }}
                >
                  Ask AI
                </Button>
              </CardContent>
            </Card>

            {/* Study Schedule Card */}
            <Card className="hover:shadow-md transition-shadow border-orange-200 bg-orange-50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Study Schedule
                    </h3>
                    <p className="text-sm text-gray-600">
                      Plan your learning schedule
                    </p>
                  </div>
                  <Calendar className="w-7 h-7 text-orange-600 flex-shrink-0 ml-2" />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => router.push('/schedule')}
                >
                  View Schedule
                </Button>
              </CardContent>
            </Card>

            {/* Course Progress Card */}
            {metrics && metrics.overallProgress > 0 && (
              <Card className="hover:shadow-md transition-shadow border-teal-200 bg-teal-50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Progress Report
                      </h3>
                      <p className="text-sm text-gray-600">
                        {metrics.overallProgress}% completed
                      </p>
                    </div>
                    <div className="w-7 h-7 text-teal-600 flex-shrink-0 ml-2 flex items-center justify-center">
                      <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{Math.round(metrics.overallProgress)}%</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full border-teal-300 text-teal-700 hover:bg-teal-100"
                    onClick={() => router.push('/progress')}
                  >
                    View Progress
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Study Plan Card */}
            <Card className="hover:shadow-md transition-shadow border-indigo-200 bg-indigo-50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Study Plan
                    </h3>
                    <p className="text-sm text-gray-600">
                      Personalized learning path
                    </p>
                  </div>
                  <BookOpen className="w-7 h-7 text-indigo-600 flex-shrink-0 ml-2" />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                  onClick={() => router.push('/study-plan')}
                >
                  View Plan
                </Button>
              </CardContent>
            </Card>

            {/* Quick Upload Card - Owner only */}
            {isOwner && (
              <Card className="hover:shadow-md transition-shadow border-gray-200 bg-gray-50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Add Content
                      </h3>
                      <p className="text-sm text-gray-600">
                        Upload new course materials
                      </p>
                    </div>
                    <Upload className="w-7 h-7 text-gray-600 flex-shrink-0 ml-2" />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (modules && modules.length > 0) {
                        setUploadingToModule(modules[0].id);
                      } else {
                        setShowModuleForm(true);
                      }
                    }}
                  >
                    {modules && modules.length > 0 ? 'Upload Files' : 'Create Module'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Modules Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Modules</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab('modules');
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'modules');
                  window.history.pushState({}, '', url.toString());
                }}
              >
                View All Modules
              </Button>
            </div>
            
            <CanvasModuleList
              modules={modules?.slice(0, 3) || []}
              expandedModules={new Set()}
              onToggleModule={() => {}}
              onFileClick={(moduleId, fileId) => {
                router.push(`/personalize/${fileId}?courseId=${courseId}&moduleId=${moduleId}`);
              }}
              isOwner={isOwner}
              onAddModule={() => setShowModuleForm(true)}
              onUploadFile={(moduleId) => setUploadingToModule(moduleId)}
              loading={modulesLoading}
            />
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Canvas-style Course Header */}
      <CanvasCourseHeader
        course={{
          id: courseId,
          title: course?.title || 'Loading...',
          code: course?.code || course?.title?.split(' ')[0] || 'COURSE',
          description: course?.description,
          instructor: {
            name: course?.instructor?.name || 'Unknown Instructor',
            email: course?.instructor?.email,
          },
          term: course?.term || 'Fall 2024',
          credits: course?.credits || 3,
          enrolledCount: course?.stats?.students,
          category: course?.category,
        }}
      />
      
      {/* Canvas-style Navigation Tabs */}
      <CanvasCourseTabs 
        courseId={courseId}
        userRole={userRole}
      />
      
      {/* Main Content Area */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Tab-based Content */}
          {renderTabContent()}

          {/* Course Stats - Only show if there's content and progress */}
          {!isEmptyCourse && metrics && metrics.overallProgress > 0 && activeTab === 'home' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Study Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Time Spent</span>
                      <span className="font-medium">{courseProgress?.time_spent || 0}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Activity</span>
                      <span className="font-medium">
                        {courseProgress?.last_accessed 
                          ? formatDistanceToNow(new Date(courseProgress.last_accessed), { addSuffix: true })
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Module Creation Dialog */}
      <ModuleForm
        courseId={courseId}
        isOpen={showModuleForm}
        onClose={() => setShowModuleForm(false)}
        onSuccess={() => {
          // Refresh modules after creation
          refreshCourseData();
        }}
      />
    </div>
  );
}