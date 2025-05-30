"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

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
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const courseId = searchParams.get('courseId');
  
  // State for sidebar sticky behavior
  const [isSticky, setIsSticky] = useState(false);

  // Custom hooks
  const { outline, isLoadingOutline, toggleChapter } = useDocumentOutline(fileId);
  
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
    metricsData
  } = useStreamingContent(fileId, outline);

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
    getNextLevelXP
  } = useGamification(completedCount, totalSections);

  const chatProps = useChat(fileId, outline, focusedSectionKey, streamingContent);

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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 h-24">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="flex">
          <div className="w-80 p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <div className="flex-1 p-6 space-y-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Gamification Top Bar */}
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

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Document Sidebar */}
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

        {/* Streaming Content */}
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

      {/* AI Chat */}
      <AIChat
        {...chatProps}
        onSendMessage={chatProps.sendChatMessage}
        onClearChat={chatProps.clearChat}
        onToggleChat={chatProps.toggleChat}
        onToggleChatMinimized={chatProps.toggleChatMinimized}
        onUseSuggestion={chatProps.useSuggestion}
      />

      {/* Performance Metrics Panel */}
      {showMetrics && (
        <PerformanceMetricsPanel
          metricsData={metricsData}
          onClose={closeMetrics}
        />
      )}
    </div>
  );
}