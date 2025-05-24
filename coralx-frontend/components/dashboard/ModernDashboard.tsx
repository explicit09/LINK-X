"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ModernSidebar from "@/components/dashboard/ModernSidebar";
import { ModernCourseCard } from "@/components/dashboard/ModernCourseCard";
import {
  Bell,
  Search,
  Plus,
  BookOpen,
  Users,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  ChevronRight,
  Star,
  Target,
  Zap,
  Brain,
  Lightbulb,
  GraduationCap,
  BarChart3,
  BookmarkPlus,
  X,
  Check,
} from "lucide-react";
import { FloatingAIAssistant } from "@/components/ai/FloatingAIAssistant";
import { SmartSelection } from "@/components/ai/SmartSelection";
import { toast as sonnerToast } from 'sonner';
import { instructorAPI, studentAPI, adminAPI } from "@/lib/api";
import CourseForm from "@/components/dashboard/CourseForm";

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

interface TodoItem {
  id: string;
  title: string;
  course: string;
  dueDate?: string;
  type: "quiz" | "assignment" | "reading" | "review";
  priority: "high" | "medium" | "low";
}

interface RecentActivity {
  id: string;
  type: "upload" | "quiz" | "ai_chat" | "completion" | "grade" | "announcement";
  course: string;
  title: string;
  timestamp: string;
}

interface ModernDashboardProps {
  userRole: "student" | "instructor" | "admin";
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  courses?: Course[];
}

