'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Target,
  Brain,
  BarChart3,
  Activity,
  BookOpen,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EngagementMetrics {
  total_sessions: number;
  avg_engagement: number;
  total_time_minutes: number;
  avg_interactions: number;
  active_days: number;
}

interface LearningPattern {
  data: any;
  confidence: number;
  last_updated: string;
}

interface ContentPerformance {
  file_id: string;
  title: string;
  avg_completion: number;
  avg_duration: number;
  access_count: number;
  last_accessed: string;
}

interface StudyInsights {
  avg_session_length: number;
  avg_effectiveness: number;
  avg_focus_score: number;
  completed_sessions: number;
  missed_sessions: number;
  total_xp_earned: number;
}

interface AnalyticsData {
  overview: {
    this_week_activities: number;
    this_week_avg_duration: number;
    this_week_engagement: number;
    monthly_activities: number;
    avg_completion_rate: number;
    avg_engagement_score: number;
    current_xp: number;
    current_level: number;
    daily_streak: number;
  };
  engagement_trends: Array<{
    date: string;
    avg_engagement: number;
    session_count: number;
    avg_time_on_content: number;
  }>;
  learning_patterns: Record<string, LearningPattern>;
  content_performance: ContentPerformance[];
  study_insights: StudyInsights;
  generated_at: string;
}

interface EngagementDashboardProps {
  userId: string;
  className?: string;
}

export function EngagementDashboard({ userId, className }: EngagementDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
        const response = await fetch(`/api/v2/analytics/student/dashboard?days=${selectedPeriod}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const result = await response.json();
        if (result.status === 'success') {
          setAnalyticsData(result.data);
          setError(null);
        } else {
          throw new Error(result.message || 'Failed to load analytics');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedPeriod, userId]);

  const formatEngagementScore = (score: number): string => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Needs Improvement';
  };

  const getEngagementColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTopLearningHours = (patterns: Record<string, LearningPattern>): string[] => {
    const peakHours = patterns.peak_hours?.data;
    if (!peakHours) return [];

    return Object.entries(peakHours)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
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
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No analytics data available yet. Start learning to see your insights!</p>
        </CardContent>
      </Card>
    );
  }

  const { overview, engagement_trends, learning_patterns, content_performance, study_insights } = analyticsData;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Period Selection */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Learning Analytics</h2>
        <div className="flex space-x-2">
          {(['7', '30', '90'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period} days
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">This Week Activities</p>
                <p className="text-2xl font-bold text-gray-900">{overview.this_week_activities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Engagement Score</p>
                <p className={`text-2xl font-bold ${getEngagementColor(overview.this_week_engagement)}`}>
                  {formatEngagementScore(overview.this_week_engagement)}
                </p>
                <p className="text-xs text-gray-500">
                  {(overview.this_week_engagement * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Avg. Session Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(overview.this_week_avg_duration)} min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Streak</p>
                <p className="text-2xl font-bold text-gray-900">{overview.daily_streak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="engagement" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Engagement Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {engagement_trends.slice(-7).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {new Date(trend.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={trend.avg_engagement * 100} 
                          className="w-20" 
                        />
                        <span className="text-sm text-gray-900 w-12">
                          {(trend.avg_engagement * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Completion Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Performance Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Completion</span>
                  <Badge variant="secondary">
                    {overview.avg_completion_rate.toFixed(0)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Overall Engagement</span>
                  <Badge variant={overview.avg_engagement_score >= 0.6 ? "default" : "secondary"}>
                    {formatEngagementScore(overview.avg_engagement_score)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Level</span>
                  <Badge variant="outline">Level {overview.current_level}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total XP</span>
                  <span className="font-semibold">{overview.current_xp}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Content Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {content_performance.slice(0, 5).map((content, index) => (
                  <div key={content.file_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 truncate flex-1 mr-4">
                        {content.title}
                      </h4>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {content.access_count} views
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Completion:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress value={content.avg_completion} className="flex-1" />
                          <span className="w-12 text-right">
                            {content.avg_completion.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg. Time:</span>
                        <p className="font-medium">
                          {Math.round(content.avg_duration / 60)} min
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Learning Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Peak Learning Hours</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTopLearningHours(learning_patterns).map((hour, index) => (
                    <div key={hour} className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{hour}</span>
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        {index === 0 ? 'Peak' : `Top ${index + 1}`}
                      </Badge>
                    </div>
                  ))}
                  {getTopLearningHours(learning_patterns).length === 0 && (
                    <p className="text-sm text-gray-500">
                      Keep learning to discover your peak hours!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Learning Style */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Learning Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {learning_patterns.learning_style && Object.entries(learning_patterns.learning_style.data)
                    .filter(([key, value]) => typeof value === 'number' && value > 0)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 4)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-900 capitalize">
                          {type.replace('_', ' ')}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Progress value={(count as number) / 10 * 100} className="w-20" />
                          <span className="text-sm text-gray-600 w-8">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Effectiveness</span>
                  <span className="font-semibold">
                    {study_insights.avg_effectiveness?.toFixed(1) || 'N/A'}/5
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Focus Score</span>
                  <span className="font-semibold">
                    {study_insights.avg_focus_score?.toFixed(1) || 'N/A'}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Length</span>
                  <span className="font-semibold">
                    {Math.round(study_insights.avg_session_length || 0)} min
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <Badge variant="default">
                    {study_insights.completed_sessions || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Missed</span>
                  <Badge variant={study_insights.missed_sessions > 0 ? "destructive" : "secondary"}>
                    {study_insights.missed_sessions || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="font-semibold">
                    {study_insights.completed_sessions && study_insights.missed_sessions
                      ? Math.round((study_insights.completed_sessions / (study_insights.completed_sessions + study_insights.missed_sessions)) * 100)
                      : 100}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rewards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {study_insights.total_xp_earned || 0}
                  </p>
                  <p className="text-sm text-gray-600">XP Earned</p>
                </div>
                <div className="text-center pt-2">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Level {overview.current_level}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}