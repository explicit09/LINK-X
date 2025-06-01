"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Zap, BookOpen, Clock, CheckCircle, TrendingUp } from "lucide-react";

interface WeeklyGoal {
  id: string;
  title: string;
  description: string;
  current: number;
  total: number;
  type: "xp" | "tasks" | "study" | "streak";
  reward: string;
  status: "active" | "completed" | "at_risk";
}

interface EnhancedWeeklyMissionProps {
  goals?: WeeklyGoal[];
  onGoalClick?: (goalId: string) => void;
}

const defaultGoals: WeeklyGoal[] = [
  {
    id: "xp",
    title: "Earn 150 XP",
    description: "Complete assignments and activities",
    current: 78,
    total: 150,
    type: "xp",
    reward: "+100 Bonus XP",
    status: "active"
  },
  {
    id: "tasks",
    title: "Complete 8 Tasks",
    description: "Stay on top of your workload",
    current: 5,
    total: 8,
    type: "tasks",
    reward: "Study Streak Boost",
    status: "active"
  },
  {
    id: "study",
    title: "Study 12 Hours",
    description: "Maintain consistent learning",
    current: 8.5,
    total: 12,
    type: "study",
    reward: "Focus Badge",
    status: "active"
  }
];

export function EnhancedWeeklyMission({ 
  goals = defaultGoals, 
  onGoalClick 
}: EnhancedWeeklyMissionProps) {
  
  const getIcon = (type: string) => {
    switch (type) {
      case "xp": return <Zap className="h-4 w-4" />;
      case "tasks": return <Target className="h-4 w-4" />;
      case "study": return <Clock className="h-4 w-4" />;
      case "streak": return <BookOpen className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "border-green-200 bg-green-50";
      case "at_risk": return "border-orange-200 bg-orange-50";
      default: return "border-blue-200 bg-blue-50";
    }
  };

  const getProgressColor = (type: string, status: string) => {
    if (status === "completed") return "bg-green-500";
    switch (type) {
      case "xp": return "bg-yellow-500";
      case "tasks": return "bg-blue-500";
      case "study": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const overallProgress = goals.reduce((acc, goal) => acc + (goal.current / goal.total), 0) / goals.length;
  const completedGoals = goals.filter(g => g.current >= g.total).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with Overall Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">This Week's Mission</h2>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            {completedGoals}/{goals.length} Complete
          </Badge>
        </div>
        
        {/* Overall Progress Ring */}
        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-gray-200"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                d="M18 3 a 15 15 0 0 1 0 30 a 15 15 0 0 1 0 -30"
              />
              <path
                className="stroke-blue-500"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${overallProgress * 94}, 94`}
                d="M18 3 a 15 15 0 0 1 0 30 a 15 15 0 0 1 0 -30"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">
                {Math.round(overallProgress * 100)}%
              </span>
            </div>
          </div>
          
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">Week Progress</p>
            <p className="text-lg font-semibold text-gray-900">
              {overallProgress >= 0.8 ? "Crushing it!" : 
               overallProgress >= 0.5 ? "On track" : "Keep pushing"}
            </p>
            <p className="text-xs text-gray-500">
              {Math.round((1 - overallProgress) * 100)}% remaining
            </p>
          </div>
          
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
      </div>

      {/* Individual Goals */}
      <div className="p-4 space-y-3">
        {goals.map((goal) => {
          const progress = (goal.current / goal.total) * 100;
          const isCompleted = goal.current >= goal.total;
          
          return (
            <div 
              key={goal.id}
              className={`border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all ${getStatusColor(goal.status)}`}
              onClick={() => onGoalClick?.(goal.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-full ${goal.type === 'xp' ? 'bg-yellow-100' : goal.type === 'tasks' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                    {getIcon(goal.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{goal.title}</h3>
                    <p className="text-xs text-gray-600">{goal.description}</p>
                  </div>
                </div>
                
                {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{goal.current} / {goal.total} {goal.type === "study" ? "hours" : goal.type}</span>
                  <span className="font-medium text-purple-600">{goal.reward}</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(goal.type, goal.status)}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Action Footer */}
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <Button 
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={() => onGoalClick?.("view-all")}
        >
          <Target className="h-4 w-4 mr-2" />
          View Detailed Progress
        </Button>
      </div>
    </div>
  );
}