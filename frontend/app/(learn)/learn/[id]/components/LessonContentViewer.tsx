import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Timer, Star, Clock } from 'lucide-react';
import { Subsection } from '../types/streaming.types';
import { ContentSkeleton } from './ui/ContentSkeleton';
import { BlinkingCursor } from './ui/BlinkingCursor';

interface LessonContentViewerProps {
  currentLesson: Subsection | null;
}

export const LessonContentViewer = ({
  currentLesson,
}: LessonContentViewerProps) => {
  if (!currentLesson) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-8">
        {/* Lesson Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {currentLesson.title}
          </h1>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Timer className="h-4 w-4" />
              <span>{currentLesson.timeToComplete || 5} minutes</span>
            </div>

            {currentLesson.score && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4" />
                <span>Your best: {currentLesson.score}%</span>
              </div>
            )}

            {currentLesson.lastVisited && (
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
            {currentLesson.isLoading ? (
              <ContentSkeleton />
            ) : currentLesson.content ? (
              <div className="whitespace-pre-wrap">
                {currentLesson.content}
                {currentLesson.isStreaming && <BlinkingCursor />}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading content...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
