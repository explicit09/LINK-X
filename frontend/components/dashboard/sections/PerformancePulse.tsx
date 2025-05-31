"use client";

import React from "react";
import { TrendingUp, Trophy, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface PerformancePulseProps {
  weeklyImprovement?: number;
  currentRank?: number;
  achievements?: Achievement[];
  onMaintainRank?: () => void;
}

export function PerformancePulse({ 
  weeklyImprovement = 15, 
  currentRank = 3,
  achievements = [
    {
      id: "1",
      title: "3 Key Reviews",
      description: "Completed critical study sessions",
      icon: <Target className="h-3 w-3 text-blue-600" />
    },
    {
      id: "2", 
      title: "Daily Streak",
      description: "5 days consistent learning",
      icon: <Zap className="h-3 w-3 text-yellow-600" />
    }
  ],
  onMaintainRank
}: PerformancePulseProps) {
  
  const getNextAction = () => {
    if (currentRank <= 5) {
      return "Complete CS229 assignment to reach rank #2";
    }
    return "Maintain ranking with daily 15-min reviews";
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-1.5 bg-blue-100 rounded">
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Performance Pulse</h3>
      </div>
      
      <div className="space-y-4">
        {/* Weekly improvement with achievement breakdown */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">This week</div>
          <div className="flex items-center justify-center space-x-1">
            <span className="text-sm font-medium text-green-600">+{weeklyImprovement}%</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${weeklyImprovement * 4}%` }}
            />
          </div>
          
          {/* Achievement breakdown */}
          <div className="mt-3 space-y-1">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center text-xs text-gray-600">
                <span className="mr-2">{achievement.icon}</span>
                <span className="font-medium">{achievement.title}:</span>
                <span className="ml-1">{achievement.description}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Rank and next action */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-900">Rank #{currentRank}</span>
            </div>
            <span className="text-xs text-green-600">↗ +2 this week</span>
          </div>
          
          <p className="text-xs text-gray-600 mb-3">
            {getNextAction()}
          </p>
          
          <Button 
            onClick={onMaintainRank}
            variant="outline" 
            size="sm" 
            className="w-full text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            View Action Plan
          </Button>
        </div>
      </div>
    </div>
  );
}