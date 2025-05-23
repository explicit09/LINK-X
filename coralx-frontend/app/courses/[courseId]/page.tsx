"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ModernSidebar from "@/components/dashboard/ModernSidebar";
import { EnhancedFileUpload } from "@/components/course/EnhancedFileUpload";
import { FloatingAIAssistant } from "@/components/ai/FloatingAIAssistant";
import { SmartSelection } from "@/components/ai/SmartSelection";
import { SmartRecommendations } from "@/components/ai/SmartRecommendations";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Settings,
  Brain,
  MessageSquare,
  Upload,
  FileText,
  Video,
  Mic,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Presentation,
  CheckCircle,
  Search,
  Filter,
  Plus
} from "lucide-react";
import { toast as sonnerToast } from 'sonner';
import { Input } from "@/components/ui/input";

import { studentAPI, instructorAPI, userAPI, courseAPI } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  instructor?: string;
  studentsCount?: number;
  materialsCount?: number;
  color?: string;
  lastActivity?: string;
}

interface Material {
  id: string;
  title: string;
  type: "pdf" | "audio" | "video" | "document";
  size?: string;
  uploadedAt: string;
  processed?: boolean;
}

interface AIConversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: number;
  completed?: boolean;
  score?: number;
  createdAt: string;
}

const courseColors = [
  {
    name: "electric-blue",
    gradient: "from-blue-500 via-purple-500 to-indigo-600",
    accent: "blue-500",
    text: "blue-700",
    bg: "blue-50",
    border: "blue-200",
    bar: "bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600"
  },
  {
    name: "vibrant-green", 
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    accent: "emerald-500",
    text: "emerald-700",
    bg: "emerald-50",
    border: "emerald-200",
    bar: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600"
  },
  {
    name: "sunset-purple",
    gradient: "from-purple-500 via-pink-500 to-rose-600",
    accent: "purple-500", 
    text: "purple-700",
    bg: "purple-50",
    border: "purple-200",
    bar: "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-600"
  },
  {
    name: "coral-orange",
    gradient: "from-orange-500 via-red-500 to-pink-600",
    accent: "orange-500",
    text: "orange-700", 
    bg: "orange-50",
    border: "orange-200",
    bar: "bg-gradient-to-r from-orange-500 via-red-500 to-pink-600"
  },
  {
    name: "ruby-red",
    gradient: "from-red-500 via-pink-500 to-purple-600",
    accent: "red-500",
    text: "red-700",
    bg: "red-50", 
    border: "red-200",
    bar: "bg-gradient-to-r from-red-500 via-pink-500 to-purple-600"
  },
  {
    name: "ocean-teal",
    gradient: "from-teal-500 via-cyan-500 to-blue-600",
    accent: "teal-500",
    text: "teal-700",
    bg: "teal-50",
    border: "teal-200",
    bar: "bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600"
  },
  {
    name: "golden-yellow",
    gradient: "from-yellow-500 via-orange-500 to-red-500",
    accent: "yellow-500",
    text: "yellow-700",
    bg: "yellow-50",
    border: "yellow-200",
    bar: "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"
  },
  {
    name: "royal-indigo",
    gradient: "from-indigo-500 via-purple-500 to-blue-600", 
    accent: "indigo-500",
    text: "indigo-700",
    bg: "indigo-50",
    border: "indigo-200",
    bar: "bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600"
  }
];

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params?.courseId as string;
  const activeTab = searchParams?.get("tab") || "home";

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<{ id: string; title: string; type: string } | undefined>();

  // Load real data from API
  useEffect(() => {
    if (!courseId) return;
    
    const loadCourseData = async () => {
      try {
        setLoading(true);
        
        // Get user first to determine API endpoints
        const user = await userAPI.getMe();
        setCurrentUser(user);
        
        let courseData;
        let modulesData = [];
        let filesData: any[] = [];
        
        // Load course data based on user role
        if (user.role === "student") {
          // For students, get course from their enrolled courses
          const enrolledCourses = await studentAPI.getCourses();
          courseData = enrolledCourses.find((c: any) => c.id === courseId);
          
          if (courseData) {
            // Get modules and files for this course
            // Note: API might need to be enhanced to get modules by course ID for students
            // For now we'll construct based on available data
          }
        } else if (user.role === "instructor") {
          // For instructors, get course directly
          courseData = await instructorAPI.getCourse(courseId);
          
          if (courseData) {
            // Get modules for this course
            modulesData = await instructorAPI.getCourseModules(courseId);
            
            // Get files for each module
            for (const moduleItem of modulesData) {
              const moduleFiles = await instructorAPI.getModuleFiles(moduleItem.id);
              filesData.push(...moduleFiles.map((file: any) => ({
                ...file,
                moduleId: moduleItem.id,
                moduleName: moduleItem.title
              })));
            }
          }
        }
        
        if (!courseData) {
          setCourse(null);
          return;
        }
        
        // Transform course data
        const transformedCourse: Course = {
          id: courseData.id,
          title: courseData.title,
          code: courseData.code || "N/A",
          term: courseData.term || "Current",
          description: courseData.description || "",
          instructor: user.role === "instructor" ? 
            user.profile?.name || user.email : 
            "Instructor",
          studentsCount: courseData.students || 0,
          materialsCount: filesData.length,
          color: "course-blue",
          lastActivity: courseData.last_updated ? formatRelativeTime(courseData.last_updated) : "Recently",
        };
        
        // Transform materials data
        const transformedMaterials: Material[] = filesData.map((file: any) => ({
          id: file.id,
          title: file.title,
          type: getFileType(file.file_type),
          size: formatFileSize(file.file_size),
          uploadedAt: formatRelativeTime(file.created_at),
          processed: true, // Assume processed if in database
        }));
        
        // TODO: Load real conversations and chats from API
        const conversations: AIConversation[] = [];
        // Chat functionality would be implemented with course discussions API
        // if (user.role === "student") {
        //   const discussions = await studentAPI.getCourseDiscussions(courseId);
        //   // Transform discussions to conversations format
        // }
        
        // TODO: Generate quizzes based on course content
        const quizzes: Quiz[] = [];
        
        setCourse(transformedCourse);
        setMaterials(transformedMaterials);
        setConversations(conversations);
        setQuizzes(quizzes);
        
      } catch (error) {
        console.error("Failed to load course:", error);
        sonnerToast.error("Failed to load course data");
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  // Helper functions
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (mimeType: string): Material["type"] => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('audio')) return 'audio';
    if (mimeType.includes('video')) return 'video';
    return 'document';
  };

  const handleTabChange = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.replace(url.pathname + url.search);
  };

  const handleUploadComplete = (newFile: any) => {
    setMaterials(prev => [...prev, newFile]);
    // Auto-close dialog after a short delay to show success
    setTimeout(() => {
      setIsUploadDialogOpen(false);
    }, 2000);
  };

  // Handle AI selection from SmartSelection component
  const handleSmartSelection = (selectedText: string, action: string) => {
    const message = `${action.charAt(0).toUpperCase() + action.slice(1)} this text: "${selectedText}"`;
    sonnerToast.success(`AI is processing your request: ${action}`);
    // The FloatingAIAssistant will handle the actual AI interaction
  };

  const getFileIcon = (type: Material["type"]) => {
    switch (type) {
      case "pdf": return FileText;
      case "audio": return Mic;
      case "video": return Video;
      default: return FileText;
    }
  };

  const getFileColor = (type: Material["type"]) => {
    switch (type) {
      case "pdf": return "text-red-600";
      case "audio": return "text-purple-600";
      case "video": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="canvas-body">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="canvas-heading-2 mb-2">Course Not Found</h2>
          <p className="canvas-body mb-4">The course you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Generate a consistent color index from the courseId string by summing character codes
  const colorIndex = courseId ? 
    (Array.from(courseId.toString()).reduce((sum, char) => sum + char.charCodeAt(0), 0) % courseColors.length) : 
    0; // Default to first color if courseId is undefined
  const colors = courseColors[colorIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex">
      <ModernSidebar
        userRole="student"
        onCollapseChange={setIsCollapsed}
        courses={[course]}
        currentUser={currentUser}
      />
      
      <div className={cn("flex-1 transition-all duration-300", isCollapsed ? "ml-16" : "ml-64")}>
        {/* Enhanced Course Header */}
        <div className="bg-gradient-to-r from-white via-gray-50 to-white border-b border-gray-200 relative overflow-hidden">
          {/* Animated Course Color Bar */}
          <div className={cn("h-2 w-full transition-all duration-500", colors.bar)} />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className={cn("w-full h-full bg-gradient-to-br", colors.gradient)} />
          </div>
          
          <div className="px-6 py-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-600 hover:text-gray-900 modern-hover"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div>
                  <h1 className={cn(
                    "canvas-heading-1 bg-gradient-to-r bg-clip-text text-transparent",
                    `from-${colors.text} via-gray-900 to-${colors.text}`
                  )}>
                    {course.title}
                  </h1>
                  <p className="canvas-body">
                    {course.code} • {course.term} • {course.instructor}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs modern-hover", `border-${colors.border} text-${colors.text}`)}
                >
                  {course.studentsCount} students
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs modern-hover", `border-${colors.border} text-${colors.text}`)}
                >
                  {course.materialsCount} materials
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Course Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 relative">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="h-12 bg-transparent border-none p-0">
              <TabsTrigger 
                value="home" 
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none modern-hover",
                  `data-[state=active]:border-${colors.accent} data-[state=active]:text-${colors.text}`
                )}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Home
              </TabsTrigger>
              <TabsTrigger 
                value="materials"
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none modern-hover",
                  `data-[state=active]:border-${colors.accent} data-[state=active]:text-${colors.text}`
                )}
              >
                <FileText className="h-4 w-4 mr-2" />
                Materials
              </TabsTrigger>
              <TabsTrigger 
                value="ai"
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none modern-hover",
                  `data-[state=active]:border-${colors.accent} data-[state=active]:text-${colors.text}`
                )}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Tutor
              </TabsTrigger>
              <TabsTrigger 
                value="quizzes"
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none modern-hover",
                  `data-[state=active]:border-${colors.accent} data-[state=active]:text-${colors.text}`
                )}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Quizzes
              </TabsTrigger>
              <TabsTrigger 
                value="people"
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:border-b-2 rounded-none modern-hover",
                  `data-[state=active]:border-${colors.accent} data-[state=active]:text-${colors.text}`
                )}
              >
                <Users className="h-4 w-4 mr-2" />
                People
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <main className="p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Home Tab */}
            <TabsContent value="home" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Smart Recommendations - Featured prominently */}
                  <SmartRecommendations 
                    courseId={courseId} 
                    userId={currentUser?.id}
                  />

                  {/* Enhanced Course Description */}
                  <Card className="canvas-card gradient-hover modern-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-full bg-gradient-to-r flex items-center justify-center", colors.gradient)}>
                          <BookOpen className="h-4 w-4 text-white" />
                        </div>
                        Course Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="canvas-body">{course.description}</p>
                    </CardContent>
                  </Card>

                  {/* Enhanced Recent Materials */}
                  <Card className="canvas-card gradient-hover modern-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-8 h-8 rounded-full bg-gradient-to-r flex items-center justify-center", colors.gradient)}>
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          Recent Materials
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTabChange("materials")}
                          className={cn("modern-hover", `hover:bg-${colors.bg} hover:border-${colors.border} hover:text-${colors.text}`)}
                        >
                          View All
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {materials.slice(0, 3).map((material) => {
                          const IconComponent = getFileIcon(material.type);
                          return (
                            <div 
                              key={material.id} 
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-300 cursor-pointer modern-hover group"
                              onClick={() => setCurrentMaterial({ id: material.id, title: material.title, type: material.type })}
                            >
                              <IconComponent className={cn("h-5 w-5 transition-colors duration-300", getFileColor(material.type))} />
                              <div className="flex-1">
                                <p className="text-sm font-medium sidebar-text">{material.title}</p>
                                <p className="text-xs sidebar-text-muted">{material.size} • {material.uploadedAt}</p>
                              </div>
                              {!material.processed && (
                                <Badge variant="outline" className="text-xs animate-pulse">Processing</Badge>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTabChange("ai");
                                }}
                                className={cn(
                                  "opacity-0 group-hover:opacity-100 transition-all duration-300",
                                  `hover:bg-${colors.bg} hover:border-${colors.border} hover:text-${colors.text}`
                                )}
                              >
                                <Brain className="h-3 w-3 mr-1" />
                                Ask AI
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Sidebar */}
                <div className="space-y-6">
                  {/* Enhanced Quick Actions */}
                  <Card className="canvas-card gradient-hover modern-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-full bg-gradient-to-r flex items-center justify-center", colors.gradient)}>
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className={cn("w-full justify-start modern-hover button-pulse bg-gradient-to-r", colors.gradient)}
                        onClick={() => setIsUploadDialogOpen(true)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Material
                      </Button>
                      <Button 
                        variant="outline" 
                        className={cn("w-full justify-start modern-hover", `hover:bg-${colors.bg} hover:border-${colors.border} hover:text-${colors.text}`)}
                        onClick={() => handleTabChange("ai")}
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Ask AI Tutor
                      </Button>
                      <Button 
                        variant="outline" 
                        className={cn("w-full justify-start modern-hover", `hover:bg-${colors.bg} hover:border-${colors.border} hover:text-${colors.text}`)}
                        onClick={() => handleTabChange("quizzes")}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Generate Quiz
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Enhanced Recent AI Conversations */}
                  <Card className="canvas-card gradient-hover modern-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
                            <Brain className="h-4 w-4 text-white" />
                          </div>
                          Recent AI Chats
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTabChange("ai")}
                          className="modern-hover hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
                        >
                          View All
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {conversations.slice(0, 2).map((conversation) => (
                          <div key={conversation.id} className="p-3 rounded-lg hover:bg-gray-50 transition-all duration-300 cursor-pointer modern-hover">
                            <p className="text-sm font-medium sidebar-text line-clamp-1">{conversation.title}</p>
                            <p className="text-xs sidebar-text-muted mt-1 line-clamp-2">{conversation.lastMessage}</p>
                            <p className="text-xs text-gray-400 mt-2">{conversation.messageCount} messages • {conversation.timestamp}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Materials Tab - Enhanced */}
            <TabsContent value="materials" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="canvas-heading-2">Course Materials</h2>
                <Button 
                  onClick={() => setIsUploadDialogOpen(true)}
                  className={cn("modern-hover button-pulse bg-gradient-to-r", colors.gradient)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Material
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.map((material) => {
                  const IconComponent = getFileIcon(material.type);
                  return (
                    <Card 
                      key={material.id} 
                      className="canvas-card modern-hover cursor-pointer gradient-hover group"
                      onClick={() => setCurrentMaterial({ id: material.id, title: material.title, type: material.type })}
                    >
                      <CardContent className="p-6 relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn("p-3 rounded-lg bg-gradient-to-r", colors.gradient)}>
                            <IconComponent className="h-6 w-6 text-white" />
                          </div>
                          {!material.processed && (
                            <Badge variant="outline" className="text-xs animate-pulse">Processing</Badge>
                          )}
                        </div>
                        <h3 className="font-medium sidebar-text mb-2 line-clamp-2">{material.title}</h3>
                        <p className="text-sm sidebar-text-muted">{material.size} • {material.uploadedAt}</p>
                        
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" className={cn("flex-1 bg-gradient-to-r", colors.gradient)}>
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTabChange("ai");
                            }}
                            className={cn("modern-hover", `hover:bg-${colors.bg} hover:border-${colors.border} hover:text-${colors.text}`)}
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            Ask AI
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* AI Tutor Tab */}
            <TabsContent value="ai" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="canvas-heading-2">AI Tutor</h2>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="canvas-card h-96">
                    <CardContent className="p-6 h-full flex items-center justify-center">
                      <div className="text-center">
                        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="canvas-heading-3 mb-2">Start a conversation with your AI tutor</h3>
                        <p className="canvas-body text-gray-500 mb-4">Ask questions about course materials, get explanations, or request practice problems.</p>
                        <div className="space-y-2">
                          <Button>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Start Chatting
                          </Button>
                          <p className="text-xs text-gray-400">💡 Tip: Highlight any text on this page and ask AI about it!</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card className="canvas-card">
                    <CardHeader>
                      <CardTitle>Recent Conversations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {conversations.map((conversation) => (
                          <div key={conversation.id} className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                            <p className="text-sm font-medium sidebar-text line-clamp-1">{conversation.title}</p>
                            <p className="text-xs sidebar-text-muted mt-1 line-clamp-2">{conversation.lastMessage}</p>
                            <p className="text-xs text-gray-400 mt-2">{conversation.messageCount} messages • {conversation.timestamp}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="canvas-heading-2">Practice Quizzes</h2>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Generate Quiz
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id} className="canvas-card modern-hover cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <MessageSquare className="h-8 w-8 text-blue-600" />
                        {quiz.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                      <h3 className="font-medium sidebar-text mb-2">{quiz.title}</h3>
                      <p className="text-sm sidebar-text-muted mb-4">
                        {quiz.questions} questions • {quiz.createdAt}
                      </p>
                      
                      {quiz.completed ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Score:</span>
                            <Badge variant="secondary">{quiz.score}%</Badge>
                          </div>
                          <Button size="sm" variant="outline" className="w-full">Review</Button>
                        </div>
                      ) : (
                        <Button size="sm" className="w-full">Start Quiz</Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* People Tab */}
            <TabsContent value="people" className="space-y-6">
              <h2 className="canvas-heading-2">Course People</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="canvas-card">
                  <CardHeader>
                    <CardTitle>Instructor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">SJ</span>
                      </div>
                      <div>
                        <p className="font-medium sidebar-text">{course.instructor}</p>
                        <p className="text-sm sidebar-text-muted">Professor</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="canvas-card">
                  <CardHeader>
                    <CardTitle>Classmates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="canvas-body text-center py-8 text-gray-500">
                      Classmate list will be available soon
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* AI Components */}
      <FloatingAIAssistant 
        courseId={courseId}
        courseName={course.title}
        currentMaterial={currentMaterial}
      />
      
      <SmartSelection
        onAskAI={handleSmartSelection}
        courseId={courseId}
        materialId={currentMaterial?.id}
      />

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Course Materials</DialogTitle>
          </DialogHeader>
          <EnhancedFileUpload 
            courseId={courseId}
            onUploadComplete={handleUploadComplete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 