"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

interface PerformancePulseProps {
  weeklyImprovement?: number;
  currentRank?: number;
  bestFocus?: string;
}

export function PerformancePulse({ 
  weeklyImprovement = 15, 
  currentRank = 3,
  bestFocus = "Current Rank"
}: PerformancePulseProps) {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-1.5 bg-blue-100 rounded">
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Performance Pulse</h3>
      </div>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">This week</div>
          <div className="flex items-center justify-center space-x-1">
            <span className="text-sm font-medium text-green-600">+{weeklyImprovement}%</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${weeklyImprovement * 4}%` }}
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <div>
            <div className="text-xs text-gray-500">{bestFocus}</div>
            <div className="text-sm font-medium text-gray-900">#{currentRank}</div>
          </div>
        </div>
      </div>
    </div>
  );
}