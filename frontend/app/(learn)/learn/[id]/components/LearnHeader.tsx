import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Menu, CheckCircle2, Clock, Flame } from "lucide-react";
import { Chapter, Subsection } from '../types/learn.types';

interface LearnHeaderProps {
  courseName: string | null;
  currentModule: Chapter | null;
  currentLesson: Subsection | null;
  completedLessons: number;
  totalLessons: number;
  studyTime: number;
  currentStreak: number;
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
}

export const LearnHeader = ({
  courseName,
  currentModule,
  currentLesson,
  completedLessons,
  totalLessons,
  studyTime,
  currentStreak,
  sidebarVisible,
  setSidebarVisible
}: LearnHeaderProps) => {
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4">
        {/* Navigation & Context */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-900 flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            {/* Dynamic Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="font-semibold text-gray-900">{courseName || "Loading..."}</span>
              {currentModule && (
                <>
                  <span className="text-gray-400">›</span>
                  <span className="text-gray-700">{currentModule.chapterTitle}</span>
                </>
              )}
              {currentLesson && (
                <>
                  <span className="text-gray-400">›</span>
                  <span className="font-medium text-blue-600">{currentLesson.title}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Unified Metrics */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-gray-900">{completedLessons}/{totalLessons}</span>
              <span className="text-gray-600">lessons</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-gray-900">{studyTime}m</span>
              <span className="text-gray-600">today</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Flame className="h-4 w-4 text-orange-600" />
              <span className="font-semibold text-gray-900">{currentStreak}-day</span>
              <span className="text-gray-600">streak</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Progress value={progressPercentage} className="w-24 h-2" />
              <span className="text-sm font-semibold text-gray-900">{Math.round(progressPercentage)}%</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};