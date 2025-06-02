'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Zap } from 'lucide-react';

interface WeeklyProgressData {
  completedGoals: number;
  totalGoals: number;
  studyHours: number;
  aiInteractions: number;
  completionRate: number;
}

interface WeeklyProgressCardProps {
  progress: WeeklyProgressData;
  onViewProgress?: () => void;
}

/**
 * WeeklyProgressCard - Displays weekly progress metrics
 * EXTRACTED from NarrativeDashboard.tsx for modularity
 */
export const WeeklyProgressCard: React.FC<WeeklyProgressCardProps> = ({
  progress,
  onViewProgress,
}) => {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
          This Week's Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {progress.completedGoals}/{progress.totalGoals}
            </div>
            <p className="text-xs text-gray-600 flex items-center justify-center">
              <Target className="h-3 w-3 mr-1" />
              Goals
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {progress.studyHours}h
            </div>
            <p className="text-xs text-gray-600">Study Time</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {progress.aiInteractions}
            </div>
            <p className="text-xs text-gray-600 flex items-center justify-center">
              <Zap className="h-3 w-3 mr-1" />
              AI Chats
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Weekly Completion</span>
            <span>{progress.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.completionRate}%` }}
            />
          </div>
        </div>

        <Button
          onClick={onViewProgress}
          variant="outline"
          size="sm"
          className="w-full"
        >
          View Detailed Progress
        </Button>
      </CardContent>
    </Card>
  );
};