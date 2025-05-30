import { useState, useEffect } from 'react';

export const useProgressTracking = () => {
  const [studyTime, setStudyTime] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(3);
  const [recommendedLesson, setRecommendedLesson] = useState<{ moduleIndex: number; lessonIndex: number } | null>(null);

  // Study time tracking
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setStudyTime(Math.floor((Date.now() - startTime) / 1000 / 60) + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const setRecommendedLessonData = (moduleIndex: number, lessonIndex: number) => {
    setRecommendedLesson({ moduleIndex, lessonIndex });
  };

  return {
    studyTime,
    currentStreak,
    recommendedLesson,
    setRecommendedLessonData
  };
};