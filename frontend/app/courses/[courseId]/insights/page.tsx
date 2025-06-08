'use client';

import { useParams, useRouter } from 'next/navigation';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { useCourseData } from '@/hooks/course/useCourseData';
import { useMockAuth as useAuth } from '@/contexts/MockAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Brain,
  BarChart3,
  Calendar,
  Users,
  Award
} from 'lucide-react';

export default function CourseInsightsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  
  const { user, profile } = useAuth();
  const currentUser = { id: user?.id || "default-user", email: user?.email || "user@example.com", name: user?.name || "Default User", role: "student" };
  const { course, loading, error } = useCourseData(courseId);

  if (loading) {
    return (
              <SharedDashboardLayout pageTitle="Loading Insights..." currentUser={undefined}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-gray-600">Loading insights...</div>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <SharedDashboardLayout pageTitle="Error" currentUser={currentUser}>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">Failed to load course insights</div>
          <Button onClick={() => router.back()} variant="outline">Go Back</Button>
        </div>
      </SharedDashboardLayout>
    );
  }

  // Mock data for insights - replace with real data
  const studyEfficiency = 73;
  const currentStreak = 12;
  const weeklyGoal = 8;
  const hoursThisWeek = 6.5;
  const weakAreas = ['Linear Algebra', 'Neural Networks', 'Backpropagation'];
  const strongAreas = ['Statistics', 'Data Preprocessing', 'Model Evaluation'];

  return (
    <SharedDashboardLayout 
      pageTitle={`${course.title} - Insights`} 
      currentUser={currentUser}
      showGamification={false}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header with back navigation */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push(`/courses/${courseId}`)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Overview</span>
          </Button>
          <div className="h-4 w-px bg-gray-300" />
          <h1 className="text-2xl font-semibold">{course.title} Insights</h1>
        </div>

        {/* Study Efficiency Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Study Efficiency */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Study Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-2">{studyEfficiency}%</div>
              <Progress value={studyEfficiency} className="h-2 mb-2" />
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8% vs last week
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Time to mastery / Total study time
              </div>
            </CardContent>
          </Card>

          {/* Study Streak */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center">
                <Award className="h-4 w-4 mr-2" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-2">{currentStreak} days</div>
              <div className="text-sm text-gray-600 mb-2">Personal best: 18 days</div>
              <div className="flex items-center text-sm text-blue-600">
                <Target className="h-3 w-3 mr-1" />
                6 days to new record
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-2">{hoursThisWeek}h</div>
              <Progress value={(hoursThisWeek / weeklyGoal) * 100} className="h-2 mb-2" />
              <div className="text-sm text-gray-600">
                Goal: {weeklyGoal}h ({Math.round(((weeklyGoal - hoursThisWeek) / weeklyGoal) * 100)}% remaining)
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weak Areas Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Areas Needing Focus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingDown className="h-5 w-5 mr-2 text-orange-500" />
                Areas Needing Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weakAreas.map((area, index) => (
                <div key={area} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{area}</div>
                    <div className="text-sm text-gray-600">
                      {45 - index * 5}% confidence • Last studied {2 + index} days ago
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                </div>
              ))}
              <Button className="w-full" variant="outline">
                Create Focused Study Plan
              </Button>
            </CardContent>
          </Card>

          {/* Strong Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Strong Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {strongAreas.map((area, index) => (
                <div key={area} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{area}</div>
                    <div className="text-sm text-gray-600">
                      {85 + index * 3}% confidence • Mastered
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    ✓ Strong
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* AI Tutor Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-500" />
              AI Tutor Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <div className="font-medium text-purple-900 mb-2">
                📚 Focus on Linear Algebra fundamentals
              </div>
              <div className="text-sm text-purple-700 mb-3">
                Your neural network performance could improve by 23% with stronger linear algebra foundations. 
                I recommend spending 30 minutes on matrix operations before continuing.
              </div>
              <div className="flex space-x-2">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Start Linear Algebra Review
                </Button>
                <Button size="sm" variant="outline">
                  Show me why
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="font-medium text-blue-900 mb-2">
                ⚡ Try spaced repetition for backpropagation
              </div>
              <div className="text-sm text-blue-700 mb-3">
                You've studied this topic 3 times but retention is low. Spaced repetition could help you master it in 4 focused sessions.
              </div>
              <div className="flex space-x-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Set up spaced repetition
                </Button>
                <Button size="sm" variant="outline">
                  Not now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Schedule Optimization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-indigo-500" />
              Optimized Study Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className="text-center">
                  <div className="text-sm font-medium text-gray-700 mb-2">{day}</div>
                  <div className="space-y-1">
                    {index < 5 && (
                      <div className="text-xs p-2 bg-blue-100 text-blue-800 rounded">
                        Neural Networks
                        <br />9-10 AM
                      </div>
                    )}
                    {index === 2 && (
                      <div className="text-xs p-2 bg-orange-100 text-orange-800 rounded">
                        Review Linear Algebra
                        <br />2-3 PM
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button className="w-full" variant="outline">
                Sync with Calendar
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </SharedDashboardLayout>
  );
}