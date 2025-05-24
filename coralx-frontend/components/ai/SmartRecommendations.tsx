"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Target,
  Clock,
  Brain,
  BookOpen,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Star,
  Zap,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Recommendation {
  id: string;
  type: "study" | "practice" | "review" | "focus" | "schedule";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  timeEstimate?: string;
  confidence: number;
  reason: string;
  dueDate?: string;
}

interface LearningInsight {
  metric: string;
  value: number;
  change: number;
  status: "improving" | "declining" | "stable";
  description: string;
}

interface SmartRecommendationsProps {
  courseId?: string;
  userId?: string;
  className?: string;
  prioritizedLayout?: boolean;
}

export function SmartRecommendations({ courseId, userId, className, prioritizedLayout }: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({
    mustDo: true,
    nextUp: false,
    planProgress: false
  });

  useEffect(() => {
    // Simulate loading recommendations and insights
    const loadData = async () => {
      setIsLoading(true);
      
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock recommendations based on simulated student behavior
      const mockRecommendations: Recommendation[] = [
        {
          id: "1",
          type: "practice",
          priority: "high",
          title: "Practice Python Loops",
          description: "You've been struggling with loop concepts. Practice with interactive exercises.",
          action: "Start Practice Session",
          timeEstimate: "15 min",
          confidence: 92,
          reason: "Based on your quiz performance and time spent on loop-related materials",
          dueDate: "Today"
        },
        {
          id: "2",
          type: "review",
          priority: "medium",
          title: "Review Data Types",
          description: "Quick review before tomorrow's quiz to reinforce your knowledge.",
          action: "Review Materials",
          timeEstimate: "10 min",
          confidence: 85,
          reason: "Upcoming quiz detected and previous performance analysis",
          dueDate: "Tomorrow"
        },
        {
          id: "3",
          type: "study",
          priority: "medium",
          title: "Deep Dive: Functions",
          description: "You're ready for advanced function concepts. Great progress!",
          action: "Continue Learning",
          timeEstimate: "30 min",
          confidence: 78,
          reason: "Strong performance in basics suggests readiness for advanced topics"
        },
        {
          id: "4",
          type: "schedule",
          priority: "low",
          title: "Plan Study Schedule",
          description: "Optimize your study time with AI-generated schedule recommendations.",
          action: "Create Schedule",
          timeEstimate: "5 min",
          confidence: 71,
          reason: "Pattern analysis suggests you learn best in morning sessions"
        }
      ];

      const mockInsights: LearningInsight[] = [
        {
          metric: "Comprehension Score",
          value: 85,
          change: 12,
          status: "improving",
          description: "Your understanding has improved significantly this week"
        },
        {
          metric: "Study Consistency",
          value: 92,
          change: 5,
          status: "improving",
          description: "Great job maintaining regular study habits"
        },
        {
          metric: "Material Engagement",
          value: 67,
          change: -3,
          status: "declining",
          description: "Consider trying different study materials or methods"
        },
        {
          metric: "Quiz Performance",
          value: 78,
          change: 0,
          status: "stable",
          description: "Consistent performance, ready for more challenging topics"
        }
      ];

      setRecommendations(mockRecommendations);
      setInsights(mockInsights);
      setIsLoading(false);
    };

    loadData();
  }, [courseId, userId]);

  const getPriorityColor = (priority: Recommendation["priority"]) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-orange-600 bg-orange-50 border-orange-200";
      case "low": return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const getTypeIcon = (type: Recommendation["type"]) => {
    switch (type) {
      case "study": return BookOpen;
      case "practice": return Target;
      case "review": return Clock;
      case "focus": return Brain;
      case "schedule": return Calendar;
      default: return BookOpen;
    }
  };

  const getInsightIcon = (status: LearningInsight["status"]) => {
    switch (status) {
      case "improving": return CheckCircle2;
      case "declining": return AlertTriangle;
      case "stable": return TrendingUp;
    }
  };

  const getInsightColor = (status: LearningInsight["status"]) => {
    switch (status) {
      case "improving": return "text-green-600";
      case "declining": return "text-red-600";
      case "stable": return "text-blue-600";
    }
  };

  const toggleZone = (zone: string) => {
    setExpandedZones(prev => ({
      ...prev,
      [zone]: !prev[zone]
    }));
  };

  const getZoneIcon = (zone: string) => {
    switch (zone) {
      case "mustDo": return "🔥";
      case "nextUp": return "⏱️";
      case "planProgress": return "🗓️";
      default: return "📋";
    }
  };

  const groupRecommendationsByPriority = () => {
    const mustDo = recommendations.filter(r => r.priority === "high");
    const nextUp = recommendations.filter(r => r.priority === "medium");
    const planProgress = recommendations.filter(r => r.priority === "low");
    
    return { mustDo, nextUp, planProgress };
  };

  const renderPriorityZone = (title: string, zoneKey: string, items: Recommendation[], itemLimit: number = 2) => {
    const isExpanded = expandedZones[zoneKey];
    const displayItems = isExpanded ? items : items.slice(0, itemLimit);
    const hasMore = !isExpanded && items.length > itemLimit;
    
    return (
      <div key={zoneKey} className="space-y-4">
        <div 
          className="flex items-center justify-between cursor-pointer group py-2"
          onClick={() => toggleZone(zoneKey)}
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>{getZoneIcon(zoneKey)}</span>
            {title} ({items.length})
          </h3>
          <div className="flex items-center gap-2">
            {!isExpanded && hasMore && (
              <span className="text-xs text-gray-500">
                {items.length - itemLimit} more
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              {isExpanded ? "Collapse" : "Show All"}
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          {displayItems.map((rec) => {
            const IconComponent = getTypeIcon(rec.type);
            const isHighPriority = rec.priority === "high";
            return (
              <div 
                key={rec.id} 
                className={cn(
                  "p-6 rounded-lg bg-white hover:bg-gray-50 transition-all duration-300 cursor-pointer",
                  isHighPriority && "shadow-md border border-red-100"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg", getPriorityColor(rec.priority))}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {rec.timeEstimate && (
                          <span className="text-xs text-gray-500">{rec.timeEstimate}</span>
                        )}
                        {isHighPriority && (
                          <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                            High Priority
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {rec.dueDate && (
                          <span className="text-xs text-gray-500">Due: {rec.dueDate}</span>
                        )}
                      </div>
                      
                      <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                        {rec.action}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Prioritized Layout for Course Home
  if (prioritizedLayout) {
    const { mustDo, nextUp } = groupRecommendationsByPriority();
    
    return (
      <div className={cn("space-y-6", className)}>
        {/* Must-Do Zone - Always Expanded */}
        {mustDo.length > 0 && renderPriorityZone("Must-Do", "mustDo", mustDo, 1)}
        
        {/* Next Up Zone - Collapsed by Default */}
        {nextUp.length > 0 && (
          <div className="space-y-3">
            <button 
              className="flex items-center justify-between w-full py-2 text-left group"
              onClick={() => toggleZone("nextUp")}
            >
              <span className="text-sm font-medium text-gray-700">
                Show Next Up ({nextUp.length})
              </span>
              <span className="text-xs text-gray-400 group-hover:text-gray-600">
                {expandedZones.nextUp ? "Hide" : "Show"}
              </span>
            </button>
            
            {expandedZones.nextUp && (
              <div className="space-y-3">
                {nextUp.slice(0, 2).map((rec) => {
                  const IconComponent = getTypeIcon(rec.type);
                  return (
                    <div 
                      key={rec.id} 
                      className="p-4 rounded-lg bg-white hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg", getPriorityColor(rec.priority))}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{rec.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {rec.timeEstimate && (
                                <span className="text-xs text-gray-500">{rec.timeEstimate}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {rec.dueDate && (
                                <span className="text-xs text-gray-500">Due: {rec.dueDate}</span>
                              )}
                            </div>
                            
                            <Button size="sm" variant="outline" className="text-xs">
                              {rec.action}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-purple-600" />
        <h3 className="canvas-heading-3">Smart Recommendations</h3>
        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
          AI-Powered
        </Badge>
      </div>

      {/* Learning Insights */}
      <Card className="canvas-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {insights.map((insight) => {
              const IconComponent = getInsightIcon(insight.status);
              return (
                <div key={insight.metric} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <IconComponent className={cn("h-5 w-5", getInsightColor(insight.status))} />
                  </div>
                  <div className="text-2xl font-bold canvas-text mb-1">{insight.value}%</div>
                  <div className="text-xs canvas-body mb-2">{insight.metric}</div>
                  <div className={cn(
                    "text-xs flex items-center justify-center gap-1",
                    insight.change > 0 ? "text-green-600" : insight.change < 0 ? "text-red-600" : "text-gray-600"
                  )}>
                    {insight.change > 0 ? "+" : ""}{insight.change}%
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className="space-y-4">
        {recommendations.map((rec) => {
          const IconComponent = getTypeIcon(rec.type);
          return (
            <Card key={rec.id} className="canvas-card modern-hover">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg", getPriorityColor(rec.priority))}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium canvas-text">{rec.title}</h4>
                        <p className="text-sm canvas-body mt-1">{rec.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {rec.confidence}% confident
                        </Badge>
                        {rec.timeEstimate && (
                          <Badge variant="secondary" className="text-xs">
                            {rec.timeEstimate}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs capitalize", getPriorityColor(rec.priority))}
                        >
                          {rec.priority} priority
                        </Badge>
                        {rec.dueDate && (
                          <span className="text-xs text-gray-500">Due: {rec.dueDate}</span>
                        )}
                      </div>
                      
                      <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                        {rec.action}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <Brain className="h-3 w-3 inline mr-1" />
                      AI Insight: {rec.reason}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Study Streak */}
      <Card className="canvas-card bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-800">7-Day Study Streak! 🔥</h4>
                <p className="text-sm text-green-600">Keep up the great momentum</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">7</div>
              <div className="text-xs text-green-600">days</div>
            </div>
          </div>
          <Progress value={70} className="mt-3 h-2" />
          <p className="text-xs text-green-600 mt-2">3 more days to reach your 10-day goal!</p>
        </CardContent>
      </Card>
    </div>
  );
} 