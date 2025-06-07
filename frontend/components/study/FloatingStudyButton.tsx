'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudyTime } from '@/hooks/useStudyTime';
import { cn } from '@/lib/utils';

interface FloatingStudyButtonProps {
  className?: string;
}

export function FloatingStudyButton({ className }: FloatingStudyButtonProps) {
  const { activeSession, startSession, endSession } = useStudyTime('week');
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);

  // Timer effect
  React.useEffect(() => {
    if (!activeSession) {
      setSessionTimer(0);
      return;
    }

    const startTime = new Date(activeSession.started_at).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setSessionTimer(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = async () => {
    if (activeSession) {
      // End session
      if (sessionTimer >= 60) {
        await endSession();
      } else {
        setIsExpanded(true);
      }
    } else {
      // Start session
      await startSession();
    }
  };

  const handleForceEnd = async () => {
    await endSession();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className={cn(
          "fixed bottom-6 right-6 z-50",
          className
        )}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Button
          onClick={handleToggle}
          size="lg"
          className={cn(
            "rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
            activeSession 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "bg-blue-500 hover:bg-blue-600 text-white"
          )}
        >
          {activeSession ? (
            <>
              <Pause className="h-5 w-5 mr-2" />
              {formatTime(sessionTimer)}
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Study
            </>
          )}
        </Button>

        {/* Pulse animation when active */}
        {activeSession && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-400"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        )}
      </motion.div>

      {/* Expanded Warning Dialog */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              className="bg-white rounded-lg p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 text-yellow-500 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold">Session Too Short</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Study for at least 1 minute to earn XP and save your progress.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Current time: {formatTime(sessionTimer)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsExpanded(false)}
                  >
                    Continue Studying
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleForceEnd}
                  >
                    End Anyway
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}