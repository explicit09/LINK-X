import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCourseContext } from '../context/CourseContext';

export function useCourseUIState() {
  const searchParams = useSearchParams();
  const { state } = useCourseContext();

  // UI state
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Get active tab from URL or state
  const activeTab = searchParams?.get('tab') || state.activeTab || 'home';

  return {
    isCollapsed,
    setIsCollapsed,
    isFocusMode,
    setIsFocusMode,
    activeTab,
  };
}
