'use client';

import React, { useState } from 'react';
import { UserJourneyStage, useUserJourneyStage } from '@/hooks/useUserJourneyStage';
import { PersonalizedGreeting } from './PersonalizedGreeting';
import { SetupMissions } from './SetupMissions';
import { BlankStateCTA } from './BlankStateCTA';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target,
  Zap,
  Brain,
  TrendingUp,
  Calendar,
  BookOpen,
  Trophy,
  ChevronRight,
  Info,
  Lock,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProgressiveDashboardProps {
  userName?: string;
  dashboardData?: any;
  aiRecommendations?: any[];
  onActionClick?: (action: any) => void;
}

export function ProgressiveDashboard({
  userName,
  dashboardData,
  aiRecommendations = [],
  onActionClick
}: ProgressiveDashboardProps) {
  const { stage, metrics, isLoading } = useUserJourneyStage();
  const [activeTab, setActiveTab] = useState('overview');
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);

  // Debug logging (commented out for production)
  // console.log('🎨 ProgressiveDashboard Debug:', {
  //   stage,
  //   metrics,
  //   coursesCount: metrics.coursesCount,
  //   showingSetupMissions: stage === UserJourneyStage.FIRST_VISIT
  // });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="h-32" />
        </Card>
      </div>
    );
  }

  // Define which features are available at each stage
  const features = {
    missions: [UserJourneyStage.FIRST_VISIT, UserJourneyStage.ONBOARDED].includes(stage),
    weeklyGoals: ![UserJourneyStage.FIRST_VISIT].includes(stage),
    aiRecommendations: [UserJourneyStage.ACTIVE_LEARNER, UserJourneyStage.POWER_USER].includes(stage),
    advancedAnalytics: [UserJourneyStage.POWER_USER].includes(stage),
    scheduling: [UserJourneyStage.ACTIVE_LEARNER, UserJourneyStage.POWER_USER].includes(stage),
    achievements: ![UserJourneyStage.FIRST_VISIT, UserJourneyStage.ONBOARDED].includes(stage)
  };

  // Helper function to show locked features with tooltip
  const LockedFeature = ({ children, unlockStage, featureName }: any) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative opacity-50 cursor-not-allowed">
            {children}
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
              <Lock className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {featureName} unlocks when you become a{' '}
            <span className="font-semibold">{unlockStage}</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-6">
      {/* Personalized Greeting */}
      <PersonalizedGreeting 
        userName={userName} 
        onActionClick={onActionClick}
      />

      {/* Stage-specific content */}
      {stage === UserJourneyStage.FIRST_VISIT && (
        <SetupMissions 
          onMissionComplete={(id) => setCompletedMissions([...completedMissions, id])}
          completedMissions={completedMissions}
          coursesCount={metrics.coursesCount}
        />
      )}

      {stage === UserJourneyStage.ONBOARDED && metrics.coursesCount === 0 && (
        <BlankStateCTA />
      )}

      {/* Main Dashboard Content with Progressive Tabs */}
      {![UserJourneyStage.FIRST_VISIT].includes(stage) && (
        <Card>
          <CardHeader>
            <CardTitle>Your Learning Hub</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="goals" disabled={!features.weeklyGoals}>
                  Goals
                  {!features.weeklyGoals && <Lock className="h-3 w-3 ml-1" />}
                </TabsTrigger>
                <TabsTrigger value="insights" disabled={!features.aiRecommendations}>
                  AI Insights
                  {!features.aiRecommendations && <Lock className="h-3 w-3 ml-1" />}
                </TabsTrigger>
                <TabsTrigger value="analytics" disabled={!features.advancedAnalytics}>
                  Analytics
                  {!features.advancedAnalytics && <Lock className="h-3 w-3 ml-1" />}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab - Available to all */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Focus */}
                  <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Target className="h-4 w-4 mr-2 text-blue-600" />
                        Current Focus
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dashboardData?.current_focus ? (
                        <div>
                          <p className="font-medium">{dashboardData.current_focus.title}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {dashboardData.current_focus.description}
                          </p>
                          <Button size="sm" className="mt-3">
                            Continue <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Add courses to see your personalized focus areas
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="border-green-200 bg-green-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-green-600" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <BookOpen className="h-3 w-3 mr-2" />
                        Browse Courses
                      </Button>
                      {features.scheduling ? (
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Calendar className="h-3 w-3 mr-2" />
                          Schedule Study Time
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full justify-start opacity-50" 
                                disabled
                              >
                                <Calendar className="h-3 w-3 mr-2" />
                                Schedule Study Time
                                <Lock className="h-3 w-3 ml-auto" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Unlocks as Active Learner</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity - Shows for users with activity */}
                {metrics.tasksCompleted > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Tasks completed today</span>
                          <Badge variant="secondary">{metrics.tasksCompleted}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Study streak</span>
                          <Badge variant="secondary">{metrics.streakDays} days</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Goals Tab - Available from GETTING_STARTED */}
              <TabsContent value="goals" className="space-y-4 mt-4">
                {features.weeklyGoals ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Weekly Goals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Weekly goals content */}
                        <p className="text-sm text-gray-600">
                          Track your progress towards weekly learning goals
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Lock className="h-8 w-8 mx-auto mb-2" />
                    <p>Complete setup missions to unlock goals</p>
                  </div>
                )}
              </TabsContent>

              {/* AI Insights Tab - Available from ACTIVE_LEARNER */}
              <TabsContent value="insights" className="space-y-4 mt-4">
                {features.aiRecommendations ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center">
                          <Brain className="h-4 w-4 mr-2 text-purple-600" />
                          AI-Powered Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {aiRecommendations.map((rec, idx) => (
                          <div key={idx} className="p-3 bg-purple-50 rounded-lg mb-2">
                            <p className="text-sm font-medium">{rec.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Lock className="h-8 w-8 mx-auto mb-2" />
                    <p>Become an Active Learner to unlock AI insights</p>
                  </div>
                )}
              </TabsContent>

              {/* Analytics Tab - Available for POWER_USER */}
              <TabsContent value="analytics" className="space-y-4 mt-4">
                {features.advancedAnalytics ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Advanced Analytics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          Deep insights into your learning patterns
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Lock className="h-8 w-8 mx-auto mb-2" />
                    <p>Power Users get access to advanced analytics</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Feature Discovery Card - Shows features user is close to unlocking */}
      {stage !== UserJourneyStage.POWER_USER && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
              Coming Up Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Features you'll unlock as you progress:
            </p>
            <div className="space-y-2">
              {!features.weeklyGoals && (
                <div className="flex items-center text-sm">
                  <Target className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Weekly Goals & Progress Tracking</span>
                </div>
              )}
              {!features.aiRecommendations && (
                <div className="flex items-center text-sm">
                  <Brain className="h-4 w-4 mr-2 text-gray-400" />
                  <span>AI-Powered Study Recommendations</span>
                </div>
              )}
              {!features.scheduling && (
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Smart Study Scheduling</span>
                </div>
              )}
              {!features.advancedAnalytics && (
                <div className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Advanced Learning Analytics</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}