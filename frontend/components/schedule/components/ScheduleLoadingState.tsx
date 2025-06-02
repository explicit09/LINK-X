/**
 * Schedule Loading State Component
 * Reusable loading spinner for schedule views
 */

interface ScheduleLoadingStateProps {
  message?: string;
  className?: string;
}

export function ScheduleLoadingState({ 
  message = "Loading your schedule...",
  className = "h-96" 
}: ScheduleLoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  );
}