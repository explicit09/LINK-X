'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseProgress, AchievementBadge } from '../types';

interface ProgressWidgetProps {
  courseProgress: CourseProgress;
  achievementBadges: AchievementBadge[];
}

export function ProgressWidget({
  courseProgress,
  achievementBadges,
}: ProgressWidgetProps) {
  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Your Progress</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Circular Progress Ring */}
        <div className="flex items-center gap-4">
          <div className="relative w-[90px] h-[90px]">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-gray-200"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#7B61FF] transition-all duration-300 ease-out"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${courseProgress.progressPercentage}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-[#7B61FF]">
                {courseProgress.progressPercentage}%
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">
              Course Completion
            </span>
            <p className="text-xs text-[#6B7280] mt-1">
              {courseProgress.completedMaterials} of{' '}
              {courseProgress.totalMaterials} materials completed
            </p>
          </div>
        </div>

        {/* Time Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">
              {Math.round(courseProgress.todayTimeMinutes)}m
            </div>
            <div className="text-xs text-gray-600">Today</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {Math.round((courseProgress.weeklyTimeMinutes / 60) * 10) / 10}h
            </div>
            <div className="text-xs text-gray-600">This Week</div>
          </div>
        </div>

        {/* Achievement Badges */}
        {achievementBadges.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Achievements
            </h4>
            <div className="space-y-2">
              {achievementBadges.map((badge, index) => {
                const IconComponent = badge.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg',
                      badge.color,
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{badge.label}</p>
                      <p className="text-xs opacity-75">{badge.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Milestone */}
        {courseProgress.progressPercentage < 100 && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                Next Milestone
              </span>
            </div>
            <p className="text-xs text-purple-600">
              {courseProgress.progressPercentage < 25
                ? "Complete 25% to unlock 'Getting Started' badge"
                : courseProgress.progressPercentage < 50
                  ? "Complete 50% to unlock 'Half Way There' badge"
                  : courseProgress.progressPercentage < 75
                    ? "Complete 75% to unlock 'Almost Done' badge"
                    : 'Complete 100% to finish the course!'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
