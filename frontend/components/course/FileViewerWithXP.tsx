'use client';

import React, { useEffect, useRef } from 'react';
import { FileCard } from './FileCard';
import { useContentViewXP } from '@/hooks/useXPTracking';
import { useMetrics } from '@/services/metricsService';
import { useGamification } from '@/contexts/GamificationContext';

interface FileViewerWithXPProps {
  file: {
    id: string;
    name: string;
    type: string;
    size?: number;
    processed?: boolean;
    uploadedAt?: Date;
  };
  courseId?: string;
  moduleId?: string;
  onPreview: (fileId: string) => void;
  onDownload: (fileId: string) => void;
  onPersonalize: (fileId: string) => void;
  isEven: boolean;
  className?: string;
}

export function FileViewerWithXP({
  file,
  courseId,
  moduleId,
  onPreview,
  onDownload,
  onPersonalize,
  isEven,
  className
}: FileViewerWithXPProps) {
  const { trackInteraction } = useContentViewXP(file.id, {
    courseId,
    moduleId,
    fileType: file.type,
    fileName: file.name
  });
  
  const { recordEvent, recordLearningEvent } = useMetrics({
    courseId,
    moduleId,
    fileId: file.id
  });
  
  const { awardXP } = useGamification();
  const viewStartTime = useRef<number>(0);
  const hasStarted = useRef(false);

  // Track view start
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      viewStartTime.current = Date.now();
      recordLearningEvent('start', file.id);
    }

    return () => {
      // Track view end on unmount
      if (viewStartTime.current > 0) {
        const duration = Date.now() - viewStartTime.current;
        recordEvent('file_view_duration', {
          duration,
          completed: duration > 5000 // Consider viewed if > 5 seconds
        });
        
        if (duration > 5000) {
          recordLearningEvent('complete', file.id);
        }
      }
    };
  }, [file.id, recordEvent, recordLearningEvent]);

  // Track interactions
  useEffect(() => {
    const handleScroll = () => {
      trackInteraction(); // This will trigger XP award after first interaction
      recordEvent('file_interaction', { type: 'scroll' });
    };

    const handleClick = () => {
      trackInteraction();
      recordEvent('file_interaction', { type: 'click' });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
    };
  }, [trackInteraction, recordEvent]);

  // Enhanced handlers with XP
  const handlePreview = async (fileId: string) => {
    recordEvent('file_action', { action: 'preview', fileId });
    onPreview(fileId);
  };

  const handleDownload = async (fileId: string) => {
    recordEvent('file_action', { action: 'download', fileId });
    // No XP awarded for download in simplified system
    onDownload(fileId);
  };

  const handlePersonalize = async (fileId: string) => {
    recordEvent('file_action', { action: 'personalize', fileId });
    // No XP awarded for personalization in simplified system
    onPersonalize(fileId);
  };

  return (
    <FileCard
      file={file}
      onPreview={handlePreview}
      onDownload={handleDownload}
      onPersonalize={handlePersonalize}
      isEven={isEven}
      className={className}
    />
  );
}