"use client";

import { SharedDashboardLayout } from "@/components/dashboard/layouts/SharedDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Brain,
  Star
} from "lucide-react";

export default function StudyPlanPage() {
  const weeklyGoals = [
    {
      id: "1",
      title: "Complete CS229 Neural Networks Assignment",
      dueDate: "Today",
      priority: "high",
      estimatedTime: "2 hours",
      progress: 85,
      status: "in_progress"
    },
    {
      id: "2", 
      title: "Review CS224n Recursion Concepts",
      dueDate: "Tomorrow",
      priority: "medium",
      estimatedTime: "45 mins",
      progress: 0,
      status: "pending"
    },
    {
      id: "3",
      title: "CS231n Computer Vision Lab",
      dueDate: "3 days",
      priority: "low",
      estimatedTime: "1.5 hours",
      progress: 60,
      status: "in_progress"
    }
  ];

  const studyRecommendations = [
    {
      icon: <Brain className="h-5 w-5 text-purple-600" />,
      title: "Peak Focus Sessions",
      description: "Schedule demanding tasks during your 9-11 AM peak hours",
      action: "Optimize Schedule"
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-600" />,
      title: "Spaced Repetition",
      description: "Review CS224n concepts in 3 days for optimal retention",
      action: "Set Reminder"
    },
    {
      icon: <Target className="h-5 w-5 text-green-600" />,
      title: "Goal Alignment",
      description: "Your current pace will achieve 90% of weekly targets",
      action: "View Details"
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-orange-100 text-orange-800 border-orange-200";
      case "low": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-600" />;
      case "pending": return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <SharedDashboardLayout pageTitle="Study Plan" showGamification={false}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Study Plan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>This Week's Goals</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklyGoals.map((goal) => (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(goal.status)}
                        <h3 className="font-medium text-gray-900">{goal.title}</h3>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due {goal.dueDate}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{goal.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={getPriorityColor(goal.priority)}>
                      {goal.priority}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <Button 
                      size="sm" 
                      variant={goal.status === "completed" ? "secondary" : "default"}
                      disabled={goal.status === "completed"}
                    >
                      {goal.status === "completed" ? "Completed" : 
                       goal.status === "in_progress" ? "Continue" : "Start"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Weekly Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Weekly Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">75%</div>
                  <div className="text-sm text-gray-500">Goals Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">8.5h</div>
                  <div className="text-sm text-gray-500">Study Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">92%</div>
                  <div className="text-sm text-gray-500">Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">5</div>
                  <div className="text-sm text-gray-500">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Study Recommendations Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-600" />
                <span>AI Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {studyRecommendations.map((rec, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">{rec.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">
                        {rec.title}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {rec.description}
                      </p>
                      <Button size="sm" variant="outline" className="text-xs">
                        {rec.action}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Set New Goal
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Study Session
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Progress Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SharedDashboardLayout>
  );
}