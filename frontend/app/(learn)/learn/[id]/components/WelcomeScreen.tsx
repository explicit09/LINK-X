import { Button } from '@/components/ui/button';
import { BookOpen, Play } from 'lucide-react';
import { Chapter } from '../types/learn.types';

interface WelcomeScreenProps {
  courseName: string | null;
  completedLessons: number;
  totalLessons: number;
  studyTime: number;
  currentStreak: number;
  recommendedLesson: { moduleIndex: number; lessonIndex: number } | null;
  chapters: Chapter[];
  onStartRecommendedLesson: () => void;
}

export const WelcomeScreen = ({
  courseName,
  completedLessons,
  totalLessons,
  studyTime,
  currentStreak,
  recommendedLesson,
  chapters,
  onStartRecommendedLesson,
}: WelcomeScreenProps) => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
          <BookOpen className="h-10 w-10 text-white" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {courseName || 'Course Materials'}
          </h1>

          {recommendedLesson ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                You&apos;ve completed{' '}
                <span className="font-semibold text-blue-600">
                  {completedLessons} of {totalLessons}
                </span>{' '}
                lessons.
              </p>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 max-w-2xl mx-auto">
                <h3 className="font-semibold text-orange-900 mb-2">
                  Today&apos;s recommended lesson:
                </h3>
                <p className="text-orange-800 mb-4">
                  <span className="font-medium">
                    {
                      chapters[recommendedLesson.moduleIndex]?.subsections[
                        recommendedLesson.lessonIndex
                      ]?.title
                    }
                  </span>
                  <span className="text-orange-600 ml-2">
                    (
                    {
                      chapters[recommendedLesson.moduleIndex]?.subsections[
                        recommendedLesson.lessonIndex
                      ]?.timeToComplete
                    }
                    m)
                  </span>
                </p>

                <Button
                  onClick={onStartRecommendedLesson}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Now
                </Button>
              </div>

              {studyTime === 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-xl mx-auto">
                  <p className="text-blue-800 text-sm">
                    💡 You&apos;re maintaining your {currentStreak}-day streak—keep
                    the momentum going!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-lg text-gray-600">
              Outstanding! You&apos;ve completed all available lessons.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
