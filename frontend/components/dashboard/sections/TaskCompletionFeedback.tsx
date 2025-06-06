'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, X, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCompletionFeedbackProps {
  completion?: {
    title: string;
    xpEarned: number;
    streakBonus?: number;
    achievement?: string;
  } | null;
  onClose: () => void;
  onViewProgress: () => void;
}

export function TaskCompletionFeedback({ 
  completion, 
  onClose, 
  onViewProgress 
}: TaskCompletionFeedbackProps) {
  if (!completion) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
        <CardContent className="p-8 relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Success Animation */}
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                <Trophy className="h-12 w-12 text-white" />
              </div>
              {/* Sparkles */}
              <Star className="absolute top-0 left-1/4 h-6 w-6 text-yellow-400 animate-pulse" />
              <Star className="absolute bottom-0 right-1/4 h-5 w-5 text-orange-400 animate-pulse delay-150" />
            </div>

            {/* Content */}
            <div>
              <h2 className="text-2xl font-bold mb-2">Task Complete!</h2>
              <p className="text-muted-foreground">{completion.title}</p>
            </div>

            {/* XP Earned */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">XP Earned</span>
                <span className="text-lg font-bold text-primary">+{completion.xpEarned}</span>
              </div>
              {completion.streakBonus && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Streak Bonus</span>
                  <span className="text-lg font-bold text-orange-600">+{completion.streakBonus}</span>
                </div>
              )}
            </div>

            {/* Achievement */}
            {completion.achievement && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800">
                  🏆 Achievement Unlocked: {completion.achievement}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onClose}
              >
                Continue Learning
              </Button>
              <Button 
                className="flex-1"
                onClick={onViewProgress}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                View Progress
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}