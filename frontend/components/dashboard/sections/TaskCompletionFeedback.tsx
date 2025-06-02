'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, X, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCompletionFeedbackProps {
  completion?: {
    title: string;
    xpEarned: number;
    message?: string;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
      <Card className="relative max-w-md w-full mx-4 p-6 bg-white shadow-2xl animate-in slide-in-from-bottom-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="text-center space-y-4">
          <div className="relative">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <Trophy className="h-8 w-8 text-yellow-500 absolute -bottom-2 -right-2 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900">{completion.title}</h3>
            {completion.message && (
              <p className="text-gray-600">{completion.message}</p>
            )}
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold text-purple-700">
                +{completion.xpEarned} XP
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Continue
            </Button>
            <Button
              onClick={onViewProgress}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              View Progress
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}