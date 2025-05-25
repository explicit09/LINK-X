"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ModernSidebar from "@/components/dashboard/ModernSidebar";
import { EnhancedFileUpload } from "@/components/course/EnhancedFileUpload";
import { FloatingAIAssistant } from "@/components/ai/FloatingAIAssistant";
import { SmartSelection } from "@/components/ai/SmartSelection";
import { SmartRecommendations } from "@/components/ai/SmartRecommendations";
import MaterialViewer from "@/components/course/MaterialViewer";
import { StudentCourseUpload } from "@/components/course/StudentCourseUpload";
import { ModuleStream } from "@/components/course/ModuleStream";
import { StatsSidePanel } from "@/components/course/StatsSidePanel";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Brain,
  MessageSquare,
  Upload,
  FileText,
  Video,
  Mic,
  Clock,
  CheckCircle2,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Download,
  Package,
  Zap,
  BarChart3
} from "lucide-react";
import { toast as sonnerToast } from 'sonner';

import { studentAPI, instructorAPI, userAPI } from "@/lib/api";

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

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<{ id: string; title: string; type: string } | undefined>();
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [useAdvancedUpload, setUseAdvancedUpload] = useState(false);

  const [courseProgress, setCourseProgress] = useState({
    completedMaterials: 0,
    totalMaterials: 0,
    weeklyTimeMinutes: 0,
    todayTimeMinutes: 0,
    progressPercentage: 0
  });



  // Load real data from API
  useEffect(() => {
    if (!courseId) return;
    
    // Clear any existing error toasts on page load
    sonnerToast.dismiss();
    
    const loadCourseData = async () => {
      try {
        setLoading(true);
        
        let user;
        try {
          // Get user first to determine API endpoints
          user = await userAPI.getMe();
          setCurrentUser(user);
          console.log('User loaded successfully:', user);
        } catch (userError) {
          console.error('Failed to load user:', userError);
          sonnerToast.error('Authentication failed. Please log in again.');
          // Redirect to login or show error state
          router.push('/login');
          return;
        }
        
        let courseData;
        let modulesData = [];
        let filesData: any[] = [];
        
        try {
          // Load course data based on user role
          if (user.role === "student") {
            try {
              // For students, get course from their enrolled courses
              const enrolledCourses = await studentAPI.getCourses();
              courseData = enrolledCourses.find((c: any) => c.id === courseId);
              
              if (courseData) {
                // Get modules and files for this course
                try {
                  modulesData = await studentAPI.getCourseModules(courseId);
                  
                  // Get files for each module
                  for (const moduleItem of modulesData) {
                    try {
                      const moduleFiles = await studentAPI.getModuleFiles(moduleItem.id);
                      filesData.push(...moduleFiles.map((file: any) => ({
                        ...file,
                        moduleId: moduleItem.id,
                        moduleName: moduleItem.title
                      })));
                    } catch (fileError) {
                      console.warn(`Failed to load files for module ${moduleItem.id}:`, fileError);
                    }
                  }
                } catch (moduleError) {
                  console.warn('Failed to load modules:', moduleError);
                }
              }
            } catch (courseError) {
              console.error('Failed to load student courses:', courseError);
              sonnerToast.error('Failed to load your courses');
            }
          } else if (user.role === "instructor") {
            try {
              // For instructors, get course directly
              courseData = await instructorAPI.getCourse(courseId);
              
              if (courseData) {
                // Get modules for this course
                try {
                  modulesData = await instructorAPI.getCourseModules(courseId);
                  
                  // Get files for each module
                  for (const moduleItem of modulesData) {
                    try {
                      const moduleFiles = await instructorAPI.getModuleFiles(moduleItem.id);
                      filesData.push(...moduleFiles.map((file: any) => ({
                        ...file,
                        moduleId: moduleItem.id,
                        moduleName: moduleItem.title
                      })));
                    } catch (fileError) {
                      console.warn(`Failed to load files for module ${moduleItem.id}:`, fileError);
                    }
                  }
                } catch (moduleError) {
                  console.warn('Failed to load modules:', moduleError);
                }
              }
            } catch (courseError) {
              console.error('Failed to load instructor course:', courseError);
              sonnerToast.error('Failed to load course details');
            }
          }
        } catch (dataError) {
          console.error('Failed to load course data:', dataError);
          sonnerToast.error('Failed to load course information');
        }
        
        if (!courseData) {
          console.warn('No course data found for ID:', courseId);
          setCourse(null);
          setMaterials([]);
          setConversations([]);
          setQuizzes([]);
          return;
        }
        
        // Transform course data safely
        const transformedCourse: Course = {
          id: courseData.id || courseId,
          title: courseData.title || "Unknown Course",
          code: courseData.code || "N/A",
          term: courseData.term || "Current Term",
          description: courseData.description || "No description available",
          instructor: user.role === "instructor" ? 
            user.profile?.name || user.email || "Instructor" : 
            courseData.instructor || "Instructor",
          studentsCount: courseData.students || 0,
          materialsCount: filesData.length,
          color: "course-blue",
          lastActivity: courseData.last_updated ? formatRelativeTime(courseData.last_updated) : "Recently",
        };
        
        // Transform materials data safely
        const transformedMaterials: Material[] = filesData
          .filter(file => file && file.id) // Filter out invalid files
          .map((file: any) => ({
            id: file.id,
            title: file.title || file.name || "Unknown File",
            type: getFileType(file.file_type || file.type || ""),
            size: formatFileSize(file.file_size || file.size || 0),
            uploadedAt: formatRelativeTime(file.created_at || file.uploadedAt || new Date().toISOString()),
            processed: file.processed !== false, // Default to true unless explicitly false
          }));
        
        // Load conversations from API
        let conversations: AIConversation[] = [];
        try {
          if (user.role === "student") {
            const discussionsData = await studentAPI.getCourseDiscussions(courseId);
            if (discussionsData && Array.isArray(discussionsData)) {
              conversations = discussionsData
                .filter(discussion => discussion && discussion.id) // Filter out invalid discussions
                .map((discussion: any) => ({
                  id: discussion.id,
                  title: discussion.title || "Conversation",
                  lastMessage: discussion.last_message || "No messages yet",
                  timestamp: formatRelativeTime(discussion.updated_at || new Date().toISOString()),
                  messageCount: discussion.message_count || 0
                }));
            }
          }
        } catch (error: any) {
          // Check if it's a 404 error (endpoint doesn't exist)
          if (error?.message?.includes('404') || error?.message?.includes('NOT FOUND')) {
            console.info("Discussions endpoint not available yet");
          } else {
            console.warn("Failed to load discussions:", error);
          }
          // Leave conversations as empty array - don't show error to user
        }
        
        // Load quizzes from API
        let quizzes: Quiz[] = [];
        try {
          // TODO: Implement quiz API endpoints
          // const quizzesData = await studentAPI.getCourseQuizzes(courseId);
          // quizzes = quizzesData.map((quiz: any) => ({
          //   id: quiz.id,
          //   title: quiz.title,
          //   questions: quiz.question_count,
          //   completed: quiz.completed,
          //   score: quiz.score,
          //   createdAt: formatRelativeTime(quiz.created_at)
          // }));
        } catch (error) {
          console.warn("Failed to load quizzes:", error);
        }
        
        setCourse(transformedCourse);
        setMaterials(transformedMaterials);
        setConversations(conversations);
        setQuizzes(quizzes);

        // Load real course progress from API
        let realProgress = {
          completedMaterials: 0,
          totalMaterials: transformedMaterials.length,
          weeklyTimeMinutes: 0,
          todayTimeMinutes: 0,
          progressPercentage: 0
        };
        
        try {
          if (user.role === "student") {
            const progressData = await studentAPI.getCourseProgress(courseId);
            realProgress = {
              completedMaterials: progressData.viewedMaterials || 0,
              totalMaterials: progressData.totalMaterials || transformedMaterials.length,
              weeklyTimeMinutes: progressData.weeklyTimeMinutes || 0,
              todayTimeMinutes: progressData.todayTimeMinutes || 0,
              progressPercentage: progressData.progressPercentage || 0
            };
          } else {
            // For instructors, calculate based on materials
            const processedMaterials = transformedMaterials.filter(m => m.processed).length;
            realProgress = {
              completedMaterials: processedMaterials,
              totalMaterials: transformedMaterials.length,
              weeklyTimeMinutes: 0, // Instructors don't have "study time"
              todayTimeMinutes: 0,
              progressPercentage: transformedMaterials.length > 0 ? 
                Math.round((processedMaterials / transformedMaterials.length) * 100) : 0
            };
          }
        } catch (progressError) {
          console.warn("Failed to load real progress data:", progressError);
          // Fallback to basic calculation
          const processedMaterials = transformedMaterials.filter(m => m.processed).length;
          realProgress = {
            completedMaterials: processedMaterials,
            totalMaterials: transformedMaterials.length,
            weeklyTimeMinutes: 0,
            todayTimeMinutes: 0,
            progressPercentage: transformedMaterials.length > 0 ? 
              Math.round((processedMaterials / transformedMaterials.length) * 100) : 0
          };
        }
        
        setCourseProgress(realProgress);
        
      } catch (error) {
        console.error("Failed to load course:", error);
        sonnerToast.error("Failed to load course data");
        setCourse(null);
        setMaterials([]);
        setConversations([]);
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, router]);

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
    try {
      if (!newFile) {
        console.warn("Upload completed but no file data received");
        return;
      }
      
      setMaterials(prev => [...prev, newFile]);
      // Auto-close dialog after a short delay to show success
      setTimeout(() => {
        setIsUploadDialogOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Error handling upload completion:", error);
      sonnerToast.error("Upload completed but failed to update interface");
    }
  };

  // Handle viewing a material
  const handleViewMaterial = (material: { id: string; title: string; type: Material["type"] }) => {
    try {
      if (!material || !material.id) {
        sonnerToast.error("Invalid material selected");
        return;
      }
      
      if (!currentUser) {
        sonnerToast.error("Please log in to view materials");
        return;
      }
      
      // Log the file view activity
      studentAPI.logActivity({
        type: 'file_view',
        fileId: material.id,
        courseId: courseId
      }).catch(error => {
        console.warn("Failed to log file view activity:", error);
      });
      
      setCurrentMaterial(material);
    } catch (error) {
      console.error("Error opening material:", error);
      sonnerToast.error("Failed to open material");
    }
  };

  // Handle AI selection from SmartSelection component
  const handleSmartSelection = (selectedText: string, action: string) => {
    try {
      if (!selectedText || !action) {
        sonnerToast.error("Invalid selection");
        return;
      }
      
      if (!currentUser) {
        sonnerToast.error("Please log in to use AI features");
        return;
      }
      
      const message = `${action.charAt(0).toUpperCase() + action.slice(1)} this text: "${selectedText}"`;
      sonnerToast.success(`AI is processing your request: ${action}`);
      // The FloatingAIAssistant will handle the actual AI interaction
    } catch (error) {
      console.error("Error handling smart selection:", error);
      sonnerToast.error("Failed to process selection");
    }
  };

  // Handle Ask AI button click for materials
  const handleAskAI = async (material: { id: string; title: string; type: Material["type"] }) => {
    try {
      if (!material || !material.id) {
        sonnerToast.error("Invalid material selected");
        return;
      }
      
      if (!currentUser) {
        sonnerToast.error("Please log in to use AI features");
        return;
      }

      // Show persistent loading state
      const loadingToast = sonnerToast.loading("Creating personalized learning experience...", {
        description: "Analyzing your learning profile and preparing content",
        duration: 0 // Keep loading until we dismiss it
      });

      // First, fetch the user's onboarding profile
      const profileRes = await fetch("http://localhost:8080/student/profile", {
        method: "GET",
        credentials: "include",
      });

      if (!profileRes.ok) {
        throw new Error("Failed to fetch student profile. Please complete your onboarding first.");
      }

      const profileData = await profileRes.json();
      const { name, onboard_answers } = profileData;

      // Prepare user profile for personalization
      const userProfile = {
        role: onboard_answers.job || "student",
        traits: onboard_answers.traits || "helpful and encouraging",
        learningStyle: onboard_answers.learningStyle || "visual",
        depth: onboard_answers.depth || "intermediate",
        interests: onboard_answers.topics || "general learning",
        personalization: onboard_answers.interests || "using practical examples",
        schedule: onboard_answers.schedule || "flexible learning",
      };

      // Polling function to wait for file processing
      const pollForProcessing = async (attempt = 1): Promise<any> => {
        try {
          // Update loading message based on attempt
          if (attempt === 1) {
            sonnerToast.loading("Creating personalized learning experience...", {
              description: "Analyzing your learning profile and preparing content",
              id: loadingToast
            });
          } else if (attempt <= 3) {
            sonnerToast.loading("Creating personalized learning experience...", {
              description: "Processing course material (this may take a moment)...",
              id: loadingToast
            });
          } else if (attempt <= 6) {
            sonnerToast.loading("Creating personalized learning experience...", {
              description: "Still processing... AI is analyzing the content thoroughly",
              id: loadingToast
            });
          } else {
            sonnerToast.loading("Creating personalized learning experience...", {
              description: "Almost ready... finalizing your personalized content",
              id: loadingToast
            });
          }

          const personalizeRes = await fetch("http://localhost:8080/generatepersonalizedfilecontent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              name: name,
              userProfile: userProfile,
              fileId: material.id,
            }),
          });

          // Handle the new status codes
          if (personalizeRes.status === 202) {
            // File is still processing - continue polling
            if (attempt > 12) { // Max 12 attempts = ~2 minutes
              throw new Error("The file is taking longer than expected to process. Please try again later or contact support.");
            }
            
            // Wait before next attempt (progressive backoff)
            const waitTime = Math.min(attempt * 1000, 5000); // 1s, 2s, 3s, 4s, 5s, 5s...
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            return pollForProcessing(attempt + 1);
          }

          if (!personalizeRes.ok) {
            const errorText = await personalizeRes.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText };
            }

            throw new Error(`Failed to generate personalized content: ${errorData.error || 'Unknown error'}`);
          }

          return await personalizeRes.json();
        } catch (error) {
          // If it's a network or other error, retry
          if (error instanceof Error && (
            error.message.includes("Failed to fetch") || 
            error.message.includes("NetworkError") ||
            error.message.includes("TypeError")
          )) {
            if (attempt > 12) {
              throw new Error("Network connection issue. Please check your connection and try again.");
            }
            const waitTime = Math.min(attempt * 1000, 5000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return pollForProcessing(attempt + 1);
          }
          throw error;
        }
      };

      // Start polling for processing completion
      const personalizedData = await pollForProcessing();
      
      sonnerToast.dismiss(loadingToast);
      sonnerToast.success("Personalized learning experience created!", {
        description: `Redirecting to your customized version of "${material.title}"`,
      });

      // Log the AI personalization activity
      studentAPI.logActivity({
        type: 'personalized_view',
        fileId: material.id,
        courseId: courseId
      }).catch(error => {
        console.warn("Failed to log AI activity:", error);
      });

      // Small delay to show success message before redirect
      setTimeout(() => {
        router.push(`/learn/${personalizedData.id}`);
      }, 1000);

    } catch (error) {
      sonnerToast.dismiss();
      console.error("Error creating personalized content:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      if (errorMessage.includes("complete your onboarding")) {
        sonnerToast.error("Profile Required", {
          description: "Please complete your learning profile first to enable personalized content.",
          action: {
            label: "Complete Profile",
            onClick: () => router.push("/onboarding")
          }
        });
      } else if (errorMessage.includes("taking longer than expected")) {
        sonnerToast.error("Processing Timeout", {
          description: errorMessage,
          action: {
            label: "Try Again",
            onClick: () => handleAskAI(material)
          }
        });
      } else if (errorMessage.includes("Network connection")) {
        sonnerToast.error("Connection Issue", {
          description: errorMessage,
          action: {
            label: "Retry",
            onClick: () => handleAskAI(material)
          }
        });
      } else {
        sonnerToast.error("Failed to Create Personalized Content", {
          description: errorMessage,
          action: {
            label: "Contact Support",
            onClick: () => {
              window.open("mailto:support@link-x.ai?subject=Personalization Error&body=" + encodeURIComponent(`Error: ${errorMessage}\nMaterial: ${material.title}\nUser: ${currentUser?.email}`));
            }
          }
        });
      }
    }
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

  // Handle starting a new AI conversation
  const handleStartAIChat = () => {
    try {
      if (!currentUser) {
        sonnerToast.error("Please log in to use AI tutor");
        return;
      }
      
      setSelectedConversation(null);
      setAiChatOpen(true);
    } catch (error) {
      console.error("Error starting AI chat:", error);
      sonnerToast.error("Failed to start AI chat");
    }
  };

  // Handle opening an existing conversation
  const handleOpenConversation = (conversationId: string) => {
    try {
      if (!conversationId) {
        sonnerToast.error("Invalid conversation selected");
        return;
      }
      
      if (!currentUser) {
        sonnerToast.error("Please log in to view conversations");
        return;
      }
      
      setSelectedConversation(conversationId);
      setAiChatOpen(true);
    } catch (error) {
      console.error("Error opening conversation:", error);
      sonnerToast.error("Failed to open conversation");
    }
  };

  // Handle starting a quiz
  const handleStartQuiz = (quiz: Quiz) => {
    try {
      if (!quiz || !quiz.id) {
        sonnerToast.error("Invalid quiz selected");
        return;
      }
      
      if (!currentUser) {
        sonnerToast.error("Please log in to take quizzes");
        return;
      }
      
      setSelectedQuiz(quiz);
      setQuizDialogOpen(true);
    } catch (error) {
      console.error("Error starting quiz:", error);
      sonnerToast.error("Failed to start quiz");
    }
  };

  // Handle generating a new quiz
  const handleGenerateQuiz = async () => {
    try {
      // TODO: Replace with actual API call when quiz generation is implemented
      // const newQuiz = await studentAPI.generateCourseQuiz(courseId);
      
      sonnerToast.info("Quiz generation not yet implemented in the backend");
      // For now, show that the feature will be available soon
      return;
      
      // When implemented, this would look like:
      // setQuizzes(prev => [newQuiz, ...prev]);
      // setSelectedQuiz(newQuiz);
      // setQuizDialogOpen(true);
      // sonnerToast.success("New quiz generated!");
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      sonnerToast.error("Failed to generate quiz");
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
    <div className="min-h-screen bg-gray-50/30 flex">
      {!isFocusMode && (
        <ModernSidebar
          userRole="student"
          onCollapseChange={setIsCollapsed}
          courses={[course]}
          currentUser={currentUser}
          initialCollapsed={true}
        />
      )}
      
      <div className={cn("flex-1 transition-all duration-300 ease-out", 
        isFocusMode ? "ml-0" : (isCollapsed ? "ml-14" : "ml-64")
      )}>
        {/* Modern Course Header */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg px-3 py-2 transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-8 rounded-full bg-gradient-to-b", colors.gradient)} />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                      {course.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                      <span>{course.code} • {course.term}</span>
                      <span>•</span>
                      <span>{materials.length} material{materials.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{courseProgress.progressPercentage}% complete</span>
                      <span>•</span>
                      <span>{Math.round(courseProgress.todayTimeMinutes)}m today</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setIsFocusMode(!isFocusMode);
                    if (!isFocusMode) {
                      setIsCollapsed(true); // Force sidebar collapsed when entering focus mode
                    }
                  }}
                >
                  {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Navigation */}
        <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
          <div className="px-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="h-14 bg-transparent border-none p-0 w-full justify-start">
                <TabsTrigger 
                  value="home" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900 rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 font-medium"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Home
                </TabsTrigger>
                <TabsTrigger 
                  value="ai"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900 rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 font-medium"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI Tutor
                </TabsTrigger>
                <TabsTrigger 
                  value="quizzes"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900 rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 font-medium"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Quizzes
                </TabsTrigger>
                <TabsTrigger 
                  value="people"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:text-gray-900 rounded-lg px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white/80 transition-all duration-200 font-medium"
                >
                  <Users className="h-4 w-4 mr-2" />
                  People
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Subtle Progress Bar */}
            <div className="w-full bg-gray-200/50 h-0.5">
              <div 
                className="h-0.5 bg-[#7B61FF] transition-all duration-500 ease-out"
                style={{ width: `${courseProgress.progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <main className="bg-gray-50/30 relative">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Home Tab - Modern Design */}
            <TabsContent value="home" className="space-y-0">
              <div className="flex min-h-screen">
                {/* Main Content Area */}
                <div className={cn("flex-1 mx-auto px-6 py-8 transition-all duration-200", 
                  isFocusMode ? "max-w-none w-[90vw]" : "max-w-5xl"
                )}>
                  <div className="space-y-6">
                    {/* Materials Section */}
                    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className={cn("w-2 h-6 rounded-full bg-gradient-to-b", colors.gradient)} />
                          Materials
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <ModuleStream 
                          courseId={courseId}
                          materials={materials}
                          onUploadComplete={handleUploadComplete}
                          onViewMaterial={handleViewMaterial}
                          onAskAI={handleAskAI}
                          userRole={currentUser?.role || 'student'}
                        />
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Improved empty-state treatment - only show when materials count is reasonable */}
                  {materials.length > 0 && materials.length <= 4 && (
                    <div className="mt-16 py-20 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-blue-100 mb-6">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">All set—start learning!</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Your course materials are organized and ready. Click any file to begin learning with AI assistance.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modern Stats Sidebar */}
                {!isFocusMode && (
                  <div className="w-80 bg-white/60 backdrop-blur-sm border-l border-gray-200/50 p-6 overflow-y-auto stats-sidebar transition-all duration-200">
                    <StatsSidePanel 
                      course={course}
                      courseProgress={courseProgress}
                      onUpdateDescription={(newDescription) => {
                        setCourse(prev => prev ? { ...prev, description: newDescription } : null);
                      }}
                      userRole={currentUser?.role || 'student'}
                    />
                  </div>
                )}
              </div>
            </TabsContent>



            {/* AI Tutor Tab */}
            <TabsContent value="ai" className="p-6">
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-8 rounded-full bg-gradient-to-b", colors.gradient)} />
                    <h2 className="text-2xl font-semibold text-gray-900">AI Tutor</h2>
                  </div>
                  <Button 
                    onClick={handleStartAIChat}
                    className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Conversation
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {aiChatOpen ? (
                    <Card className="canvas-card h-[600px] flex flex-col">
                      <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-600" />
                            {selectedConversation ? 
                              conversations.find(c => c.id === selectedConversation)?.title || "AI Tutor Chat" :
                              "New AI Conversation"
                            }
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setAiChatOpen(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 p-0 flex flex-col">
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                          {/* Sample conversation messages */}
                          <div className="flex justify-start">
                            <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                              <p className="text-sm">Hello! I'm your AI tutor for {course?.title || 'this course'}. How can I help you today?</p>
                            </div>
                          </div>
                          
                          {selectedConversation && (
                            <div className="flex justify-end">
                              <div className="bg-blue-600 text-white rounded-lg p-3 max-w-[80%]">
                                <p className="text-sm">Can you explain the key concepts from today's reading?</p>
                              </div>
                            </div>
                          )}
                          
                          {selectedConversation && (
                            <div className="flex justify-start">
                              <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                                <p className="text-sm">Of course! The main concepts covered in today's reading include...</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Chat input */}
                        <div className="p-4 border-t bg-white">
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Ask me anything about the course materials..."
                              className="flex-1"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  sonnerToast.success('Message sent to AI tutor!');
                                }
                              }}
                            />
                            <Button>Send</Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            💡 Tip: Ask about specific materials, request explanations, or get practice problems
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="canvas-card h-96">
                      <CardContent className="p-6 h-full flex items-center justify-center">
                        <div className="text-center">
                          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="canvas-heading-3 mb-2">Start a conversation with your AI tutor</h3>
                          <p className="canvas-body text-gray-500 mb-4">Ask questions about course materials, get explanations, or request practice problems.</p>
                          <div className="space-y-2">
                            <Button onClick={handleStartAIChat}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Start Chatting
                            </Button>
                            <p className="text-xs text-gray-400">💡 Tip: Highlight any text on this page and ask AI about it!</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-6">
                  <Card className="canvas-card">
                    <CardHeader>
                      <CardTitle>Recent Conversations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {conversations.map((conversation) => (
                          <div 
                            key={conversation.id} 
                            className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border"
                            onClick={() => handleOpenConversation(conversation.id)}
                          >
                            <p className="text-sm font-medium sidebar-text line-clamp-1">{conversation.title}</p>
                            <p className="text-xs sidebar-text-muted mt-1 line-clamp-2">{conversation.lastMessage}</p>
                            <p className="text-xs text-gray-400 mt-2">{conversation.messageCount} messages • {conversation.timestamp}</p>
                          </div>
                        ))}
                        
                        {conversations.length === 0 && (
                          <div className="text-center py-8">
                            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-sm text-gray-500 mb-4">No conversations yet</p>
                            <Button size="sm" onClick={handleStartAIChat}>
                              Start Your First Chat
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Tips Card */}
                  <Card className="canvas-card bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Zap className="h-5 w-5" />
                        AI Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-purple-700">
                        <p>💡 Ask specific questions about course materials</p>
                        <p>📝 Request practice problems and explanations</p>
                        <p>🎯 Get personalized study recommendations</p>
                        <p>✨ Upload materials and chat about them instantly</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
                </div>
            </TabsContent>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes" className="p-6">
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-8 rounded-full bg-gradient-to-b", colors.gradient)} />
                    <h2 className="text-2xl font-semibold text-gray-900">Practice Quizzes</h2>
                  </div>
                  <Button 
                    onClick={handleGenerateQuiz}
                    className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
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
                          <Button size="sm" variant="outline" className="w-full" onClick={() => handleStartQuiz(quiz)}>
                            Review Results
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" className="w-full" onClick={() => handleStartQuiz(quiz)}>
                          Start Quiz
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {quizzes.length === 0 && (
                  <div className="col-span-full">
                    <Card className="canvas-card">
                      <CardContent className="p-12 text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="canvas-heading-3 mb-2">No quizzes available</h3>
                        <p className="canvas-body text-gray-500 mb-4">Generate your first quiz to test your knowledge!</p>
                        <Button onClick={handleGenerateQuiz}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Generate Your First Quiz
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
                </div>
            </TabsContent>

            {/* People Tab */}
            <TabsContent value="people" className="p-6">
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-8 rounded-full bg-gradient-to-b", colors.gradient)} />
                  <h2 className="text-2xl font-semibold text-gray-900">Course People</h2>
                </div>
              
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
                        <p className="font-medium sidebar-text">{course?.instructor || 'Instructor'}</p>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Upload Course Materials</DialogTitle>
              {currentUser?.role === 'student' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={useAdvancedUpload ? "outline" : "default"}
                    size="sm"
                    onClick={() => setUseAdvancedUpload(false)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Simple
                  </Button>
                  <Button
                    variant={useAdvancedUpload ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseAdvancedUpload(true)}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Advanced
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription>
              Upload PDF, audio, video, or presentation files to your course. Files will be automatically processed for AI interaction.
            </DialogDescription>
          </DialogHeader>
          
          {useAdvancedUpload && currentUser?.role === 'student' ? (
            <StudentCourseUpload 
              courseId={courseId}
              onUploadComplete={handleUploadComplete}
            />
          ) : (
            <EnhancedFileUpload 
              courseId={courseId}
              userRole={currentUser?.role || 'student'}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Material View Dialog */}
      <Dialog open={!!currentMaterial} onOpenChange={(open) => !open && setCurrentMaterial(undefined)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-xl">{currentMaterial?.title || 'Course Material'}</DialogTitle>
            <DialogDescription className="sr-only">
              View and interact with course material. You can download the file or ask AI questions about its content.
            </DialogDescription>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  if (!currentMaterial?.id) {
                    sonnerToast.error("No file selected for download");
                    return;
                  }
                  
                  if (!currentUser) {
                    sonnerToast.error("Please log in to download files");
                    return;
                  }
                  
                  // Download file using API
                  const userRole = currentUser.role || 'student';
                  const api = userRole === 'instructor' ? instructorAPI : studentAPI;
                  
                  sonnerToast.info("Starting download...");
                  
                  // Trigger download via API
                  await api.downloadFile(currentMaterial.id);
                  sonnerToast.success("Download started...");
                  
                } catch (error) {
                  console.error("Download failed:", error);
                  sonnerToast.error("Download failed. Please try again.");
                }
              }}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMaterial(undefined)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 mt-4 overflow-hidden">
            {currentMaterial && (
              <MaterialViewer
                materialId={currentMaterial.id}
                materialType={currentMaterial.type as 'pdf' | 'audio' | 'video' | 'document'}
                materialTitle={currentMaterial.title}
                userRole={currentUser?.role || 'student'}
                courseId={courseId}
                onClose={() => setCurrentMaterial(undefined)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              {selectedQuiz?.title || 'Practice Quiz'}
            </DialogTitle>
            <DialogDescription>
              {selectedQuiz?.completed 
                ? 'Review your quiz results and performance.'
                : 'Take a practice quiz to test your knowledge of the course material.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuiz && (
            <div className="space-y-6">
              {selectedQuiz.completed ? (
                // Quiz Results View
                <div className="space-y-4">
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-800 mb-2">Quiz Completed!</h3>
                    <p className="text-green-700">You scored {selectedQuiz.score}% on this quiz</p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Quiz Summary:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Questions: {selectedQuiz.questions}</div>
                      <div>Score: {selectedQuiz.score}%</div>
                      <div>Correct: {Math.round((selectedQuiz.score || 0) / 100 * selectedQuiz.questions)}</div>
                      <div>Incorrect: {selectedQuiz.questions - Math.round((selectedQuiz.score || 0) / 100 * selectedQuiz.questions)}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">View Detailed Results</Button>
                    <Button className="flex-1" onClick={() => {
                      setQuizDialogOpen(false);
                      handleGenerateQuiz();
                    }}>
                      Take Another Quiz
                    </Button>
                  </div>
                </div>
              ) : (
                // Quiz Taking View
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Ready to start?</h4>
                      <p className="text-sm text-gray-600">{selectedQuiz.questions} questions • Estimated time: {Math.ceil(selectedQuiz.questions * 1.5)} minutes</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{selectedQuiz.questions}</div>
                      <div className="text-xs text-gray-500">Questions</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Quiz Instructions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Read each question carefully</li>
                      <li>Select the best answer from the options provided</li>
                      <li>You can review and change your answers before submitting</li>
                      <li>Click &quot;Submit Quiz&quot; when you&apos;re ready to finish</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setQuizDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={() => {
                      // TODO: Implement real quiz taking functionality
                      sonnerToast.info("Quiz taking functionality not yet implemented");
                      
                      // When implemented, this would start a real quiz session:
                      // startQuizSession(selectedQuiz.id);
                    }}>
                      Start Quiz
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}