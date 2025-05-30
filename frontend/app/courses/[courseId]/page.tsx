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
import { StatsSidePanel } from "@/components/course/StatsSidePanel";
import { ModuleCard } from "@/components/course/ModuleCard";
import { EnterpriseModuleCard } from "@/components/course/EnterpriseModuleCard";
import { EnhancedSidebar } from "@/components/course/EnhancedSidebar";
import { SearchAndFilter } from "@/components/course/SearchAndFilter";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { designTokens } from "@/lib/design-system";
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
  Search,
  Package,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  Loader2
} from "lucide-react";
import { toast as sonnerToast } from 'sonner';

import { studentAPI, instructorAPI, userAPI, getAuthToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
  viewed?: boolean;   // Track if a file has been viewed
  moduleId?: string;
  moduleName?: string;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  materials: Material[];
  isExpanded: boolean;
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
  const selectedModuleId = searchParams?.get("moduleId") || undefined;

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<{ id: string; title: string; type: string } | undefined>();
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string; moduleId: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moduleDeleteDialogOpen, setModuleDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [useAdvancedUpload, setUseAdvancedUpload] = useState(false);
  const [createModuleDialogOpen, setCreateModuleDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  
  // Edit module state
  const [editModuleDialogOpen, setEditModuleDialogOpen] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<Module | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [editModuleDescription, setEditModuleDescription] = useState("");
  const [isUpdatingModule, setIsUpdatingModule] = useState(false);
  const [courseDeleteDialogOpen, setCourseDeleteDialogOpen] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [uploadModuleId, setUploadModuleId] = useState<string | undefined>(undefined);
  
  // P2: Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    fileTypes: [] as string[],
    aiProcessed: 'all' as 'all' | 'processed' | 'unprocessed',
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month',
  });
  
  // User stats for gamification
  const [userStats, setUserStats] = useState({
    filesUploaded: 0,
    weeksCompleted: 0,
    studyStreak: 0,
    aiQuestions: 0,
    totalStudyTime: 0,
    currentWeekProgress: 0
  });

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
    
    sonnerToast.dismiss();
    
    const loadCourseData = async () => {
      try {
        setLoading(true);
        
        let user;
        try {
          user = await userAPI.getMe();
          setCurrentUser(user);
        } catch (userError) {
          console.error('Failed to load user:', userError);
          sonnerToast.error('Authentication failed. Please log in again.');
          router.push('/login');
          return;
        }
        
        let courseData;
        let modulesData = [];
        let filesData: any[] = [];
        
        try {
          if (user.role === "student") {
            try {
              const enrolledCourses = await studentAPI.getCourses();
              courseData = enrolledCourses.find((c: any) => c.id === courseId);
              
              if (courseData) {
                try {
                  // Get auth token
                  const token = await getAuthToken();
                  const modulesWithFilesResponse = await fetch(
                    `${API_URL}/api/v2/courses/${courseId}/moduleswithfiles`,
                    {
                      method: 'GET',
                      credentials: 'include',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                    }
                  );
                  
                  
                  if (modulesWithFilesResponse.ok) {
                    const modulesWithFiles = await modulesWithFilesResponse.json();
                    modulesData = modulesWithFiles;
                    
                    filesData = modulesWithFiles.flatMap((module: any) => 
                      (module.files || []).map((file: any) => ({
                        ...file,
                        moduleId: module.id,
                        moduleName: module.title
                      }))
                    );
                  } else {
                    modulesData = await studentAPI.getCourseModules(courseId);
                    
                    // Ensure modulesData is an array
                    if (!Array.isArray(modulesData)) {
                      console.error('Invalid modules data received:', modulesData);
                      modulesData = [];
                    }
                    
                    const filePromises = modulesData.map((moduleItem: any) => 
                      studentAPI.getModuleFiles(moduleItem.id)
                        .then(files => files.map((file: any) => ({
                          ...file,
                          moduleId: moduleItem.id,
                          moduleName: moduleItem.title
                        })))
                        .catch(() => [])
                    );
                    
                    const filesArrays = await Promise.all(filePromises);
                    filesData = filesArrays.flat();
                  }
                } catch (moduleError) {
                  console.error('=== MODULE LOADING ERROR (STUDENT) ===');
                  console.error('Error details:', moduleError);
                }
              }
            } catch (courseError) {
              console.error('=== COURSE LOADING ERROR (STUDENT) ===');
              console.error('Error details:', courseError);
              sonnerToast.error('Failed to load your courses');
            }
          } else if (user.role === "instructor") {
            try {
              courseData = await instructorAPI.getCourse(courseId);
              
              if (courseData) {
                try {
                  const token = await getAuthToken();
                  const modulesWithFilesResponse = await fetch(
                    `${API_URL}/api/v2/courses/${courseId}/moduleswithfiles`,
                    {
                      method: 'GET',
                      credentials: 'include',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                    }
                  );
                  
                  if (modulesWithFilesResponse.ok) {
                    const modulesWithFiles = await modulesWithFilesResponse.json();
                    modulesData = modulesWithFiles;
                    
                    filesData = modulesWithFiles.flatMap((module: any) => 
                      (module.files || []).map((file: any) => ({
                        ...file,
                        moduleId: module.id,
                        moduleName: module.title
                      }))
                    );
                  } else {
                    modulesData = await instructorAPI.getCourseModules(courseId);
                    
                    // Ensure modulesData is an array
                    if (!Array.isArray(modulesData)) {
                      console.error('Invalid modules data received:', modulesData);
                      modulesData = [];
                    }
                    
                    const filePromises = modulesData.map((moduleItem: any) => 
                      instructorAPI.getModuleFiles(moduleItem.id)
                        .then(files => files.map((file: any) => ({
                          ...file,
                          moduleId: moduleItem.id,
                          moduleName: moduleItem.title
                        })))
                        .catch(() => [])
                    );
                    
                    const filesArrays = await Promise.all(filePromises);
                    filesData = filesArrays.flat();
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
          courseData = {
            id: courseId,
            title: "Sample Course",
            code: "TEST101",
            term: "Fall 2025",
            description: "Course description",
            instructor: "Test Instructor"
          };
        }
        
        // Transform course data
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
        
        // Transform materials data
        const transformedMaterials: Material[] = filesData
          .filter(file => file && file.id)
          .map((file: any) => ({
            id: file.id,
            title: file.title || file.name || "Unknown File",
            type: getFileType(file.file_type || file.type || ""),
            size: formatFileSize(file.file_size || file.size || 0),
            uploadedAt: formatRelativeTime(file.created_at || file.uploadedAt || new Date().toISOString()),
            processed: file.processed !== false,
            moduleId: file.moduleId,
            moduleName: file.moduleName,
          }));

        // ALWAYS create a structured module layout
        const organizedModules = createModuleStructure(modulesData, transformedMaterials);
        
        // Load conversations
        let conversations: AIConversation[] = [];
        try {
          if (user.role === "student") {
            const discussionsData = await studentAPI.getCourseDiscussions(courseId);
            if (discussionsData && Array.isArray(discussionsData)) {
              conversations = discussionsData
                .filter(discussion => discussion && discussion.id)
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
          if (error?.message?.includes('404') || error?.message?.includes('NOT FOUND')) {
            console.info("Discussions endpoint not available yet");
          } else {
            console.warn("Failed to load discussions:", error);
          }
        }
        
        // Load quizzes
        let quizzes: Quiz[] = [];
        

        setCourse(transformedCourse);
        setModules(organizedModules);
        setConversations(conversations);
        setQuizzes(quizzes);

        // Load course progress
        let realProgress = {
          completedMaterials: 0,
          totalMaterials: transformedMaterials.length,
          weeklyTimeMinutes: 0,
          todayTimeMinutes: 0,
          progressPercentage: 0
        };
        
        try {
          if (user.role === "student") {
            try {
              const progressData = await studentAPI.getCourseProgress(courseId);
              realProgress = {
                completedMaterials: progressData.viewedMaterials || 0,
                totalMaterials: progressData.totalMaterials || transformedMaterials.length,
                weeklyTimeMinutes: progressData.weeklyTimeMinutes || 0,
                todayTimeMinutes: progressData.todayTimeMinutes || 0,
                progressPercentage: progressData.progressPercentage || 0
              };
            } catch (progressError) {
              console.error("Failed to load course progress, using default values:", progressError);
              // Calculate a fallback progress based on local data
              const processedMaterials = transformedMaterials.filter(m => m.viewed).length;
              realProgress = {
                completedMaterials: processedMaterials,
                totalMaterials: transformedMaterials.length,
                weeklyTimeMinutes: 0,
                todayTimeMinutes: 0,
                progressPercentage: transformedMaterials.length > 0 ? 
                  Math.round((processedMaterials / transformedMaterials.length) * 100) : 0
              };
            }
          } else {
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
        } catch (progressError) {
          console.warn("Failed to load real progress data:", progressError);
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
        setModules([]);
        setConversations([]);
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, router]);

  // Create structured module layout - ALWAYS show modules
  const createModuleStructure = (modulesData: any[], materials: Material[]): Module[] => {
    const moduleMap = new Map<string, Module>();
    
    // Ensure modulesData is an array
    if (!Array.isArray(modulesData)) {
      console.warn('modulesData is not an array:', modulesData);
      modulesData = [];
    }
    
    // First, create modules from API data
    modulesData.forEach(moduleData => {
      moduleMap.set(moduleData.id, {
        id: moduleData.id,
        title: moduleData.title || moduleData.name || "Untitled Module",
        description: moduleData.description,
        materials: [],
        isExpanded: true // Default to expanded, will be overridden by localStorage
      });
    });
    
    // If no modules exist, create default structure
    if (moduleMap.size === 0) {
      // Create default modules based on common course structure
      const defaultModules = [
        { id: 'student-uploads', title: 'Student Uploads', description: 'Materials uploaded by students' },
        { id: 'week-1', title: 'Week 1', description: 'Introduction and fundamentals' },
        { id: 'week-2', title: 'Week 2', description: 'Core concepts' },
        { id: 'week-3', title: 'Week 3 - Advanced Topics', description: 'Advanced concepts and applications' },
        { id: 'resources', title: 'Course Resources', description: 'Additional materials and references' }
      ];
      
      defaultModules.forEach(module => {
        moduleMap.set(module.id, {
          ...module,
          materials: [],
          isExpanded: true // Default to expanded
        });
      });
    }
    
    // Distribute materials into modules
    materials.forEach(material => {
      
      if (material.moduleId && moduleMap.has(material.moduleId)) {
        // Material has a valid moduleId and the module exists - use it
        moduleMap.get(material.moduleId)!.materials.push(material);
      } else if (material.moduleId) {
        // Material has moduleId but module doesn&apos;t exist in moduleMap
        // This shouldn&apos;t happen if backend is working correctly, but let&apos;s handle it
        console.warn(`Material ${material.title} has moduleId ${material.moduleId} but module not found in moduleMap`);
        
        // Create the missing module
        moduleMap.set(material.moduleId, {
          id: material.moduleId,
          title: material.moduleName || `Module ${material.moduleId}`,
          description: '',
          materials: [material],
          isExpanded: true
        });
      } else {
        // Material has no moduleId - only then do smart assignment
        let targetModuleId = 'resources'; // default fallback
        
        // Smart assignment based on file name or type
        const title = material.title.toLowerCase();
        if (title.includes('week 1') || title.includes('intro') || title.includes('introduction')) {
          targetModuleId = 'week-1';
        } else if (title.includes('week 2')) {
          targetModuleId = 'week-2';
        } else if (title.includes('week 3') || title.includes('advanced')) {
          targetModuleId = 'week-3';
        } else if (title.includes('student') || title.includes('upload')) {
          targetModuleId = 'student-uploads';
        }
        
        // Ensure the target module exists
        if (!moduleMap.has(targetModuleId)) {
          moduleMap.set(targetModuleId, {
            id: targetModuleId,
            title: targetModuleId.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            materials: [],
            isExpanded: true
          });
        }
        
        moduleMap.get(targetModuleId)!.materials.push(material);
      }
    });
    
    // Convert to array and sort
    const moduleArray = Array.from(moduleMap.values());
    
    // Sort modules by priority (student uploads first, then weeks, then resources)
    moduleArray.sort((a, b) => {
      const getPriority = (id: string) => {
        if (id === 'student-uploads') return 0;
        if (id.startsWith('week-')) return parseInt(id.split('-')[1]) || 999;
        if (id === 'resources') return 1000;
        return 500;
      };
      
      return getPriority(a.id) - getPriority(b.id);
    });
    
    // Restore accordion state from localStorage
    try {
      const savedState = localStorage.getItem(`course-${courseId}-accordion`);
      if (savedState) {
        const accordionState = JSON.parse(savedState) as Record<string, boolean>;
        moduleArray.forEach(module => {
          if (accordionState.hasOwnProperty(module.id)) {
            module.isExpanded = accordionState[module.id];
          }
        });
      }
    } catch (error) {
      console.warn('Failed to restore accordion state:', error);
    }
    
    return moduleArray;
  };

  // Toggle module expansion with state persistence
  const toggleModule = (moduleId: string) => {
    setModules(prev => {
      const updated = prev.map(module => 
        module.id === moduleId 
          ? { ...module, isExpanded: !module.isExpanded }
          : module
      );
      
      // Persist accordion state in localStorage
      try {
        const accordionState = updated.reduce((acc, module) => {
          acc[module.id] = module.isExpanded;
          return acc;
        }, {} as Record<string, boolean>);
        
        localStorage.setItem(`course-${courseId}-accordion`, JSON.stringify(accordionState));
      } catch (error) {
        console.warn('Failed to persist accordion state:', error);
      }
      
      return updated;
    });
  };

  // P2: Filter modules and materials based on search and filters
  const filterMaterials = (materials: Material[]) => {
    return materials.filter(material => {
      // Search query filter
      if (searchQuery && !material.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // File type filter
      if (filters.fileTypes.length > 0 && !filters.fileTypes.includes(material.type)) {
        return false;
      }
      
      // AI processed filter
      if (filters.aiProcessed === 'processed' && !material.processed) {
        return false;
      }
      if (filters.aiProcessed === 'unprocessed' && material.processed) {
        return false;
      }
      
      // Date range filter
      if (filters.dateRange !== 'all') {
        const uploadDate = new Date(material.uploadedAt);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filters.dateRange) {
          case 'today':
            if (diffDays > 0) return false;
            break;
          case 'week':
            if (diffDays > 7) return false;
            break;
          case 'month':
            if (diffDays > 30) return false;
            break;
        }
      }
      
      return true;
    });
  };

  const filteredModules = modules.map(module => ({
    ...module,
    materials: filterMaterials(module.materials || [])
  })).filter(module => 
    // Only show modules that have materials after filtering, or if no search/filters are active
    module.materials.length > 0 || (!searchQuery && filters.fileTypes.length === 0 && filters.aiProcessed === 'all' && filters.dateRange === 'all')
  );

  const totalFiles = modules.reduce((total, module) => total + module.materials.length, 0);
  const filteredFiles = filteredModules.reduce((total, module) => total + module.materials.length, 0);

  // Helper functions
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "—";
    
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return "—";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes: number | string) => {
    if (!bytes || bytes === 0) return "—";
    
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    if (isNaN(numBytes) || numBytes === 0) return "—";
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    const size = parseFloat((numBytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
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

  const handleSelectFile = (fileId: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleBulkAction = async (action: string, fileIds: string[]) => {
    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${fileIds.length} files? This action cannot be undone.`)) {
        return;
      }

      try {
        // Delete files one by one (could be optimized with batch API)
        for (const fileId of fileIds) {
          if (currentUser?.role === "student") {
            await studentAPI.deleteFile(fileId);
          } else {
            await instructorAPI.deleteFile(fileId);
          }
        }

        // Remove files from local state
        setModules(prev => 
          prev.map(module => ({
            ...module,
            materials: module.materials.filter(material => !fileIds.includes(material.id))
          }))
        );

        // Clear selection
        setSelectedFiles(new Set());

        sonnerToast.success(`${fileIds.length} files deleted successfully`);
      } catch (error) {
        console.error("Error deleting files:", error);
        sonnerToast.error("Failed to delete some files. Please try again.");
      }
    }
  };

  const handleDeleteFile = async (fileId: string, moduleId: string) => {
    // Find the file to get its name for the confirmation dialog
    const file = modules
      .find(module => module.id === moduleId)
      ?.materials.find(material => material.id === fileId);
    
    if (!file) {
      sonnerToast.error("File not found");
      return;
    }

    // Set up the delete dialog
    setFileToDelete({ id: fileId, name: file.title, moduleId });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    
    try {
      // Call the appropriate API based on user role
      if (currentUser?.role === "student") {
        await studentAPI.deleteFile(fileToDelete.id);
      } else {
        await instructorAPI.deleteFile(fileToDelete.id);
      }

      // Remove the file from the local state
      setModules(prev => 
        prev.map(module => 
          module.id === fileToDelete.moduleId 
            ? {
                ...module,
                materials: module.materials.filter(material => material.id !== fileToDelete.id)
              }
            : module
        )
      );

      // Show success message
      sonnerToast.success("File deleted successfully");
      
      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      sonnerToast.error("Failed to delete file. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to handle module editing
  const handleEditModule = (module: Module) => {
    setModuleToEdit(module);
    setEditModuleTitle(module.title);
    setEditModuleDescription(module.description || "");
    setEditModuleDialogOpen(true);
  };

  // Function to confirm module update
  const confirmUpdateModule = async () => {
    if (!moduleToEdit || !editModuleTitle.trim()) return;
    
    setIsUpdatingModule(true);
    
    try {
      const moduleId = moduleToEdit.id;
      const updateData = {
        title: editModuleTitle.trim(),
        description: editModuleDescription.trim() || undefined
      };
      
      // Determine which API to use based on user role
      const api = currentUser?.role === 'instructor' ? instructorAPI : studentAPI;
      
      const response = await api.updateModule(courseId as string, moduleId, updateData);
      
      if (response.ok) {
        // Update the module in the local state
        setModules(prevModules => 
          prevModules.map(m => 
            m.id === moduleId ? {
              ...m,
              title: editModuleTitle.trim(),
              description: editModuleDescription.trim() || undefined
            } : m
          )
        );
        
        // Close the dialog and reset state
        setEditModuleDialogOpen(false);
        setModuleToEdit(null);
        setEditModuleTitle("");
        setEditModuleDescription("");
        
        sonnerToast.success("Module updated successfully");
      } else {
        const errorData = await response.json();
        sonnerToast.error(errorData.error || "Failed to update module. Please try again.");
      }
    } catch (error) {
      console.error("Error updating module:", error);
      sonnerToast.error("Failed to update module. Please try again.");
    } finally {
      setIsUpdatingModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    // Find the module to get its name and check if it has files
    const module = modules.find(m => m.id === moduleId);
    
    if (!module) {
      sonnerToast.error("Module not found");
      return;
    }

    // Check if module has files
    if (module.materials.length > 0) {
      sonnerToast.error("Cannot delete module with files", {
        description: "Please delete all files in the module first, then try again."
      });
      return;
    }

    // Set up the delete dialog
    setModuleToDelete({ id: moduleId, name: module.title });
    setModuleDeleteDialogOpen(true);
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;

    setIsDeletingModule(true);
    
    try {
      // Call the appropriate API based on user role
      const endpoint = currentUser?.role === "student" 
        ? `/student/modules/${moduleToDelete.id}`
        : `/instructor/modules/${moduleToDelete.id}`;
        
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete module: ${response.statusText}`);
      }

      // Remove the module from the local state
      setModules(prev => prev.filter(module => module.id !== moduleToDelete.id));

      // Show success message
      sonnerToast.success("Module deleted successfully");
      
      // Close dialog and reset state
      setModuleDeleteDialogOpen(false);
      setModuleToDelete(null);
    } catch (error) {
      console.error("Error deleting module:", error);
      sonnerToast.error("Failed to delete module. Please try again.");
    } finally {
      setIsDeletingModule(false);
    }
  };

  const handleCreateModule = () => {
    setCreateModuleDialogOpen(true);
    setNewModuleTitle("");
    setNewModuleDescription("");
  };

  const confirmCreateModule = async () => {
    if (!newModuleTitle.trim()) {
      sonnerToast.error("Module title is required");
      return;
    }

    setIsCreatingModule(true);
    
    try {
      // Use unified API endpoint
      const endpoint = `/api/v2/courses/${courseId}/modules`;
        
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newModuleTitle.trim(),
          description: newModuleDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let errorMsg = `Failed to create module: ${response.statusText}`;
        try {
          const errJson = await response.json();
          errorMsg = errJson.error || errorMsg;
        } catch {}
        sonnerToast.error(errorMsg);
        setIsCreatingModule(false);
        return;
      }

      const responseData = await response.json();
      const newModule = responseData.module;

      // Add the new module to the local state with proper structure
      const moduleToAdd: Module = {
        id: newModule.id || `temp-${Date.now()}`,
        title: newModule.title || 'New Module',
        description: newModule.description || '',
        materials: [],
        isExpanded: true,
      };
      

      setModules(prev => {
        // Ensure we don&apos;t have duplicate IDs
        const filtered = prev.filter(m => m.id !== moduleToAdd.id);
        const updated = [...filtered, moduleToAdd];
        return updated;
      });

      // Show success message
      sonnerToast.success("Module created successfully");
      
      // Close dialog and reset state
      setCreateModuleDialogOpen(false);
      setNewModuleTitle("");
      setNewModuleDescription("");
    } catch (error) {
      console.error("Error creating module:", error);
      sonnerToast.error("Failed to create module. Please try again.");
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleDeleteCourse = () => {
    setCourseDeleteDialogOpen(true);
  };

  const confirmDeleteCourse = async () => {
    if (!course) return;

    setIsDeletingCourse(true);
    
    try {
      // Call the appropriate API based on user role
      const endpoint = currentUser?.role === "student" 
        ? `/student/courses/${courseId}`
        : `/instructor/courses/${courseId}`;
        
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete course: ${response.statusText}`);
      }

      // Show success message
      sonnerToast.success("Course deleted successfully");
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting course:", error);
      sonnerToast.error("Failed to delete course. Please try again.");
    } finally {
      setIsDeletingCourse(false);
      setCourseDeleteDialogOpen(false);
    }
  };

  const handleUploadComplete = async (newFile: any) => {
    try {
      if (!newFile) {
        console.warn("Upload completed but no file data received");
        return;
      }
      
      
      // Normalize the file data - handle both module_id and moduleId
      const moduleId = newFile.moduleId || newFile.module_id;
      
      // Add to appropriate module and refresh structure
      const newMaterial: Material = {
        id: newFile.id,
        title: newFile.title || newFile.name || newFile.filename,
        type: getFileType(newFile.file_type || newFile.type || ""),
        size: newFile.size || formatFileSize(newFile.file_size || 0),
        uploadedAt: formatRelativeTime(newFile.created_at || newFile.uploadedAt || new Date().toISOString()),
        processed: newFile.processed !== false,
        moduleId: moduleId,
        moduleName: newFile.moduleName,
      };
      
      
      // Instead of just adding to existing materials, reload the modules from the server
      // This ensures we get the latest data including the newly uploaded file
      try {
        if (currentUser?.role === "student") {
          // Try the optimized endpoint first
          const modulesWithFilesResponse = await fetch(
            `${API_URL}/courses/${courseId}/moduleswithfiles`,
            {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (modulesWithFilesResponse.ok) {
            const modulesWithFiles = await modulesWithFilesResponse.json();
            
            const filesData = modulesWithFiles.flatMap((module: any) => 
              (module.files || []).map((file: any) => ({
                ...file,
                moduleId: module.id,
                moduleName: module.title
              }))
            );
            
            const transformedMaterials: Material[] = filesData
              .filter((file: any) => file && file.id)
              .map((file: any) => ({
                id: file.id,
                title: file.title || file.name || "Unknown File",
                type: getFileType(file.file_type || file.type || ""),
                size: file.size || formatFileSize(file.file_size || 0),
                uploadedAt: formatRelativeTime(file.uploadedAt || file.created_at || new Date().toISOString()),
                processed: file.processed !== false,
                moduleId: file.moduleId,
                moduleName: file.moduleName,
              }));
            
            const organizedModules = createModuleStructure(modulesWithFiles, transformedMaterials);
            setModules(organizedModules);
            
            sonnerToast.success(`${newMaterial.title} uploaded successfully!`);
          } else {
            // Fallback: just add the new material to existing modules
            setModules(prev => {
              const allMaterials = prev.flatMap(m => m.materials).concat(newMaterial);
              return createModuleStructure(prev, allMaterials);
            });
          }
        } else {
          // For instructors, use a similar approach
          const modulesData = await instructorAPI.getCourseModules(courseId);
          const filePromises = modulesData.map((moduleItem: any) => 
            instructorAPI.getModuleFiles(moduleItem.id)
              .then(files => files.map((file: any) => ({
                ...file,
                moduleId: moduleItem.id,
                moduleName: moduleItem.title
              })))
              .catch(() => [])
          );
          
          const filesArrays = await Promise.all(filePromises);
          const filesData = filesArrays.flat();
          
          const transformedMaterials: Material[] = filesData
            .filter((file: any) => file && file.id)
            .map((file: any) => ({
              id: file.id,
              title: file.title || file.name || "Unknown File",
              type: getFileType(file.file_type || file.type || ""),
              size: formatFileSize(file.file_size || file.size || 0),
              uploadedAt: formatRelativeTime(file.created_at || new Date().toISOString()),
              processed: file.processed !== false,
              moduleId: file.moduleId,
              moduleName: file.moduleName,
            }));
          
          const organizedModules = createModuleStructure(modulesData, transformedMaterials);
          setModules(organizedModules);
        }
      } catch (refreshError) {
        console.error("Failed to refresh modules, using local update:", refreshError);
        // Fallback: just add the new material to existing modules
        setModules(prev => {
          const allMaterials = prev.flatMap(m => m.materials).concat(newMaterial);
          return createModuleStructure(prev, allMaterials);
        });
      }
      
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

      // New streaming approach - go directly to streaming page
      // The streaming page will handle fetching user profile and generating content in real-time
      const loadingToast = sonnerToast.loading("Opening personalized learning experience...", {
        description: "Redirecting to your personalized content"
      });

      studentAPI.logActivity({
        type: 'personalized_view',
        fileId: material.id,
        courseId: courseId
      }).catch(error => {
        console.warn("Failed to log AI activity:", error);
      });

      // Small delay for better UX
      setTimeout(() => {
        sonnerToast.dismiss(loadingToast);
        router.push(`/learn/streaming/${material.id}?courseId=${courseId}`);
      }, 500);

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
              window.open("mailto:support@learn-x.ai?subject=Personalization Error&body=" + encodeURIComponent(`Error: ${errorMessage}\nMaterial: ${material.title}\nUser: ${currentUser?.email}`));
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
      sonnerToast.info("Quiz generation not yet implemented in the backend");
      return;
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

  const colorIndex = courseId ? 
    (Array.from(courseId.toString()).reduce((sum, char) => sum + char.charCodeAt(0), 0) % courseColors.length) : 
    0;
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
                      <span>{modules.reduce((total, module) => total + module.materials.length, 0)} material{modules.reduce((total, module) => total + module.materials.length, 0) !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <span>{courseProgress.progressPercentage}% complete</span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${courseProgress.progressPercentage}%` }}
                          />
                        </div>
                      </div>
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
                      setIsCollapsed(true);
                    }
                  }}
                >
                  {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
                </Button>
                {currentUser?.role === 'instructor' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={handleDeleteCourse}
                  >
                    Delete Course
                  </Button>
                )}
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
            {/* Home Tab - Structured Module Layout */}
            <TabsContent value="home" className="space-y-0">
              <div className="min-h-screen">
                {/* P0: Full-width content area - sidebar removed */}
                <div className={cn("mx-auto px-6 py-8 transition-all duration-200", 
                  isFocusMode ? "max-w-4xl" : "max-w-6xl"
                )}>
                  <div className="space-y-6">
                    {/* Materials Section - Always Structured */}
                    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                          <div className={cn("w-2 h-6 rounded-full bg-gradient-to-b", colors.gradient)} />
                          Course Materials
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleCreateModule}
                            size="sm"
                            className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Module
                          </Button>
                          <Button
                            onClick={() => setIsUploadDialogOpen(true)}
                            size="sm"
                            variant="outline"
                            className="border-[#7B61FF] text-[#7B61FF] hover:bg-[#7B61FF] hover:text-white"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Files
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        {/* P2: Search and filter for large file collections */}
                        {totalFiles > 0 && (
                          <div className="mb-6">
                            <SearchAndFilter
                              onSearch={setSearchQuery}
                              onFilterChange={setFilters}
                              totalFiles={totalFiles}
                              filteredFiles={filteredFiles}
                            />
                          </div>
                        )}
                        
                        <div className="space-y-6">
                          {filteredModules.map((module, index) => (
                            <EnterpriseModuleCard
                              key={module.id}
                              module={{
                                ...module
                              }}
                              onToggle={toggleModule}
                              onViewMaterial={handleViewMaterial}
                              onUploadFile={() => setIsUploadDialogOpen(true)}
                              onAskAI={handleAskAI}
                              onDeleteFile={handleDeleteFile}
                              onDeleteModule={handleDeleteModule}
                              onEditModule={handleEditModule}
                              selectedFiles={selectedFiles}
                              onSelectFile={handleSelectFile}
                              onBulkAction={handleBulkAction}
                            />
                          ))}
                          
                          {filteredModules.length === 0 && modules.length === 0 && (
                            <div className="text-center py-12">
                              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No modules yet
                              </h3>
                              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                                Create your first module to start organizing course materials and unlock AI-powered learning features.
                              </p>
                              <Button
                                onClick={() => setIsUploadDialogOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create First Module
                              </Button>
                            </div>
                          )}
                          
                          {filteredModules.length === 0 && modules.length > 0 && (
                            <div className="text-center py-12">
                              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No files match your search
                              </h3>
                              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                                Try adjusting your search terms or filters to find what you&apos;re looking for.
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSearchQuery("");
                                  setFilters({
                                    fileTypes: [],
                                    aiProcessed: 'all',
                                    dateRange: 'all',
                                  });
                                }}
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                Clear all filters
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* P0: Right sidebar removed - progress moved to header breadcrumb */}
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
                            <div className="flex justify-start">
                              <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                                <p className="text-sm">Hello! I&apos;m your AI tutor for {course?.title || 'this course'}. How can I help you today?</p>
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
          
          <div className="mb-4">
            <label htmlFor="module-select" className="text-sm font-medium text-gray-700 block mb-2">
              Select Module *
            </label>
            <select
              id="module-select"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7B61FF]"
              value={uploadModuleId || ""}
              onChange={(e) => setUploadModuleId(e.target.value || undefined)}
            >
              <option value="">Select a module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>
          
          {useAdvancedUpload && currentUser?.role === 'student' ? (
            <StudentCourseUpload
              courseId={courseId}
              moduleId={uploadModuleId}
              onUploadComplete={handleUploadComplete}
            />
          ) : (
            <EnhancedFileUpload 
              courseId={courseId}
              moduleId={uploadModuleId}
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
                  
                  const userRole = currentUser.role || 'student';
                  const api = userRole === 'instructor' ? instructorAPI : studentAPI;
                  
                  sonnerToast.info("Starting download...");
                  
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
                      sonnerToast.info("Quiz taking functionality not yet implemented");
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteFile}
        itemName={fileToDelete?.name}
        isLoading={isDeleting}
      />

      {/* Module Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={moduleDeleteDialogOpen}
        onOpenChange={setModuleDeleteDialogOpen}
        onConfirm={confirmDeleteModule}
        title="Delete Module"
        itemName={moduleToDelete?.name}
        description={moduleToDelete?.name ? `Are you sure you want to delete the module "${moduleToDelete.name}"? This action cannot be undone.` : undefined}
        isLoading={isDeletingModule}
      />

      {/* Edit Module Dialog */}
      <Dialog open={editModuleDialogOpen} onOpenChange={setEditModuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update the module title and description.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-module-title" className="text-sm font-medium text-gray-700 block mb-2">
                Module Title *
              </label>
              <Input
                id="edit-module-title"
                value={editModuleTitle}
                onChange={(e) => setEditModuleTitle(e.target.value)}
                placeholder="e.g., Week 1: Introduction"
                className="w-full"
              />
            </div>
            
            <div>
              <label htmlFor="edit-module-description" className="text-sm font-medium text-gray-700 block mb-2">
                Description (optional)
              </label>
              <Input
                id="edit-module-description"
                value={editModuleDescription}
                onChange={(e) => setEditModuleDescription(e.target.value)}
                placeholder="Brief description of the module content"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditModuleDialogOpen(false)}
              disabled={isUpdatingModule}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUpdateModule}
              disabled={isUpdatingModule || !editModuleTitle.trim()}
              className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white"
            >
              {isUpdatingModule ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Create Module Dialog */}
      <Dialog open={createModuleDialogOpen} onOpenChange={setCreateModuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Module</DialogTitle>
            <DialogDescription>
              Add a new module to organize your course materials.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="module-title" className="text-sm font-medium text-gray-700 block mb-2">
                Module Title *
              </label>
              <Input
                id="module-title"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="e.g., Week 1: Introduction"
                className="w-full"
              />
            </div>
            
            <div>
              <label htmlFor="module-description" className="text-sm font-medium text-gray-700 block mb-2">
                Description (optional)
              </label>
              <Input
                id="module-description"
                value={newModuleDescription}
                onChange={(e) => setNewModuleDescription(e.target.value)}
                placeholder="Brief description of the module content"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setCreateModuleDialogOpen(false)}
              disabled={isCreatingModule}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCreateModule}
              disabled={isCreatingModule || !newModuleTitle.trim()}
              className="bg-[#7B61FF] hover:bg-[#6B51E5] text-white"
            >
              {isCreatingModule ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Module
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={courseDeleteDialogOpen}
        onOpenChange={setCourseDeleteDialogOpen}
        onConfirm={confirmDeleteCourse}
        title="Delete Course"
        itemName={course?.title}
        description={course?.title ? `Are you sure you want to delete the course "${course.title}"? This will permanently delete all modules, files, and course data. This action cannot be undone.` : undefined}
        isLoading={isDeletingCourse}
      />
    </div>
  );
}