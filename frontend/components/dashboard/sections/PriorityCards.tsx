'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface PriorityItem {
  id: string;
  courseCode: string;
  courseTitle: string;
  taskTitle: string;
  description?: string;
  urgency: 'urgent' | 'weak' | 'streak';
  timeEstimate?: string;
  lastScore?: string;
  actionText: string;
  progress?: number;
}

interface PriorityCardsProps {
  priorities?: PriorityItem[];
  onActionClick?: (item: PriorityItem) => void;
}

const defaultPriorities: PriorityItem[] = [
  {
    id: '1',
    courseCode: 'CS229',
    courseTitle: 'Machine Learning',
    taskTitle: 'Neural Networks Assignment',
    urgency: 'urgent',
    timeEstimate: '20 min',
    actionText: 'Finish Now (20 min)',
    progress: 85,
  },
  {
    id: '2',
    courseCode: 'CS224n',
    courseTitle: 'Natural Language Processing',
    taskTitle: 'Struggling with Recursion',
    description: 'Last score: 40% • Try visual tutorial',
    urgency: 'weak',
    lastScore: '40%',
    actionText: 'Start 10-min Tutorial',
  },
  {
    id: '3',
    courseCode: 'CS231n',
    courseTitle: 'Computer Vision',
    taskTitle: 'Keep momentum going',
    urgency: 'streak',
    actionText: 'Quick 15-min Review',
  },
];

export function PriorityCards({
  priorities = defaultPriorities,
  onActionClick,
}: PriorityCardsProps) {
  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return {
          cardBg: 'bg-red-50 border-red-200',
          badgeBg: 'bg-red-100 text-red-700',
          buttonBg: 'bg-red-600 hover:bg-red-700 text-white',
          icon: AlertTriangle,
          badgeText: '6 hrs',
        };
      case 'weak':
        return {
          cardBg: 'bg-orange-50 border-orange-200',
          badgeBg: 'bg-orange-100 text-orange-700',
          buttonBg: 'bg-orange-600 hover:bg-orange-700 text-white',
          icon: Clock,
          badgeText: 'Weak',
        };
      case 'streak':
        return {
          cardBg: 'bg-green-50 border-green-200',
          badgeBg: 'bg-green-100 text-green-700',
          buttonBg: 'bg-green-600 hover:green-700 text-white',
          icon: TrendingUp,
          badgeText: 'Streak',
        };
      default:
        return {
          cardBg: 'bg-gray-50 border-gray-200',
          badgeBg: 'bg-gray-100 text-gray-700',
          buttonBg: 'bg-gray-600 hover:bg-gray-700 text-white',
          icon: Clock,
          badgeText: '',
        };
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Your Priority Right Now
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {priorities.map((item) => {
          const styles = getUrgencyStyles(item.urgency);
          const IconComponent = styles.icon;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border ${styles.cardBg} relative`}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles.badgeBg}`}
                >
                  <IconComponent className="w-3 h-3 mr-1" />
                  {styles.badgeText}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <h3 className="font-medium text-gray-900 text-sm">
                  {item.courseCode}
                </h3>
                <p className="text-xs text-gray-600">{item.courseTitle}</p>
                <p className="text-sm font-medium text-gray-900">
                  {item.taskTitle}
                </p>

                {item.description && (
                  <p className="text-xs text-gray-500">{item.description}</p>
                )}

                {item.progress && (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Progress</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-red-600 h-1.5 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {item.urgency === 'streak' && (
                  <div className="text-xs text-green-600">••••••••••••</div>
                )}
              </div>

              <Button
                onClick={() => onActionClick?.(item)}
                className={`w-full text-sm py-2 ${styles.buttonBg}`}
                size="sm"
              >
                {item.actionText}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
