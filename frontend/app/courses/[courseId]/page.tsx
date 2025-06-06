'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { CanvasCourseHeader } from '@/components/course/canvas/CanvasCourseHeader';
import { CanvasCourseTabs } from '@/components/course/canvas/CanvasCourseTabs';
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
  AlertCircle, ChevronRight, ChevronDown, FileText,
  PlayCircle, CheckCircle, Sparkles, BarChart3,
  Target, TrendingUp, BookMarked, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { FileCard } from '@/components/course/FileCard';
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
  const { course, loading: courseLoading, error: courseError } = useCourseData(courseId);
  const { modules, loading: modulesLoading, error: modulesError } = useCourseModules(courseId);
  const { progress: courseProgress, loading: progressLoading } = useCourseProgress(courseId);
  
  // Determine user role for tabs
  const userRole = currentUser?.role as 'student' | 'instructor' | 'admin' || 'student';
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState<CourseMetrics | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [uploadingToModule, setUploadingToModule] = useState<string | null>(null);

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
        {/* Course Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {course.title}
                </h1>
                {isStudentCreatedCourse && (
                  <Badge variant="secondary" className="text-xs">
                    Personal
                  </Badge>
                )}
              </div>
              {course.code && (
                <p className="text-sm text-gray-600 mb-1">
                  Course Code: {course.code}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>
                    {isStudentCreatedCourse 
                      ? 'Personal Course' 
                      : course.instructor?.name || 'Unknown Instructor'}
                  </span>
                </div>
                {metrics && metrics.totalDuration > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{Math.round(metrics.totalDuration / 60)}h total</span>
                  </div>
                )}
                {metrics?.deadline && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span className={cn(
                      metrics.daysRemaining && metrics.daysRemaining < 7 ? "text-red-600 font-medium" : ""
                    )}>
                      Due {formatDistanceToNow(metrics.deadline, { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Owner Actions */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Edit course feature coming soon!')}
                >
                  Edit Course
                </Button>
                {isEmptyCourse && (
                  <Button
                    size="sm"
                    onClick={() => setShowModuleForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Module
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Course Description */}
          {course.description && (
            <p className="mt-4 text-gray-700">{course.description}</p>
          )}
        </div>

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
            {/* Quick Actions - Dynamic based on progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Action - Smart suggestion based on progress */}
              {nextAction && (
                <Card className={cn(
                  "border-2",
                  nextAction.type === 'completed' ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {nextAction.type === 'completed' ? 'Course Complete!' : 'Continue Learning'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {nextAction.message}
                        </p>
                      </div>
                      {nextAction.type === 'completed' ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : (
                        <PlayCircle className="w-8 h-8 text-blue-600" />
                      )}
                    </div>
                    <Button 
                      className="w-full"
                      variant={nextAction.type === 'completed' ? 'outline' : 'default'}
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

              {/* AI Assistant Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        AI Study Assistant
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Get personalized help with course material
                      </p>
                    </div>
                    <Sparkles className="w-8 h-8 text-purple-600" />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
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
            </div>

            {/* Modules Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Course Modules</span>
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
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {modules.map((module, index) => {
                    const isExpanded = expandedModules.has(module.id);
                    const isLocked = false; // Removed locking behavior
                    const hasFiles = module.materials_list && module.materials_list.length > 0;
                    
                    return (
                      <div key={module.id} className="group">
                        <div
                          className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleModuleExpansion(module.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                              
                              {/* Module Status Icon */}
                              {module.progress >= 100 ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : module.progress > 0 ? (
                                <PlayCircle className="w-5 h-5 text-blue-600" />
                              ) : (
                                <BookOpen className="w-5 h-5 text-gray-400" />
                              )}
                              
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">
                                  Module {index + 1}: {module.title}
                                </h3>
                                {module.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {module.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600">
                                {hasFiles ? `${module.materials_list.length} files` : 'No files'}
                              </span>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={module.progress || 0} 
                                  className="w-20 h-2" 
                                />
                                <span className="text-sm font-medium text-gray-700 w-10 text-right">
                                  {Math.round(module.progress || 0)}%
                                </span>
                              </div>
                              {hasFiles && module.materials_list.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const firstFile = module.materials_list[0];
                                    router.push(`/personalize/${firstFile.id}?courseId=${courseId}&moduleId=${module.id}`);
                                  }}
                                  title="Personalize learning"
                                >
                                  <Sparkles className="h-4 w-4 text-purple-600" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-6 pb-4 bg-gray-50 border-t border-gray-200">
                            {hasFiles ? (
                              <div className="space-y-2 mt-4">
                                {/* Add Materials Button for modules with existing files */}
                                {isOwner && (
                                  <div className="flex justify-end mb-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setUploadingToModule(module.id);
                                      }}
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Add More Materials
                                    </Button>
                                  </div>
                                )}
                                {module.materials_list.map((material) => (
                                  <FileCard
                                    key={material.id}
                                    file={{
                                      id: material.id,
                                      name: material.title,
                                      type: material.file_type || material.type,
                                      size: material.file_size,
                                      processed: material.completed,
                                      uploadedAt: undefined
                                    }}
                                    onPreview={(fileId) => {
                                      router.push(`/courses/${courseId}/modules/${module.id}/files/${fileId}`);
                                    }}
                                    onDownload={(fileId) => {
                                      toast.info('Download feature coming soon!');
                                    }}
                                    onPersonalize={(fileId) => {
                                      router.push(`/personalize/${fileId}?courseId=${courseId}&moduleId=${module.id}`);
                                    }}
                                    isEven={false}
                                    className="bg-white"
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-600 mb-4">
                                  {isOwner 
                                    ? isStudentCreatedCourse 
                                      ? 'Add your study materials to this module'
                                      : 'No files in this module yet'
                                    : 'No files in this module yet'}
                                </p>
                                {isOwner && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUploadingToModule(module.id);
                                    }}
                                  >
                                    <Upload className="w-4 h-4 mr-1" />
                                    {isStudentCreatedCourse ? 'Add Study Materials' : 'Upload Files'}
                                  </Button>
                                )}
                              </div>
                            )}
                            
                            {/* File Upload Section */}
                            {uploadingToModule === module.id && (
                              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-gray-900">Upload Study Materials</h4>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setUploadingToModule(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                <EnhancedFileUpload
                                  courseId={courseId}
                                  moduleId={module.id}
                                  userRole={currentUser?.role || 'student'}
                                  onUploadComplete={() => {
                                    setUploadingToModule(null);
                                    // Refresh modules to show new files
                                    window.location.reload();
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Course Stats - Only show if there's content and progress */}
        {!isEmptyCourse && metrics && metrics.overallProgress > 0 && (
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
          window.location.reload();
        }}
      />
    </div>
  );
}