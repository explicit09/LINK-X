/**
 * Session Card Component
 * Reusable session display component
 */

import { StudySession, CourseConfig } from '../types/schedule';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, Clock, Brain, Zap } from 'lucide-react';

interface SessionCardProps {
  session: StudySession;
  courseStyle: { color: string; name: string };
  isNext?: boolean;
  isActive?: boolean;
  isCompleted?: boolean;
  onSelect?: (session: StudySession) => void;
  onStart?: (session: StudySession) => void;
  onComplete?: (session: StudySession) => void;
  className?: string;
}

export function SessionCard({
  session,
  courseStyle,
  isNext = false,
  isActive = false,
  isCompleted = false,
  onSelect,
  onStart,
  onComplete,
  className = ""
}: SessionCardProps) {
  const getCognitiveLoadColor = (load: string) => {
    switch (load) {
      case 'high': return 'text-red-700 bg-red-50';
      case 'medium': return 'text-orange-700 bg-orange-50';
      case 'low': return 'text-green-700 bg-green-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return '🔴';
      case 'soon': return '🟡';
      case 'later': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div
      onClick={() => onSelect?.(session)}
      className={`relative border rounded-lg p-4 transition-all cursor-pointer ${
        isActive
          ? 'ring-2 ring-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300'
          : isNext
            ? 'ring-2 ring-blue-200 bg-blue-50 border-blue-300'
            : isCompleted
              ? 'bg-green-50 border-green-200 opacity-80'
              : 'bg-white border-gray-200 hover:border-gray-300'
      } ${className}`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: isActive ? '#8B5CF6' : isCompleted ? '#10b981' : courseStyle?.color,
      }}
    >
      {/* Session header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 text-sm mb-1">
            {session.title}
          </h3>
          <p className="text-xs text-gray-600">
            {session.course} • {session.duration}
          </p>
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs">{getUrgencyIcon(session.urgency)}</span>
          {session.cognitiveLoad === 'high' && <Brain className="h-3 w-3 text-red-500" />}
        </div>
      </div>

      {/* Session metadata */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className={`text-xs ${getCognitiveLoadColor(session.cognitiveLoad)}`}>
          {session.cognitiveLoad}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {session.estimatedStart}
        </div>
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <Zap className="h-3 w-3" />
          +{session.xpReward} XP
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {isCompleted ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
            disabled
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Completed
          </Button>
        ) : isActive ? (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onComplete?.(session);
            }}
            size="sm"
            variant="outline"
            className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Complete
          </Button>
        ) : (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onStart?.(session);
            }}
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Start Session
          </Button>
        )}
      </div>

      {/* Next session indicator */}
      {isNext && !isActive && !isCompleted && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            Next
          </div>
        </div>
      )}

      {/* AI suggestion indicator */}
      {session.isGhost && (
        <div className="absolute -top-2 -left-2">
          <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            ✨ AI
          </div>
        </div>
      )}
    </div>
  );
}