'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Star, Zap, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskCompletion {
  id: string;
  taskName: string;
  timeSpent: number;
  xpGained: number;
  achievementUnlocked?: {
    title: string;
    description: string;
    icon: string;
  };
  performanceBoost?: number;
  streakIncreased?: boolean;
}

interface TaskCompletionFeedbackProps {
  completion?: TaskCompletion | null;
  onClose?: () => void;
  onViewProgress?: () => void;
}

export function TaskCompletionFeedback({
  completion,
  onClose,
  onViewProgress,
}: TaskCompletionFeedbackProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpAnimated, setXpAnimated] = useState(false);

  useEffect(() => {
    if (completion) {
      setShowConfetti(true);
      setTimeout(() => setXpAnimated(true), 300);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, [completion]);

  if (!completion) return null;

  return (
    <>
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 animate-pulse">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completion Modal */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute -top-2 -right-2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Task Completed! 🎉
              </h2>
              <p className="text-gray-600">{completion.taskName}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-700">
                  {completion.timeSpent}m
                </div>
                <div className="text-xs text-blue-600">Time Spent</div>
              </div>

              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div
                  className={cn(
                    'text-lg font-bold text-green-700 transition-all duration-500',
                    xpAnimated && 'animate-pulse',
                  )}
                >
                  +{completion.xpGained} XP
                </div>
                <div className="text-xs text-green-600">Experience Gained</div>
              </div>
            </div>

            {/* Achievement Unlocked */}
            {completion.achievementUnlocked && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {completion.achievementUnlocked.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-yellow-800">
                      Achievement Unlocked!
                    </h3>
                    <p className="text-sm text-yellow-700">
                      {completion.achievementUnlocked.title}
                    </p>
                    <p className="text-xs text-yellow-600">
                      {completion.achievementUnlocked.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Boost */}
            {completion.performanceBoost && (
              <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">
                      Performance Boost
                    </span>
                  </div>
                  <span className="text-sm font-bold text-purple-700">
                    +{completion.performanceBoost}%
                  </span>
                </div>
              </div>
            )}

            {/* Streak Increased */}
            {completion.streakIncreased && (
              <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-medium text-orange-700">
                    Daily streak increased!
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onViewProgress}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Trophy className="h-4 w-4 mr-2" />
                View Progress Dashboard
              </Button>

              <Button onClick={onClose} variant="outline" className="w-full">
                Continue Learning
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
