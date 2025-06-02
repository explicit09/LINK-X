'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  TrendingUp, 
  Search,
  Settings,
  Share2,
  Download 
} from 'lucide-react';
import { toast } from 'sonner';

interface CourseData {
  id: string;
  title: string;
  code: string;
  instructor: string;
  progress: number;
  nextDeadline: string;
  studyTime: string;
  weeklyStudyTime: number;
  targetStudyTime: number;
  rank: string;
  previousRank: number;
  grade: string;
  previousGrade: string;
  color: string;
  urgentTasks: number;
  completionStreak: number;
  efficiency: number;
  lastActivity: string;
}

interface WeeklyStats {
  streakDays: number;
  efficiencyTrend: string;
  studyTimeProgress: number;
}

interface CourseHeaderProps {
  course: CourseData;
  weeklyStats: WeeklyStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function CourseHeader({ 
  course, 
  weeklyStats, 
  searchQuery, 
  onSearchChange 
}: CourseHeaderProps) {
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'share_course':
        toast.success('Course shared with study group!');
        break;
      case 'download_materials':
        toast.success('Downloading all course materials...');
        break;
      case 'course_settings':
        toast.info('Course settings opened');
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  return (
    <div className="mb-4">
      {/* Compact Course Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-2 h-6 rounded-full bg-blue-500" />
            {course.title}
            {course.urgentTasks > 0 && (
              <Badge
                variant="destructive"
                className="animate-pulse urgent-pulse"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {course.urgentTasks} URGENT
              </Badge>
            )}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-gray-600">
              {course.instructor} • {course.studyTime}
            </span>
            <span className="text-gray-600 flex items-center gap-1">
              {course.rank}
              {course.previousRank > parseInt(course.rank.split('#')[1]) && (
                <TrendingUp className="h-3 w-3 text-green-600" />
              )}
            </span>
            <span className="text-xs text-gray-500">
              Active {course.lastActivity}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={`${
              course.grade > course.previousGrade 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {course.grade}
            {course.grade > course.previousGrade && (
              <TrendingUp className="h-3 w-3 ml-1" />
            )}
          </Badge>
          <Badge
            className="bg-orange-100 text-orange-800 hover:animate-wiggle cursor-pointer"
            onClick={() =>
              toast.success('Streak protected! Keep going for bonus XP')
            }
          >
            🔥 {weeklyStats.streakDays}-day streak
          </Badge>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-8"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAction('share_course')}
              className="text-gray-600 hover:text-gray-900"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAction('download_materials')}
              className="text-gray-600 hover:text-gray-900"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAction('course_settings')}
              className="text-gray-600 hover:text-gray-900"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}