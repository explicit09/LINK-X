import { useState, useEffect } from 'react';

export const useResponsiveLayout = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(
    null,
  );
  const [selectedLesson, setSelectedLesson] = useState<{
    moduleIndex: number;
    lessonIndex: number;
  } | null>(null);

  // Auto-hide sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleModuleClick = (moduleIndex: number) => {
    if (currentModuleIndex === moduleIndex) {
      setCurrentModuleIndex(null);
      setSelectedLesson(null);
    } else {
      setCurrentModuleIndex(moduleIndex);
      setSelectedLesson(null);
    }
  };

  const handleLessonSelect = (moduleIndex: number, lessonIndex: number) => {
    setSelectedLesson({ moduleIndex, lessonIndex });
    setCurrentModuleIndex(moduleIndex);
  };

  return {
    sidebarVisible,
    currentModuleIndex,
    selectedLesson,
    setSidebarVisible,
    setCurrentModuleIndex,
    setSelectedLesson,
    handleModuleClick,
    handleLessonSelect,
  };
};
