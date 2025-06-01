"use client";

import { SharedDashboardLayout } from "@/components/dashboard/layouts/SharedDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { userAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { 
  useStudyPlanDashboard, 
  useGoalPriority, 
  useApplyRecommendation,
  useUpdateGoalStatus,
  useCreateStudyPlan,
  useCreateGoal,
  useStartSession
} from "@/hooks/useStudyPlans";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, 
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Brain,
  Star,
  Flame,
  ChevronDown,
  ChevronRight,
  Plus,
  BarChart3,
  Sparkles,
  FileText,
  Video,
  Trophy,
  Play,
  RotateCcw
} from "lucide-react";

export default function StudyPlanPage() {
  const [activeRecommendations, setActiveRecommendations] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [planFormData, setPlanFormData] = useState({
    plan_name: '',
    weekly_study_hours: 12,
    preferred_session_length: 45,
    learning_style: '',
    difficulty_preference: 'adaptive'
  });
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    description: '',
    goal_type: 'weekly',
    priority: 'medium',
    estimated_hours: '',
    target_date: ''
  });

  const router = useRouter();
  
  // Study plan hooks
  const {
    activePlan,
    weeklyGoals,
    todayGoals,
    urgentGoals,
    recommendations,
    analytics,
    isLoading,
    refetchAll
  } = useStudyPlanDashboard();
  
  const { getPriorityColor, getStatusColor } = useGoalPriority();
  const { execute: applyRecommendation } = useApplyRecommendation();
  const { execute: updateGoalStatus } = useUpdateGoalStatus();
  const { execute: createStudyPlan } = useCreateStudyPlan();
  const { execute: createGoal } = useCreateGoal();
  const { execute: startSession } = useStartSession();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await userAPI.getMe();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        // Fallback for development
        setCurrentUser({ name: "Student User", email: "student@example.com" });
      }
    };

    fetchUser();
  }, []);
  
  const toggleRecommendation = async (recId: string) => {
    try {
      await applyRecommendation(recId);
      setActiveRecommendations(prev => new Set(prev).add(recId));
      refetchAll(); // Refresh data after applying recommendation
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
    }
  };

  const handleGoalAction = async (goalId: string, currentStatus: string) => {
    try {
      let newStatus = currentStatus;
      
      if (currentStatus === 'pending') {
        newStatus = 'in_progress';
        toast.success('🎯 Goal started! Good luck!');
      } else if (currentStatus === 'in_progress') {
        newStatus = 'completed';
        toast.success('🎉 Congratulations! Goal completed!');
      }
      
      if (newStatus !== currentStatus) {
        await updateGoalStatus({ goalId, status: newStatus });
        refetchAll();
      }
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  const handleStartStudySession = async (goalId: string, goalTitle: string) => {
    try {
      await startSession({
        goal_id: goalId,
        session_type: 'study',
        planned_duration: activePlan?.preferred_session_length || 45
      });
      toast.success(`📚 Study session started for: ${goalTitle}`);
      // Could redirect to a study session page
      // router.push(`/study-session/${sessionId}`);
    } catch (error) {
      console.error('Failed to start study session:', error);
    }
  };

  const handleCreatePlan = async () => {
    try {
      await createStudyPlan({
        ...planFormData,
        is_active: true
      });
      setShowCreatePlan(false);
      setPlanFormData({
        plan_name: '',
        weekly_study_hours: 12,
        preferred_session_length: 45,
        learning_style: '',
        difficulty_preference: 'adaptive'
      });
      refetchAll();
    } catch (error) {
      console.error('Failed to create study plan:', error);
    }
  };

  const handleCreateGoal = async () => {
    try {
      if (!activePlan) {
        toast.error('Please create a study plan first');
        return;
      }

      await createGoal({
        study_plan_id: activePlan.id,
        ...goalFormData,
        estimated_hours: goalFormData.estimated_hours ? parseFloat(goalFormData.estimated_hours) : undefined,
        target_date: goalFormData.target_date || undefined
      });

      setShowCreateGoal(false);
      setGoalFormData({
        title: '',
        description: '',
        goal_type: 'weekly',
        priority: 'medium',
        estimated_hours: '',
        target_date: ''
      });
      refetchAll();
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-goal':
        setShowCreateGoal(true);
        break;
      case 'study-session':
        if (urgentGoals && urgentGoals.length > 0) {
          handleStartStudySession(urgentGoals[0].id, urgentGoals[0].title);
        } else {
          toast.info('Create some goals first to start a study session');
        }
        break;
      case 'add-material':
        router.push('/courses');
        break;
      case 'progress-report':
        router.push('/dashboard');
        break;
      case 'study-group':
        toast.info('Study groups feature coming soon!');
        break;
      default:
        toast.info(`${action} feature coming soon!`);
    }
  };

  // Format goals for display
  const displayGoals = weeklyGoals?.map(goal => ({
    id: goal.id,
    title: goal.title,
    dueDate: goal.target_date ? formatDueDate(goal.target_date) : 'No due date',
    priority: goal.priority,
    estimatedTime: goal.estimated_hours ? `${goal.estimated_hours} hours` : 'Not estimated',
    progress: goal.completion_percentage,
    status: goal.status
  })) || [];
  
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Overdue';
    if (diffDays <= 7) return `${diffDays} days`;
    return date.toLocaleDateString();
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'schedule': return <Brain className="h-5 w-5 text-purple-600" />;
      case 'technique': return <Zap className="h-5 w-5 text-yellow-600" />;
      case 'content': return <Target className="h-5 w-5 text-green-600" />;
      default: return <Sparkles className="h-5 w-5 text-blue-600" />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SharedDashboardLayout pageTitle="Study Plan" showGamification={false} currentUser={currentUser}>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your study plan...</p>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }
  
  // No active plan state
  if (!activePlan) {
    return (
      <SharedDashboardLayout pageTitle="Study Plan" showGamification={false} currentUser={currentUser}>
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Study Plan</h2>
          <p className="text-gray-600 mb-6">Create your first study plan to get started with personalized learning.</p>
          
          <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Study Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Your Study Plan</DialogTitle>
                <DialogDescription>
                  Set up a personalized study plan to achieve your learning goals.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="plan_name">Plan Name</Label>
                  <Input
                    id="plan_name"
                    value={planFormData.plan_name}
                    onChange={(e) => setPlanFormData({...planFormData, plan_name: e.target.value})}
                    placeholder="e.g., Spring 2024 Study Plan"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weekly_hours">Weekly Study Hours</Label>
                  <Input
                    id="weekly_hours"
                    type="number"
                    value={planFormData.weekly_study_hours}
                    onChange={(e) => setPlanFormData({...planFormData, weekly_study_hours: parseInt(e.target.value)})}
                    min="1"
                    max="80"
                  />
                </div>
                
                <div>
                  <Label htmlFor="session_length">Preferred Session Length (minutes)</Label>
                  <Input
                    id="session_length"
                    type="number"
                    value={planFormData.preferred_session_length}
                    onChange={(e) => setPlanFormData({...planFormData, preferred_session_length: parseInt(e.target.value)})}
                    min="15"
                    max="180"
                  />
                </div>
                
                <div>
                  <Label htmlFor="learning_style">Learning Style</Label>
                  <Select value={planFormData.learning_style} onValueChange={(value) => setPlanFormData({...planFormData, learning_style: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your learning style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual">Visual</SelectItem>
                      <SelectItem value="auditory">Auditory</SelectItem>
                      <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreatePlan(false)}>Cancel</Button>
                <Button onClick={handleCreatePlan} disabled={!planFormData.plan_name}>
                  Create Plan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SharedDashboardLayout>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-600" />;
      case "pending": return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <SharedDashboardLayout pageTitle="Study Plan" showGamification={false} currentUser={currentUser}>
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
            <CardContent>
              <div className="mt-4 space-y-4">
                {/* Next Best Step Banner */}
                {urgentGoals && urgentGoals.length > 0 && (
                  <div className="rounded-lg bg-primary/10 border border-primary/10 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>Next Best Step: {urgentGoals[0].title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">
                        <Trophy className="h-3 w-3" />
                        +{urgentGoals[0].xp_reward} XP
                      </span>
                      <Button 
                        size="sm"
                        onClick={() => handleStartStudySession(urgentGoals[0].id, urgentGoals[0].title)}
                        className="px-3 py-1 border border-primary text-primary text-sm font-medium rounded hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start Now
                      </Button>
                    </div>
                  </div>
                )}
                
                {displayGoals.length > 0 ? (
                  displayGoals.map((goal) => (
                    <div key={goal.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
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
                      
                      <div className="flex justify-between mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartStudySession(goal.id, goal.title)}
                          disabled={goal.status === "completed"}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Study
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant={goal.status === "completed" ? "secondary" : "default"}
                          disabled={goal.status === "completed"}
                          onClick={() => handleGoalAction(goal.id, goal.status)}
                        >
                          {goal.status === "completed" ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </>
                          ) : goal.status === "in_progress" ? (
                            "Mark Complete"
                          ) : (
                            "Start Goal"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No goals for this week</p>
                    <p className="text-xs mb-4">Create new goals to get started</p>
                    <Button onClick={() => setShowCreateGoal(true)} size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Create Goal
                    </Button>
                  </div>
                )}
              </div>
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
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics?.plan_analytics ? Math.round((analytics.plan_analytics.completed_goals / Math.max(analytics.plan_analytics.total_goals, 1)) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-500">Goals Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics?.plan_analytics?.total_study_hours || 0}h
                  </div>
                  <div className="text-sm text-gray-500">Study Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((analytics?.plan_analytics?.avg_effectiveness || 0) * 10) / 10}
                  </div>
                  <div className="text-sm text-gray-500">Efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {analytics?.plan_analytics?.study_days || 0}
                  </div>
                  <div className="text-sm text-gray-500">Study Days</div>
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
              {recommendations && recommendations.length > 0 ? (
                recommendations.map((rec) => {
                  const isActive = activeRecommendations.has(rec.id) || rec.status === 'applied';
                  return (
                    <div 
                      key={rec.id} 
                      className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                        isActive 
                          ? "border-green-300 bg-green-50 shadow-sm" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => !isActive && toggleRecommendation(rec.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">{getRecommendationIcon(rec.recommendation_type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {rec.title}
                            </h4>
                            {isActive && (
                              <div className="flex items-center space-x-1 bg-green-100 px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-medium text-green-700">+{rec.xp_reward} XP</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {rec.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Button 
                              size="sm" 
                              variant={isActive ? "default" : "outline"} 
                              className={`text-xs ${isActive ? "bg-green-600 hover:bg-green-700" : ""}`}
                              disabled={isActive}
                            >
                              {isActive ? "Applied" : rec.action_text || "Apply"}
                            </Button>
                            {isActive && (
                              <span className="text-xs text-green-600 font-medium">Active</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No recommendations available</p>
                  <p className="text-xs">Complete more study sessions to get AI suggestions</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full justify-between bg-blue-600 hover:bg-blue-700">
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleQuickAction('new-goal')}>
                    <Target className="h-4 w-4 mr-2" />
                    Set New Goal
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleQuickAction('study-session')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Start Study Session
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleQuickAction('add-material')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Add Study Material
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleQuickAction('progress-report')}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Progress Report
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => handleQuickAction('study-group')}>
                    <Video className="h-4 w-4 mr-2" />
                    Join Study Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Goal Dialog */}
      <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription>
              Add a new goal to your study plan to stay organized and motivated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="goal_title">Goal Title</Label>
              <Input
                id="goal_title"
                value={goalFormData.title}
                onChange={(e) => setGoalFormData({...goalFormData, title: e.target.value})}
                placeholder="e.g., Complete Chapter 5 exercises"
              />
            </div>
            
            <div>
              <Label htmlFor="goal_description">Description (Optional)</Label>
              <Textarea
                id="goal_description"
                value={goalFormData.description}
                onChange={(e) => setGoalFormData({...goalFormData, description: e.target.value})}
                placeholder="Additional details about this goal..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goal_type">Goal Type</Label>
                <Select value={goalFormData.goal_type} onValueChange={(value) => setGoalFormData({...goalFormData, goal_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="practice">Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="goal_priority">Priority</Label>
                <Select value={goalFormData.priority} onValueChange={(value) => setGoalFormData({...goalFormData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.5"
                  value={goalFormData.estimated_hours}
                  onChange={(e) => setGoalFormData({...goalFormData, estimated_hours: e.target.value})}
                  placeholder="2.5"
                />
              </div>
              
              <div>
                <Label htmlFor="target_date">Target Date</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={goalFormData.target_date}
                  onChange={(e) => setGoalFormData({...goalFormData, target_date: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGoal(false)}>Cancel</Button>
            <Button onClick={handleCreateGoal} disabled={!goalFormData.title}>
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SharedDashboardLayout>
  );
}