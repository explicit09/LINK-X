import { useState, useEffect } from 'react';
import { Chapter } from '../types';
import { fetchChapters } from '../services/api';
import { useIsMobile } from '@/hooks/use-mobile';

export const useSidebar = (courseId?: string, pfId?: string, onCollapseChange?: (value: boolean) => void) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    if (isMobile) setCollapsed(true);

    const loadChapters = async () => {
      const loadedChapters = await fetchChapters(courseId, pfId);
      setChapters(loadedChapters);
    };

    loadChapters();
  }, [isMobile, courseId, pfId]);

  const toggleSidebar = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    onCollapseChange?.(newValue);
  };

  const handleLessonSelect = (title: string) => {
    setSelectedLesson(title);
    setCompletedLessons(prev => new Set([...prev, title]));
  };

  const totalLessons = chapters.reduce((acc, chapter) => acc + chapter.subsections.length, 0);
  const progressPercentage = totalLessons > 0 ? (completedLessons.size / totalLessons) * 100 : 0;

  return {
    collapsed,
    mounted,
    chapters,
    selectedLesson,
    completedLessons,
    totalLessons,
    progressPercentage,
    toggleSidebar,
    handleLessonSelect
  };
};