'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Target,
  Crown,
  Brain,
  Calendar,
  Award,
  ArrowRight,
  Trophy,
  Flame,
  Clock,
  BookOpen,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardMode } from '@/hooks/useDashboardMode';
import { useStudyTime } from '@/hooks/useStudyTime';
import { useGamification } from '@/contexts/GamificationContext';

interface AdvancedDashboardProps {
  userName: string;
  dashboardData?: any;
  aiRecommendations?: any[];
  onActionClick?: (action: any) => void;
}

export function AdvancedDashboard({ 
  userName, 
  dashboardData, 
  aiRecommendations, 
  onActionClick 
}: AdvancedDashboardProps) {
  const { metrics, userStats } = useDashboardMode();
  const { weeklyStudyHours, monthlyStudyHours } = useStudyTime('month');
  const { userStats: gamificationStats } = useGamification();

  // Advanced analytics data
  const advancedMetrics = {
    learningVelocity: Math.round(((userStats?.total_xp || 0) / Math.max(metrics.daysSinceSignup, 1)) * 7), // XP per week
    efficiencyScore: Math.round((weeklyStudyHours > 0 ? (userStats?.total_xp || 0) / weeklyStudyHours : 0) * 10) / 10,
    consistencyScore: Math.min((gamificationStats?.current_streak || 0) * 10, 100),
    masteryLevel: Math.floor(((userStats?.total_xp || 0) / 1000) * 5), // 0-5 mastery level
    peerComparison: Math.round(Math.random() * 30) + 70 // Mock peer comparison (70-100%)
  };

  const powerUserFeatures = [
    {
      id: 'ai-optimization',
      title: 'AI Study Optimization',
      description: 'Personalized learning path based on your patterns',
      icon: Brain,
      status: 'available',
      action: () => console.log('AI Optimization'),
      color: 'purple'
    },
    {
      id: 'peer-collaboration',
      title: 'Peer Learning Network',
      description: 'Connect with study partners at your level',
      icon: Users,
      status: 'available',
      action: () => console.log('Peer Network'),
      color: 'blue'
    },
    {
      id: 'advanced-analytics',
      title: 'Learning Analytics',
      description: 'Deep insights into your learning patterns',
      icon: BarChart3,
      status: 'available',
      action: () => window.location.href = '/analytics',
      color: 'green'
    },
    {
      id: 'expert-mode',
      title: 'Expert Study Mode',
      description: 'Advanced tools for power learners',
      icon: Crown,
      status: 'beta',
      action: () => console.log('Expert Mode'),
      color: 'yellow'
    }
  ];

  const leaderboardData = [
    { rank: 1, name: 'Alex Chen', xp: 2450, avatar: 'AC' },
    { rank: 2, name: 'Maria Garcia', xp: 2380, avatar: 'MG' },
    { rank: 3, name: 'You', xp: userStats?.total_xp || 0, avatar: '👤', isCurrentUser: true },
    { rank: 4, name: 'John Smith', xp: 2120, avatar: 'JS' },
    { rank: 5, name: 'Sarah Wilson', xp: 2050, avatar: 'SW' }
  ].sort((a, b) => b.xp - a.xp);

  const getColorClasses = (color: string) => {
    const colors = {
      purple: 'text-purple-600 bg-purple-100',
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      yellow: 'text-yellow-600 bg-yellow-100'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Power User Hero */}
      <Card className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-8 h-8 text-yellow-500" />
                <h1 className="text-3xl font-bold">Power User Dashboard</h1>
                <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  Expert Level
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">
                Welcome back, {userName}! Here are your advanced learning insights.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                Level {Math.floor((userStats?.total_xp || 0) / 100)}
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.floor((userStats?.total_xp || 0) / 100) >= 10 ? 'Master Learner' :
                 Math.floor((userStats?.total_xp || 0) / 100) >= 5 ? 'Advanced Scholar' :
                 Math.floor((userStats?.total_xp || 0) / 100) >= 2 ? 'Dedicated Student' :
                 'Learning Expert'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Learning Velocity</p>
                <p className="text-2xl font-bold text-purple-600">
                  {advancedMetrics.learningVelocity}
                </p>
                <p className="text-xs text-muted-foreground">XP per week</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Efficiency Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {advancedMetrics.efficiencyScore}
                </p>
                <p className="text-xs text-muted-foreground">XP per hour</p>
              </div>
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consistency</p>
                <p className="text-2xl font-bold text-green-600">
                  {advancedMetrics.consistencyScore}%
                </p>
                <p className="text-xs text-muted-foreground">Streak performance</p>
              </div>
              <Flame className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peer Ranking</p>
                <p className="text-2xl font-bold text-yellow-600">
                  Top {100 - advancedMetrics.peerComparison}%
                </p>
                <p className="text-xs text-muted-foreground">vs. peers</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Power User Features */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              Power User Features
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Advanced tools unlocked by your expertise level
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {powerUserFeatures.map((feature) => {
                const IconComponent = feature.icon;
                
                return (
                  <div
                    key={feature.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                    onClick={feature.action}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-full", getColorClasses(feature.color))}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{feature.title}</h3>
                          {feature.status === 'beta' && (
                            <Badge variant="outline" className="text-xs">Beta</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                        <Button size="sm" variant="ghost" className="mt-2 p-0 h-auto">
                          Explore <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Weekly Leaderboard
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your position among peer learners
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboardData.slice(0, 5).map((user, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg",
                    user.isCurrentUser ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    user.rank === 1 ? "bg-yellow-500 text-white" :
                    user.rank === 2 ? "bg-gray-400 text-white" :
                    user.rank === 3 ? "bg-orange-500 text-white" :
                    user.isCurrentUser ? "bg-blue-500 text-white" :
                    "bg-gray-200 text-gray-600"
                  )}>
                    {user.rank <= 3 ? (
                      <Trophy className="w-4 h-4" />
                    ) : (
                      user.rank
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-medium",
                      user.isCurrentUser && "text-blue-700"
                    )}>
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.xp.toLocaleString()} XP
                    </p>
                  </div>
                  {user.isCurrentUser && (
                    <Badge variant="secondary">You</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Learning Analytics Overview
          </CardTitle>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Deep insights into your learning patterns
            </p>
            <Button size="sm" variant="outline">
              View Full Analytics <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Study Time Analysis */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Study Time Analysis
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>This Week</span>
                  <span className="font-medium">{weeklyStudyHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>This Month</span>
                  <span className="font-medium">{monthlyStudyHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Session</span>
                  <span className="font-medium">45min</span>
                </div>
              </div>
            </div>

            {/* Performance Trends */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Performance Trends
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>XP Growth</span>
                  <span className="font-medium text-green-600">↑ 15%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Study Efficiency</span>
                  <span className="font-medium text-green-600">↑ 8%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Consistency</span>
                  <span className="font-medium text-blue-600">→ Stable</span>
                </div>
              </div>
            </div>

            {/* Subject Mastery */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Star className="w-4 h-4" />
                Subject Mastery
              </h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Computer Science</span>
                    <span className="font-medium">Expert</span>
                  </div>
                  <Progress value={85} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Mathematics</span>
                    <span className="font-medium">Advanced</span>
                  </div>
                  <Progress value={70} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Physics</span>
                    <span className="font-medium">Intermediate</span>
                  </div>
                  <Progress value={55} className="h-1" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations for Power Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Optimizations
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Personalized recommendations based on your advanced learning patterns
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getSmartRecommendations().length > 0 ? (
              getSmartRecommendations().map((rec, index) => (
                <div key={index} className="p-4 border rounded-lg bg-purple-50">
                  <h4 className="font-semibold mb-2">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {rec.description}
                  </p>
                  <Button size="sm" variant="outline">
                    {rec.type === 'celebration' ? 'Celebrate' : 
                     rec.type === 'schedule' ? 'Optimize Schedule' : 'Improve Focus'}
                  </Button>
                </div>
              ))
            ) : (
              <>
                <div className="p-4 border rounded-lg bg-purple-50">
                  <h4 className="font-semibold mb-2">Performance Excellence</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your learning patterns are optimized! Keep maintaining this high performance.
                  </p>
                  <Button size="sm" variant="outline">
                    View Insights
                  </Button>
                </div>
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-semibold mb-2">Knowledge Mastery</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    You're excelling across subjects. Consider exploring advanced topics.
                  </p>
                  <Button size="sm" variant="outline">
                    Explore Advanced
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}