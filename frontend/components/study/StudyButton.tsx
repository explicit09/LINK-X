'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Focus, Clock } from 'lucide-react';
import { UnifiedStudyMode } from './UnifiedStudyMode';
import { useStudyTime } from '@/hooks/useStudyTime';

interface StudyButtonProps {
  courseId?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function StudyButton({ 
  courseId, 
  className,
  variant = 'default',
  size = 'default'
}: StudyButtonProps) {
  const [showStudyMode, setShowStudyMode] = useState(false);
  const { activeSession } = useStudyTime('week');
  const [sessionTimer, setSessionTimer] = useState(0);

  // Update timer if there's an active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeSession) {
      const updateTimer = () => {
        const startTime = new Date(activeSession.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setSessionTimer(elapsed);
      };
      
      updateTimer(); // Initial update
      interval = setInterval(updateTimer, 1000);
    }
    
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Button
        onClick={() => setShowStudyMode(true)}
        variant={variant}
        size={size}
        className={cn(
          variant === 'default' && !activeSession && "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
          activeSession && "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
          className
        )}
      >
        {activeSession ? (
          <>
            <Clock className="mr-2 h-4 w-4" />
            Resume ({formatTime(sessionTimer)})
          </>
        ) : (
          <>
            <Focus className="mr-2 h-4 w-4" />
            Start Studying
          </>
        )}
      </Button>
      
      {activeSession && (
        <Badge 
          variant="outline" 
          className="ml-2 border-green-500 text-green-700"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
          Active
        </Badge>
      )}
      
      {showStudyMode && (
        <UnifiedStudyMode courseId={courseId} />
      )}
    </>
  );
}