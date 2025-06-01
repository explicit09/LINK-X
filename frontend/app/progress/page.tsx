'use client';

import { useState, useEffect } from 'react';
import { userAPI } from '@/lib/api';
import { SharedDashboardLayout } from '@/components/dashboard/layouts/SharedDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Clock,
  BookOpen,
  Zap,
  Calendar,
  Star,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Edit3,
  AlertTriangle,
  CheckCircle,
  Users,
  ArrowRight,
  Brain,
  Timer,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProgressPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [showEditGoals, setShowEditGoals] = useState(false);
  const [showEfficiencyModal, setShowEfficiencyModal] = useState(false);
  const [expandedAssignmentType, setExpandedAssignmentType] = useState<{
    courseId: string;
    type: 'completed' | 'inProgress' | 'overdue';
  } | null>(null);
  const [showRetentionDrawer, setShowRetentionDrawer] = useState(false);
  const [showOverdueDrawer, setShowOverdueDrawer] = useState(false);
  const [selectedOverdueCourse, setSelectedOverdueCourse] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await userAPI.getMe();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setCurrentUser({ name: 'Student User', email: 'student@example.com' });
      }
    };

    fetchUser();
  }, []);

  const courseProgress = [
    {
      id: '1',
      code: 'CS229',
      title: 'Machine Learning',
      progress: 85,
      completed: 17,
      inProgress: 3,
      overdue: 1,
      remaining: 4,
      grade: 'A-',
      weeklyChange: '+12%',
      totalHours: 45,
      lastActive: '2 hours ago',
      color: '#3B82F6',
      assignments: [
        {
          title: 'Neural Networks Project',
          status: 'overdue',
          due: '2 days ago',
        },
        {
          title: 'Gradient Descent Lab',
          status: 'in-progress',
          due: 'Tomorrow',
        },
        { title: 'SVM Implementation', status: 'pending', due: 'Next week' },
        { title: 'Final Exam Prep', status: 'pending', due: '2 weeks' },
      ],
    },
    {
      id: '2',
      code: 'CS224n',
      title: 'Natural Language Processing',
      progress: 42,
      completed: 8,
      inProgress: 2,
      overdue: 0,
      remaining: 9,
      grade: 'B+',
      weeklyChange: '+8%',
      totalHours: 28,
      lastActive: 'Yesterday',
      color: '#8B5CF6',
      assignments: [
        {
          title: 'Transformer Implementation',
          status: 'in-progress',
          due: '3 days',
        },
        { title: 'BERT Fine-tuning', status: 'in-progress', due: '5 days' },
        { title: 'Final Project Proposal', status: 'pending', due: '1 week' },
      ],
    },
    {
      id: '3',
      code: 'CS231n',
      title: 'Computer Vision',
      progress: 67,
      completed: 12,
      inProgress: 1,
      overdue: 0,
      remaining: 5,
      grade: 'A',
      weeklyChange: '+15%',
      totalHours: 38,
      lastActive: '5 hours ago',
      color: '#F59E0B',
      assignments: [
        {
          title: 'CNN Architecture Project',
          status: 'in-progress',
          due: '4 days',
        },
        { title: 'Object Detection Lab', status: 'pending', due: '1 week' },
        {
          title: 'Style Transfer Implementation',
          status: 'pending',
          due: '2 weeks',
        },
      ],
    },
    {
      id: '4',
      code: 'CS161',
      title: 'Algorithms',
      progress: 90,
      completed: 18,
      inProgress: 1,
      overdue: 0,
      remaining: 2,
      grade: 'A+',
      weeklyChange: '+5%',
      totalHours: 52,
      lastActive: '1 hour ago',
      color: '#10B981',
      assignments: [
        {
          title: 'Graph Algorithms Problem Set',
          status: 'in-progress',
          due: '2 days',
        },
        { title: 'Dynamic Programming Quiz', status: 'pending', due: '1 week' },
      ],
    },
  ];

  const achievements = [
    {
      icon: '🔥',
      title: '5-Day Streak',
      description: 'Studied every day this week',
      date: 'Today',
      xp: '+50 XP',
      clickable: true,
      action: 'share',
    },
    {
      icon: '🎯',
      title: 'Deadline Crusher',
      description: 'Completed urgent assignment on time',
      date: 'Yesterday',
      xp: '+75 XP',
      clickable: true,
      action: 'view_session',
    },
    {
      icon: '⚡',
      title: 'Speed Learner',
      description: 'Finished CS161 module 20% faster',
      date: '2 days ago',
      xp: '+30 XP',
      clickable: true,
      action: 'view_session',
      faded: false,
    },
    {
      icon: '🧠',
      title: 'Knowledge Master',
      description: 'Scored 95% on CS229 quiz',
      date: '3 days ago',
      xp: '+100 XP',
      clickable: true,
      action: 'view_session',
      faded: false,
    },
    {
      icon: '📚',
      title: 'Course Champion',
      description: 'Top 10% in CS161',
      date: '1 week ago',
      xp: '+25 XP',
      clickable: false,
      faded: true,
    },
  ];

  const weeklyStats = {
    studyTime: { current: 12.5, target: 15, change: 2.5, trend: 'up' },
    completedTasks: { current: 18, target: 20, change: 6, trend: 'up' },
    avgScore: { current: 89, target: 85, change: 7, trend: 'up' },
    rank: { current: 3, total: 42, change: 2, trend: 'up' },
    focusEfficiency: { current: 72, target: 80, change: -5, trend: 'down' },
    retention: { current: 84, target: 85, change: 2, trend: 'up' },
  };

  // Next 7 days workload heat-map
  const workloadHeatmap = [
    { day: 'Mon', date: '24', hours: 4.5, status: 'normal', hasOverdue: false },
    { day: 'Tue', date: '25', hours: 3.2, status: 'normal', hasOverdue: false },
    {
      day: 'Wed',
      date: '26',
      hours: 7.8,
      status: 'overloaded',
      hasOverdue: true,
    },
    { day: 'Thu', date: '27', hours: 2.1, status: 'light', hasOverdue: false },
    { day: 'Fri', date: '28', hours: 5.5, status: 'normal', hasOverdue: true },
    { day: 'Sat', date: '29', hours: 6.2, status: 'heavy', hasOverdue: false },
    { day: 'Sun', date: '30', hours: 1.8, status: 'light', hasOverdue: false },
  ];

  // Weekly goal sparklines (7 days of data)
  const goalSparklines = {
    studyTime: [10, 11, 13, 12, 14, 15, 12.5], // Daily hours
    tasks: [2, 3, 4, 2, 3, 2, 2], // Daily completed tasks
    courseProgress: [68, 69, 69, 70, 70, 71, 71], // Daily average %
  };

  const getWorkloadColor = (status: string) => {
    switch (status) {
      case 'overloaded':
        return 'bg-red-500 text-white';
      case 'heavy':
        return 'bg-orange-500 text-white';
      case 'normal':
        return 'bg-green-500 text-white';
      case 'light':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-300 text-gray-600';
    }
  };

  const handleKPIClick = (metric: string) => {
    switch (metric) {
      case 'studyTime':
        toast.success(
          'Redirecting to Focus Stack with time-boosting sessions...',
        );
        // Navigate to schedule with filtered high-value sessions
        break;
      case 'tasks':
        toast.success('Opening priority task queue...');
        break;
      case 'score':
        toast.success('Analyzing weak performance areas...');
        break;
      case 'rank':
        toast.success('Showing leaderboard and improvement opportunities...');
        break;
      case 'focus':
        if (weeklyStats.focusEfficiency.current < 75) {
          setShowEfficiencyModal(true);
        } else {
          toast.success('Focus efficiency on track! Keep up the great work.');
        }
        console.log('📊 Analytics: efficiency_fix_clicked', {
          currentEfficiency: weeklyStats.focusEfficiency.current,
        });
        break;
      case 'retention':
        setShowRetentionDrawer(true);
        break;
    }
  };

  const handleAchievementClick = (achievement: any) => {
    if (!achievement.clickable) return;

    if (achievement.action === 'share') {
      toast.success('Achievement shared to social feed!');
    } else if (achievement.action === 'view_session') {
      toast.success('Opening related study session...');
    }
  };

  const handleWorkloadClick = (day: any) => {
    if (day.status === 'overloaded') {
      toast.warning(
        `${day.day} is overloaded (${day.hours}h). Click to rebalance in Calendar.`,
      );
    } else {
      toast.info(
        `${day.day}: ${day.hours}h planned. Click to view/edit schedule.`,
      );
    }
  };

  const handleAssignmentPillClick = (
    courseId: string,
    type: 'completed' | 'inProgress' | 'overdue',
  ) => {
    const key = `${courseId}-${type}`;
    if (
      expandedAssignmentType?.courseId === courseId &&
      expandedAssignmentType?.type === type
    ) {
      setExpandedAssignmentType(null);
    } else {
      setExpandedAssignmentType({ courseId, type });
    }
  };

  const handleScheduleAll = (assignments: any[]) => {
    toast.success(
      `Scheduling ${assignments.length} assignments in next available slots...`,
    );
    // In real app: Navigate to schedule with auto-fill mode
  };

  const handleEfficiencyOptimization = () => {
    toast.success(
      'Auto-refactoring sessions to 25-min blocks for next 7 days...',
    );
    setShowEfficiencyModal(false);
    // In real app: Apply session splitting logic
  };

  const getPrescription = (metric: string, data: any) => {
    switch (metric) {
      case 'studyTime':
        const hoursNeeded = data.target - data.current;
        return hoursNeeded > 0
          ? `⚡ +${hoursNeeded}h to hit target ${data.target}h`
          : '🎯 Target achieved!';
      case 'tasks':
        const tasksNeeded = data.target - data.current;
        return tasksNeeded > 0
          ? `🚀 ${tasksNeeded} more tasks to goal`
          : '✅ Goal smashed!';
      case 'score':
        return data.current >= data.target
          ? '📈 Above target!'
          : `📚 +${data.target - data.current}% to target`;
      case 'rank':
        return `🏆 Beat ${data.current - 1} more to reach #${data.current - 1}`;
      case 'focus':
        return data.current < data.target
          ? '⏰ Try shorter 25min sessions'
          : '🔥 Efficiency on track!';
      case 'retention':
        return data.current < data.target
          ? '🧠 Review sessions 24h later'
          : '💯 Memory skills sharp!';
    }
  };

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up')
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (trend === 'down')
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    return null;
  };

  const MiniSparkline = ({
    data,
    target,
    color = 'green',
  }: { data: number[]; target: number; color?: string }) => {
    const max = Math.max(...data, target);
    const height = 22;

    return (
      <div className="flex items-end h-6 gap-0.5">
        {data.map((value, index) => (
          <div
            key={index}
            className={`w-1 rounded-t ${value >= target ? `bg-${color}-500` : `bg-${color}-300`}`}
            style={{ height: `${(value / max) * height}px` }}
            title={`Day ${index + 1}: ${value}`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        .hover\\:animate-\\[wiggle_0\\.5s_ease-in-out\\]:hover {
          animation: wiggle 0.5s ease-in-out;
        }
      `}</style>
      <SharedDashboardLayout
        pageTitle=""
        showGamification={false}
        currentUser={currentUser}
      >
        {/* Enhanced Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
          <span className="text-sm font-medium text-slate-500">
            Week 24, 2025
          </span>
        </div>

        {/* Actionable KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card
            className="bg-white shadow-sm ring-1 ring-slate-100 hover:ring-blue-300 cursor-pointer transition-all"
            onClick={() => handleKPIClick('studyTime')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-5 w-5 text-blue-600" />
                  {/* Streak flame when ≥5 days */}
                  <div
                    className="text-orange-500 cursor-pointer"
                    title="+25 XP streak bonus applied (7-day streak)"
                  >
                    🔥
                  </div>
                </div>
                {getTrendIcon(
                  weeklyStats.studyTime.trend,
                  weeklyStats.studyTime.change,
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Study Time</p>
                <p className="text-2xl font-bold text-blue-900">
                  {weeklyStats.studyTime.current}h
                </p>
                <p className="text-xs text-blue-600">
                  +{weeklyStats.studyTime.change}h vs last week
                </p>
                <p className="text-xs text-blue-700 font-medium">
                  {getPrescription('studyTime', weeklyStats.studyTime)}
                </p>
                {weeklyStats.studyTime.current <
                  weeklyStats.studyTime.target && (
                  <div className="flex items-center gap-1 mt-2">
                    <Badge
                      variant="destructive"
                      className="text-xs px-2 py-1 animate-pulse"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Fix Now
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-white shadow-sm ring-1 ring-slate-100 hover:ring-green-300 cursor-pointer transition-all"
            onClick={() => handleKPIClick('tasks')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-5 w-5 text-green-600" />
                {getTrendIcon(
                  weeklyStats.completedTasks.trend,
                  weeklyStats.completedTasks.change,
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Tasks Done</p>
                <p className="text-2xl font-bold text-green-900">
                  {weeklyStats.completedTasks.current}
                </p>
                <p className="text-xs text-green-600">
                  +{weeklyStats.completedTasks.change} vs last week
                </p>
                <p className="text-xs text-green-700 font-medium">
                  {getPrescription('tasks', weeklyStats.completedTasks)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-white shadow-sm ring-1 ring-slate-100 hover:ring-purple-300 cursor-pointer transition-all"
            onClick={() => handleKPIClick('score')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                {getTrendIcon(
                  weeklyStats.avgScore.trend,
                  weeklyStats.avgScore.change,
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-purple-900">
                  {weeklyStats.avgScore.current}%
                </p>
                <p className="text-xs text-purple-600">
                  +{weeklyStats.avgScore.change}% vs last week
                </p>
                <p className="text-xs text-purple-700 font-medium">
                  {getPrescription('score', weeklyStats.avgScore)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-white shadow-sm ring-1 ring-slate-100 hover:ring-yellow-300 cursor-pointer transition-all"
            onClick={() => handleKPIClick('rank')}
            title="Beat Alice (#2) by +3 XP or +1 completed task"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <Users className="h-3 w-3 text-gray-400" />
                </div>
                {getTrendIcon(weeklyStats.rank.trend, weeklyStats.rank.change)}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Rank</p>
                <p className="text-2xl font-bold text-yellow-900">
                  #{weeklyStats.rank.current} / {weeklyStats.rank.total}
                </p>
                <p className="text-xs text-yellow-600">
                  +{weeklyStats.rank.change} vs last week
                </p>
                <p className="text-xs text-yellow-700 font-medium">
                  {getPrescription('rank', weeklyStats.rank)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-white shadow-sm ring-1 ring-slate-100 hover:ring-orange-300 cursor-pointer transition-all"
            onClick={() => handleKPIClick('focus')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Brain className="h-5 w-5 text-orange-600" />
                {getTrendIcon(
                  weeklyStats.focusEfficiency.trend,
                  weeklyStats.focusEfficiency.change,
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">
                  Focus Efficiency
                </p>
                <p className="text-2xl font-bold text-orange-900">
                  {weeklyStats.focusEfficiency.current}%
                </p>
                <p className="text-xs text-orange-600">
                  {weeklyStats.focusEfficiency.change}% vs last week
                </p>
                <p className="text-xs text-orange-700 font-medium">
                  Cut 2 × 60min CS229 blocks to 30min
                </p>
                {weeklyStats.focusEfficiency.current < 80 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Badge
                      variant="destructive"
                      className="text-xs px-2 py-1 animate-pulse"
                    >
                      <Brain className="h-3 w-3 mr-1" />
                      Fix
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-white shadow-sm ring-1 ring-slate-100 hover:ring-indigo-300 cursor-pointer transition-all"
            onClick={() => handleKPIClick('retention')}
            title="Based on 25 spaced-repetition quizzes (last 30 days)"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <RotateCcw className="h-5 w-5 text-indigo-600" />
                {getTrendIcon(
                  weeklyStats.retention.trend,
                  weeklyStats.retention.change,
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Retention</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {weeklyStats.retention.current}%
                </p>
                <p className="text-xs text-indigo-600">
                  +{weeklyStats.retention.change}% vs last week
                </p>
                <p className="text-xs text-indigo-700 font-medium">
                  {getPrescription('retention', weeklyStats.retention)}
                </p>
                {weeklyStats.retention.current < 90 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Badge
                      className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-2 py-1 cursor-pointer"
                      onClick={() => {
                        toast.success(
                          '10-min flashcard session added to next free slot',
                        );
                        console.log('📊 Analytics: retention_review_now', {
                          currentRetention: weeklyStats.retention.current,
                        });
                      }}
                    >
                      <Brain className="h-3 w-3 mr-1" />
                      Review Now
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 7-Day Workload Heat-map */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Next 7 Days Workload</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Find overloaded day (Wed with 7.8h)
                  const overloadedDay = workloadHeatmap.find(
                    (d) => d.status === 'overloaded',
                  );
                  const targetDay = workloadHeatmap.find(
                    (d) => d.status === 'light',
                  );

                  if (overloadedDay && targetDay) {
                    const movedHours = 3.5;
                    const greenDaysCount = workloadHeatmap.filter(
                      (d) => d.status === 'normal' || d.status === 'light',
                    ).length;

                    toast.success(
                      `${overloadedDay.day} -${movedHours}h • Green days +${(movedHours / greenDaysCount).toFixed(1)}h`,
                      {
                        action: {
                          label: 'Undo',
                          onClick: () => toast.info('Load balancing reverted'),
                        },
                        duration: 8000,
                      },
                    );

                    // Analytics event
                    console.log('📊 Analytics: balance_load_click', {
                      fromDay: overloadedDay.day,
                      toDay: targetDay.day,
                      hoursMoveed: movedHours,
                    });
                  } else {
                    toast.info('No overloaded days to balance');
                  }
                }}
              >
                <Zap className="h-4 w-4 mr-1" />
                Balance Load
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {workloadHeatmap.map((day, index) => (
                <div
                  key={index}
                  className={`relative p-3 rounded-lg text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${getWorkloadColor(day.status)}`}
                  onClick={() => {
                    handleWorkloadClick(day);
                    // Analytics event
                    console.log('📊 Analytics: heatmap_day_click', {
                      day: day.day,
                      hours: day.hours,
                      status: day.status,
                    });
                    toast.info(`Opening Calendar filtered to ${day.day}...`);
                  }}
                >
                  {/* Urgency overlay strip */}
                  {day.hasOverdue && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 rounded-t-lg" />
                  )}
                  <div className="text-xs font-medium">{day.day}</div>
                  <div className="text-lg font-bold">{day.date}</div>
                  <div className="text-xs">{day.hours}h</div>
                  {day.status === 'overloaded' && (
                    <AlertTriangle className="h-3 w-3 mx-auto mt-1" />
                  )}
                  {day.hasOverdue && (
                    <div className="text-xs text-red-200 font-bold">!</div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Light (&lt;3h)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Normal (3-5h)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>Heavy (5-6h)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Overloaded (&gt;6h)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Course Progress */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>Course Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {courseProgress.slice(0, 5).map((course) => (
                  <div
                    key={course.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">
                            {course.code}
                          </h3>
                          <Badge
                            className={`text-xs px-2 py-0.5`}
                            style={{
                              backgroundColor: course.color + '20',
                              color: course.color,
                            }}
                          >
                            {course.grade}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{course.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedCourse(
                            expandedCourse === course.id ? null : course.id,
                          )
                        }
                      >
                        {expandedCourse === course.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{course.progress}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div
                            className="bg-green-500"
                            style={{
                              width: `${(course.completed / (course.completed + course.inProgress + course.overdue + course.remaining)) * 100}%`,
                            }}
                            title={`${course.completed} completed`}
                          />
                          <div
                            className="bg-blue-500"
                            style={{
                              width: `${(course.inProgress / (course.completed + course.inProgress + course.overdue + course.remaining)) * 100}%`,
                            }}
                            title={`${course.inProgress} in progress`}
                          />
                          <div
                            className="bg-red-500"
                            style={{
                              width: `${(course.overdue / (course.completed + course.inProgress + course.overdue + course.remaining)) * 100}%`,
                            }}
                            title={`${course.overdue} overdue`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <button
                          className="flex items-center gap-1 bg-green-100 hover:bg-green-200 px-3 py-2 rounded-full cursor-pointer transition-all hover:animate-[wiggle_0.5s_ease-in-out] border border-green-300"
                          onClick={() =>
                            handleAssignmentPillClick(course.id, 'completed')
                          }
                          title="Click to see completed assignments"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium">
                            {course.completed} done
                          </span>
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${
                              expandedAssignmentType?.courseId === course.id &&
                              expandedAssignmentType?.type === 'completed'
                                ? 'rotate-180'
                                : ''
                            }`}
                          />
                        </button>
                        <button
                          className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-full cursor-pointer transition-all hover:animate-[wiggle_0.5s_ease-in-out] border border-blue-300"
                          onClick={() =>
                            handleAssignmentPillClick(course.id, 'inProgress')
                          }
                          title="Click to see assignments in progress"
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium">
                            {course.inProgress} in progress
                          </span>
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${
                              expandedAssignmentType?.courseId === course.id &&
                              expandedAssignmentType?.type === 'inProgress'
                                ? 'rotate-180'
                                : ''
                            }`}
                          />
                        </button>
                        {course.overdue > 0 && (
                          <button
                            className="flex items-center gap-1 bg-red-100 hover:bg-red-200 px-3 py-2 rounded-full cursor-pointer transition-all hover:animate-[wiggle_0.5s_ease-in-out] border border-red-300 animate-pulse"
                            onClick={() => {
                              setSelectedOverdueCourse(course);
                              setShowOverdueDrawer(true);
                              // Analytics event
                              console.log('📊 Analytics: overdue_drill', {
                                courseId: course.id,
                                overdueCount: course.overdue,
                              });
                            }}
                            title="Click to see overdue assignments - needs attention!"
                          >
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="font-medium text-red-700">
                              {course.overdue} overdue
                            </span>
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            <ArrowRight className="h-3 w-3 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Assignment Type Drill-down */}
                    {expandedAssignmentType?.courseId === course.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            {expandedAssignmentType.type === 'completed' &&
                              'Completed Assignments'}
                            {expandedAssignmentType.type === 'inProgress' &&
                              'In Progress Assignments'}
                            {expandedAssignmentType.type === 'overdue' &&
                              'Overdue Assignments'}
                          </h4>
                          {expandedAssignmentType.type !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const relevantAssignments =
                                  course.assignments.filter((a) =>
                                    expandedAssignmentType.type === 'inProgress'
                                      ? a.status === 'in-progress'
                                      : expandedAssignmentType.type ===
                                          'overdue'
                                        ? a.status === 'overdue'
                                        : false,
                                  );
                                handleScheduleAll(relevantAssignments);
                              }}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Schedule All
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {course.assignments
                            .filter((assignment) => {
                              if (expandedAssignmentType.type === 'completed')
                                return false; // Mock completed assignments
                              if (expandedAssignmentType.type === 'inProgress')
                                return assignment.status === 'in-progress';
                              if (expandedAssignmentType.type === 'overdue')
                                return assignment.status === 'overdue';
                              return false;
                            })
                            .map((assignment, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  {assignment.status === 'overdue' && (
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                  )}
                                  {assignment.status === 'in-progress' && (
                                    <Timer className="h-3 w-3 text-blue-500" />
                                  )}
                                  <span
                                    className={
                                      assignment.status === 'overdue'
                                        ? 'text-red-600'
                                        : 'text-gray-700'
                                    }
                                  >
                                    {assignment.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {assignment.due}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          {expandedAssignmentType.type === 'completed' && (
                            <div className="text-center text-gray-500 text-sm py-4">
                              Show {course.completed} completed assignments...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expandable Assignment Details */}
                    {expandedCourse === course.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Remaining Assignments
                        </h4>
                        <div className="space-y-2">
                          {course.assignments.map((assignment, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                {assignment.status === 'overdue' && (
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                )}
                                {assignment.status === 'in-progress' && (
                                  <Timer className="h-3 w-3 text-blue-500" />
                                )}
                                {assignment.status === 'pending' && (
                                  <div className="h-3 w-3 rounded-full border border-gray-300" />
                                )}
                                <span
                                  className={
                                    assignment.status === 'overdue'
                                      ? 'text-red-600'
                                      : 'text-gray-700'
                                  }
                                >
                                  {assignment.title}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {assignment.due}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {courseProgress.length > 5 && (
                  <Button variant="outline" className="w-full">
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show {courseProgress.length - 5} More Courses
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Performance Trends - Real Implementation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Performance Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Study Time vs Goal Sparkline */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        4-Week Study Time Trend
                      </h4>
                      <span className="text-xs text-gray-500">
                        Target: 15h/week
                      </span>
                    </div>
                    <div className="relative h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded">
                      {/* Y-axis grid lines */}
                      {[25, 50, 75, 100].map((percent) => (
                        <div
                          key={percent}
                          className="absolute w-full border-t border-gray-300 opacity-30"
                          style={{ bottom: `${percent}%` }}
                        />
                      ))}
                      {/* Target line */}
                      <div
                        className="absolute w-full border-t-2 border-dashed border-gray-500"
                        style={{ bottom: `${(15 / 15) * 100}%` }}
                      />

                      {/* Bars */}
                      <div className="flex items-end justify-between px-2 py-1 h-full relative">
                        {[
                          { hours: 10, week: 1, target: 15 },
                          { hours: 8.5, week: 2, target: 15 },
                          { hours: 11.2, week: 3, target: 15 },
                          { hours: 12.5, week: 4, target: 15 },
                        ].map((data, index) => (
                          <div
                            key={index}
                            className="flex flex-col items-center"
                          >
                            <div
                              className={`w-4 rounded-t cursor-pointer transition-opacity hover:opacity-80 ${
                                data.hours >= data.target
                                  ? 'bg-green-500'
                                  : data.hours >= 12
                                    ? 'bg-blue-500'
                                    : 'bg-orange-500'
                              }`}
                              style={{ height: `${(data.hours / 15) * 48}px` }}
                              title={`W${data.week}: ${data.hours}h (${data.hours >= data.target ? '+' : ''}${(data.hours - data.target).toFixed(1)}h vs target)`}
                            />
                            <span className="text-xs text-gray-600 mt-1">
                              W{data.week}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quiz Performance with Weekly Data */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        Weekly Quiz Performance
                      </h4>
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs">+12% this month</span>
                      </div>
                    </div>
                    <div className="relative h-16">
                      {/* Y-axis grid lines */}
                      {[25, 50, 75, 100].map((percent) => (
                        <div
                          key={percent}
                          className="absolute w-full border-t border-gray-300 opacity-40"
                          style={{ bottom: `${percent}%` }}
                        />
                      ))}
                      <div className="absolute left-0 top-0 text-xs text-gray-400">
                        100%
                      </div>
                      <div className="absolute left-0 top-1/4 text-xs text-gray-400">
                        75%
                      </div>
                      <div className="absolute left-0 top-1/2 text-xs text-gray-400">
                        50%
                      </div>
                      <div className="absolute left-0 top-3/4 text-xs text-gray-400">
                        25%
                      </div>

                      <div className="flex items-end justify-between gap-1 h-full pl-8">
                        {[
                          { week: 'W1', score: 78, attempts: 5 },
                          { week: 'W2', score: 82, attempts: 7 },
                          { week: 'W3', score: 85, attempts: 6 },
                          { week: 'W4', score: 89, attempts: 8 },
                        ].map((data, index) => (
                          <div
                            key={index}
                            className="flex flex-col items-center flex-1"
                          >
                            <div
                              className={`w-full rounded-t cursor-pointer transition-all hover:opacity-80 ${
                                data.score >= 85
                                  ? 'bg-green-500'
                                  : data.score >= 75
                                    ? 'bg-blue-500'
                                    : 'bg-orange-500'
                              }`}
                              style={{ height: `${(data.score / 100) * 48}px` }}
                              title={`${data.week}: ${data.score}% • ${data.attempts} attempts`}
                            />
                            <span className="text-xs text-gray-600 mt-1">
                              {data.week}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>Current: 89%</span>
                      <span>32 total attempts</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Clickable Achievements with Time Decay */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span>Recent Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {achievements.slice(0, 5).map((achievement, index) => (
                  <div
                    key={index}
                    className={`border border-gray-200 rounded-lg p-3 transition-all ${
                      achievement.clickable
                        ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm'
                        : ''
                    } ${achievement.faded ? 'opacity-50' : ''}`}
                    onClick={() => handleAchievementClick(achievement)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h4
                          className={`font-medium text-sm mb-1 ${achievement.faded ? 'text-gray-500' : 'text-gray-900'}`}
                        >
                          {achievement.title}
                          {achievement.clickable && (
                            <ArrowRight className="h-3 w-3 ml-1 inline" />
                          )}
                        </h4>
                        <p
                          className={`text-xs mb-2 ${achievement.faded ? 'text-gray-400' : 'text-gray-600'}`}
                        >
                          {achievement.description}
                        </p>
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-xs ${achievement.faded ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {achievement.date}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {achievement.xp}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {achievements.length > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full text-sm text-gray-500"
                  >
                    See All {achievements.length} Achievements
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Weekly Goals with Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Weekly Goals</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditGoals(!showEditGoals)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span>Study Time Goal</span>
                      <div className="flex items-center gap-2">
                        <span>12.5h / 15h</span>
                        <MiniSparkline
                          data={goalSparklines.studyTime}
                          target={15}
                          color="blue"
                        />
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      </div>
                    </div>
                    <Progress value={83} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span>Tasks Completed</span>
                      <div className="flex items-center gap-2">
                        <span>18 / 20</span>
                        <MiniSparkline
                          data={goalSparklines.tasks}
                          target={3}
                          color="green"
                        />
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      </div>
                    </div>
                    <Progress value={90} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span>Course Progress</span>
                      <div className="flex items-center gap-2">
                        <span>71% avg</span>
                        <MiniSparkline
                          data={goalSparklines.courseProgress}
                          target={75}
                          color="purple"
                        />
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      </div>
                    </div>
                    <Progress value={71} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Streamlined Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  variant="outline"
                  onClick={() =>
                    toast.success(
                      'Opening Focus Stack with priority sessions...',
                    )
                  }
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Boost Study Time (+2.5h needed)
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  View All Achievements
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Focus Efficiency Optimization Modal */}
        {showEfficiencyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">
                    Optimize Focus Efficiency
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEfficiencyModal(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800">
                    <strong>Current efficiency: 72%</strong> (below target 80%)
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Sessions longer than 60 minutes often see focus drop-off
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Proposed Changes
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>ML Project Work (2h) → Split into 4×30min</span>
                      <span className="text-green-600 text-xs">
                        +15% efficiency
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>Algorithm Study (90m) → 3×30min</span>
                      <span className="text-green-600 text-xs">
                        +12% efficiency
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>NLP Reading (75m) → 3×25min</span>
                      <span className="text-green-600 text-xs">
                        +8% efficiency
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-3">
                    <span>Estimated new efficiency:</span>
                    <span className="font-bold text-green-600">87%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowEfficiencyModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEfficiencyOptimization}
                      className="flex-1"
                    >
                      Apply Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Retention Drawer */}
        {showRetentionDrawer && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 border-l border-gray-200">
            <div className="p-6 h-full overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold">Retention Analysis</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRetentionDrawer(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-800">
                      Current Retention
                    </span>
                    <span className="text-2xl font-bold text-indigo-900">
                      84%
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600">
                    Based on 25 spaced-repetition quizzes (last 30 days)
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Weakest Concepts
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        topic: 'Gradient Descent Optimization',
                        course: 'CS229',
                        retention: 62,
                        reviews: 3,
                      },
                      {
                        topic: 'Transformer Architecture',
                        course: 'CS224n',
                        retention: 68,
                        reviews: 2,
                      },
                      {
                        topic: 'Convolutional Neural Networks',
                        course: 'CS231n',
                        retention: 71,
                        reviews: 4,
                      },
                      {
                        topic: 'Dynamic Programming',
                        course: 'CS161',
                        retention: 75,
                        reviews: 5,
                      },
                    ].map((concept, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {concept.topic}
                            </div>
                            <div className="text-xs text-gray-500">
                              {concept.course} • {concept.reviews} reviews
                            </div>
                          </div>
                          <div
                            className={`text-sm font-medium ${
                              concept.retention < 70
                                ? 'text-red-600'
                                : concept.retention < 80
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                            }`}
                          >
                            {concept.retention}%
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Schedule Review
                          </Button>
                          <Button size="sm" variant="ghost">
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button
                    className="w-full"
                    onClick={() => {
                      toast.success(
                        'Scheduling spaced repetition for all weak concepts...',
                      );
                      setShowRetentionDrawer(false);
                    }}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Schedule All Reviews
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Assignments Instant Drawer */}
        {showOverdueDrawer && selectedOverdueCourse && (
          <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-50 border-l border-gray-200">
            <div className="p-6 h-full overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-800">
                    Overdue Assignments
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOverdueDrawer(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-sm font-medium text-red-800 mb-1">
                    {selectedOverdueCourse.code}
                  </div>
                  <div className="text-xs text-red-600">
                    {selectedOverdueCourse.overdue} assignment
                    {selectedOverdueCourse.overdue > 1 ? 's' : ''} overdue
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedOverdueCourse.assignments
                    .filter(
                      (assignment: any) => assignment.status === 'overdue',
                    )
                    .map((assignment: any, index: number) => (
                      <div
                        key={index}
                        className="border border-red-200 rounded-lg p-4 bg-red-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-sm font-medium text-red-900">
                              {assignment.title}
                            </div>
                            <div className="text-xs text-red-600">
                              Due: {assignment.due}
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            OVERDUE
                          </Badge>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              toast.success(
                                `"${assignment.title}" scheduled for next available slot`,
                              );
                              setShowOverdueDrawer(false);
                            }}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Schedule Review
                          </Button>
                          <Button size="sm" variant="outline">
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="border-t pt-4">
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      const overdueCount =
                        selectedOverdueCourse.assignments.filter(
                          (a: any) => a.status === 'overdue',
                        ).length;
                      toast.success(
                        `All ${overdueCount} overdue assignments scheduled for review`,
                      );
                      setShowOverdueDrawer(false);
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Schedule All Overdue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SharedDashboardLayout>
    </>
  );
}
