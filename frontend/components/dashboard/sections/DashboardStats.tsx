import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Clock, Brain, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  published?: boolean;
  color?: string;
  lastActivity?: string;
  unreadCount?: number;
  materialsCount?: number;
  studentsCount?: number;
}

interface DashboardStatsProps {
  realCourses: Course[];
  todoItemsLength: number;
  dashboardStats: {
    aiInteractions: number;
    weeklyHours: number;
    loading: boolean;
  };
  aiPulse: boolean;
}

export const DashboardStats = ({ realCourses, todoItemsLength, dashboardStats, aiPulse }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="canvas-card hover:bg-gray-50 transition-colors duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="canvas-small text-gray-500">Active Courses</p>
              <p className="text-2xl font-bold sidebar-text">{realCourses.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="canvas-card hover:bg-gray-50 transition-colors duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="canvas-small text-gray-500">Pending Tasks</p>
              <p className="text-2xl font-bold sidebar-text">{todoItemsLength}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center shadow-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="canvas-card hover:bg-gray-50 transition-colors duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="canvas-small text-gray-500">AI Interactions</p>
              <div className="text-2xl font-bold sidebar-text">
                {dashboardStats.loading ? (
                  <div className="animate-pulse bg-gray-200 h-6 w-8 rounded"></div>
                ) : (
                  dashboardStats.aiInteractions
                )}
              </div>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-lg transition-all duration-300",
              aiPulse ? "shadow-purple-400 shadow-2xl scale-105" : ""
            )}>
              <Brain className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="canvas-card hover:bg-gray-50 transition-colors duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="canvas-small text-gray-500">This Week</p>
              <div className="text-2xl font-bold sidebar-text">
                {dashboardStats.loading ? (
                  <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                ) : (
                  `${dashboardStats.weeklyHours}h`
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};