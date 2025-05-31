"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, Brain, Zap, Target } from "lucide-react";

interface ActionSuggestion {
  id: string;
  action: string;
  reason: string;
  timeEstimate: number;
  urgency: "high" | "medium" | "low";
  course?: string;
  type: "review" | "practice" | "study" | "assignment";
}

interface SmartActionEngineProps {
  currentTime?: Date;
  availableMinutes?: number;
  userFocusLevel?: "peak" | "medium" | "low";
  onActionClick?: (action: ActionSuggestion) => void;
}

export function SmartActionEngine({
  currentTime = new Date(),
  availableMinutes = 30,
  userFocusLevel = "peak",
  onActionClick
}: SmartActionEngineProps) {
  
  // Smart recommendation engine based on context
  const generateRecommendation = (): ActionSuggestion => {
    const hour = currentTime.getHours();
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17;
    
    // Peak focus recommendations
    if (userFocusLevel === "peak" && availableMinutes >= 20) {
      return {
        id: "peak-1",
        action: "Tackle CS229 Neural Networks Assignment",
        reason: "Peak focus + urgent deadline = optimal completion time",
        timeEstimate: 20,
        urgency: "high",
        course: "CS229",
        type: "assignment"
      };
    }
    
    // Quick review for short time windows
    if (availableMinutes <= 15) {
      return {
        id: "quick-1",
        action: "CS224n Recursion Quick Review",
        reason: `You have ${availableMinutes} min. Quick review boosts retention 23%`,
        timeEstimate: 10,
        urgency: "medium",
        course: "CS224n",
        type: "review"
      };
    }
    
    // Afternoon energy management
    if (isAfternoon && userFocusLevel === "medium") {
      return {
        id: "afternoon-1",
        action: "CS231n Computer Vision Practice",
        reason: "Your afternoon focus is perfect for visual learning",
        timeEstimate: 25,
        urgency: "medium",
        course: "CS231n",
        type: "practice"
      };
    }
    
    // Evening consolidation
    if (isEvening) {
      return {
        id: "evening-1",
        action: "Review Today's Completed Work",
        reason: "Evening review increases retention by 34%",
        timeEstimate: 15,
        urgency: "low",
        type: "review"
      };
    }
    
    // Default fallback
    return {
      id: "default-1",
      action: "Focus on CS229 Assignment",
      reason: "Highest priority based on deadline urgency",
      timeEstimate: 20,
      urgency: "high",
      course: "CS229",
      type: "assignment"
    };
  };

  const suggestion = generateRecommendation();
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "bg-red-600 hover:bg-red-700";
      case "medium": return "bg-orange-600 hover:bg-orange-700";
      case "low": return "bg-blue-600 hover:bg-blue-700";
      default: return "bg-gray-600 hover:bg-gray-700";
    }
  };

  const getTimeIcon = () => {
    if (userFocusLevel === "peak") return <Zap className="h-4 w-4 text-yellow-500" />;
    if (availableMinutes <= 15) return <Clock className="h-4 w-4 text-blue-500" />;
    return <Brain className="h-4 w-4 text-purple-500" />;
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-1.5 bg-purple-100 rounded">
          <Target className="h-4 w-4 text-purple-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Next Best Action</h3>
        <div className="flex items-center text-xs text-gray-500">
          {getTimeIcon()}
          <span className="ml-1">{availableMinutes}m available</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Main recommendation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm mb-1">
                {suggestion.action}
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                {suggestion.reason}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  ~{suggestion.timeEstimate} minutes
                </span>
                {suggestion.course && (
                  <span className="text-xs font-medium text-purple-600">
                    {suggestion.course}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action button */}
        <Button
          onClick={() => onActionClick?.(suggestion)}
          className={`w-full text-sm py-3 text-white ${getUrgencyColor(suggestion.urgency)}`}
        >
          Start {suggestion.timeEstimate}-min Session
        </Button>
        
        {/* Context indicators */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              userFocusLevel === "peak" ? "bg-green-500" : 
              userFocusLevel === "medium" ? "bg-yellow-500" : "bg-red-500"
            }`} />
            <span>{userFocusLevel} focus</span>
          </div>
          <span>Based on your patterns</span>
        </div>
      </div>
    </div>
  );
}