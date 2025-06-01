"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SharedDashboardLayout } from "@/components/dashboard/layouts/SharedDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen,
  Upload,
  Play,
  FileText,
  Video,
  Headphones,
  Calendar,
  Trophy,
  Zap,
  Brain,
  Clock,
  Users,
  Target,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Star,
  Timer,
  Award,
  ChevronDown,
  ChevronUp,
  Settings,
  MoreHorizontal,
  Download,
  Share2,
  Lightbulb,
  TrendingDown,
  Lock
} from "lucide-react";
import { toast } from "sonner";

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showWeakAreasDrawer, setShowWeakAreasDrawer] = useState(false);
  const [showEfficiencyModal, setShowEfficiencyModal] = useState(false);
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
  const [expandedMaterials, setExpandedMaterials] = useState<{[key: string]: boolean}>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Mock user fetch
    setCurrentUser({ 
      name: "Student User", 
      email: "student@example.com",
      role: "student",
      level: "Intermediate",
      streak: 7,
      xp: 2450
    });
  }, []);

  // Mock course data with enhanced behavioral triggers
  const course = {
    id: courseId,
    title: "CS229: Machine Learning",
    code: "CS229",
    instructor: "Dr. Andrew Ng",
    progress: 68,
    nextDeadline: "Neural Networks Assignment - Due in 3 days",
    studyTime: "45.2h total",
    weeklyStudyTime: 8.5,
    targetStudyTime: 12,
    rank: "#3 of 156 students",
    previousRank: 5,
    grade: "A-",
    previousGrade: "B+",
    color: "#3B82F6",
    urgentTasks: 2,
    completionStreak: 4,
    efficiency: 73,
    lastActivity: "2 hours ago"
  };

  const modules = [
    {
      id: "module-1",
      title: "Introduction to Machine Learning",
      progress: 100,
      materials: 8,
      completed: 8,
      timeSpent: "4.2h",
      estimatedTime: "4h",
      status: "completed",
      urgency: "none",
      nextItem: null,
      dueDate: null,
      weaknessScore: 0,
      confidenceLevel: 95,
      lastReviewed: "3 days ago",
      materials_list: [
        { id: "1", title: "Course Introduction", type: "video", duration: "12m", completed: true, score: 98 },
        { id: "2", title: "ML Overview Slides", type: "pdf", pages: 24, completed: true, timeSpent: "45m" },
        { id: "3", title: "Problem Set 1", type: "assignment", score: "95%", completed: true, attempts: 1 }
      ]
    },
    {
      id: "module-2", 
      title: "Linear Regression",
      progress: 85,
      materials: 6,
      completed: 5,
      timeSpent: "6.8h",
      estimatedTime: "8h",
      status: "in-progress",
      urgency: "medium",
      nextItem: "Gradient Descent Lab",
      dueDate: "Tomorrow",
      weaknessScore: 15,
      confidenceLevel: 78,
      lastReviewed: "Today",
      materials_list: [
        { id: "4", title: "Linear Regression Theory", type: "video", duration: "18m", completed: true, score: 89 },
        { id: "5", title: "Cost Function Slides", type: "pdf", pages: 16, completed: true, timeSpent: "32m" },
        { id: "6", title: "Gradient Descent Lab", type: "assignment", score: null, completed: false, urgent: true, attempts: 0, estimatedTime: "90m" }
      ]
    },
    {
      id: "module-3",
      title: "Neural Networks",
      progress: 20,
      materials: 10,
      completed: 2,
      timeSpent: "2.1h",
      estimatedTime: "12h",
      status: "urgent",
      urgency: "high",
      nextItem: "Neural Networks Project",
      dueDate: "In 3 days",
      weaknessScore: 35,
      confidenceLevel: 45,
      lastReviewed: "1 week ago",
      materials_list: [
        { id: "7", title: "Neural Networks Intro", type: "video", duration: "25m", completed: true, score: 76 },
        { id: "8", title: "Backpropagation Slides", type: "pdf", pages: 32, completed: true, timeSpent: "65m" },
        { id: "9", title: "Neural Networks Project", type: "assignment", score: null, completed: false, urgent: true, attempts: 0, estimatedTime: "4h" }
      ]
    },
    {
      id: "module-4",
      title: "Deep Learning",
      progress: 0,
      materials: 12,
      completed: 0,
      timeSpent: "0h",
      estimatedTime: "16h",
      status: "locked",
      urgency: "none",
      nextItem: "Complete Neural Networks first",
      unlockRequirement: "Finish Neural Networks module",
      dueDate: null,
      weaknessScore: 0,
      confidenceLevel: 0,
      lastReviewed: "Never",
      materials_list: []
    }
  ];

  const weeklyStats = {
    studyTime: { current: 8.5, target: 12, change: -2.5, trend: "down" },
    assignments: { current: 3, target: 4, change: 1, trend: "up" },
    quizScore: { current: 82, target: 85, change: -3, trend: "down" },
    rank: { current: 3, total: 156, change: 2, trend: "up" },
    efficiency: { current: 73, target: 80, change: -5, trend: "down" },
    streakDays: 4
  };

  const insights = [
    {
      type: "warning",
      title: "Study Time Behind Target",
      description: "You're 3.5h behind this week. Quick 45min sessions can get you back on track.",
      action: "Schedule Study Blocks",
      urgent: true
    },
    {
      type: "opportunity", 
      title: "Neural Networks Weakness",
      description: "Only 45% confidence. Dedicated review could boost your grade significantly.",
      action: "Start Weakness Review",
      urgent: true
    },
    {
      type: "positive",
      title: "Linear Regression Mastery",
      description: "78% confidence is solid! One more review session locks this in permanently.",
      action: "Lock In Knowledge",
      urgent: false
    }
  ];

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  const getModuleStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in-progress": return "bg-blue-500";
      case "urgent": return "bg-red-500";
      case "locked": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getModuleStatusText = (status: string) => {
    switch (status) {
      case "completed": return "✅ Mastered";
      case "in-progress": return "📚 Learning";
      case "urgent": return "🔥 Urgent";
      case "locked": return "🔒 Locked";
      default: return "📝 Not Started";
    }
  };

  const handleModuleClick = (module: any) => {
    if (module.status === "locked") {
      toast.warning("Complete Neural Networks module to unlock Deep Learning");
      return;
    }
    
    setActiveModule(activeModule === module.id ? null : module.id);
    
    // Analytics
    console.log('📊 Analytics: module_drill', { 
      moduleId: module.id, 
      status: module.status,
      progress: module.progress 
    });
  };

  const handleMaterialClick = (material: any, moduleId: string) => {
    if (material.completed) {
      toast.info(`Reviewing "${material.title}"...`);
    } else {
      toast.success(`Starting "${material.title}"...`, {
        action: {
          label: 'Track Progress',
          onClick: () => toast.info('Progress tracking enabled for this session')
        }
      });
    }
    
    // Analytics
    console.log('📊 Analytics: material_start', { 
      materialId: material.id, 
      moduleId,
      type: material.type 
    });
  };

  const handleQuickAction = (action: string, module?: any) => {
    switch (action) {
      case "next_urgent":
        const urgentModule = modules.find(m => m.status === "urgent");
        if (urgentModule) {
          toast.success(`Starting "${urgentModule.nextItem}"...`, {
            action: {
              label: 'Set 25min Timer',
              onClick: () => toast.success('25-minute focus timer started!')
            }
          });
          router.push(`/learn/${urgentModule.id}`);
        }
        break;
      case "continue_learning":
        const inProgressModule = modules.find(m => m.status === "in-progress");
        if (inProgressModule) {
          toast.success(`Continuing "${inProgressModule.nextItem}"...`, {
            action: {
              label: 'Set Goal',
              onClick: () => toast.success('Goal: Complete in 45 minutes')
            }
          });
          router.push(`/learn/${inProgressModule.id}`);
        }
        break;
      case "schedule_study":
        setShowScheduleDrawer(true);
        break;
      case "ai_help":
        // Deep-link with module context
        const currentModule = modules.find(m => m.status === "in-progress" || m.status === "urgent") || modules[0];
        const contextMessage = `You're in ${currentModule.title}, ${currentModule.confidenceLevel}% confidence. What's confusing?`;
        toast.success("AI Tutor loading with your current context...");
        router.push(`/learn/${courseId}/ai?context=${encodeURIComponent(contextMessage)}&module=${currentModule.id}`);
        break;
      case "boost_efficiency":
        setShowEfficiencyModal(true);
        break;
      case "review_weak_areas":
        setShowWeakAreasDrawer(true);
        break;
      case "auto_schedule_2h":
        setShowScheduleDrawer(true);
        break;
    }
  };

  const handleMaterialExpand = (moduleId: string) => {
    setExpandedMaterials(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Dynamic action tiles based on urgency and status
  const getActionTiles = () => {
    const tiles = [];
    
    // Find urgent/current tasks
    const urgentModule = modules.find(m => m.status === "urgent");
    const inProgressModule = modules.find(m => m.status === "in-progress");
    const overdueModule = modules.find(m => m.dueDate && m.dueDate.includes("ago"));
    const currentModule = urgentModule || inProgressModule || modules.find(m => m.status !== "completed");
    const weakModules = modules.filter(m => m.weaknessScore > 30);
    
    // PRIORITY 1: Overdue (highest urgency - red with pulse)
    if (overdueModule) {
      tiles.push({
        id: "overdue",
        title: "OVERDUE",
        subtitle: overdueModule.nextItem,
        detail: overdueModule.dueDate,
        gradient: "from-red-100 to-red-200",
        border: "border-red-300",
        textColor: "text-red-800",
        detailColor: "text-red-600",
        icon: AlertTriangle,
        iconColor: "text-red-600",
        action: "next_urgent",
        pulse: true
      });
    }
    
    // PRIORITY 2: Urgent (high urgency - red)
    else if (urgentModule) {
      tiles.push({
        id: "urgent",
        title: "URGENT",
        subtitle: urgentModule.nextItem,
        detail: urgentModule.dueDate,
        gradient: "from-red-50 to-red-100",
        border: "border-red-200",
        textColor: "text-red-800",
        detailColor: "text-red-600",
        icon: Zap,
        iconColor: "text-red-600",
        action: "next_urgent",
        pulse: true
      });
    }
    
    // PRIORITY 3: Continue Learning (medium urgency - blue)
    if (inProgressModule && !overdueModule) {
      tiles.push({
        id: "continue",
        title: "Continue",
        subtitle: inProgressModule.nextItem,
        detail: `${inProgressModule.progress}% complete`,
        gradient: "from-blue-50 to-blue-100",
        border: "border-blue-200",
        textColor: "text-blue-800",
        detailColor: "text-blue-600",
        icon: Play,
        iconColor: "text-blue-600",
        action: "continue_learning"
      });
    }
    
    // PRIORITY 4: Context-Aware AI Tutor (always shows with current context)
    const tutorTitle = currentModule ? `Ask Tutor about ${currentModule.title}` : "AI Tutor";
    const tutorDetail = currentModule ? `${currentModule.confidenceLevel}% confidence` : "⌘K hotkey";
    tiles.push({
      id: "ai",
      title: tutorTitle,
      subtitle: weakModules.length > 0 ? `${weakModules.length} weak areas` : "Ready to help",
      detail: tutorDetail,
      gradient: "from-purple-50 to-purple-100", 
      border: "border-purple-200",
      textColor: "text-purple-800",
      detailColor: "text-purple-600",
      icon: Brain,
      iconColor: "text-purple-600",
      action: "ai_help"
    });
    
    // Smart Schedule handled by banner CTA - no duplicate tile needed
    
    return tiles.slice(0, 4); // Always show exactly 4 tiles
  };

  return (
    <>
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }
        .urgent-pulse {
          animation: pulse-glow 2s infinite;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-1deg); }
          75% { transform: rotate(1deg); }
        }
        .hover\\:animate-wiggle:hover {
          animation: wiggle 0.3s ease-in-out;
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        .breathe-10s {
          animation: breathe 2s ease-in-out infinite;
          animation-duration: 10s;
        }
      `}</style>
      
      <SharedDashboardLayout pageTitle="" showGamification={false} currentUser={currentUser}>
        {/* Compact Course Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-2 h-6 rounded-full bg-blue-500" />
                {course.title}
                {course.urgentTasks > 0 && (
                  <Badge variant="destructive" className="animate-pulse urgent-pulse">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {course.urgentTasks} URGENT
                  </Badge>
                )}
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-gray-600">{course.instructor} • {course.studyTime}</span>
                <span className="text-gray-600 flex items-center gap-1">
                  {course.rank}
                  {course.previousRank > course.rank.split('#')[1] && (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  )}
                </span>
                <span className="text-xs text-gray-500">Active {course.lastActivity}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${course.grade > course.previousGrade ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {course.grade}
                {course.grade > course.previousGrade && <TrendingUp className="h-3 w-3 ml-1" />}
              </Badge>
              <Badge className="bg-orange-100 text-orange-800 hover:animate-wiggle cursor-pointer" 
                     onClick={() => toast.success("Streak protected! Keep going for bonus XP")}>
                🔥 {weeklyStats.streakDays}-day streak
              </Badge>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Jump to module/assignment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {modules
                        .filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    m.materials_list.some(mat => mat.title.toLowerCase().includes(searchQuery.toLowerCase())))
                        .map(module => (
                          <div key={module.id} className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                               onClick={() => {
                                 setActiveModule(module.id);
                                 setSearchQuery("");
                                 document.getElementById(module.id)?.scrollIntoView({ behavior: 'smooth' });
                               }}>
                            <div className="text-sm font-medium">{module.title}</div>
                            <div className="text-xs text-gray-500">{module.progress}% complete • {module.status}</div>
                          </div>
                      ))}
                      {modules
                        .flatMap(m => m.materials_list.map(mat => ({ ...mat, moduleTitle: m.title, moduleId: m.id })))
                        .filter(mat => mat.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(material => (
                          <div key={material.id} className="p-2 hover:bg-gray-50 cursor-pointer"
                               onClick={() => {
                                 setActiveModule(material.moduleId);
                                 setSearchQuery("");
                                 handleMaterialClick(material, material.moduleId);
                               }}>
                            <div className="text-sm font-medium">{material.title}</div>
                            <div className="text-xs text-gray-500">{material.moduleTitle} • {material.type}</div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInsightsModal(true)}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Analytics
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Progress Bar with Behavioral Triggers */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Course Progress</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{course.progress}%</span>
                <Badge variant="outline" className="text-xs">
                  {100 - course.progress}% to mastery
                </Badge>
              </div>
            </div>
            <Progress value={course.progress} className="h-3 mb-3" />
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="text-gray-500">
                <div className="font-medium">Next Deadline</div>
                <div className="text-red-600">{course.nextDeadline}</div>
              </div>
              <div className="text-center text-gray-500">
                <div className="font-medium">Modules</div>
                <div>{modules.filter(m => m.status === "completed").length} of {modules.length} mastered</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Efficiency</div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${course.efficiency < 75 ? 'text-orange-600' : 'text-green-600'}`}>
                    {course.efficiency}%
                  </span>
                  {course.efficiency < 75 && (
                    <Button 
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 py-1 h-6 breathe-10s"
                      onClick={() => handleQuickAction("boost_efficiency")}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Fix
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Alert Cards for Behavioral Triggers */}
        {weeklyStats.studyTime.current < weeklyStats.studyTime.target && (
          <Card className="mb-4 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Behind Study Target
                    </p>
                    <p className="text-xs text-orange-600">
                      {(weeklyStats.studyTime.target - weeklyStats.studyTime.current).toFixed(1)}h needed to hit weekly goal
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 px-3 py-1 h-7 text-xs"
                    onClick={() => {
                      const deficit = (weeklyStats.studyTime.target - weeklyStats.studyTime.current).toFixed(1);
                      toast.success(`Auto-scheduling ${deficit}h in next available slots...`);
                      handleQuickAction("schedule_study");
                    }}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    + Auto-Schedule {(weeklyStats.studyTime.target - weeklyStats.studyTime.current).toFixed(1)}h
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => handleQuickAction("schedule_study")}
                    title="⌘⇧S Smart Schedule • ⌘⇧U Urgent Task"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Smart Schedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dynamic Action Tiles Sorted by Urgency */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {getActionTiles().map((tile) => {
            const IconComponent = tile.icon;
            return (
              <Card 
                key={tile.id}
                className={`bg-gradient-to-br ${tile.gradient} ${tile.border} cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all ${tile.pulse ? 'urgent-pulse' : ''}`}
                onClick={() => handleQuickAction(tile.action)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <IconComponent className={`h-8 w-8 ${tile.iconColor}`} />
                    <div>
                      <p className={`text-sm font-medium ${tile.textColor}`}>{tile.title}</p>
                      <p className={`text-xs ${tile.detailColor}`}>{tile.subtitle}</p>
                      <p className={`text-xs ${tile.detailColor} font-medium`}>{tile.detail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Modules with Behavioral Psychology */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    Learning Path
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {modules.filter(m => m.weaknessScore > 30).length} weak areas
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAction("review_weak_areas")}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Active/In-Progress Modules */}
                {modules.filter(m => m.status !== "completed").map((module, index) => (
                  <div 
                    key={module.id}
                    id={module.id}
                    className={`border rounded-lg overflow-hidden transition-all hover:shadow-md ${
                      module.status === "urgent" ? "border-red-300 urgent-pulse" :
                      module.status === "in-progress" ? "border-blue-300" :
                      "border-gray-300"
                    }`}
                  >
                    <div 
                      className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                        module.status === "urgent" ? "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-l-red-500" :
                        module.status === "in-progress" ? "bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-l-blue-500" :
                        "bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-l-gray-400"
                      }`}
                      onClick={() => handleModuleClick(module)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-500">Module {modules.findIndex(m => m.id === module.id) + 1}</span>
                              <Badge className={`text-xs px-2 py-1 ${getModuleStatusColor(module.status)} text-white`}>
                                {getModuleStatusText(module.status)}
                              </Badge>
                              {module.urgency === "high" && (
                                <Badge variant="destructive" className="text-xs animate-pulse">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  URGENT
                                </Badge>
                              )}
                              {module.weaknessScore > 30 && (
                                <Badge className="bg-orange-500 text-white text-xs">
                                  <Brain className="h-3 w-3 mr-1" />
                                  Weak Area
                                </Badge>
                              )}
                            </div>
                            {/* Confidence Chip - Top Right */}
                            <Badge 
                              className={`text-xs px-2 py-1 cursor-pointer ${
                                module.confidenceLevel >= 95 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                module.confidenceLevel >= 80 ? 'bg-green-100 text-green-800 border border-green-300' :
                                module.confidenceLevel >= 70 ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                              title={`Based on ${Math.floor(Math.random() * 8) + 3} quizzes • Click for details`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.info(`Confidence based on ${Math.floor(Math.random() * 8) + 3} quizzes. Last review: ${module.lastReviewed}`);
                              }}
                            >
                              {module.confidenceLevel >= 95 ? '✓' : '💯'} {module.confidenceLevel}%
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{module.title}</h3>
                            {module.status === "locked" && (
                              <div 
                                className="flex items-center gap-1 text-gray-500 cursor-help"
                                title={`🔒 ${module.unlockRequirement || 'Complete previous modules first'}`}
                              >
                                <Lock className="h-4 w-4" />
                                <span className="text-xs">Locked</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span>{module.completed}/{module.materials} materials</span>
                                {module.status !== "completed" && (
                                  <Badge variant="outline" className="text-xs">
                                    {module.materials - module.completed} left
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>{module.timeSpent} spent</span>
                                <span className="text-gray-400">/ {module.estimatedTime} est.</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {module.nextItem && (
                                <div className="font-medium text-blue-600 text-xs">
                                  Next: {module.nextItem}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                Last reviewed: {module.lastReviewed}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Progress value={module.progress} className="h-2 flex-1" />
                            <span className="text-sm font-medium text-gray-700">{module.progress}%</span>
                          </div>
                        </div>

                        <div className="ml-4 space-y-2">
                          {module.status === "urgent" && (
                            <Button 
                              size="sm" 
                              className="bg-red-600 hover:bg-red-700 text-white w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAction("next_urgent");
                              }}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Start Now
                            </Button>
                          )}
                          {module.status === "in-progress" && (
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAction("continue_learning");
                              }}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Continue
                            </Button>
                          )}
                          {module.weaknessScore > 30 && module.status !== "locked" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-orange-300 text-orange-600 hover:bg-orange-50 w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast.success(`Starting focused review of ${module.title}...`);
                              }}
                            >
                              <Brain className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Material List */}
                    {activeModule === module.id && module.materials_list.length > 0 && (
                      <div className="border-t border-gray-200 bg-white">
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">Materials</h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMaterialExpand(module.id)}
                              className="text-xs"
                            >
                              {expandedMaterials[module.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {expandedMaterials[module.id] ? "Collapse" : "Expand All"}
                            </Button>
                          </div>
                          
                          {module.materials_list.map((material) => (
                            <div 
                              key={material.id}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 hover:shadow-sm ${
                                material.urgent ? "bg-red-50 border border-red-200 urgent-pulse" : 
                                material.completed ? "bg-green-50 border border-green-200" :
                                "bg-gray-50 border border-gray-200"
                              }`}
                              onClick={() => handleMaterialClick(material, module.id)}
                            >
                              <div className="flex items-center gap-3">
                                {material.type === "video" && <Video className="h-4 w-4 text-red-500" />}
                                {material.type === "pdf" && <FileText className="h-4 w-4 text-blue-500" />}
                                {material.type === "assignment" && <Target className="h-4 w-4 text-orange-500" />}
                                
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{material.title}</div>
                                  <div className="text-xs text-gray-500 space-x-2">
                                    {material.duration && <span>{material.duration}</span>}
                                    {material.pages && <span>{material.pages} pages</span>}
                                    {material.timeSpent && <span>Spent: {material.timeSpent}</span>}
                                    {material.estimatedTime && <span>Est: {material.estimatedTime}</span>}
                                    {material.score && <span className="font-medium text-green-600">Score: {material.score}</span>}
                                    {material.attempts !== undefined && <span>Attempts: {material.attempts}</span>}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {material.urgent && (
                                  <Badge variant="destructive" className="text-xs animate-pulse">
                                    DUE SOON
                                  </Badge>
                                )}
                                {material.completed ? (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {material.score && (
                                      <Badge variant="outline" className="text-xs">
                                        {material.score}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" className="hover:bg-blue-50">
                                    <ArrowRight className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Mastered Modules Footer Bar */}
                {modules.filter(m => m.status === "completed").length > 0 && (
                  <div className="mt-6 border-t border-gray-200 bg-gray-50">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-100 transition-all"
                      onClick={() => setActiveModule(activeModule === "completed" ? null : "completed")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <span className="text-sm font-bold text-gray-900">
                              🎉 {modules.filter(m => m.status === "completed").length} Modules Mastered
                            </span>
                            <div className="text-xs text-gray-600">
                              Avg confidence: {Math.round(modules.filter(m => m.status === "completed").reduce((sum, m) => sum + m.confidenceLevel, 0) / modules.filter(m => m.status === "completed").length)}%
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600 text-white text-xs px-3 py-1">✓ {modules.filter(m => m.status === "completed").length} Mastered</Badge>
                          {activeModule === "completed" ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Completed Modules */}
                    {activeModule === "completed" && (
                      <div className="border-t border-gray-200 bg-white">
                        <div className="p-4 space-y-3">
                          {modules.filter(m => m.status === "completed").map((module, index) => (
                            <div key={module.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center gap-3">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{module.title}</div>
                                  <div className="text-xs text-gray-500">💯 {module.confidenceLevel}% confidence • {module.lastReviewed}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  className="w-6 h-6 rounded-full border-2 border-green-500 bg-white hover:bg-green-50 transition-all flex items-center justify-center"
                                  onClick={() => {
                                    toast.success("Module marked for review! Confetti burst coming...");
                                    // TODO: Add confetti
                                  }}
                                  title="Mark as reviewed"
                                >
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                </button>
                                <Button size="sm" variant="ghost" className="text-xs">
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Behavioral Sidebar */}
          <div className="space-y-6">
            {/* Weekly Performance with Behavioral Triggers */}
            <Card className="hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>This Week's Performance</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowInsightsModal(true)}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Insights
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-all"
                    onClick={() => handleQuickAction("schedule_study")}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600">Study Time</span>
                      {weeklyStats.studyTime.trend === "down" && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{weeklyStats.studyTime.current}h / {weeklyStats.studyTime.target}h</span>
                      {getTrendIcon(weeklyStats.studyTime.trend)}
                    </div>
                  </div>
                  <Progress 
                    value={(weeklyStats.studyTime.current / weeklyStats.studyTime.target) * 100} 
                    className={`h-2 ${weeklyStats.studyTime.current < weeklyStats.studyTime.target ? 'progress-orange' : 'progress-green'}`}
                  />
                  {weeklyStats.studyTime.current < weeklyStats.studyTime.target && (
                    <div className="text-xs text-orange-600 font-medium">
                      {(weeklyStats.studyTime.target - weeklyStats.studyTime.current).toFixed(1)}h needed to hit goal
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-600">Assignments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{weeklyStats.assignments.current} / {weeklyStats.assignments.target}</span>
                      {getTrendIcon(weeklyStats.assignments.trend)}
                    </div>
                  </div>
                  <Progress value={(weeklyStats.assignments.current / weeklyStats.assignments.target) * 100} className="h-2" />
                  
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-all"
                    onClick={() => toast.info("Opening quiz performance breakdown...")}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-gray-600">Quiz Average</span>
                      {weeklyStats.quizScore.trend === "down" && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{weeklyStats.quizScore.current}%</span>
                      {getTrendIcon(weeklyStats.quizScore.trend)}
                    </div>
                  </div>
                  <Progress value={weeklyStats.quizScore.current} className="h-2" />

                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-all"
                    onClick={() => handleQuickAction("boost_efficiency")}
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-gray-600">Efficiency</span>
                      {weeklyStats.efficiency.trend === "down" && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{weeklyStats.efficiency.current}%</span>
                      {getTrendIcon(weeklyStats.efficiency.trend)}
                    </div>
                  </div>
                  <Progress value={weeklyStats.efficiency.current} className="h-2" />
                  {weeklyStats.efficiency.current < 80 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs border-orange-300 text-orange-600 hover:bg-orange-50 animate-pulse"
                      onClick={() => handleQuickAction("boost_efficiency")}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Switch to 25min blocks
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Leaderboard with Competition */}
            <Card className="hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Class Ranking
                  {course.previousRank > weeklyStats.rank.current && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Rising
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">#{weeklyStats.rank.current} / {weeklyStats.rank.total}</div>
                  <div className="text-sm text-gray-500">students</div>
                  <div className="text-xs text-green-600 mt-1">↑ +{weeklyStats.rank.change} this week</div>
                  <div className="mt-3 text-xs text-gray-500">
                    Need +20 XP to reach #2
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    onClick={() => {
                      toast.success("Opening Smart Schedule with high-XP tasks...");
                      setShowScheduleDrawer(true);
                    }}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    +20 XP to reach #2 — Plan XP
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Achievement Streak */}
            <Card className="hover:shadow-md transition-all">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* NEW Achievement - Full opacity + pulse */}
                <div 
                  className="flex items-center justify-between p-2 bg-orange-50 rounded cursor-pointer hover:bg-orange-100 transition-all animate-pulse"
                  onClick={() => toast.success("Streak protected! Bonus XP applied")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <div>
                      <div className="text-sm font-medium">{weeklyStats.streakDays}-Day Streak</div>
                      <div className="text-xs text-gray-500">Keep going for bonus XP!</div>
                    </div>
                  </div>
                  <Badge className="bg-orange-600 text-white text-xs animate-pulse">
                    NEW!
                  </Badge>
                </div>

                {/* RECENT Achievement - Faded */}
                <div 
                  className="flex items-center justify-between p-2 bg-green-50 rounded cursor-pointer hover:bg-green-100 transition-all opacity-50"
                  onClick={() => toast.info("Viewing achievement details...")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <div>
                      <div className="text-sm font-medium">Speed Learner</div>
                      <div className="text-xs text-gray-500">Completed lab 20% faster</div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    +25 XP
                  </Badge>
                </div>

                {/* OLD Achievement - Faded */}
                <div 
                  className="flex items-center justify-between p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-all opacity-50"
                  onClick={() => toast.info("Sharing achievement...")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <div>
                      <div className="text-sm font-medium">Deadline Crusher</div>
                      <div className="text-xs text-gray-500">Finished ahead of schedule</div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs p-0">
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Power Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleQuickAction("next_urgent")}
                  title="⌘⇧U - Start most urgent task"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Urgent Task
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => handleQuickAction("review_weak_areas")}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Fix Weak Areas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Insights Modal */}
        {showInsightsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Smart Insights</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInsightsModal(false)}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      insight.type === "warning" ? "bg-orange-50 border-orange-200" :
                      insight.type === "opportunity" ? "bg-blue-50 border-blue-200" :
                      "bg-green-50 border-green-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      {insight.urgent && (
                        <Badge variant="destructive" className="text-xs">
                          Action Needed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                    <Button
                      size="sm"
                      className={`${
                        insight.type === "warning" ? "bg-orange-600 hover:bg-orange-700" :
                        insight.type === "opportunity" ? "bg-blue-600 hover:bg-blue-700" :
                        "bg-green-600 hover:bg-green-700"
                      } text-white`}
                      onClick={() => {
                        toast.success(`${insight.action} activated!`);
                        setShowInsightsModal(false);
                      }}
                    >
                      {insight.action}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Efficiency Fix Modal */}
        {showEfficiencyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Boost Efficiency</h3>
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
                    <strong>Current efficiency: {course.efficiency}%</strong> (below target 80%)
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Sessions longer than 60 minutes often see focus drop-off
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Auto-Split Long Sessions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>Neural Networks Project (4h) → 8×30min</span>
                      <span className="text-green-600 text-xs">+20% efficiency</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>Linear Regression Review (90m) → 3×30min</span>
                      <span className="text-green-600 text-xs">+15% efficiency</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-3">
                    <span>Estimated new efficiency:</span>
                    <span className="font-bold text-green-600">88%</span>
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
                      onClick={() => {
                        toast.success("Sessions auto-split into 25-30min blocks for optimal focus!");
                        setShowEfficiencyModal(false);
                      }}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Apply Auto-Split
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Preview Drawer */}
        {showScheduleDrawer && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 border-l border-gray-200 animate-in slide-in-from-right duration-150 ease-out">
            <div className="p-6 h-full overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Smart Schedule Preview</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScheduleDrawer(false)}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => {
                      toast.success("2h study block scheduled for next free slot!");
                      setShowScheduleDrawer(false);
                    }}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Quick 2h Boost
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      toast.success("Full week optimized with AI slots!");
                    }}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Full Week
                  </Button>
                </div>

                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 font-medium">
                    3 optimal slots found for CS229
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Total: 3.5h added to your schedule
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">Tomorrow, 2:00 PM</div>
                      <Badge className="bg-red-100 text-red-800 text-xs">Urgent</Badge>
                    </div>
                    <div className="text-sm text-gray-600">Neural Networks Project</div>
                    <div className="text-xs text-gray-500">90 minutes • High priority</div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">Wednesday, 10:00 AM</div>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">Continue</Badge>
                    </div>
                    <div className="text-sm text-gray-600">Gradient Descent Lab</div>
                    <div className="text-xs text-gray-500">60 minutes • In progress</div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">Friday, 3:30 PM</div>
                      <Badge className="bg-orange-100 text-orange-800 text-xs">Review</Badge>
                    </div>
                    <div className="text-sm text-gray-600">Linear Regression Review</div>
                    <div className="text-xs text-gray-500">45 minutes • Weak area</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowScheduleDrawer(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        toast.success("3 study sessions scheduled! Calendar updated.", {
                          action: {
                            label: 'Undo',
                            onClick: () => toast.info('Schedule changes reverted')
                          }
                        });
                        setShowScheduleDrawer(false);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Confirm Schedule
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weak Areas Drawer */}
        {showWeakAreasDrawer && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 border-l border-gray-200">
            <div className="p-6 h-full overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Weak Areas Review</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWeakAreasDrawer(false)}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                {modules.filter(m => m.weaknessScore > 30).map((module) => (
                  <div key={module.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-orange-900">{module.title}</div>
                        <div className="text-sm text-orange-600">
                          {module.confidenceLevel}% confidence • {module.weaknessScore}% weakness
                        </div>
                      </div>
                      <Badge className="bg-orange-500 text-white text-xs">
                        Needs Review
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => {
                          toast.success(`Starting focused review of ${module.title}...`);
                          setShowWeakAreasDrawer(false);
                        }}
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        Start Focused Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                        onClick={() => {
                          toast.success(`Scheduling ${module.title} review for tomorrow...`);
                        }}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SharedDashboardLayout>
    </>
  );
}