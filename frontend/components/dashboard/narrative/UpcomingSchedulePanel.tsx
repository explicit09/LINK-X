'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  type: 'class' | 'assignment' | 'meeting' | 'study';
  course?: string;
}

interface UpcomingSchedulePanelProps {
  schedule: ScheduleItem[];
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
  onViewSchedule?: () => void;
}

/**
 * UpcomingSchedulePanel - Displays upcoming schedule items
 * EXTRACTED from NarrativeDashboard.tsx for reusability
 */
export const UpcomingSchedulePanel: React.FC<UpcomingSchedulePanelProps> = ({
  schedule,
  isExpanded,
  onToggleExpanded,
  onViewSchedule,
}) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800';
      case 'assignment':
        return 'bg-red-100 text-red-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'study':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const visibleItems = isExpanded ? schedule : schedule.slice(0, 3);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div className="bg-white rounded-lg border border-gray-200">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto hover:bg-gray-50"
          >
            <div className="flex items-center text-left">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
                <p className="text-sm text-gray-600">
                  {schedule.length} items scheduled
                </p>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="space-y-3">
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                    </div>
                    {item.course && (
                      <p className="text-sm text-gray-600">{item.course}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {item.time}
                  </div>
                </div>
              ))}
            </div>

            {schedule.length > 3 && !isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-blue-600 hover:text-blue-700"
                onClick={() => onToggleExpanded(true)}
              >
                View {schedule.length - 3} more items
              </Button>
            )}

            <Button
              onClick={onViewSchedule}
              variant="outline"
              size="sm"
              className="w-full mt-3"
            >
              View Full Schedule
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};