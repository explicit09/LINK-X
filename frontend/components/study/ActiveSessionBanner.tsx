'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Clock, Focus } from 'lucide-react';
import { useStudyTime } from '@/hooks/useStudyTime';

interface ActiveSessionBannerProps {
  className?: string;
  onResume?: () => void;
}

export function ActiveSessionBanner({ className, onResume }: ActiveSessionBannerProps) {
  const { activeSession } = useStudyTime('week');
  const [sessionTimer, setSessionTimer] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when session changes
  useEffect(() => {
    setDismissed(false);
  }, [activeSession?.session_id]);

  // Update timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeSession && !dismissed) {
      const updateTimer = () => {
        const startTime = new Date(activeSession.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setSessionTimer(elapsed);
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    
    return () => clearInterval(interval);
  }, [activeSession, dismissed]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  if (!activeSession || dismissed) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg",
      className
    )}>
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Clock className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <span className="font-medium">Study session in progress</span>
          </div>
          <div className="text-sm opacity-90">
            {activeSession.title || 'Study Session'} • {formatTime(sessionTimer)}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onResume}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            <Focus className="mr-1 h-3 w-3" />
            Resume
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}