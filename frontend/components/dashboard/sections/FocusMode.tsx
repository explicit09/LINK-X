"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Timer, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FocusModeProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  onStartPomodoro?: () => void;
}

export function FocusMode({ isActive, onToggle, onStartPomodoro }: FocusModeProps) {
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<"work" | "break">("work");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime((time) => time - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      // Session complete
      setIsRunning(false);
      if (sessionType === "work") {
        setPomodoroTime(5 * 60); // 5 min break
        setSessionType("break");
      } else {
        setPomodoroTime(25 * 60); // 25 min work
        setSessionType("work");
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, pomodoroTime, sessionType]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
    onStartPomodoro?.();
  };

  const handleReset = () => {
    setIsRunning(false);
    setPomodoroTime(25 * 60);
    setSessionType("work");
  };

  if (!isActive) {
    return (
      <Button
        onClick={() => onToggle(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-6 right-6 z-50 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-lg"
      >
        <Eye className="h-4 w-4 mr-2" />
        Focus Mode
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
      {/* Focus Mode Overlay */}
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Focus Mode</h2>
            <Button
              onClick={() => onToggle(false)}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>

          {/* Pomodoro Timer */}
          <div className="space-y-4">
            <div className="relative">
              <div className="w-32 h-32 mx-auto rounded-full border-8 border-gray-200 flex items-center justify-center relative">
                <div 
                  className={cn(
                    "absolute inset-0 rounded-full border-8 border-transparent transition-all duration-1000",
                    sessionType === "work" ? "border-t-blue-600" : "border-t-green-600"
                  )}
                  style={{
                    transform: `rotate(${((sessionType === "work" ? 25 * 60 : 5 * 60) - pomodoroTime) / (sessionType === "work" ? 25 * 60 : 5 * 60) * 360}deg)`
                  }}
                />
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-gray-900">
                    {formatTime(pomodoroTime)}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {sessionType}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                onClick={handleStartPause}
                className={cn(
                  "w-12 h-12 rounded-full",
                  sessionType === "work" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
                )}
              >
                {isRunning ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white ml-0.5" />
                )}
              </Button>
              
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="w-10 h-10 rounded-full"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current Priority */}
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Current Priority</h3>
            <div className="text-sm text-gray-600">
              <div className="font-medium">CS229 Neural Networks Assignment</div>
              <div className="text-xs text-gray-500 mt-1">
                Due today • 20 minutes remaining
              </div>
            </div>
          </div>

          {/* Session Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">3</div>
              <div className="text-xs text-gray-500">Sessions Today</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">1h 15m</div>
              <div className="text-xs text-gray-500">Focus Time</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">5</div>
              <div className="text-xs text-gray-500">Day Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}