export default function ModernDashboard({ userRole, currentUser, courses = [] }: ModernDashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPulse, setAiPulse] = useState(false);
  const [realCourses, setRealCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoCourse, setNewTodoCourse] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"high" | "medium" | "low">("medium");
  const [newTodoType, setNewTodoType] = useState<"quiz" | "assignment" | "reading" | "review">("assignment");
  const router = useRouter();

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Load courses based on user role
      let coursesData = [];
      if (userRole === "student") {
        coursesData = await studentAPI.getCourses();
      } else if (userRole === "instructor") {
        coursesData = await instructorAPI.getCourses();
      } else if (userRole === "admin") {
        coursesData = await instructorAPI.getCourses(); // Admin uses instructor API for courses
      }
      
      // Transform API data to match our interface
      const transformedCourses = coursesData.map((course: any, index: number) => ({
        id: course.id,
        title: course.title,
        code: course.code || "N/A",
        term: course.term || "Current",
        description: course.description || "",
        published: course.published,
        color: `course-${["blue", "green", "purple", "orange", "red", "teal"][index % 6]}`,
        lastActivity: course.last_updated ? formatRelativeTime(course.last_updated) : "Recently",
        materialsCount: course.modules?.length || 0,
        studentsCount: course.students || 0,
        unreadCount: Math.floor(Math.random() * 5),
      }));
      
      setRealCourses(transformedCourses);
      
      // Load user profile
      const user = await studentAPI.getProfile();
      setUserProfile(user);
      
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Show fallback data if API fails
      setRealCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Load real data from API and initialize todo/activity from localStorage
  useEffect(() => {
    loadCourses();
    loadTodoItems();
    loadRecentActivity();
  }, [userRole]);

  // Load todo items from localStorage
  const loadTodoItems = () => {
    try {
      const saved = localStorage.getItem('linkx-todo-items');
      if (saved) {
        setTodoItems(JSON.parse(saved));
      } else {
        // Initialize with sample items
        const sampleTodos: TodoItem[] = [
          {
            id: "1",
            title: "Complete Machine Learning Quiz",
            course: "CS 101",
            dueDate: "Tomorrow",
            type: "quiz",
            priority: "high"
          },
          {
            id: "2", 
            title: "Review Chapter 5 Notes",
            course: "Physics 201",
            dueDate: "Friday",
            type: "reading",
            priority: "medium"
          }
        ];
        setTodoItems(sampleTodos);
        localStorage.setItem('linkx-todo-items', JSON.stringify(sampleTodos));
      }
    } catch (error) {
      console.error('Error loading todo items:', error);
    }
  };

  // Load recent activity from localStorage  
  const loadRecentActivity = () => {
    try {
      const saved = localStorage.getItem('linkx-recent-activity');
      if (saved) {
        setRecentActivity(JSON.parse(saved));
      } else {
        // Initialize with sample activities
        const sampleActivities: RecentActivity[] = [
          {
            id: "1",
            type: "upload",
            course: "CS 101", 
            title: "Uploaded assignment solution",
            timestamp: "2 hours ago"
          },
          {
            id: "2",
            type: "quiz",
            course: "Physics 201",
            title: "Completed Chapter 4 Quiz",
            timestamp: "1 day ago"
          }
        ];
        setRecentActivity(sampleActivities);
        localStorage.setItem('linkx-recent-activity', JSON.stringify(sampleActivities));
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  // Function to add new todo item
  const addTodoItem = () => {
    if (!newTodoTitle.trim()) return;

    const newItem: TodoItem = {
      id: Date.now().toString(),
      title: newTodoTitle,
      course: newTodoCourse || "General",
      dueDate: "Added just now",
      type: newTodoType,
      priority: newTodoPriority
    };

    const updatedTodos = [newItem, ...todoItems];
    setTodoItems(updatedTodos);
    localStorage.setItem('linkx-todo-items', JSON.stringify(updatedTodos));
    
    // Clear form
    setNewTodoTitle("");
    setNewTodoCourse("");
    setShowAddTodo(false);
    
    // Add to recent activity
    addActivity("completion", newTodoCourse || "General", `Added new task: ${newTodoTitle}`);
    
    sonnerToast.success("Todo item added successfully!");
  };

  // Function to remove todo item
  const removeTodoItem = (id: string) => {
    const updatedTodos = todoItems.filter(item => item.id !== id);
    setTodoItems(updatedTodos);
    localStorage.setItem('linkx-todo-items', JSON.stringify(updatedTodos));
    sonnerToast.success("Todo item completed!");
  };

  // Function to add activity 
  const addActivity = (type: RecentActivity["type"], course: string, title: string) => {
    const newActivity: RecentActivity = {
      id: Date.now().toString(),
      type,
      course,
      title,
      timestamp: "Just now"
    };

    const updatedActivity = [newActivity, ...recentActivity.slice(0, 9)]; // Keep only 10 items
    setRecentActivity(updatedActivity);
    localStorage.setItem('linkx-recent-activity', JSON.stringify(updatedActivity));
  };

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Add pulse animation for AI section
  useEffect(() => {
    const interval = setInterval(() => {
      setAiPulse(true);
      setTimeout(() => setAiPulse(false), 2000);
    }, 8000); // Pulse every 8 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSmartSelection = (selectedText: string, action: string) => {
    sonnerToast.success(`AI is processing your request: ${action}`);
    // The FloatingAIAssistant will handle the actual AI interaction
  };

  const handleCourseCreated = async (courseData: any) => {
    try {
      // Refresh courses list after creating a new course
      await loadCourses();
      setShowCourseForm(false);
      sonnerToast.success("Course list updated!");
    } catch (error) {
      console.error("Failed to refresh courses:", error);
    }
  };

  const filteredCourses = realCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCourseClick = (course: Course) => {
    router.push(`/courses/${course.id}`);
  };

  const handleUpload = (courseId: string) => {
    // Handle file upload
    const course = realCourses.find(c => c.id === courseId);
    addActivity("upload", course?.title || "Unknown Course", "Uploaded new material");
    router.push(`/courses/${courseId}?tab=materials`);
  };

  const handleAIChat = (courseId: string) => {
    // Handle AI chat
    const course = realCourses.find(c => c.id === courseId);
    addActivity("ai_chat", course?.title || "Unknown Course", "Started AI chat session");
    router.push(`/courses/${courseId}?tab=ai`);
  };

  const handleQuiz = (courseId: string) => {
    // Handle quiz generation
    const course = realCourses.find(c => c.id === courseId);
    addActivity("quiz", course?.title || "Unknown Course", "Generated new quiz");
    router.push(`/courses/${courseId}?tab=quiz`);
  };

  const getTodoIcon = (type: TodoItem["type"]) => {
    switch (type) {
      case "quiz": return BookmarkPlus;
      case "assignment": return BookOpen;
      case "reading": return BookOpen;
      case "review": return Brain;
      default: return BookOpen;
    }
  };

  const getPriorityColor = (priority: TodoItem["priority"]) => {
    switch (priority) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "upload": return BookOpen;
      case "grade": return GraduationCap;
      case "announcement": return Lightbulb;
      default: return BookOpen;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="canvas-body">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <ModernSidebar
        userRole={userRole}
        onCollapseChange={setIsCollapsed}
        courses={realCourses}
        currentUser={currentUser}
      />
      
      <div className={cn("flex-1 transition-all duration-300 flex flex-col overflow-hidden", isCollapsed ? "ml-16" : "ml-64")}>
        {/* Top Header - Reduced gradient usage */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="canvas-heading-1">Dashboard</h1>
                <p className="canvas-body mt-1">
                  Welcome back, {currentUser?.name || "Student"}! Here&apos;s your learning overview.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button variant="outline" size="icon" className="modern-hover">
                  <Bell className="h-4 w-4" />
                </Button>
                {/* Show Create Course button for students */}
                {userRole === 'student' && (
                  <Button 
                    onClick={() => setShowCourseForm(true)}
                    variant="outline"
                    className="modern-hover"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                )}
                {/* PRIMARY GRADIENT - Only for main CTA */}
                <Button 
                  onClick={() => router.push("/courses?action=join")}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 button-pulse shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Join Course
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="p-6 flex-1 overflow-y-auto bg-gray-100">
          {/* Stats with cleaner design - flat colors with subtle shadows */}
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
                    <p className="text-2xl font-bold sidebar-text">{todoItems.length}</p>
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
                    <p className="text-2xl font-bold sidebar-text">24</p>
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
                    <p className="text-2xl font-bold sidebar-text">12h</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Courses Section */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="canvas-heading-2">My Courses</h2>
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/courses")}
                  className="modern-hover"
                >
                  View All
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                  <ModernCourseCard
                    key={course.id}
                    course={course}
                    colorIndex={index}
                    onClick={handleCourseClick}
                    onUpload={handleUpload}
                    onAIChat={handleAIChat}
                    onQuiz={handleQuiz}
                  />
                ))}
              </div>
            </div>

            {/* Enhanced Sidebar Content */}
            <div className="space-y-6">
              {/* To Do List - Highlighted zone */}
              <Card className="bg-blue-50 border-l-4 border-blue-500 shadow-lg border border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      To Do
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowAddTodo(!showAddTodo)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Add Todo Form */}
                  {showAddTodo && (
                    <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="space-y-2">
                        <Input
                          placeholder="What needs to be done?"
                          value={newTodoTitle}
                          onChange={(e) => setNewTodoTitle(e.target.value)}
                          className="text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Course (optional)"
                            value={newTodoCourse}
                            onChange={(e) => setNewTodoCourse(e.target.value)}
                            className="text-sm"
                          />
                          <select 
                            value={newTodoPriority}
                            onChange={(e) => setNewTodoPriority(e.target.value as "high" | "medium" | "low")}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={addTodoItem}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setShowAddTodo(false)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3 max-h-32 overflow-y-auto">
                    {todoItems.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No tasks yet!</p>
                        <p className="text-xs">Add your first task above</p>
                      </div>
                    ) : (
                      todoItems.slice(0, 2).map((item) => {
                        const IconComponent = getTodoIcon(item.type);
                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200 group"
                          >
                            <IconComponent className={cn("h-4 w-4 mt-0.5", getPriorityColor(item.priority))} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium sidebar-text truncate">
                                {item.title}
                              </p>
                              <p className="text-xs sidebar-text-muted">
                                {item.course} • {item.dueDate}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {item.priority}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeTodoItem(item.id)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity - Enhanced with background */}
              <Card className="bg-green-50 border-l-4 border-green-500 shadow-lg border border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shadow-md">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No recent activity</p>
                        <p className="text-xs">Your actions will appear here</p>
                      </div>
                    ) : (
                      recentActivity.slice(0, 3).map((activity) => {
                        const IconComponent = getActivityIcon(activity.type);
                        return (
                          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200">
                            <IconComponent className="h-4 w-4 text-gray-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm sidebar-text">{activity.title}</p>
                              <p className="text-xs sidebar-text-muted">
                                {activity.course} • {activity.timestamp}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* NEXT-LEVEL AI SECTION - Enhanced engagement */}
              <Card className={cn(
                "canvas-card bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-purple-200 relative overflow-hidden",
                aiPulse ? "ring-2 ring-purple-300 ring-opacity-75" : ""
              )}>
                <CardContent className="p-6 text-center relative">
                  {/* Subtle animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 via-blue-100/20 to-transparent opacity-0 animate-pulse" 
                       style={{ animationDuration: '3s' }} />
                  
                  <div className="relative">
                    <div className={cn(
                      "w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300",
                      aiPulse ? "scale-110 shadow-lg shadow-purple-400" : "shadow-md"
                    )}>
                      <Brain className="h-8 w-8 text-white" />
                      <div className={cn(
                        "absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center transition-all duration-300",
                        aiPulse ? "scale-125 animate-bounce" : ""
                      )}>
                        <Zap className="h-3 w-3 text-yellow-800" />
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="canvas-heading-3 mb-2 bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent">
                    AI Study Assistant
                  </h3>
                  
                  {/* Enhanced copy */}
                  <p className="canvas-small text-purple-600 mb-4 leading-relaxed">
                    Stuck? Highlight anything or click here to ask your AI tutor instantly.
                  </p>
                  
                  {/* Enhanced CTA with primary gradient */}
                  <Button 
                    className={cn(
                      "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
                      "shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-medium"
                    )}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Start Learning Now
                  </Button>
                  
                  {/* Subtle feature callout */}
                  <p className="text-xs text-purple-500 mt-3 opacity-75">
                    💡 Try highlighting text anywhere for instant AI help
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* AI Components */}
      <FloatingAIAssistant />
      <SmartSelection onAskAI={handleSmartSelection} />

      {/* Course Form Dialog */}
      <Dialog open={showCourseForm} onOpenChange={setShowCourseForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
          </DialogHeader>
          <CourseForm 
            userRole={userRole === 'admin' ? 'instructor' : userRole}
            onSave={handleCourseCreated} 
            onCancel={() => setShowCourseForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}