import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  HelpCircle,
  Timer,
  Star,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Chapter } from '../types/streaming.types';

interface CourseNavigationSidebarProps {
  chapters: Chapter[];
  currentModuleIndex: number | null;
  selectedLesson: { moduleIndex: number; lessonIndex: number } | null;
  recommendedLesson: { moduleIndex: number; lessonIndex: number } | null;
  onModuleClick: (moduleIndex: number) => void;
  onLessonSelect: (moduleIndex: number, lessonIndex: number) => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'video':
      return Video;
    case 'quiz':
      return HelpCircle;
    default:
      return FileText;
  }
};

export const CourseNavigationSidebar = ({
  chapters,
  currentModuleIndex,
  selectedLesson,
  recommendedLesson,
  onModuleClick,
  onLessonSelect,
}: CourseNavigationSidebarProps) => {
  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto relative">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
          Course Modules
        </h2>

        {/* Collapsed Module List */}
        <div className="space-y-2">
          {chapters.map((chapter, moduleIndex) => (
            <div key={moduleIndex} className="relative">
              {/* Module Header */}
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-200 border',
                  currentModuleIndex === moduleIndex
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-sm',
                )}
                onClick={() => onModuleClick(moduleIndex)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle
                        className={cn(
                          'text-sm font-semibold leading-tight line-clamp-2',
                          currentModuleIndex === moduleIndex
                            ? 'text-blue-900'
                            : 'text-gray-900',
                        )}
                      >
                        {chapter.title}
                      </CardTitle>
                      <div className="flex items-center space-x-3 mt-2">
                        <span
                          className={cn(
                            'text-xs',
                            currentModuleIndex === moduleIndex
                              ? 'text-blue-700'
                              : 'text-gray-600',
                          )}
                        >
                          {chapter.subsections.length} lessons
                        </span>
                        <div className="flex items-center space-x-1">
                          <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all duration-300',
                                currentModuleIndex === moduleIndex
                                  ? 'bg-blue-600'
                                  : 'bg-gray-400',
                              )}
                              style={{ width: `${chapter.progress || 0}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              'text-xs font-medium',
                              currentModuleIndex === moduleIndex
                                ? 'text-blue-700'
                                : 'text-gray-600',
                            )}
                          >
                            {chapter.progress || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {currentModuleIndex === moduleIndex ? (
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Expanded Lessons - Directly Under Module */}
              {currentModuleIndex === moduleIndex && (
                <div className="mt-2 ml-4 space-y-2">
                  {chapter.subsections.map((lesson, lessonIndex) => {
                    const TypeIcon = getTypeIcon(lesson.type || 'text');
                    const isSelected =
                      selectedLesson?.moduleIndex === moduleIndex &&
                      selectedLesson?.lessonIndex === lessonIndex;
                    const isRecommended =
                      recommendedLesson?.moduleIndex === moduleIndex &&
                      recommendedLesson?.lessonIndex === lessonIndex;

                    return (
                      <Card
                        key={lessonIndex}
                        className={cn(
                          'cursor-pointer border transition-all duration-200 group relative overflow-hidden',
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                            : lesson.completed
                              ? 'border-green-200 bg-green-50 hover:shadow-md hover:scale-102'
                              : isRecommended
                                ? 'border-orange-300 bg-orange-50 hover:shadow-md ring-2 ring-orange-200'
                                : 'border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-102',
                        )}
                        onClick={() => onLessonSelect(moduleIndex, lessonIndex)}
                      >
                        {isRecommended && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
                          </div>
                        )}

                        <CardContent className="p-0">
                          <div className="p-4">
                            <div className="flex items-center space-x-3">
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-xl flex items-center justify-center relative transition-all duration-200',
                                  lesson.completed
                                    ? 'bg-green-500 text-white shadow-lg'
                                    : isSelected
                                      ? 'bg-blue-500 text-white shadow-lg'
                                      : isRecommended
                                        ? 'bg-orange-500 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:shadow-md',
                                )}
                              >
                                {lesson.isLoading || lesson.isStreaming ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : lesson.completed ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <TypeIcon className="h-4 w-4" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4
                                  className={cn(
                                    'font-semibold text-sm leading-tight line-clamp-2 mb-2',
                                    isSelected
                                      ? 'text-blue-900'
                                      : 'text-gray-900',
                                  )}
                                >
                                  {lesson.title}
                                </h4>

                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                                    <Timer className="h-3 w-3" />
                                    <span className="font-medium">
                                      {lesson.timeToComplete || 5}m
                                    </span>
                                  </div>

                                  {lesson.score && (
                                    <div className="flex items-center space-x-1 text-xs text-blue-600">
                                      <Star className="h-3 w-3" />
                                      <span className="font-medium">
                                        {lesson.score}%
                                      </span>
                                    </div>
                                  )}

                                  {lesson.lastVisited && (
                                    <span className="text-xs text-gray-500 font-medium">
                                      {lesson.lastVisited}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
