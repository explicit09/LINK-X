'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Users } from 'lucide-react';

interface AIStudyCoachProps {
  message?: string;
  onGetStudyPlan?: () => void;
}

export function AIStudyCoach({
  message = "Focus on CS229 first—you're so close! After that 10-min recursion review, you'll have crushed your hardest tasks today.",
  onGetStudyPlan,
}: AIStudyCoachProps) {
  return (
    <div className="space-y-6">
      {/* AI Study Coach */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-1.5 bg-purple-100 rounded">
            <Bot className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900">AI Study Coach</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          "{message}"
        </p>

        <Button
          onClick={onGetStudyPlan}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm py-2"
        >
          Get Full Study Plan
        </Button>
      </div>

      {/* Active Study Groups */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-1.5 bg-orange-100 rounded">
            <Users className="h-4 w-4 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Active Study Groups</h3>
        </div>

        <div className="text-right">
          <span className="text-xs text-orange-600 font-medium">
            + 5 online
          </span>
        </div>
      </div>
    </div>
  );
}
