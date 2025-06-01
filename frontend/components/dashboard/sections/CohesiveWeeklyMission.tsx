'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  Zap,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

interface WeeklyGoal {
  id: string;
  title: string;
  current: number;
  total: number;
  type: 'xp' | 'tasks' | 'study';
  status: 'behind' | 'on_track' | 'ahead';
}

interface CohesiveWeeklyMissionProps {
  goals?: WeeklyGoal[];
  onViewProgress?: () => void;
  onImproveProgress?: () => void;
}

const defaultGoals: WeeklyGoal[] = [
  {
    id: 'xp',
    title: 'XP Goal',
    current: 78,
    total: 150,
    type: 'xp',
    status: 'on_track',
  },
  {
    id: 'tasks',
    title: 'Tasks',
    current: 5,
    total: 8,
    type: 'tasks',
    status: 'behind',
  },
  {
    id: 'study',
    title: 'Study Time',
    current: 8.5,
    total: 12,
    type: 'study',
    status: 'on_track',
  },
];

export function CohesiveWeeklyMission({
  goals = defaultGoals,
  onViewProgress,
  onImproveProgress,
}: CohesiveWeeklyMissionProps) {
  const overallProgress =
    goals.reduce((acc, goal) => acc + goal.current / goal.total, 0) /
    goals.length;
  const behindGoals = goals.filter((g) => g.status === 'behind').length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'xp':
        return <Zap className="h-4 w-4" />;
      case 'tasks':
        return <Target className="h-4 w-4" />;
      case 'study':
        return <Clock className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'behind':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'ahead':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getProgressColor = (type: string) => {
    switch (type) {
      case 'xp':
        return 'bg-yellow-500';
      case 'tasks':
        return 'bg-blue-500';
      case 'study':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSmartCopy = (goal: WeeklyGoal) => {
    const remaining = goal.total - goal.current;
    switch (goal.type) {
      case 'xp':
        return remaining > 0
          ? `Almost there! Earn ${remaining} more XP to reach ${goal.total}`
          : `🎉 ${goal.total} XP Complete!`;
      case 'tasks':
        return remaining > 0
          ? `${goal.current}/${goal.total} Tasks Complete — ${remaining} left!`
          : `🎉 All ${goal.total} Tasks Done!`;
      case 'study':
        return remaining > 0
          ? `Almost done: ${remaining} hours left`
          : `🎉 ${goal.total} Study Hours Complete!`;
      default:
        return `${goal.current}/${goal.total}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Summary Strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1">
          🔥 {Math.round(overallProgress * 100)}% Weekly Progress
        </Badge>
        <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
          🧠 {goals.find((g) => g.type === 'tasks')?.current}/
          {goals.find((g) => g.type === 'tasks')?.total} Tasks Complete
        </Badge>
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-3 py-1">
          🎯 {goals.find((g) => g.type === 'xp')?.current}/
          {goals.find((g) => g.type === 'xp')?.total} XP
        </Badge>
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1">
          ⏳ {goals.find((g) => g.type === 'study')?.current}/
          {goals.find((g) => g.type === 'study')?.total}h Study
        </Badge>
      </div>

      {/* Unified Milestones Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              This Week's Milestones
            </h3>
            {behindGoals > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {behindGoals} Behind
              </Badge>
            )}
          </div>
        </div>

        {/* Unified Metrics Stack */}
        <div className="p-4 space-y-4">
          {goals.map((goal) => {
            const progress = (goal.current / goal.total) * 100;
            const isCompleted = goal.current >= goal.total;

            return (
              <div
                key={goal.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  goal.status === 'behind'
                    ? 'border-orange-200 bg-orange-50'
                    : isCompleted
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div
                    className={`p-2 rounded-full ${
                      goal.type === 'xp'
                        ? 'bg-yellow-100'
                        : goal.type === 'tasks'
                          ? 'bg-blue-100'
                          : 'bg-purple-100'
                    }`}
                  >
                    {getIcon(goal.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {goal.title}:
                      </span>
                      <span className="text-sm text-gray-600">
                        {goal.current}/{goal.total}{' '}
                        {goal.type === 'study'
                          ? 'Hours'
                          : goal.type === 'xp'
                            ? 'XP'
                            : 'Complete'}
                      </span>
                      {getStatusIcon(goal.status)}
                    </div>
                    <p className="text-xs text-gray-600">
                      {getSmartCopy(goal)}
                    </p>
                  </div>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-16 ml-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(goal.type)}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Integrated Action Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            {behindGoals > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onImproveProgress}
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Improve My Progress
              </Button>
            ) : (
              <div className="text-sm text-green-600 font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                You're doing great!
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onViewProgress}
              className="text-gray-600 hover:text-gray-900"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Detailed Progress
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
