'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Brain
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StrugglingStudent {
  user_id: string;
  name: string;
  avg_engagement: number;
  completion_rate: number;
  last_activity: string;
}

interface PopularContent {
  file_id: string;
  title: string;
  avg_engagement: number;
  completion_rate: number;
  view_count: number;
}

interface ModuleCompletion {
  module_id: string;
  title: string;
  avg_completion: number;
  student_count: number;
}

interface EngagementTrend {
  date: string;
  avg_engagement: number;
  active_students: number;
  total_sessions: number;
}

interface CourseInsights {
  course_summary: {
    total_students: number;
    week_avg_engagement: number;
    week_total_sessions: number;
    week_active_students: number;
  };
  insights: {
    struggling_students?: { data: StrugglingStudent[]; generated_at: string };
    popular_content?: { data: PopularContent[]; generated_at: string };
    completion_rates?: { data: ModuleCompletion[]; generated_at: string };
    engagement_trends?: { data: EngagementTrend[]; generated_at: string };
  };
  module_completion: Array<{
    module_id: string;
    title: string;
    ordering: number;
    total_files: number;
    avg_completion_rate: number;
    avg_engagement_score: number;
  }>;
  generated_at: string;
}

interface ProfessorInsightsProps {
  courseId: string;
  className?: string;
}

export function ProfessorInsights({ courseId, className }: ProfessorInsightsProps) {
  const [insights, setInsights] = useState<CourseInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/analytics/professor/course/${courseId}/insights`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course insights');
      }

      const result = await response.json();
      if (result.status === 'success') {
        setInsights(result.data);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to load insights');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Insights fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [courseId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInsights();
  };

  const formatEngagementLevel = (score: number): { label: string; color: string } => {
    if (score >= 0.8) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 0.6) return { label: 'Good', color: 'text-blue-600' };
    if (score >= 0.4) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Poor', color: 'text-red-600' };
  };

  const getEngagementBadgeVariant = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    if (score >= 0.4) return 'outline';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No insights available for this course yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { course_summary, insights: insightData, module_completion } = insights;
  const strugglingStudents = insightData.struggling_students?.data || [];
  const popularContent = insightData.popular_content?.data || [];
  const engagementTrends = insightData.engagement_trends?.data || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Course Analytics</h2>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Course Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{course_summary.total_students}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Week Engagement</p>
                <p className={`text-lg font-bold ${formatEngagementLevel(course_summary.week_avg_engagement).color}`}>
                  {formatEngagementLevel(course_summary.week_avg_engagement).label}
                </p>
                <p className="text-xs text-gray-500">
                  {(course_summary.week_avg_engagement * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Active Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {course_summary.week_active_students}
                </p>
                <p className="text-xs text-gray-500">
                  {course_summary.total_students > 0 
                    ? Math.round((course_summary.week_active_students / course_summary.total_students) * 100)
                    : 0}% of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Week Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{course_summary.week_total_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights Tabs */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          {/* Struggling Students Alert */}
          {strugglingStudents.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>{strugglingStudents.length} students</strong> may need additional support based on low engagement or completion rates.
              </AlertDescription>
            </Alert>
          )}

          {/* Students Needing Attention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Students Needing Attention</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strugglingStudents.length > 0 ? (
                <div className="space-y-4">
                  {strugglingStudents.slice(0, 10).map((student) => (
                    <div key={student.user_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{student.name}</h4>
                        <Badge 
                          variant={getEngagementBadgeVariant(student.avg_engagement)}
                        >
                          {(student.avg_engagement * 100).toFixed(0)}% engagement
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Completion Rate:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <Progress value={student.completion_rate} className="flex-1" />
                            <span className="w-12 text-right">
                              {student.completion_rate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Activity:</span>
                          <p className="text-gray-900">
                            {new Date(student.last_activity).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Great! No students currently need attention. All students are performing well.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Top Performing Content</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {popularContent.slice(0, 5).map((content, index) => (
                    <div key={content.file_id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate flex-1 mr-2">
                          {content.title}
                        </h4>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Engagement:</span>
                          <p className={`font-medium ${formatEngagementLevel(content.avg_engagement).color}`}>
                            {(content.avg_engagement * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Completion:</span>
                          <p className="font-medium">{(content.completion_rate * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {content.view_count} total views
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>Content Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {popularContent.filter(c => c.avg_engagement >= 0.7).length}
                    </p>
                    <p className="text-sm text-green-800">High Engagement</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {popularContent.filter(c => c.completion_rate >= 0.8).length}
                    </p>
                    <p className="text-sm text-blue-800">High Completion</p>
                  </div>
                </div>
                
                {popularContent.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Avg. Engagement:</span>
                      <span className="font-medium">
                        {((popularContent.reduce((sum, c) => sum + c.avg_engagement, 0) / popularContent.length) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Avg. Completion:</span>
                      <span className="font-medium">
                        {((popularContent.reduce((sum, c) => sum + c.completion_rate, 0) / popularContent.length) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Module Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {module_completion.map((module) => (
                  <div key={module.module_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{module.title}</h4>
                        <p className="text-sm text-gray-600">
                          {module.total_files} files
                        </p>
                      </div>
                      <Badge variant="outline">
                        Module {module.ordering}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Completion Rate:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress 
                            value={(module.avg_completion_rate || 0) * 100} 
                            className="flex-1" 
                          />
                          <span className="w-12 text-sm text-right">
                            {((module.avg_completion_rate || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Engagement Score:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress 
                            value={(module.avg_engagement_score || 0) * 100} 
                            className="flex-1" 
                          />
                          <span className="w-12 text-sm text-right">
                            {((module.avg_engagement_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>7-Day Engagement Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {engagementTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {new Date(trend.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {trend.active_students} active students, {trend.total_sessions} sessions
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className={`font-medium ${formatEngagementLevel(trend.avg_engagement).color}`}>
                          {(trend.avg_engagement * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500">engagement</p>
                      </div>
                      <Progress 
                        value={trend.avg_engagement * 100} 
                        className="w-24" 
                      />
                    </div>
                  </div>
                ))}
                {engagementTrends.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No engagement data available for the past 7 days.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}