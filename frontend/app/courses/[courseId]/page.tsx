'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { CourseHeader } from '@/components/course/sections/CourseHeader';
import { ModuleGrid } from '@/components/course/sections/ModuleGrid';
import { ProgressDashboard } from '@/components/course/sections/ProgressDashboard';
import { BehavioralTriggers } from '@/components/course/sections/BehavioralTriggers';
import { useCourseData } from '@/hooks/course/useCourseData';
import { useCourseModules } from '@/hooks/course/useCourseModules';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  // Use extracted hooks (preserve exact API patterns from working dashboard)
  const { course, currentUser, loading: courseLoading, error: courseError } = useCourseData(courseId);
  const { modules, loading: modulesLoading, error: modulesError } = useCourseModules(courseId);

  // Local UI state
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showWeakAreasDrawer, setShowWeakAreasDrawer] = useState(false);
  const [showEfficiencyModal, setShowEfficiencyModal] = useState(false);
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
  const [expandedMaterials, setExpandedMaterials] = useState<{
    [key: string]: boolean;
  }>({});
  const [searchQuery, setSearchQuery] = useState('');

  // COPY EXACT authentication patterns from working dashboard
  const loading = courseLoading || modulesLoading;
  const error = courseError || modulesError;

  // Handle loading and error states (same as dashboard)
  if (loading) {
    return (
      <SharedDashboardLayout
        pageTitle="Loading..."
        showGamification={false}
        currentUser={null}
      >
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
      <SharedDashboardLayout
        pageTitle="Error"
        showGamification={false}
        currentUser={currentUser}
      >
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="text-red-600 mb-4">Failed to load course</div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  // Event handlers
  const handleModuleSelect = (moduleId: string) => {
    setActiveModule(activeModule === moduleId ? null : moduleId);
  };

  const handleMaterialExpand = (moduleId: string) => {
    setExpandedMaterials(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Mock weekly stats (preserve existing functionality)
  const weeklyStats = {
    streakDays: course.completionStreak,
    efficiencyTrend: course.efficiency > 75 ? 'Improving' : 'Needs attention',
    studyTimeProgress: (course.weeklyStudyTime / course.targetStudyTime) * 100,
  };

  return (
    <>
      {/* Preserve existing CSS animations */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }
        .urgent-pulse {
          animation: pulse-glow 2s infinite;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-1deg); }
          75% { transform: rotate(1deg); }
        }
        .hover\\:animate-wiggle:hover {
          animation: wiggle 0.3s ease-in-out;
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        .breathe-10s {
          animation: breathe 2s ease-in-out infinite;
          animation-duration: 10s;
        }
      `}</style>

      <SharedDashboardLayout
        pageTitle=""
        showGamification={false}
        currentUser={currentUser}
      >
        {/* Course Header */}
        <CourseHeader
          course={course}
          weeklyStats={weeklyStats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Module Grid */}
        <ModuleGrid
          modules={modules}
          searchQuery={searchQuery}
          activeModule={activeModule}
          onModuleSelect={handleModuleSelect}
          expandedMaterials={expandedMaterials}
          onMaterialExpand={handleMaterialExpand}
        />

        {/* Progress Dashboard */}
        <ProgressDashboard
          course={course}
          weeklyStats={weeklyStats}
          onShowInsights={() => setShowInsightsModal(true)}
          onShowWeakAreas={() => setShowWeakAreasDrawer(true)}
          onShowEfficiency={() => setShowEfficiencyModal(true)}
          onShowSchedule={() => setShowScheduleDrawer(true)}
        />

        {/* Behavioral Triggers (Modals & Drawers) */}
        <BehavioralTriggers
          modules={modules}
          showInsightsModal={showInsightsModal}
          showWeakAreasDrawer={showWeakAreasDrawer}
          showEfficiencyModal={showEfficiencyModal}
          showScheduleDrawer={showScheduleDrawer}
          onCloseInsights={() => setShowInsightsModal(false)}
          onCloseWeakAreas={() => setShowWeakAreasDrawer(false)}
          onCloseEfficiency={() => setShowEfficiencyModal(false)}
          onCloseSchedule={() => setShowScheduleDrawer(false)}
        />
      </SharedDashboardLayout>
    </>
  );
}