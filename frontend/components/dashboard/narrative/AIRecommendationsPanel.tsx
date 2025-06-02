'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Brain, CheckCircle } from 'lucide-react';

interface AIRecommendation {
  id: string;
  text: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
}

interface AIRecommendationsPanelProps {
  recommendations: AIRecommendation[];
  onRecommendationComplete?: (id: string) => void;
}

/**
 * AIRecommendationsPanel - Displays AI-powered recommendations
 * EXTRACTED from NarrativeDashboard.tsx for reusability
 */
export const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({
  recommendations,
  onRecommendationComplete,
}) => {
  const [completedRecommendations, setCompletedRecommendations] = useState<string[]>([]);

  const handleComplete = (id: string) => {
    setCompletedRecommendations(prev => [...prev, id]);
    onRecommendationComplete?.(id);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'border-l-purple-500';
      case 'medium':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        <Brain className="h-4 w-4 mr-1 text-purple-500" />
        AI Recommendations
      </h3>
      <div className="space-y-3">
        {recommendations.map((rec) => {
          const isCompleted = completedRecommendations.includes(rec.id);

          return (
            <div
              key={rec.id}
              className={cn(
                'p-3 bg-white border-l-4 rounded-r-lg shadow-sm transition-all',
                getImpactColor(rec.impact),
                isCompleted && 'opacity-60 bg-gray-50'
              )}
            >
              <div className="flex items-start justify-between">
                <p className={cn(
                  'text-sm flex-1',
                  isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'
                )}>
                  {rec.text}
                </p>
                {!isCompleted ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleComplete(rec.id)}
                    className="ml-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500 ml-2 flex-shrink-0" />
                )}
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {rec.category}
                </span>
                <span className={cn(
                  'text-xs ml-2 px-2 py-1 rounded',
                  rec.impact === 'high' && 'bg-purple-100 text-purple-700',
                  rec.impact === 'medium' && 'bg-blue-100 text-blue-700',
                  rec.impact === 'low' && 'bg-green-100 text-green-700'
                )}>
                  {rec.impact} impact
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};