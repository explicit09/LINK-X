import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Trophy,
  Flame,
  Star,
  Zap,
  Target,
  Award,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface GamificationTopBarProps {
  userXP: number;
  userLevel: number;
  streak: number;
  levelProgress: number;
  showXPAnimation: boolean;
  lastXPGain: number;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }>;
  totalSections: number;
  completedCount: number;
  progress: number;
  courseId?: string | null;
}

export function GamificationTopBar({
  userXP,
  userLevel,
  streak,
  levelProgress,
  showXPAnimation,
  lastXPGain,
  achievements,
  totalSections,
  completedCount,
  progress,
  courseId,
}: GamificationTopBarProps) {
  const router = useRouter();

  const recentAchievements = achievements.filter((a) => a.unlocked).slice(-3);

  const handleBackToCourse = () => {
    if (courseId) {
      router.push(`/courses/${courseId}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackToCourse}
          className="text-gray-700 border-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Course
        </Button>

        <div className="flex items-center space-x-3">
          <h1 className="text-[20px] font-semibold text-gray-900">AI Learning Session</h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Performance Metrics Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="text-gray-700 border-gray-300"
          >
            <Activity className="w-4 h-4 mr-2" />
            Metrics
          </Button>
        </div>
      </div>

      {/* Metrics Grid - v2 style */}
      <div className="grid grid-cols-4 gap-4">
        {/* Level & XP */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-indigo-600" />
              </div>
              {showXPAnimation && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-bounce">
                  +{lastXPGain}
                </div>
              )}
            </div>
            <div>
              <div className="text-[14px] font-medium text-gray-700">Level {userLevel}</div>
              <div className="text-[16px] font-semibold text-gray-900">
                {userXP.toLocaleString()} XP
              </div>
            </div>
          </div>
          <Progress value={levelProgress} className="h-2" />
          <div className="text-[12px] text-gray-600 mt-1">
            {Math.round(levelProgress)}% to Level {userLevel + 1}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-[14px] font-medium text-gray-700">Streak</div>
              <div className="text-[16px] font-semibold text-gray-900">{streak} days</div>
            </div>
          </div>
        </div>

        {/* Learning Progress */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-[14px] font-medium text-gray-700">Progress</div>
              <div className="text-[16px] font-semibold text-gray-900">
                {completedCount}/{totalSections}
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-[12px] text-gray-600 mt-1">
            {Math.round(progress)}% Complete
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[14px] font-medium text-gray-700">Achievements</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-600 hover:text-gray-900"
                  >
                    <Trophy className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <h4 className="font-semibold mb-2">All Achievements</h4>
                    <div className="space-y-1">
                      {achievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          className={cn(
                            'flex items-center space-x-2 text-xs p-1 rounded',
                            achievement.unlocked
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600',
                          )}
                        >
                          <span>{achievement.icon}</span>
                          <div>
                            <div className="font-medium">
                              {achievement.name}
                            </div>
                            <div className="opacity-75">
                              {achievement.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex space-x-1">
            {recentAchievements.length > 0 ? (
              recentAchievements.map((achievement) => (
                <TooltipProvider key={achievement.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-700 border-yellow-200 text-sm px-1.5 py-0.5"
                      >
                        {achievement.icon}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <div className="font-semibold">
                          {achievement.name}
                        </div>
                        <div className="text-xs opacity-75">
                          {achievement.description}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))
            ) : (
              <div className="text-[12px] text-gray-500">No achievements yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
