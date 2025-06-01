'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ModernSidebar from '@/components/dashboard/ModernSidebar';
import { FloatingAIAssistant } from '@/components/ai/FloatingAIAssistant';
import { SmartSelection } from '@/components/ai/SmartSelection';
import { toast as sonnerToast } from 'sonner';
import CourseForm from '@/components/dashboard/CourseForm';
import AccessCodePopup from '@/components/dashboard/AccessCodeCard';

// Custom hooks
import { useDashboardData } from './hooks/useDashboardData';
import { useTodoItems } from './hooks/useTodoItems';
import { useRecentActivity } from './hooks/useRecentActivity';
import { useDashboardState } from './hooks/useDashboardState';

// Components
import { DashboardHeader } from './sections/DashboardHeader';
import { DashboardStats } from './sections/DashboardStats';
import { CoursesSection } from './sections/CoursesSection';
import { TodoSection } from './sections/TodoSection';
import { RecentActivitySection } from './sections/RecentActivitySection';
import { AIAssistantSection } from './sections/AIAssistantSection';

interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  published?: boolean;
  color?: string;
  lastActivity?: string;
  unreadCount?: number;
  materialsCount?: number;
  studentsCount?: number;
}

interface ModernDashboardProps {
  userRole: 'student' | 'instructor' | 'admin';
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  courses?: Course[];
}

function ModernDashboard({
  userRole,
  currentUser,
  courses = [],
}: ModernDashboardProps) {
  const router = useRouter();

  // Custom hooks for state management and business logic
  const {
    loading,
    realCourses,
    userProfile,
    dashboardStats,
    loadCourses,
    loadDashboardStats,
  } = useDashboardData(userRole);
  const { recentActivity, loadRecentActivity, addActivity } =
    useRecentActivity(userRole);
  const {
    todoItems,
    showAddTodo,
    newTodoTitle,
    newTodoCourse,
    newTodoPriority,
    newTodoType,
    setShowAddTodo,
    setNewTodoTitle,
    setNewTodoCourse,
    setNewTodoPriority,
    setNewTodoType,
    addTodoItem,
    removeTodoItem,
  } = useTodoItems(userRole);
  const {
    isCollapsed,
    searchQuery,
    aiPulse,
    showCourseForm,
    showAccessCodeDialog,
    setIsCollapsed,
    setSearchQuery,
    setShowCourseForm,
    setShowAccessCodeDialog,
  } = useDashboardState();

  // Load dashboard stats when recent activity changes
  useEffect(() => {
    if (recentActivity.length >= 0) {
      loadDashboardStats();
    }
  }, [recentActivity, loadDashboardStats]);

  const handleSmartSelection = (selectedText: string, action: string) => {
    sonnerToast.success(`AI is processing your request: ${action}`);
  };

  const handleCourseCreated = async (courseData: any) => {
    try {
      await loadCourses();
      setShowCourseForm(false);
      sonnerToast.success('Course list updated!');
    } catch (error) {
      console.error('Failed to refresh courses:', error);
    }
  };

  const filteredCourses = realCourses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCourseClick = (course: Course) => {
    router.push(`/courses/${course.id}`);
  };

  const handleUpload = (courseId: string) => {
    const course = realCourses.find((c) => c.id === courseId);
    addActivity(
      'upload',
      course?.title || 'Unknown Course',
      'Uploaded new material',
    );
    router.push(`/courses/${courseId}?tab=materials`);
  };

  const handleAIChat = (courseId: string) => {
    const course = realCourses.find((c) => c.id === courseId);
    addActivity(
      'ai_chat',
      course?.title || 'Unknown Course',
      'Started AI chat session',
    );
    router.push(`/courses/${courseId}?tab=ai`);
  };

  const handleQuiz = (courseId: string) => {
    const course = realCourses.find((c) => c.id === courseId);
    addActivity(
      'quiz',
      course?.title || 'Unknown Course',
      'Generated new quiz',
    );
    router.push(`/courses/${courseId}?tab=quiz`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="canvas-body">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <ModernSidebar
        userRole={userRole}
        onCollapseChange={setIsCollapsed}
        courses={realCourses}
        currentUser={currentUser}
      />

      <div
        className={cn(
          'flex-1 transition-all duration-300 flex flex-col overflow-hidden',
          isCollapsed ? 'ml-16' : 'ml-64',
        )}
      >
        {/* Header */}
        <DashboardHeader
          currentUser={currentUser}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="p-6 flex-1 overflow-y-auto bg-gray-100">
          {/* Stats */}
          <DashboardStats
            realCourses={realCourses}
            todoItemsLength={todoItems.length}
            dashboardStats={dashboardStats}
            aiPulse={aiPulse}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Courses Section */}
            <CoursesSection
              userRole={userRole}
              filteredCourses={filteredCourses}
              setShowCourseForm={setShowCourseForm}
              setShowAccessCodeDialog={setShowAccessCodeDialog}
              onCourseClick={handleCourseClick}
              onUpload={handleUpload}
              onAIChat={handleAIChat}
              onQuiz={handleQuiz}
            />

            {/* Enhanced Sidebar Content */}
            <div className="space-y-6">
              {/* To Do List */}
              <TodoSection
                todoItems={todoItems}
                showAddTodo={showAddTodo}
                newTodoTitle={newTodoTitle}
                newTodoCourse={newTodoCourse}
                newTodoPriority={newTodoPriority}
                setShowAddTodo={setShowAddTodo}
                setNewTodoTitle={setNewTodoTitle}
                setNewTodoCourse={setNewTodoCourse}
                setNewTodoPriority={setNewTodoPriority}
                addTodoItem={addTodoItem}
                removeTodoItem={removeTodoItem}
              />

              {/* Recent Activity */}
              <RecentActivitySection recentActivity={recentActivity} />

              {/* AI Assistant Section */}
              <AIAssistantSection aiPulse={aiPulse} />
            </div>
          </div>
        </main>
      </div>

      {/* AI Components */}
      <FloatingAIAssistant />
      <SmartSelection onAskAI={handleSmartSelection} />

      {/* Course Form Dialog */}
      <Dialog open={showCourseForm} onOpenChange={setShowCourseForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
          </DialogHeader>
          <CourseForm
            userRole={userRole === 'admin' ? 'instructor' : userRole}
            onSave={handleCourseCreated}
            onCancel={() => setShowCourseForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Access Code Dialog */}
      <AccessCodePopup
        open={showAccessCodeDialog}
        onClose={() => setShowAccessCodeDialog(false)}
        onSuccess={() => {
          setShowAccessCodeDialog(false);
          loadCourses();
          sonnerToast.success('Successfully enrolled in course!');
        }}
      />
    </div>
  );
}

export default React.memo(ModernDashboard);
