'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Trophy,
  Target,
  Zap,
  Brain,
  Calendar,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

interface CourseData {
  id: string;
  title: string;
  progress: number;
  weeklyStudyTime: number;
  targetStudyTime: number;
  efficiency: number;
  completionStreak: number;
  urgentTasks: number;
}

interface WeeklyStats {
  streakDays: number;
  efficiencyTrend: string;
  studyTimeProgress: number;
}

interface ProgressDashboardProps {
  course: CourseData;
  weeklyStats: WeeklyStats;
  onShowInsights: () => void;
  onShowWeakAreas: () => void;
  onShowEfficiency: () => void;
  onShowSchedule: () => void;
}

export function ProgressDashboard({
  course,
  weeklyStats,
  onShowInsights,
  onShowWeakAreas,
  onShowEfficiency,
  onShowSchedule,
}: ProgressDashboardProps) {
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'view_insights':
        onShowInsights();
        break;
      case 'weak_areas':
        onShowWeakAreas();
        break;
      case 'efficiency_tips':
        onShowEfficiency();
        break;
      case 'smart_schedule':
        onShowSchedule();
        break;
      case 'ai_help':
        toast.success('AI Tutor activated! Ask me anything about the course.');
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  // Calculate smart recommendations
  const getSmartTiles = () => {
    const tiles = [];

    // Efficiency tile (always show if below 80%)
    if (course.efficiency < 80) {
      const efficiencyDetail = 
        course.efficiency < 60 
          ? 'Major improvements possible'
          : course.efficiency < 80 
            ? 'Some optimization opportunities' 
            : 'Minor tweaks available';

      tiles.push({
        title: `${course.efficiency}% Study Efficiency`,
        detail: efficiencyDetail,
        gradient: 'from-blue-50 to-blue-100',
        border: 'border-blue-200',
        textColor: 'text-blue-800',
        detailColor: 'text-blue-600',
        icon: Zap,
        iconColor: 'text-blue-600',
        action: 'efficiency_tips',
      });
    }

    // Study time progress tile
    const studyProgress = (course.weeklyStudyTime / course.targetStudyTime) * 100;
    if (studyProgress < 90) {
      const timeDetail = 
        studyProgress < 50 
          ? 'Significantly behind target'
          : studyProgress < 80 
            ? 'Slightly behind schedule' 
            : 'Almost on track';

      tiles.push({
        title: `${course.weeklyStudyTime}h / ${course.targetStudyTime}h This Week`,
        detail: timeDetail,
        gradient: 'from-orange-50 to-orange-100',
        border: 'border-orange-200',
        textColor: 'text-orange-800',
        detailColor: 'text-orange-600',
        icon: Clock,
        iconColor: 'text-orange-600',
        action: 'smart_schedule',
      });
    }

    // Weak areas tile (if there are any)
    tiles.push({
      title: 'Weak Areas Detected',
      detail: 'Review recommendations available',
      gradient: 'from-red-50 to-red-100',
      border: 'border-red-200',
      textColor: 'text-red-800',
      detailColor: 'text-red-600',
      icon: Target,
      iconColor: 'text-red-600',
      action: 'weak_areas',
    });

    // AI tutor tile
    const tutorDetail = 'Ask questions, get explanations';
    tiles.push({
      title: 'AI Tutor Available',
      detail: tutorDetail,
      gradient: 'from-purple-50 to-purple-100',
      border: 'border-purple-200',
      textColor: 'text-purple-800',
      detailColor: 'text-purple-600',
      icon: Brain,
      iconColor: 'text-purple-600',
      action: 'ai_help',
    });

    return tiles.slice(0, 4); // Always show exactly 4 tiles
  };

  const smartTiles = getSmartTiles();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Course Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">{course.progress}%</span>
              </div>
              <Progress value={course.progress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {course.weeklyStudyTime}h
                </div>
                <div className="text-xs text-gray-500">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {course.efficiency}%
                </div>
                <div className="text-xs text-gray-500">Efficiency</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Action Tiles */}
      <div className="grid grid-cols-2 gap-4">
        {smartTiles.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <Card
              key={index}
              className={`cursor-pointer transition-all hover:shadow-lg ${tile.border} ${tile.gradient} breathe-10s`}
              onClick={() => handleQuickAction(tile.action)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`h-4 w-4 ${tile.iconColor}`} />
                  <div className={`font-medium text-sm ${tile.textColor}`}>
                    {tile.title}
                  </div>
                </div>
                <div className={`text-xs ${tile.detailColor}`}>
                  {tile.detail}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Weekly Stats Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="font-medium text-green-800">
                  {weeklyStats.streakDays}-day learning streak!
                </div>
                <div className="text-sm text-green-600">
                  {weeklyStats.efficiencyTrend} efficiency trend
                </div>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleQuickAction('view_insights')}
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              View Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}