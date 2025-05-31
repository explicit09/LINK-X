"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, Brain, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const generateRecommendations = (): ActionSuggestion[] => {
    const hour = currentTime.getHours();
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17;
    
    const recommendations: ActionSuggestion[] = [];
    
    // 1. URGENT: Due today/high priority
    recommendations.push({
      id: "urgent-1",
      action: "CS229 Neural Networks Assignment",
      reason: "Due TODAY - Peak focus time optimal for completion",
      timeEstimate: 20,
      urgency: "high",
      course: "CS229",
      type: "assignment"
    });
    
    // 2. SKILL BOOST: Improve weak areas
    recommendations.push({
      id: "skill-1", 
      action: "CS224n Recursion Tutorial",
      reason: "40% last score - Visual tutorial boosts understanding",
      timeEstimate: 10,
      urgency: "medium",
      course: "CS224n",
      type: "review"
    });
    
    // 3. LONG-TERM: Foundation building
    if (availableMinutes >= 25) {
      recommendations.push({
        id: "longterm-1",
        action: "CS103 Mathematical Foundations",
        reason: "Build strong foundation for advanced topics",
        timeEstimate: 25,
        urgency: "low",
        course: "CS103",
        type: "study"
      });
    } else {
      recommendations.push({
        id: "longterm-quick",
        action: "CS161 Algorithm Review",
        reason: "Quick maintenance of strong performance",
        timeEstimate: 15,
        urgency: "low", 
        course: "CS161",
        type: "review"
      });
    }
    
    return recommendations;
  };

  const recommendations = generateRecommendations();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const selectedSuggestion = recommendations[selectedIndex];
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "bg-red-600 hover:bg-red-700";
      case "medium": return "bg-orange-600 hover:bg-orange-700";
      case "low": return "bg-blue-600 hover:bg-blue-700";
      default: return "bg-gray-600 hover:bg-gray-700";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "high": return "🔥";
      case "medium": return "⚙️";
      case "low": return "📚";
      default: return "💡";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "assignment": return "Assignment";
      case "review": return "Review";
      case "practice": return "Practice";
      case "study": return "Study";
      default: return "Task";
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
        {/* 3 Action Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {recommendations.map((rec, index) => (
            <button
              key={rec.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded text-xs font-medium transition-all",
                selectedIndex === index 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <span>{getUrgencyIcon(rec.urgency)}</span>
              <span className="hidden sm:inline">{getTypeLabel(rec.type)}</span>
            </button>
          ))}
        </div>

        {/* Selected recommendation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                selectedSuggestion.urgency === "high" ? "bg-red-100" : 
                selectedSuggestion.urgency === "medium" ? "bg-orange-100" : "bg-blue-100"
              )}>
                <span>{getUrgencyIcon(selectedSuggestion.urgency)}</span>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm mb-1">
                {selectedSuggestion.action}
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                {selectedSuggestion.reason}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  ~{selectedSuggestion.timeEstimate} minutes
                </span>
                {selectedSuggestion.course && (
                  <span className="text-xs font-medium text-purple-600">
                    {selectedSuggestion.course}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action button */}
        <Button
          onClick={() => onActionClick?.(selectedSuggestion)}
          className={`w-full text-sm py-3 text-white ${getUrgencyColor(selectedSuggestion.urgency)}`}
        >
          Start {selectedSuggestion.timeEstimate}-min {getTypeLabel(selectedSuggestion.type)}
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
          <span>3 ranked by priority</span>
        </div>
      </div>
    </div>
  );
}