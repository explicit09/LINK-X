/**
 * Original Session Card - DnD Enabled
 * Preserves the original design with drag and drop functionality
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  CheckCircle2,
  Clock,
  Target,
  Brain,
  ArrowRight,
} from 'lucide-react';
import type { StudySession } from '../types/schedule';

interface OriginalSessionCardProps {
  session: StudySession;
  index: number;
  courseStyle: any;
  isNext: boolean;
  isActive: boolean;
  isCompleted: boolean;
  onSelect: (session: StudySession) => void;
  onStart: (session: StudySession) => void;
  onComplete: (session: StudySession) => void;
}

export function OriginalSessionCard({
  session,
  index,
  courseStyle,
  isNext,
  isActive,
  isCompleted,
  onSelect,
  onStart,
  onComplete,
}: OriginalSessionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getCognitiveLoadColor = (load: string) => {
    switch (load) {
      case 'high':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-500 text-white border border-red-600';
      case 'soon':
        return 'bg-yellow-500 text-white border border-yellow-600';
      case 'later':
        return 'bg-green-500 text-white border border-green-600';
      default:
        return 'bg-gray-500 text-white border border-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return '📝';
      case 'study':
        return '📚';
      case 'meeting':
        return '👥';
      case 'lab':
        return '🧪';
      default:
        return '📖';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative bg-white rounded-lg border transition-all duration-200 cursor-pointer
        ${isDragging ? 'opacity-50 scale-105 shadow-lg z-10' : ''}
        ${isNext ? 'ring-2 ring-blue-400 border-blue-300 shadow-md' : 'border-gray-200 hover:border-gray-300'}
        ${isActive ? 'ring-2 ring-purple-400 border-purple-300 bg-purple-50' : ''}
        ${isCompleted ? 'opacity-60 bg-gray-50' : 'hover:shadow-md'}
      `}
      onClick={() => onSelect(session)}
    >
      {/* Priority Indicator */}
      {isNext && !isCompleted && !isActive && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
          Next Up
        </div>
      )}

      {/* Stack Position Number */}
      <div className="absolute -left-3 top-4 w-6 h-6 bg-gray-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
        {index + 1}
      </div>

      <div className="p-4 pl-6">
        {/* Header with Icon and Title */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{getTypeIcon(session.type)}</span>
              <h3 className={`font-semibold text-lg ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {session.title}
              </h3>
              {isCompleted && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
            
            {/* Course Badge and Due Date */}
            <div className="flex items-center gap-2 mb-3">
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: courseStyle?.color + '20',
                  color: courseStyle?.color,
                }}
              >
                {session.course}
              </span>
              {session.dueIn && (
                <span className="text-sm font-medium text-gray-600">
                  Due {session.dueIn}
                </span>
              )}
            </div>
          </div>

          {/* XP Reward */}
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              +{session.xpReward}
            </div>
            <div className="text-sm text-blue-500 font-medium">XP</div>
          </div>
        </div>

        {/* Metadata Tags */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{session.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Brain className="h-4 w-4 text-gray-400" />
            <span className={`px-2 py-1 rounded-md text-sm font-medium ${getCognitiveLoadColor(session.cognitiveLoad)}`}>
              {session.cognitiveLoad} load
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4 text-gray-400" />
            <span className={`px-2 py-1 rounded-md text-sm font-medium ${getUrgencyColor(session.urgency)}`}>
              {session.urgency}
            </span>
          </div>
        </div>

        {/* Estimated Start Time */}
        <div className="text-sm text-gray-600 mb-4">
          Estimated start: {session.estimatedStart}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Completed</span>
            </div>
          ) : isActive ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(session);
              }}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete
            </Button>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onStart(session);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 px-3"
          >
            View Details
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Progress Bar for Active Session */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-1 bg-purple-200 rounded-b-lg">
            <div 
              className="h-1 bg-purple-500 rounded-b-lg transition-all duration-1000"
              style={{ width: '65%' }} // TODO: Calculate actual progress
            />
          </div>
        </div>
      )}
    </div>
  );
}