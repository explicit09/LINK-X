'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timer, Play } from 'lucide-react';

interface SmartAction {
  id: string;
  title: string;
  description: string;
  urgency: 'urgent' | 'medium' | 'low';
  timeEstimate: string;
  category: string;
}

interface SmartActionsPanelProps {
  actions: SmartAction[];
  onActionClick?: (action: SmartAction) => void;
}

/**
 * SmartActionsPanel - Displays prioritized actions for the user
 * EXTRACTED from NarrativeDashboard.tsx for reusability
 */
export const SmartActionsPanel: React.FC<SmartActionsPanelProps> = ({
  actions,
  onActionClick,
}) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Smart Actions ({actions.length})
      </h3>
      <div className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getUrgencyColor(action.urgency)}`}
            onClick={() => onActionClick?.(action)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{action.title}</h4>
              <Badge className={`text-xs ${getUrgencyBadge(action.urgency)}`}>
                {action.urgency}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{action.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center">
                <Timer className="h-3 w-3 mr-1" />
                {action.timeEstimate}
              </span>
              <Button
                size="sm"
                variant={action.urgency === 'urgent' ? 'default' : 'outline'}
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};