'use client';

import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  course: string;
  type: 'due' | 'study' | 'completed' | 'meeting';
  completed?: boolean;
  urgent?: boolean;
}

interface TodaysScheduleProps {
  items?: ScheduleItem[];
  onItemClick?: (item: ScheduleItem) => void;
}

export function TodaysSchedule({
  items = [],
  onItemClick,
}: TodaysScheduleProps) {
  const getTypeIcon = (type: string, completed?: boolean) => {
    if (completed) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (type === 'due') return <AlertCircle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-blue-600" />;
  };

  const getTypeStyles = (
    type: string,
    completed?: boolean,
    urgent?: boolean,
  ) => {
    if (completed) return 'bg-green-50 border-green-200 text-green-900';
    if (urgent) return 'bg-red-50 border-red-200 text-red-900';
    if (type === 'due') return 'bg-orange-50 border-orange-200 text-orange-900';
    return 'bg-blue-50 border-blue-200 text-blue-900';
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
        <Button variant="ghost" size="sm" className="text-xs text-gray-500">
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm ${getTypeStyles(item.type, item.completed, item.urgent)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="mt-0.5">
                {getTypeIcon(item.type, item.completed)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    {item.time}
                  </span>
                  <span className="text-xs text-gray-400">{item.course}</span>
                </div>

                <h4
                  className={`text-sm font-medium mt-1 ${item.completed ? 'line-through text-gray-500' : ''}`}
                >
                  {item.title}
                </h4>

                {item.urgent && !item.completed && (
                  <span className="inline-block mt-1 text-xs font-medium text-red-600">
                    Urgent
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{items.filter(item => item.completed).length} completed • {items.filter(item => !item.completed).length} pending</span>
          <span>Focus time: {items.length > 0 ? '2h 30m' : '0h'}</span>
        </div>
      </div>
    </div>
  );
}
