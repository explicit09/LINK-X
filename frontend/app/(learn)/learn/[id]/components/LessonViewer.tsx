import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Timer, Star, Clock } from 'lucide-react';
import { Subsection } from '../types/learn.types';

interface LessonViewerProps {
  currentLesson: Subsection | null;
  currentContent: string | null;
}

export const LessonViewer = ({
  currentLesson,
  currentContent,
}: LessonViewerProps) => {
  return (
    <div className="space-y-8">
      <div className="space-y-8">
        {/* Lesson Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {currentLesson?.title}
          </h1>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Timer className="h-4 w-4" />
              <span>{currentLesson?.timeToComplete} minutes</span>
            </div>

            {currentLesson?.score && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4" />
                <span>Your best: {currentLesson.score}%</span>
              </div>
            )}

            {currentLesson?.lastVisited && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Last visited {currentLesson.lastVisited}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lesson Content */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
          <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
            {currentContent ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: currentContent.replace(/\n/g, '<br />'),
                }}
              />
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Select a lesson to begin learning
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
