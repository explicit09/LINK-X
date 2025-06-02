'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { useCourseData } from '@/hooks/course/useCourseData';
import { useCourseModules, type Module, type Material } from '@/hooks/course/useCourseModules';
import { useCourseProgress } from '@/hooks/course/useCourseProgress';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, Play, BookOpen, Clock, AlertTriangle, TrendingUp, FileText, Video, Music, Eye, Download } from 'lucide-react';
import { courseAPI, type ResumeTarget } from '@/lib/api/courses';
import { useAlert } from '@/contexts/AlertContext';
import { FileCard } from '@/components/course/FileCard';
import { EnhancedFileUpload } from '@/components/course/enhanced-file-upload/EnhancedFileUpload';

// Use the Module type from useCourseModules hook instead of custom interface

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  
  const { user: currentUser } = useAuthUser();
  const { course, loading: courseLoading, error: courseError } = useCourseData(courseId);
  const { modules, loading: modulesLoading, error: modulesError } = useCourseModules(courseId);
  const { progress: courseProgress, loading: progressLoading } = useCourseProgress(courseId);
  
  const [nextModule, setNextModule] = useState<Module | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [uploadingModules, setUploadingModules] = useState<Set<string>>(new Set());
  const [showAlternateActions, setShowAlternateActions] = useState(false);
  const [resumeTarget, setResumeTarget] = useState<ResumeTarget | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [alertsTriggered, setAlertsTriggered] = useState(false);
  
  const { addUrgentCourseAlert, clearAlerts } = useAlert();

  // Determine next module based on real data
  useEffect(() => {
    if (modules && modules.length > 0) {
      // Find the next module to work on
      const nextModuleCandidate = modules.find(m => 
        m.status === 'in-progress' || (m.status === 'urgent' && m.progress < 90)
      );
      
      if (nextModuleCandidate) {
        setNextModule(nextModuleCandidate);
      } else {
        // Fallback: first incomplete module or first module
        const firstIncomplete = modules.find(m => m.progress < 90);
        setNextModule(firstIncomplete || modules[0]);
      }
    }
  }, [modules]);

  // Toggle module expansion
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

  // Toggle upload mode for a module
  const toggleUploadMode = (moduleId: string) => {
    setUploadingModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // Handle upload completion - refresh modules data
  const handleUploadComplete = () => {
    // Trigger modules refetch to show new files
    if (modules) {
      // Use the refetch function from useCourseModules if available
      window.location.reload(); // Simple refresh for now
    }
  };

  // Fetch resume target when course loads
  useEffect(() => {
    if (courseId) {
      setResumeLoading(true);
      courseAPI.getResumeTarget(courseId)
        .then(target => {
          setResumeTarget(target);
        })
        .catch(error => {
          console.error('Failed to fetch resume target:', error);
        })
        .finally(() => {
          setResumeLoading(false);
        });
    }
  }, [courseId]);

  // Check for urgent conditions and trigger global alerts (only once per course)
  useEffect(() => {
    if (!course || !modules || modules.length === 0 || alertsTriggered) {
      return;
    }

    let shouldTriggerAlert = false;
    
    const hasUrgentDeadline = modules.some(m => m.status === 'urgent') || 
                             (course.deadline && new Date(course.deadline).getTime() - Date.now() < 72 * 60 * 60 * 1000);
    
    if (hasUrgentDeadline) {
      const hoursUntilDeadline = course.deadline 
        ? Math.round((new Date(course.deadline).getTime() - Date.now()) / (1000 * 60 * 60))
        : 24; // Default for urgent modules
      
      addUrgentCourseAlert(
        courseId,
        `Urgent: ${course.title} Deadline Approaching`,
        `You have ${hoursUntilDeadline} hours remaining. ${resumeTarget ? 'Continue where you left off' : 'Start studying now'} to stay on track.`,
        resumeTarget?.type === 'file' && resumeTarget.file_id 
          ? `/courses/${courseId}/modules/${resumeTarget.module_id}/files/${resumeTarget.file_id}`
          : `/courses/${courseId}/modules/${resumeTarget?.module_id || modules[0]?.id}`
      );
      shouldTriggerAlert = true;
    }
    
    if (shouldTriggerAlert) {
      setAlertsTriggered(true);
    }
  }, [course, modules, resumeTarget, courseId, addUrgentCourseAlert, alertsTriggered]);

  // Reset alerts when courseId changes
  useEffect(() => {
    setAlertsTriggered(false);
  }, [courseId]);

  const getModuleCardStyles = (status: Module['status']) => {
    switch (status) {
      case 'completed': 
        return {
          container: 'bg-white border border-[#E5E9F2] rounded-lg',
          icon: '✔',
          iconColor: 'text-green-600',
          title: 'text-gray-900',
          progress: 'bg-green-500',
          badge: 'bg-green-100 text-green-800'
        };
      case 'active': 
        return {
          container: 'bg-white border border-[#E5E9F2] rounded-lg',
          icon: '▶',
          iconColor: 'text-[#3B5BFF]',
          title: 'text-gray-900',
          progress: 'bg-[#3B5BFF]',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'urgent': 
        return {
          container: 'bg-white border-2 border-[#FF6363] rounded-lg',
          icon: '!',
          iconColor: 'text-[#FF6363]',
          title: 'text-gray-900',
          progress: 'bg-[#FF6363]',
          badge: 'bg-red-100 text-red-800'
        };
      case 'locked': 
        return {
          container: 'bg-[#F4F6FA] border border-[#E5E9F2] rounded-lg opacity-75',
          icon: '🔒',
          iconColor: 'text-gray-400',
          title: 'text-gray-600',
          progress: 'bg-gray-300',
          badge: 'bg-gray-100 text-gray-600'
        };
      default: 
        return {
          container: 'bg-white border border-[#E5E9F2] rounded-lg',
          icon: '○',
          iconColor: 'text-gray-400',
          title: 'text-gray-900',
          progress: 'bg-gray-300',
          badge: 'bg-gray-100 text-gray-600'
        };
    }
  };


  const hasUrgentDeadline = modules?.some(m => m.status === 'urgent') || 
                           (course?.deadline && new Date(course.deadline).getTime() - Date.now() < 72 * 60 * 60 * 1000);

  const loading = courseLoading || modulesLoading;
  const error = courseError || modulesError;

  if (loading) {
    return (
      <SharedDashboardLayout pageTitle="Loading..." currentUser={null}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-gray-600">Loading course...</div>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <SharedDashboardLayout pageTitle="Error" currentUser={currentUser}>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">Failed to load course</div>
          <Button onClick={() => router.back()} variant="outline">Go Back</Button>
        </div>
      </SharedDashboardLayout>
    );
  }

  // Calculate real overall progress
  const overallProgress = (() => {
    // Use backend progress if available, otherwise calculate from modules
    if (courseProgress) {
      return courseProgress.completion_percentage;
    }
    
    if (!modules || modules.length === 0) return 0;
    
    const totalProgress = modules.reduce((sum, module) => sum + module.progress, 0);
    return Math.round(totalProgress / modules.length);
  })();

  return (
    <SharedDashboardLayout 
      pageTitle={course.title || 'CS229: Machine Learning'} 
      currentUser={currentUser}
    >
      <div className="flex min-h-screen">
        {/* Center Content */}
        <div className="flex-1 p-6 max-w-4xl mx-auto pr-8">
          {/* Course Header - Clean design system */}
          <div className="mb-8">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[20px] font-semibold text-gray-900 mb-1">
                  {course.title || 'CS229: Machine Learning'}
                </h1>
                <div className="text-[14px] text-gray-600">
                  {course.instructor?.name || 'Dr. Andrew Ng'} • 45.2h total
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[14px] font-medium">
                  A- • 4-day streak
                </div>
                <Button size="sm" variant="outline" className="text-[14px]">
                  ⋯ Actions
                </Button>
              </div>
            </div>

            {/* Glance Metrics - Three key indicators */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-medium text-gray-700">Progress</span>
                  <span className="text-[16px] font-semibold text-gray-900">{overallProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-medium text-gray-700">Time Left</span>
                  <span className="text-[16px] font-semibold text-gray-900">3d</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full w-[25%]" />
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-medium text-gray-700">Confidence</span>
                  <span className="text-[16px] font-semibold text-gray-900">73%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full w-[73%]" />
                </div>
                <Button size="sm" variant="outline" className="mt-2 text-[12px] w-full">
                  Fix
                </Button>
              </div>
            </div>
          </div>

          {/* Action Block - Primary/Secondary structure */}
          <div className="space-y-6 mb-8">
            {/* Primary Action */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-[14px] font-medium text-gray-700">Primary</span>
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[12px] font-medium">Due in 3d</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Complete Assignment: Support Vector Machines</h3>
                  <p className="text-[14px] text-gray-600">High priority assignment approaching deadline</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white ml-6">
                  Start Now
                </Button>
              </div>
            </div>

            {/* Secondary Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h4 className="text-[14px] font-medium text-gray-700 mb-4">Secondary</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="text-[16px] font-medium text-gray-900">Continue Linear Regression Lab</h5>
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full w-[85%]" />
                      </div>
                      <span className="text-[14px] text-gray-600">85%</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-[14px] ml-4">
                    Continue
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="text-[16px] font-medium text-gray-900">Review clustering concepts (3 topics)</h5>
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-orange-500 h-1.5 rounded-full w-[45%]" />
                      </div>
                      <span className="text-[14px] text-gray-600">45%</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-[14px] ml-4">
                    Review with Tutor
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Path - Accordion format */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-semibold text-gray-900">Learning Path</h2>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {modules?.map((module, index) => {
                const styles = getModuleCardStyles(module.status);
                const isExpanded = expandedModules.has(module.id);
                return (
                  <div key={module.id} className="border-b border-gray-100 last:border-b-0">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleModuleExpansion(module.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Expand/Collapse Icon */}
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                          <div className="text-[14px] text-gray-600">Module {index + 1}</div>
                          {module.status === 'completed' && <span className="text-green-600">✓</span>}
                          {module.status === 'urgent' && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[12px] font-medium">urgent</span>
                          )}
                          <h3 className="text-[16px] font-medium text-gray-900">{module.title}</h3>
                        </div>
                        <div className="flex items-center space-x-4 text-right">
                          <div className="text-[14px] text-gray-900 font-medium">
                            {Math.round(module.progress)}%
                          </div>
                          <div className="text-[14px] text-gray-600">
                            {module.confidenceLevel}% confidence
                          </div>
                          <div className="text-[12px] text-gray-500">
                            {module.materials} files
                          </div>
                        </div>
                      </div>
                      
                      {/* Module Description */}
                      {module.description && (
                        <div className="mt-2 text-[14px] text-gray-600 pl-7">
                          {module.description}
                        </div>
                      )}
                    </div>

                    {/* Expanded Files Section */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[14px] font-medium text-gray-700">
                              Files ({module.materials_list.length})
                            </h4>
                            <Button 
                              size="sm" 
                              variant={uploadingModules.has(module.id) ? "default" : "outline"}
                              className="text-[12px] h-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUploadMode(module.id);
                              }}
                            >
                              {uploadingModules.has(module.id) ? 'Cancel' : '+ Upload'}
                            </Button>
                          </div>
                          
                          {/* File Upload Section */}
                          {uploadingModules.has(module.id) && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <EnhancedFileUpload
                                courseId={courseId}
                                moduleId={module.id}
                                userRole="student" // TODO: Get from auth context
                                onUploadComplete={handleUploadComplete}
                                className="max-w-full"
                              />
                            </div>
                          )}
                          
                          {module.materials_list.length > 0 ? (
                            <div className="space-y-1">
                              {module.materials_list.map((material, materialIndex) => (
                                <FileCard
                                  key={material.id}
                                  file={{
                                    id: material.id,
                                    name: material.title,
                                    type: material.file_type || material.type,
                                    size: material.file_size,
                                    processed: material.completed,
                                    uploadedAt: undefined // TODO: Add upload date to Material interface
                                  }}
                                  onPreview={(fileId) => {
                                    router.push(`/courses/${courseId}/modules/${module.id}/files/${fileId}`);
                                  }}
                                  onDownload={(fileId) => {
                                    // TODO: Add download functionality
                                    console.log('Download file:', fileId);
                                  }}
                                  isEven={materialIndex % 2 === 0}
                                  className="rounded-lg"
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-gray-500">
                              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-[14px]">No files uploaded yet</p>
                              <p className="text-[12px] text-gray-400">Upload course materials to get started</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Insights Side-rail - Cleaner design */}
        <div className="w-72 p-6 bg-gray-50 flex-shrink-0">
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-[14px] font-medium text-gray-700 mb-3">Performance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-gray-600">Quiz Average</span>
                  <span className="text-[16px] font-semibold text-gray-900">82%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-gray-600">Efficiency</span>
                  <span className="text-[16px] font-semibold text-gray-900">73%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-gray-600">Class Rank</span>
                  <span className="text-[16px] font-semibold text-indigo-600">#3/156</span>
                </div>
              </div>
            </div>

            {/* This Week */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-[14px] font-medium text-gray-700 mb-3">This Week</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] text-gray-600">Study Time</span>
                    <span className="text-[14px] font-medium text-gray-900">8.5h / 12h</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full w-[70%]" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] text-gray-600">Assignments</span>
                    <span className="text-[14px] font-medium text-gray-900">3 / 4</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full w-[75%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-[14px] font-medium text-gray-700 mb-3">Achievements</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-500">🎯</span>
                  <div>
                    <div className="text-[14px] font-medium text-gray-900">Top 10%</div>
                    <div className="text-[12px] text-gray-600">Class performance</div>
                  </div>
                </div>
                <span className="text-[12px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Earned</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] justify-start">
                Start Urgent Task
              </Button>
              <Button variant="outline" className="w-full text-[14px] justify-start">
                AI Tutor Help
              </Button>
              <Button variant="outline" className="w-full text-[14px] justify-start">
                Smart Schedule
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SharedDashboardLayout>
  );
}