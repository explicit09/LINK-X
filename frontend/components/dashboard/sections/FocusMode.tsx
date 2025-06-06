'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Focus, 
  Timer, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  Volume2,
  VolumeX 
} from 'lucide-react';

interface FocusModeProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  onStartPomodoro?: () => void;
}

export function FocusMode({ isActive, onToggle, onStartPomodoro }: FocusModeProps) {
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(time => time - 1);
      }, 1000);
    } else if (pomodoroTime === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (soundEnabled) {
        // Play completion sound (in a real app)
        console.log('Timer complete! Play sound');
      }
    }

    return () => clearInterval(interval);
  }, [isTimerRunning, pomodoroTime, soundEnabled]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setPomodoroTime(25 * 60);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
    if (!isTimerRunning && onStartPomodoro) {
      onStartPomodoro();
    }
  };

  if (!isActive) {
    return (
      <Button
        onClick={() => onToggle(true)}
        className="fixed bottom-6 right-6 z-50 shadow-lg"
        size="lg"
      >
        <Focus className="mr-2 h-5 w-5" />
        Focus Mode
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 p-8 relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={() => {
            onToggle(false);
            resetTimer();
          }}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Content */}
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Focus Mode Active</h2>
            <p className="text-muted-foreground">
              Minimize distractions and maximize productivity
            </p>
          </div>

          {/* Pomodoro Timer */}
          <div className="space-y-4">
            <div className="text-6xl font-mono font-bold text-primary">
              {formatTime(pomodoroTime)}
            </div>

            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTimer}
              >
                {isTimerRunning ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={resetTimer}
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-left">
            <p className="font-semibold mb-2">Focus Tips:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Close unnecessary tabs and apps</li>
              <li>• Put your phone on silent</li>
              <li>• Take a 5-minute break after each session</li>
              <li>• Stay hydrated</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}