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
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToCourse}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>

          <div className="flex items-center space-x-4">
            {/* Performance Metrics Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Activity className="w-4 h-4 mr-2" />
              Metrics
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Level & XP Section */}
          <div className="lg:col-span-3">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center border-2 border-yellow-300">
                  <Star className="w-6 h-6 text-yellow-300" />
                </div>
                {showXPAnimation && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
                    +{lastXPGain}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm opacity-90">Level {userLevel}</div>
                <div className="text-xl font-bold">
                  {userXP.toLocaleString()} XP
                </div>
              </div>
            </div>
            <div className="mt-2">
              <Progress value={levelProgress} className="h-2 bg-white/20" />
              <div className="text-xs opacity-75 mt-1">
                {Math.round(levelProgress)}% to Level {userLevel + 1}
              </div>
            </div>
          </div>

          {/* Streak Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-orange-300" />
              <div>
                <div className="text-sm opacity-90">Streak</div>
                <div className="text-lg font-bold">{streak} days</div>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="lg:col-span-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-green-300" />
                <span className="text-sm opacity-90">
                  Learning Progress: {completedCount}/{totalSections} sections
                </span>
              </div>
              <Progress value={progress} className="h-3 bg-white/20" />
              <div className="text-xs opacity-75 mt-1">
                {Math.round(progress)}% Complete
              </div>
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-end space-x-2">
              <div className="text-sm opacity-90">Recent:</div>
              <div className="flex space-x-1">
                {recentAchievements.length > 0 ? (
                  recentAchievements.map((achievement) => (
                    <TooltipProvider key={achievement.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="bg-yellow-400/20 text-yellow-300 border-yellow-300/50 text-lg px-2 py-1"
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
                  <div className="text-xs opacity-60">No achievements yet</div>
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 p-1"
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
          </div>
        </div>
      </div>
    </div>
  );
}
