'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { useAuthUser } from '@/hooks/useAuthUser';

// Custom hooks
import { useDocumentOutline } from './hooks/useDocumentOutline';
import { useStreamingContent } from './hooks/useStreamingContent';
import { useGamification } from './hooks/useGamification';
import { useChat } from './hooks/useChat';
import { usePerformanceMetrics } from './hooks/usePerformanceMetrics';

// Components
import { GamificationTopBar } from './components/GamificationTopBar';
import { DocumentSidebar } from './components/DocumentSidebar';
import { StreamingContent } from './components/StreamingContent';
import { AIChat } from './components/AIChat';
import { PerformanceMetricsPanel } from './components/PerformanceMetricsPanel';

export default function StreamingLearnPage() {
  const { id: fileId } = useParams();
  const searchParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  );
  const courseId = searchParams.get('courseId');
  const moduleId = searchParams.get('moduleId');
  
  // Get current user for layout
  const { user: currentUser } = useAuthUser();

  // State for sidebar sticky behavior
  const [isSticky, setIsSticky] = useState(false);

  // Custom hooks
  const { outline, isLoadingOutline, toggleChapter } =
    useDocumentOutline(fileId as string);

  const {
    streamingContent,
    streamingStates,
    activeSectionKey,
    focusedSectionKey,
    setFocusedSectionKey,
    generatedSections,
    visibleSections,
    setVisibleSections,
    contentRefs,
    totalSections,
    completedCount,
    streamingCount,
    progress,
    streamSection,
    regenerateSection,
    prefetchNext,
    metricsData,
  } = useStreamingContent(fileId as string, outline);

  const {
    userXP,
    userLevel,
    streak,
    achievements,
    showXPAnimation,
    lastXPGain,
    currentLevelXP,
    levelProgress,
    awardXP,
    updateStreak,
    getRecentAchievements,
    getNextLevelXP,
  } = useGamification(completedCount, totalSections);

  const chatProps = useChat(
    fileId as string,
    outline,
    focusedSectionKey,
    streamingContent,
  );

  const { showMetrics, toggleMetrics, closeMetrics } = usePerformanceMetrics();

  // Handle sticky sidebar
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Loading state
  if (isLoadingOutline) {
    return (
      <SharedDashboardLayout 
        pageTitle="Loading..." 
        currentUser={currentUser}
        showGamification={false}
        showFocusMode={false}
      >
        <div className="flex min-h-screen">
          <div className="w-80 p-4 space-y-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex-1 p-6 space-y-6 ml-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  return (
    <SharedDashboardLayout 
      pageTitle="AI Learning Assistant" 
      currentUser={currentUser}
      showGamification={false}
      showFocusMode={false}
      className="relative"
    >
      {/* Gamification Header - Integrated with v2 design */}
      <div className="mb-6">
        <GamificationTopBar
          userXP={userXP}
          userLevel={userLevel}
          streak={streak}
          levelProgress={levelProgress}
          showXPAnimation={showXPAnimation}
          lastXPGain={lastXPGain}
          achievements={achievements}
          totalSections={totalSections}
          completedCount={completedCount}
          progress={progress}
          courseId={courseId}
        />
      </div>

      {/* Main Streaming Interface */}
      <div className="flex min-h-screen gap-6">
        {/* Document Sidebar - v2 styled */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
            <DocumentSidebar
              outline={outline}
              isLoadingOutline={isLoadingOutline}
              streamingStates={streamingStates}
              activeSectionKey={activeSectionKey}
              focusedSectionKey={focusedSectionKey}
              visibleSections={visibleSections}
              isSticky={isSticky}
              onToggleChapter={toggleChapter}
              onStreamSection={streamSection}
              onFocusSection={setFocusedSectionKey}
              onRegenerateSection={regenerateSection}
            />
          </div>
        </div>

        {/* Streaming Content - v2 styled */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full">
            <StreamingContent
              outline={outline}
              streamingContent={streamingContent}
              streamingStates={streamingStates}
              activeSectionKey={activeSectionKey}
              focusedSectionKey={focusedSectionKey}
              contentRefs={contentRefs}
              onStreamSection={streamSection}
              onRegenerateSection={regenerateSection}
              onSetVisibleSections={setVisibleSections}
            />
          </div>
        </div>
      </div>

      {/* AI Chat - Floating overlay */}
      <AIChat
        {...chatProps}
        onSendMessage={chatProps.sendChatMessage}
        onClearChat={chatProps.clearChat}
        onToggleChat={chatProps.toggleChat}
        onToggleChatMinimized={chatProps.toggleChatMinimized}
        onUseSuggestion={chatProps.useSuggestion}
      />

      {/* Performance Metrics Panel - Floating overlay */}
      {showMetrics && (
        <PerformanceMetricsPanel
          metricsData={metricsData}
          onClose={closeMetrics}
        />
      )}
    </SharedDashboardLayout>
  );
}
