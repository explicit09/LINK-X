import { useState } from 'react';
import { Chapter } from '../types/learn.types';

export const useLessonNavigation = (chapters: Chapter[]) => {
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(
    null,
  );
  const [selectedLesson, setSelectedLesson] = useState<{
    moduleIndex: number;
    lessonIndex: number;
  } | null>(null);
  const [currentContent, setCurrentContent] = useState<string | null>(null);

  const handleModuleClick = (moduleIndex: number) => {
    if (currentModuleIndex === moduleIndex) {
      setCurrentModuleIndex(null);
      setSelectedLesson(null);
      setCurrentContent(null);
    } else {
      setCurrentModuleIndex(moduleIndex);
      setSelectedLesson(null);
      setCurrentContent(null);
    }
  };

  const handleLessonSelect = (moduleIndex: number, lessonIndex: number) => {
    setSelectedLesson({ moduleIndex, lessonIndex });
    setCurrentModuleIndex(moduleIndex);

    // Set content immediately without loading delay
    const lesson = chapters[moduleIndex].subsections[lessonIndex];
    setCurrentContent(lesson.fullText);
  };

  const startRecommendedLesson = (
    recommendedLesson: { moduleIndex: number; lessonIndex: number } | null,
  ) => {
    if (recommendedLesson) {
      handleLessonSelect(
        recommendedLesson.moduleIndex,
        recommendedLesson.lessonIndex,
      );
    }
  };

  return {
    currentModuleIndex,
    selectedLesson,
    currentContent,
    setCurrentModuleIndex,
    handleModuleClick,
    handleLessonSelect,
    startRecommendedLesson,
  };
};
