'use client';

import { lazy, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent } from '@/components/ui/tabs';

// Context and Hooks
import { CourseProvider } from './context/CourseContext';
import { useCourseData } from './hooks/useCourseData';
import { useCourseUIState } from './hooks/useCourseUIState';

// Handlers
import {
  useTabHandler,
  useMaterialHandler,
  useSmartSelectionHandler,
  useCourseDeleteHandler
} from './handlers';

// Components
import { CourseHeader } from './components/CourseHeader';
import { CourseNavigation } from './components/CourseNavigation';
import { HomeTab } from './components/home/HomeTab';
import { LoadingState, ErrorState } from './components/states';
import { MaterialViewDialog } from './components/dialogs';
import ModernSidebar from '@/components/dashboard/ModernSidebar';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { FloatingAIAssistant } from '@/components/ai/FloatingAIAssistant';
import { SmartSelection } from '@/components/ai/SmartSelection';

// Lazy loaded components
const AITab = lazy(() => import('./components/ai/AITab'));
const QuizzesTab = lazy(() => import('./components/quizzes/QuizzesTab'));
const PeopleTab = lazy(() => import('./components/people/PeopleTab'));

interface CoursePageContentProps {
  courseId: string;
}

const CoursePageContent = ({ courseId }: CoursePageContentProps) => {
  // Data fetching
  const { course, modules, courseProgress, loading, error, currentUser } = useCourseData(courseId);
  
  // UI state
  const { isCollapsed, setIsCollapsed, isFocusMode, setIsFocusMode, activeTab } = useCourseUIState();
  
  // Handlers
  const { handleTabChange } = useTabHandler();
  const { currentMaterial, setCurrentMaterial, handleViewMaterial, handleAskAI } = useMaterialHandler(courseId, currentUser);
  const { handleSmartSelection } = useSmartSelectionHandler();
  const {
    courseDeleteDialogOpen,
    setCourseDeleteDialogOpen,
    isDeletingCourse,
    handleDeleteCourse,
    confirmDeleteCourse
  } = useCourseDeleteHandler(courseId);

  // Loading and error states
  if (loading) return <LoadingState />;
  if (error || !course) return <ErrorState />;

  const totalMaterials = modules.reduce((total, module) => total + module.materials.length, 0);

  return (
    <div className="min-h-screen bg-gray-50/30 flex">
      {!isFocusMode && (
        <ModernSidebar
          userRole={currentUser?.role || "student"}
          onCollapseChange={setIsCollapsed}
          courses={[course]}
          currentUser={currentUser}
          initialCollapsed={true}
        />
      )}
      
      <div className={cn("flex-1 transition-all duration-300 ease-out", 
        isFocusMode ? "ml-0" : (isCollapsed ? "ml-14" : "ml-64")
      )}>
        <CourseHeader
          course={course}
          courseProgress={courseProgress}
          totalMaterials={totalMaterials}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => {
            setIsFocusMode(!isFocusMode);
            if (!isFocusMode) {
              setIsCollapsed(true);
            }
          }}
          onDeleteCourse={currentUser?.role === 'instructor' ? handleDeleteCourse : undefined}
          isInstructor={currentUser?.role === 'instructor'}
        />

        <CourseNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          courseProgress={courseProgress}
        />

        <main className="bg-gray-50/30 relative">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsContent value="home" className="space-y-0">
              <HomeTab
                courseId={courseId}
                isFocusMode={isFocusMode}
                onViewMaterial={handleViewMaterial}
                onAskAI={handleAskAI}
              />
            </TabsContent>

            <TabsContent value="ai" className="p-6">
              <Suspense fallback={<div>Loading AI Tutor...</div>}>
                <AITab courseId={courseId} courseName={course.title} />
              </Suspense>
            </TabsContent>

            <TabsContent value="quizzes" className="p-6">
              <Suspense fallback={<div>Loading Quizzes...</div>}>
                <QuizzesTab courseId={courseId} />
              </Suspense>
            </TabsContent>

            <TabsContent value="people" className="p-6">
              <Suspense fallback={<div>Loading People...</div>}>
                <PeopleTab course={course} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* AI Components */}
      <FloatingAIAssistant 
        courseId={courseId}
        courseName={course.title}
        currentMaterial={currentMaterial}
      />
      
      <SmartSelection
        onAskAI={handleSmartSelection}
        courseId={courseId}
        materialId={currentMaterial?.id}
      />

      {/* Material View Dialog */}
      <MaterialViewDialog
        currentMaterial={currentMaterial}
        onClose={() => setCurrentMaterial(undefined)}
        currentUser={currentUser}
        courseId={courseId}
      />

      {/* Course Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={courseDeleteDialogOpen}
        onOpenChange={setCourseDeleteDialogOpen}
        onConfirm={confirmDeleteCourse}
        title="Delete Course"
        itemName={course?.title}
        description={course?.title ? `Are you sure you want to delete the course "${course.title}"? This will permanently delete all modules, files, and course data. This action cannot be undone.` : undefined}
        isLoading={isDeletingCourse}
      />
    </div>
  );
};

// Main exported component with provider
export default function CoursePage() {
  const params = useParams();
  const courseId = params?.courseId as string;

  return (
    <CourseProvider>
      <CoursePageContent courseId={courseId} />
    </CourseProvider>
  );
}