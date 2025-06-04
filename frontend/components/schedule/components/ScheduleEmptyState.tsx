/**
 * Schedule Empty State Component
 * Reusable empty state for when no sessions are available
 */

interface ScheduleEmptyStateProps {
  userCoursesCount: number;
  onBrowseCourses?: () => void;
  onCreateSession?: () => void;
}

export function ScheduleEmptyState({ 
  userCoursesCount, 
  onBrowseCourses,
  onCreateSession 
}: ScheduleEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center p-6">
      {/* Compelling Value Prop */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Lock 25 min now → finish assignments faster
        </h1>
        <p className="text-lg text-gray-600 max-w-lg">
          Students using focused time blocks complete tasks 40% faster and get better grades.
        </p>
      </div>

      {/* Primary CTA - HUGE and unmissable */}
      <div className="mb-6">
        {userCoursesCount === 0 ? (
          <button 
            onClick={onBrowseCourses || (() => window.location.href = '/my-courses')}
            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-xl"
          >
            🚀 Get Started - Add Your First Course
          </button>
        ) : (
          <button 
            onClick={onCreateSession}
            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-xl"
          >
            🎯 Start 25-Min Focus Session
          </button>
        )}
      </div>

      {/* Social Proof / Urgency */}
      <div className="text-sm text-gray-500 mb-4">
        <span className="inline-flex items-center gap-2">
          <div className="flex -space-x-1">
            <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
            <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
            <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-white"></div>
          </div>
          <span>Join 2,847+ students already using LEARN-X</span>
        </span>
      </div>

      {/* Quick wins preview */}
      <div className="grid grid-cols-3 gap-4 mt-6 text-center">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl mb-1">⚡</div>
          <div className="text-xs font-medium text-blue-700">Instant Focus</div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl mb-1">📈</div>
          <div className="text-xs font-medium text-green-700">Track Progress</div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-xs font-medium text-purple-700">Earn XP</div>
        </div>
      </div>
    </div>
  );
}