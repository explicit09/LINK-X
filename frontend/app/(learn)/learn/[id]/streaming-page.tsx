'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Custom hooks
import { useStreamingCourse } from './hooks/useStreamingCourse';
import { useAIChat } from './hooks/useAIChat';
import { useProgressTracking } from './hooks/useProgressTracking';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';

// Components
import { StreamingHeader } from './components/StreamingHeader';
import { CourseNavigationSidebar } from './components/CourseNavigationSidebar';
import { LessonContentViewer } from './components/LessonContentViewer';
import { WelcomePrompt } from './components/WelcomePrompt';
import { AITutorChat } from './components/AITutorChat';

export default function StreamingLearnPage() {
  const params = useParams();
  const pfId = typeof params?.id === 'string' ? params.id : null;

  // Custom hooks for state management and business logic
  const {
    courseName,
    chapters,
    totalLessons,
    completedLessons,
    streamSectionContent,
  } = useStreamingCourse(pfId);
  const {
    studyTime,
    currentStreak,
    recommendedLesson,
    setRecommendedLessonData,
  } = useProgressTracking();
  const {
    sidebarVisible,
    currentModuleIndex,
    selectedLesson,
    setSidebarVisible,
    handleModuleClick,
    handleLessonSelect,
  } = useResponsiveLayout();
  const {
    chatOpen,
    chatInput,
    chatMessages,
    unreadMessages,
    isStreaming,
    chatMessagesEndRef,
    setChatOpen,
    setChatInput,
    handleChatSubmit,
    openChat,
  } = useAIChat(pfId);

  // Set recommended lesson when chapters are loaded
  React.useEffect(() => {
    if (
      chapters.length > 0 &&
      chapters[0].subsections.length > 0 &&
      !recommendedLesson
    ) {
      setRecommendedLessonData(0, 0);
    }
  }, [chapters, recommendedLesson, setRecommendedLessonData]);

  // Handle lesson selection with content streaming
  const handleLessonSelectWithStreaming = async (
    moduleIndex: number,
    lessonIndex: number,
  ) => {
    handleLessonSelect(moduleIndex, lessonIndex);

    // Stream content if not already loaded
    const chapter = chapters[moduleIndex];
    const lesson = chapter.subsections[lessonIndex];

    if (!lesson.content && !lesson.isLoading && !lesson.isStreaming) {
      await streamSectionContent(chapter.id, lesson.id);
    }
  };

  const startRecommendedLesson = () => {
    if (recommendedLesson) {
      handleLessonSelectWithStreaming(
        recommendedLesson.moduleIndex,
        recommendedLesson.lessonIndex,
      );
    }
  };

  // Derived data
  const currentModule = selectedLesson
    ? chapters[selectedLesson.moduleIndex]
    : null;
  const currentLesson = selectedLesson
    ? chapters[selectedLesson.moduleIndex]?.subsections[
        selectedLesson.lessonIndex
      ]
    : null;

  if (!pfId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center shadow-lg">
          <CardContent>
            <div className="text-red-500 text-lg font-semibold mb-2">
              Missing personalized file ID
            </div>
            <p className="text-gray-600 mb-4">
              Please return to your course materials and try again.
            </p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <StreamingHeader
        courseName={courseName}
        currentModule={currentModule}
        currentLesson={currentLesson}
        completedLessons={completedLessons}
        totalLessons={totalLessons}
        studyTime={studyTime}
        currentStreak={currentStreak}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
      />

      {/* Two-Pane Layout */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Pane: Navigation Sidebar */}
        {sidebarVisible && (
          <CourseNavigationSidebar
            chapters={chapters}
            currentModuleIndex={currentModuleIndex}
            selectedLesson={selectedLesson}
            recommendedLesson={recommendedLesson}
            onModuleClick={handleModuleClick}
            onLessonSelect={handleLessonSelectWithStreaming}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          <div className="flex items-center justify-center min-h-full p-6">
            <div className="w-full max-w-6xl">
              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-16">
                  {!selectedLesson ? (
                    <WelcomePrompt
                      courseName={courseName}
                      completedLessons={completedLessons}
                      totalLessons={totalLessons}
                      studyTime={studyTime}
                      currentStreak={currentStreak}
                      recommendedLesson={recommendedLesson}
                      chapters={chapters}
                      onStartRecommendedLesson={startRecommendedLesson}
                    />
                  ) : (
                    <LessonContentViewer currentLesson={currentLesson} />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Tutor Chat */}
          <AITutorChat
            chatOpen={chatOpen}
            chatInput={chatInput}
            chatMessages={chatMessages}
            unreadMessages={unreadMessages}
            isStreaming={isStreaming}
            chatMessagesEndRef={chatMessagesEndRef}
            setChatOpen={setChatOpen}
            setChatInput={setChatInput}
            handleChatSubmit={handleChatSubmit}
            openChat={openChat}
          />
        </div>
      </div>
    </div>
  );
}
