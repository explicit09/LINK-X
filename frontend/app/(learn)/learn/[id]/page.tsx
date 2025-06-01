'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Custom hooks
import { useCourseData } from './hooks/useCourseData';
import { useLessonNavigation } from './hooks/useLessonNavigation';
import { useProgressTracking } from './hooks/useProgressTracking';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { useAIChat } from './hooks/useAIChat';

// Components
import { LearnHeader } from './components/LearnHeader';
import { CourseModuleSidebar } from './components/CourseModuleSidebar';
import { LessonViewer } from './components/LessonViewer';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AITutorChat } from './components/AITutorChat';

export default function LearnPage() {
  const params = useParams();
  const pfId = typeof params?.id === 'string' ? params.id : null;

  // Custom hooks for state management and business logic
  const {
    courseName,
    chapters,
    totalLessons,
    completedLessons,
    recommendedLesson,
  } = useCourseData(pfId);
  const { studyTime, currentStreak } = useProgressTracking();
  const {
    currentModuleIndex,
    selectedLesson,
    currentContent,
    setCurrentModuleIndex,
    handleModuleClick,
    handleLessonSelect,
    startRecommendedLesson,
  } = useLessonNavigation(chapters);
  const { sidebarVisible, setSidebarVisible } = useResponsiveLayout();
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

  // Set recommended lesson module as expanded when data loads
  React.useEffect(() => {
    if (recommendedLesson && currentModuleIndex === null) {
      setCurrentModuleIndex(recommendedLesson.moduleIndex);
    }
  }, [recommendedLesson, currentModuleIndex, setCurrentModuleIndex]);

  // Derived data
  const currentModule = selectedLesson
    ? chapters[selectedLesson.moduleIndex]
    : null;
  const currentLesson = selectedLesson
    ? chapters[selectedLesson.moduleIndex]?.subsections[
        selectedLesson.lessonIndex
      ]
    : null;

  const handleStartRecommendedLesson = () => {
    startRecommendedLesson(recommendedLesson);
  };

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
      <LearnHeader
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
          <CourseModuleSidebar
            chapters={chapters}
            currentModuleIndex={currentModuleIndex}
            selectedLesson={selectedLesson}
            recommendedLesson={recommendedLesson}
            onModuleClick={handleModuleClick}
            onLessonSelect={handleLessonSelect}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          <div className="flex items-center justify-center min-h-full p-6">
            <div className="w-full max-w-6xl">
              <Card className="shadow-sm border border-gray-200">
                <CardContent className="p-16">
                  {!selectedLesson ? (
                    <WelcomeScreen
                      courseName={courseName}
                      completedLessons={completedLessons}
                      totalLessons={totalLessons}
                      studyTime={studyTime}
                      currentStreak={currentStreak}
                      recommendedLesson={recommendedLesson}
                      chapters={chapters}
                      onStartRecommendedLesson={handleStartRecommendedLesson}
                    />
                  ) : (
                    <LessonViewer
                      currentLesson={currentLesson}
                      currentContent={currentContent}
                    />
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
