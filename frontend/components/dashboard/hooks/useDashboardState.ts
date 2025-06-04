import { useState, useEffect } from 'react';

export const useDashboardState = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPulse, setAiPulse] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);

  // Add pulse animation for AI section
  useEffect(() => {
    const interval = setInterval(() => {
      setAiPulse(true);
      setTimeout(() => setAiPulse(false), 2000);
    }, 8000); // Pulse every 8 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    isCollapsed,
    searchQuery,
    aiPulse,
    showCourseForm,
    showAccessCodeDialog,
    setIsCollapsed,
    setSearchQuery,
    setAiPulse,
    setShowCourseForm,
    setShowAccessCodeDialog,
  };
};
