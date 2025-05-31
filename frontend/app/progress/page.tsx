"use client";

import { SharedDashboardLayout } from "@/components/dashboard/layouts/SharedDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Trophy, 
  Target, 
  Clock, 
  BookOpen,
  Zap,
  Calendar,
  Star,
  Award,
  BarChart3
} from "lucide-react";

export default function ProgressPage() {
  const courseProgress = [
    {
      id: "1",
      code: "CS229",
      title: "Machine Learning",
      progress: 85,
      grade: "A-",
      weeklyChange: "+12%",
      totalHours: 45,
      lastActive: "2 hours ago"
    },
    {
      id: "2",
      code: "CS224n", 
      title: "Natural Language Processing",
      progress: 42,
      grade: "B+",
      weeklyChange: "+8%",
      totalHours: 28,
      lastActive: "Yesterday"
    },
    {
      id: "3",
      code: "CS231n",
      title: "Computer Vision", 
      progress: 67,
      grade: "A",
      weeklyChange: "+15%",
      totalHours: 38,
      lastActive: "5 hours ago"
    },
    {
      id: "4",
      code: "CS161",
      title: "Algorithms",
      progress: 90,
      grade: "A+", 
      weeklyChange: "+5%",
      totalHours: 52,
      lastActive: "1 hour ago"
    }
  ];

  const achievements = [
    {
      icon: "🔥",
      title: "5-Day Streak",
      description: "Studied every day this week",
      date: "Today",
      xp: "+50 XP"
    },
    {
      icon: "🎯", 
      title: "Deadline Crusher",
      description: "Completed urgent assignment on time",
      date: "Yesterday",
      xp: "+75 XP"
    },
    {
      icon: "⚡",
      title: "Speed Learner",
      description: "Finished CS161 module 20% faster",
      date: "2 days ago", 
      xp: "+30 XP"
    },
    {
      icon: "🧠",
      title: "Knowledge Master",
      description: "Scored 95% on CS229 quiz",
      date: "3 days ago",
      xp: "+100 XP"
    }
  ];

  const weeklyStats = {
    studyTime: "12.5h",
    studyTimeChange: "+2.5h",
    completedTasks: 18,
    completedTasksChange: "+6",
    avgScore: "89%",
    avgScoreChange: "+7%",
    rank: 3,
    rankChange: "+2"
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 60) return "bg-blue-500";
    if (progress >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-600 bg-green-100";
    if (grade.startsWith("B")) return "text-blue-600 bg-blue-100";
    if (grade.startsWith("C")) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <SharedDashboardLayout pageTitle="Progress" showGamification={false}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Study Time</p>
                <p className="text-2xl font-bold text-blue-900">{weeklyStats.studyTime}</p>
                <p className="text-xs text-blue-600">
                  {weeklyStats.studyTimeChange} from last week
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Tasks Done</p>
                <p className="text-2xl font-bold text-green-900">{weeklyStats.completedTasks}</p>
                <p className="text-xs text-green-600">
                  {weeklyStats.completedTasksChange} from last week
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Avg Score</p>
                <p className="text-2xl font-bold text-purple-900">{weeklyStats.avgScore}</p>
                <p className="text-xs text-purple-600">
                  {weeklyStats.avgScoreChange} from last week
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Rank</p>
                <p className="text-2xl font-bold text-yellow-900">#{weeklyStats.rank}</p>
                <p className="text-xs text-yellow-600">
                  {weeklyStats.rankChange} from last week
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Progress */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <span>Course Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {courseProgress.map((course) => (
                <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{course.code}</h3>
                        <Badge className={getGradeColor(course.grade)}>
                          {course.grade}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{course.title}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {course.weeklyChange}
                      </div>
                      <div className="text-xs text-gray-500">
                        {course.totalHours}h total
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={course.progress} className="h-2" />
                      <div 
                        className={`absolute top-0 left-0 h-2 rounded-full ${getProgressColor(course.progress)}`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      Last active: {course.lastActive}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Performance Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Performance Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Performance chart visualization</p>
                  <p className="text-sm">Coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <span>Recent Achievements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {achievements.map((achievement, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {achievement.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{achievement.date}</span>
                        <Badge variant="secondary" className="text-xs">
                          {achievement.xp}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Study Time Goal</span>
                    <span>12.5h / 15h</span>
                  </div>
                  <Progress value={83} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tasks Completed</span>
                    <span>18 / 20</span>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Course Progress</span>
                    <span>71% avg</span>
                  </div>
                  <Progress value={71} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Trophy className="h-4 w-4 mr-2" />
                View All Achievements
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Export Progress Report
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Star className="h-4 w-4 mr-2" />
                Set New Goals
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SharedDashboardLayout>
  );
}