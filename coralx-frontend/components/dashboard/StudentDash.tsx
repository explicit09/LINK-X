"use client";

import { useState, useEffect, useRef, useMemo, useCallback, ChangeEvent } from "react";
import { LayoutDashboard, Upload, Plus, Trash2, Loader2 } from "lucide-react";

import Sidebar from "@/components/dashboard/DashSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AudioUpload from "@/components/dashboard/AudioUpload";
import { Button } from "@/components/ui/button";
import Footer from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { toast as sonnerToast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CourseCard } from "@/components/dashboard/StudentCourseCard";
import { CourseForm } from "@/components/dashboard/CourseForm";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StudentDashboard() {
  interface Student {
    id: string;
    name: string;
    email: string;
    enrolledAt: string;
    enrollmentId: string;
  }

  type FileSummary = {
    id: string;
    title: string;
    filename: string;
  };

  interface OnboardingData {
    name: string;
    job: string;
    traits: string;
    learningStyle: string;
    depth: string;
    topics: string;
    interests: string;
    schedule: string;
    quizzes: boolean;
  }

  type Course = {
    id: string;
    title: string;
    code: string;
    term?: string;
    description?: string;
    published?: boolean;
  };

  // UI State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"home" | "modules" | "people" | "settings">("home");
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [uploadingModuleId, setUploadingModuleId] = useState<string | null>(null);
  const [uploadingAudioModuleId, setUploadingAudioModuleId] = useState<string | null>(null);
  const [editedCourse, setEditedCourse] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  
  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data State
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [moduleFiles, setModuleFiles] = useState<Record<string, FileSummary[]>>({});
  const [previewingFile, setPreviewingFile] = useState<FileSummary | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const isMedia = previewingFile?.title
    ? ['.mp3', '.mp4', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.aiff']
        .some(ext => previewingFile.title.toLowerCase().endsWith(ext))
    : false;

  const fetchEnrollments = useCallback(async () => {
    try {
      // Fetch enrolled and created courses in parallel
      const [enrolledRes, createdRes] = await Promise.all([
        fetch("http://localhost:8080/student/enrollments", {
          credentials: "include",
        }),
        fetch("http://localhost:8080/student/courses", {
          credentials: "include",
        })
      ]);

      if (!enrolledRes.ok) throw new Error("Failed to fetch enrolled courses");
      if (!createdRes.ok) throw new Error("Failed to fetch created courses");

      const enrolledData = await enrolledRes.json();
      const createdData = await createdRes.json();

      setEnrolledCourses(Array.isArray(enrolledData) ? enrolledData : []);
      setCreatedCourses(Array.isArray(createdData) ? createdData : []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      sonnerToast.error("Failed to load courses");
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Fetch files for a specific module
  const fetchModuleFiles = useCallback(async (moduleId: string) => {
    try {
      const res = await fetch(
        `http://localhost:8080/student/modules/${moduleId}/files`,
        {
          credentials: "include",
        }
      );
      
      if (!res.ok) {
        throw new Error(`Failed to fetch module files: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Update module files state
      setModuleFiles(prev => ({
        ...prev,
        [moduleId]: data
      }));
    } catch (err) {
      console.error(`Error fetching files for module ${moduleId}:`, err);
    }
  }, []);

  // Fetch modules for the selected course
  const fetchModules = useCallback(async () => {
    if (!selectedCourse) return;
    
    try {
      const res = await fetch(
        `http://localhost:8080/student/courses/${selectedCourse.id}/modules`,
        {
          credentials: "include",
        }
      );
      
      if (!res.ok) {
        throw new Error(`Failed to fetch modules: ${res.statusText}`);
      }
      
      const data = await res.json();
      setModules(data);
      
      // Fetch files for each module
      data.forEach((module: any) => {
        fetchModuleFiles(module.id);
      });
    } catch (err) {
      console.error("Error fetching modules:", err);
      sonnerToast.error("Failed to load modules");
    }
  }, [selectedCourse, fetchModuleFiles]);

  useEffect(() => {
    fetchModules();
  }, [selectedCourse, fetchModuleFiles]);

  useEffect(() => {
    const fetchClassmates = async () => {
      if (activeTab !== "people" || !selectedCourse?.id) return;
      setLoadingPeople(true);
      try {
        const res = await fetch(
          `http://localhost:8080/student/courses/${selectedCourse.id}/classmates`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch classmates");
        const classmates = await res.json();
        const formatted = classmates.map((s: any, index: number) => ({
          id: index.toString(),
          name: s.name,
        }));
        setEnrolledStudents(formatted);
      } catch (err) {
        console.error("Error fetching classmates:", err);
        setEnrolledStudents([]);
      } finally {
        setLoadingPeople(false);
      }
    };

    fetchClassmates();
  }, [activeTab, selectedCourse]);

  useEffect(() => {
    fetch("http://localhost:8080/student/profile", {
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch onboarding");
        const data = await res.json();

        setOnboardingData({
          name: data.name,
          job: data.onboard_answers?.job || "",
          traits: data.onboard_answers?.traits || "",
          learningStyle: data.onboard_answers?.learningStyle || "",
          depth: data.onboard_answers?.depth || "",
          topics: data.onboard_answers?.topics || "",
          interests: data.onboard_answers?.interests || "",
          schedule: data.onboard_answers?.schedule || "",
          quizzes: data.want_quizzes || false,
        });
      })
      .catch((err) => {
        console.error("❌ Error loading onboarding:", err);
      });
  }, []);

  const filteredEnrolledCourses = useMemo(() => 
    enrolledCourses.filter(course => 
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.term?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  [enrolledCourses, searchQuery]);

  const filteredCreatedCourses = useMemo(() => 
    createdCourses.filter(course => 
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.term?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  [createdCourses, searchQuery]);

  const handleCourseClick = (course: any) => {
    setSelectedCourse(course);
  };

  const handleBackToDashboard = () => {
    setSelectedCourse(null);
  };

  const handleCreateCourse = useCallback(async (courseData: any) => {
    if (!courseData.title.trim()) {
      sonnerToast.error('Please enter a course title');
      return;
    }

    try {
      setIsCreatingCourse(true);
      const response = await fetch('http://localhost:8080/student/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: courseData.title,
          description: courseData.description,
          code: courseData.code,
          term: courseData.term
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const newCourse = await response.json();
      setCreatedCourses(prev => [...prev, newCourse]);
      setIsCreateDialogOpen(false);
      setIsCreatingCourse(false);
      sonnerToast.success('Course created successfully!');
      
      // Navigate to the course view
      setSelectedCourse(newCourse);
      setActiveTab("home");
    } catch (err) {
      console.error('Create course error:', err);
      sonnerToast.error(err instanceof Error ? err.message : 'Failed to create course');
      setIsCreatingCourse(false);
    }
  }, []);

  const handlePersonalize = useCallback(async () => {
    if (!previewingFile || !onboardingData) return;

    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // First check if we already have a personalized version of this file
      const checkRes = await fetch(
        `http://localhost:8080/student/personalized-files`,
        {
          credentials: "include",
          signal: controller.signal,
        }
      );

      if (!checkRes.ok) {
        throw new Error("Failed to check personalized files");
      }

      const existingFiles = await checkRes.json();
      const match = existingFiles.find(
        (f: any) => f.originalFileId === previewingFile.id
      );

      if (match) {
        setIsGenerating(false);
        abortControllerRef.current = null;
        router.push(`/learn/${match.id}`);
        return;
      }

      // Check if the file has been processed with AI embeddings
      const fileCheckRes = await fetch(
        `http://localhost:8080/student/files/${previewingFile.id}`,
        {
          credentials: "include",
          signal: controller.signal,
        }
      );

      if (!fileCheckRes.ok) {
        throw new Error("Failed to check file status");
      }

      const fileData = await fileCheckRes.json();
      
      // If the file doesn't have embeddings yet, show a message
      if (!fileData.has_embeddings) {
        sonnerToast.error(
          "This file is still being processed. Please wait a few moments and try again."
        );
        setIsGenerating(false);
        abortControllerRef.current = null;
        return;
      }

      // No match — send personalization request
      const payload = {
        name: onboardingData.name,
        message: "personalize this PDF",
        fileId: previewingFile.id,
        userProfile: {
          role: onboardingData.job,
          traits: onboardingData.traits,
          learningStyle: onboardingData.learningStyle,
          depth: onboardingData.depth,
          interests: onboardingData.interests,
          personalization: onboardingData.topics,
          schedule: onboardingData.schedule,
        },
      };

      const res = await fetch(
        "http://localhost:8080/generatepersonalizedfilecontent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Personalization failed");
      }

      const data = await res.json();
      sonnerToast.success("Personalized content generated!");
      router.push(`/learn/${data.id}`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn("❌ Personalization aborted by user.");
        sonnerToast.info("Personalization cancelled.");
      } else {
        console.error("Personalization failed:", err);
        sonnerToast.error(err.message || "Something went wrong during personalization.");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [previewingFile, onboardingData]);

  const handleToggleModule = useCallback(async (modId: string) => {
    if (selectedModuleId === modId) {
      setSelectedModuleId(null);
    } else {
      setSelectedModuleId(modId);
      
      // Only fetch files if we don't have them already
      if (!moduleFiles[modId]) {
        setLoadingFiles(modId);
        try {
          const response = await fetch(
            `http://localhost:8080/student/modules/${modId}/files`,
            { credentials: "include" }
          );
          
          if (!response.ok) throw new Error("Failed to fetch files");
          
          const files = await response.json();
          setModuleFiles((prev: Record<string, any[]>) => ({
            ...prev,
            [modId]: Array.isArray(files) ? files : []
          }));
        } catch (err) {
          console.error("Error fetching files:", err);
          sonnerToast.error("Failed to load module files");
          setModuleFiles(prev => ({
            ...prev,
            [modId]: []
          }));
        } finally {
          setLoadingFiles(null);
        }
      }
    }
  }, [selectedModuleId, moduleFiles]);

  // Add module function
  const handleAddModule = useCallback(async () => {
    if (!newModuleTitle.trim() || !selectedCourse) return;
    
    try {
      const response = await fetch(`http://localhost:8080/student/courses/${selectedCourse.id}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newModuleTitle,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const newModule = await response.json();
      setModules(prev => [...prev, newModule]);
      setNewModuleTitle('');
      sonnerToast.success('Module created successfully!');
    } catch (err) {
      console.error('Create module error:', err);
      sonnerToast.error(err instanceof Error ? err.message : 'Failed to create module');
    }
  }, [newModuleTitle, selectedCourse]);

  // File upload function
  // Define the FileSummary interface with additional properties for upload status
  interface ExtendedFileSummary extends FileSummary {
    isUploading?: boolean;
    uploadFailed?: boolean;
    processingMessage?: string;
  }

  const handleUploadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, moduleId: string, fileType: 'pdf' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourse) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('moduleId', moduleId);
    formData.append('title', file.name);

    if (fileType === 'pdf') {
      setUploadingModuleId(moduleId);
    } else {
      setUploadingAudioModuleId(moduleId);
    }

    // Create a unique ID for the temporary file
    const tempFileId = `temp-${Date.now()}`;
    
    try {
      // First add a temporary file entry to the UI for immediate feedback
      const tempFile: ExtendedFileSummary = {
        id: tempFileId,
        title: file.name,
        filename: file.name,
        isUploading: true,
        processingMessage: 'Uploading file...'
      };
      
      // Add the temporary file to the UI
      setModuleFiles(prev => ({
        ...prev,
        [moduleId]: [...(prev[moduleId] || []), tempFile]
      }));

      // Update processing message after 3 seconds
      const messageTimer = setTimeout(() => {
        setModuleFiles(prev => {
          const newModuleFiles = { ...prev };
          if (!newModuleFiles[moduleId]) return prev;
          
          const moduleFilesList = [...newModuleFiles[moduleId]];
          const tempIndex = moduleFilesList.findIndex(f => f.id === tempFileId);
          
          if (tempIndex !== -1 && (moduleFilesList[tempIndex] as ExtendedFileSummary).isUploading) {
            moduleFilesList[tempIndex] = {
              ...moduleFilesList[tempIndex],
              processingMessage: 'Processing file with AI (this may take a minute)...'
            } as ExtendedFileSummary;
            newModuleFiles[moduleId] = moduleFilesList;
          }
          
          return newModuleFiles;
        });
      }, 3000);

      // Set up a timeout for the fetch request (2 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      // Make the API call to upload the file
      const response = await fetch(
        `http://localhost:8080/student/modules/${moduleId}/files`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
          signal: controller.signal
        }
      );
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      clearTimeout(messageTimer);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      // Get the response data
      const data = await response.json();
      
      // Replace the temporary file with the actual file
      setModuleFiles(prev => {
        const newModuleFiles = { ...prev };
        if (!newModuleFiles[moduleId]) return prev;
        
        const moduleFilesList = [...newModuleFiles[moduleId]];
        const tempIndex = moduleFilesList.findIndex(f => f.id === tempFileId);
        
        if (tempIndex !== -1) {
          // Replace the temp file with the real one
          moduleFilesList[tempIndex] = {
            ...data,
            isUploading: false
          } as ExtendedFileSummary;
          newModuleFiles[moduleId] = moduleFilesList;
        }
        
        return newModuleFiles;
      });
      
      // Show success message
      sonnerToast.success(`${file.name} uploaded successfully`);
      
      // Refresh the module files to ensure we have the latest data
      fetchModuleFiles(moduleId);
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      // Update the temporary file to show the error
      setModuleFiles(prev => {
        const newModuleFiles = { ...prev };
        if (!newModuleFiles[moduleId]) return prev;
        
        const moduleFilesList = [...newModuleFiles[moduleId]];
        const tempIndex = moduleFilesList.findIndex(f => f.id === tempFileId);
        
        if (tempIndex !== -1) {
          // Mark the temp file as failed
          moduleFilesList[tempIndex] = {
            ...moduleFilesList[tempIndex],
            isUploading: false,
            uploadFailed: true
          } as ExtendedFileSummary;
          newModuleFiles[moduleId] = moduleFilesList;
        }
        
        return newModuleFiles;
      });
      
      // Show appropriate error message
      const errorMessage = error.name === 'AbortError'
        ? `Upload of ${file.name} is taking too long. The file may still be processing in the background.`
        : `Failed to upload ${file.name}. Please try again.`;
      
      sonnerToast.error(errorMessage);
      
    } finally {
      // Clear loading state
      if (fileType === 'pdf') {
        setUploadingModuleId(null);
      } else {
        setUploadingAudioModuleId(null);
      }
      // Reset the file input
      e.target.value = '';
    }
  }, [selectedCourse, fetchModuleFiles]);
  // File view function
  const handleViewFile = useCallback((file: FileSummary) => {
    setPreviewingFile(file);
  }, []);

  // Course update function
  const handleUpdateCourseInfo = useCallback(async (updatedCourse: any) => {
    if (!selectedCourse) return;
    
    try {
      const res = await fetch(
        `http://localhost:8080/student/courses/${updatedCourse.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            title: updatedCourse.title,
            description: updatedCourse.description,
            code: updatedCourse.code,
            term: updatedCourse.term,
            published: updatedCourse.published,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to update course");
      }

      const newTimestamp = new Date().toISOString();

      setCreatedCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.id === updatedCourse.id
            ? { ...course, ...updatedCourse, lastUpdated: newTimestamp }
            : course
        )
      );

      setSelectedCourse({ ...selectedCourse, ...updatedCourse, lastUpdated: newTimestamp });
      setEditedCourse(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      sonnerToast.success("Course updated successfully");
    } catch (error) {
      console.error("Failed to update course:", error);
      sonnerToast.error("Failed to update course");
    }
  }, [selectedCourse]);

  // Publish toggle function
  const handlePublishToggle = useCallback(async (courseId: string) => {
    if (!selectedCourse) return;
    
    try {
      const newPublishedState = !selectedCourse.published;
      const res = await fetch(
        `http://localhost:8080/student/courses/${courseId}/publish`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            published: newPublishedState,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to ${newPublishedState ? 'publish' : 'unpublish'} course`);
      }

      setCreatedCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.id === courseId
            ? { ...course, published: newPublishedState }
            : course
        )
      );

      setSelectedCourse({ ...selectedCourse, published: newPublishedState });
      sonnerToast.success(`Course ${newPublishedState ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error("Failed to toggle publish state:", error);
      sonnerToast.error("Failed to update course");
    }
  }, [selectedCourse]);

  // Delete course function
  const handleDeleteCourse = useCallback(async (courseToDelete: any) => {
    try {
      const res = await fetch(
        `http://localhost:8080/student/courses/${courseToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Failed to delete course");

      setCreatedCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      setSelectedCourse(null); // Navigate back to dashboard view
      sonnerToast.success("Course deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      sonnerToast.error("Failed to delete course");
    } finally {
      setConfirmingDelete(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <Sidebar
        onCollapseChange={(value) => setIsCollapsed(value)}
        userRole="student"
      />
      <div
        className={`transition-all duration-300 ${
          isCollapsed ? "ml-20" : "ml-60"
        } flex-1 flex flex-col min-h-screen`}
      >
        <main className="flex-1 p-6 md:p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-gradient">
                Welcome back, Student!
              </h2>
              <p className="text-gray-600">Manage your courses and learning materials</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="purple-gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-white shadow-lg rounded-xl border border-gray-200">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to create your course.
                  </DialogDescription>
                </DialogHeader>
                <CourseForm
                  onSubmit={handleCreateCourse}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Course Display - Matching Professor Dashboard Style */}
          {selectedCourse ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleBackToDashboard}
                    className="flex items-center space-x-1"
                  >
                    <span>←</span>
                    <span>Back to Dashboard</span>
                  </Button>
                  <h2 className="text-2xl font-bold">{selectedCourse.title}</h2>
                </div>
              </div>
              
              <Tabs defaultValue="home" value={activeTab} onValueChange={(value) => setActiveTab(value as "home" | "modules" | "people" | "settings")}>
                <TabsList>
                  <TabsTrigger value="home">Home</TabsTrigger>
                  <TabsTrigger value="modules">Modules</TabsTrigger>
                  <TabsTrigger value="people">People</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="home" className="space-y-4 mt-6">
                  <Card className="glass-effect border-white/10">
                    <CardHeader>
                      <CardTitle>{selectedCourse.title}</CardTitle>
                      <CardDescription>
                        {selectedCourse.code} • {selectedCourse.term}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <strong>Description:</strong>{" "}
                        {selectedCourse.description || 'No description available'}
                      </div>
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Access Code</h3>
                          <span className="text-gray-600">{(selectedCourse as any).accessCode || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Students Enrolled</h3>
                          <span className="text-gray-600">{(selectedCourse as any).students?.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Status</h3>
                          <span className="text-gray-600">{selectedCourse.published ? 'Published' : 'Unpublished'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Instructor</h3>
                          <span className="text-gray-600">{(selectedCourse as any).creatorName || (selectedCourse as any).creator?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Last Updated</h3>
                          <span className="text-gray-600">{(selectedCourse as any).lastUpdated ? new Date((selectedCourse as any).lastUpdated).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Course Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                          <h3 className="font-semibold text-lg text-blue-700">{modules.length}</h3>
                          <p className="text-sm text-blue-600">Modules</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <h3 className="font-semibold text-lg text-green-700">{Object.values(moduleFiles).flat().length}</h3>
                          <p className="text-sm text-green-600">Learning Materials</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                          <h3 className="font-semibold text-lg text-purple-700">{enrolledStudents.length}</h3>
                          <p className="text-sm text-purple-600">Classmates</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="modules" className="space-y-4 mt-6">
                  {/* Add Module Section */}
                  <Card className="mb-6 border p-6 rounded-lg shadow-sm bg-white">
                    <CardHeader className="p-0 pb-4">
                      <CardTitle className="text-lg font-semibold">Add Module</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Module Title"
                          value={newModuleTitle}
                          onChange={(e) => setNewModuleTitle(e.target.value)}
                          className="w-full p-3 rounded border border-gray-300 bg-white text-black placeholder-gray-500 focus:outline-none focus:ring focus:ring-blue-300"
                        />
                        <Button
                          onClick={handleAddModule}
                          disabled={!newModuleTitle}
                        >
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Module List */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Your Modules</h3>
                    {modules.length > 0 ? (
                      <ul className="space-y-2">
                        {modules.map((module) => (
                          <li key={module.id}>
                            <div
                              className={`flex items-center justify-between p-3 rounded-md border cursor-pointer ${
                                selectedModuleId === module.id
                                  ? "bg-blue-100 border-blue-400"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => handleToggleModule(module.id)}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <span className="text-black">
                                    {selectedModuleId === module.id ? "▼" : "▶"}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {module.title}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Module Section */}
                            {selectedModuleId === module.id && (
                              <div className="mt-3 border border-gray-300 rounded-lg bg-gray-50 shadow-sm p-4 space-y-4">
                                {/* Upload Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="border rounded-lg p-4 bg-white">
                                    <h4 className="font-medium mb-2">Upload PDF</h4>
                                    <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById(`pdf-upload-${module.id}`)?.click()}>
                                      <div className="text-center">
                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                        <p className="mt-1 text-sm text-gray-500">Click to upload PDF</p>
                                      </div>
                                      <input
                                        id={`pdf-upload-${module.id}`}
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => handleUploadFile(e, module.id, 'pdf')}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="border rounded-lg p-4 bg-white">
                                    <h4 className="font-medium mb-2">Upload Audio</h4>
                                    <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50" onClick={() => document.getElementById(`audio-upload-${module.id}`)?.click()}>
                                      <div className="text-center">
                                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                                        <p className="mt-1 text-sm text-gray-500">Click to upload Audio</p>
                                      </div>
                                      <input
                                        id={`audio-upload-${module.id}`}
                                        type="file"
                                        accept=".mp3,.wav,.m4a,.aac"
                                        className="hidden"
                                        onChange={(e) => handleUploadFile(e, module.id, 'audio')}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Files Section */}
                                <div className="border-t pt-3 space-y-2">
                                  <h5 className="text-sm font-semibold text-gray-700">Files</h5>
                                  {loadingFiles === module.id ? (
                                    <p className="text-sm text-blue-600 italic">Loading files…</p>
                                  ) : moduleFiles[module.id]?.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {moduleFiles[module.id].map((file: any) => (
                                        <div
                                          key={file.id}
                                          className={`flex items-center p-2 border rounded-md ${file.isUploading ? 'bg-blue-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                                          onClick={() => !file.isUploading && handleViewFile(file)}
                                        >
                                          <div className="mr-2">
                                            {file.isUploading ? '⏳' : 
                                             file.filename?.toLowerCase().endsWith('.pdf') ? '📄' : 
                                             file.filename?.toLowerCase().match(/\.(mp3|wav|m4a|aac)$/) ? '🔊' : 
                                             file.filename?.toLowerCase().match(/\.(ppt|pptx)$/) ? '📊' : '📁'}
                                          </div>
                                          <div className="flex-1 truncate flex items-center">
                                            <span>{file.title || file.filename}</span>
                                            {(file as ExtendedFileSummary).isUploading && (
                                              <div className="flex items-center">
                                                <Loader2 className="h-3 w-3 animate-spin ml-2 text-blue-500" />
                                                <span className="ml-2 text-xs text-gray-500">
                                                  {(file as ExtendedFileSummary).processingMessage || 'Uploading...'}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 italic">No files uploaded yet.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-500">No modules available for this course yet. Create your first module!</p>
                      </div>
                    )}
                  </div>
                  
                  {/* File Preview Section */}
                  {previewingFile && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mt-4 gap-4">
                        <Button
                          variant="outline"
                          onClick={() => setPreviewingFile(null)}
                        >
                          ← Back to Modules
                        </Button>
                        
                        {/* Only show personalize button for PDFs, not audio files */}
                        {!previewingFile.filename?.toLowerCase().match(/\.(mp3|wav|m4a|aac)$/) && (
                          <Button
                            variant="default"
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                            onClick={handlePersonalize}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Personalizing...
                              </>
                            ) : (
                              <>Personalize Content</>
                            )}
                          </Button>
                        )}
                      </div>

                      <h2 className="text-2xl font-bold text-gray-900">
                        {previewingFile.title || previewingFile.filename}
                      </h2>
                      
                      {previewingFile.filename?.toLowerCase().match(/\.(mp3|wav|m4a|aac)$/) ? (
                        <div className="w-full p-4 border rounded-lg">
                          <audio
                            controls
                            className="w-full"
                            src={`http://localhost:8080/student/files/${previewingFile.id}/content`}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      ) : (
                        <iframe
                          src={`http://localhost:8080/student/files/${previewingFile.id}/content`}
                          title={previewingFile.title || previewingFile.filename}
                          className="w-full h-[80vh] border rounded-lg shadow-sm"
                        />
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="people" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Classmates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingPeople ? (
                        <div className="py-4 text-center">Loading classmates...</div>
                      ) : enrolledStudents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {enrolledStudents.map((student) => (
                            <div key={student.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-sm text-gray-500">{student.email || 'No email available'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-gray-500">No classmates found</div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4 mt-6">
                  <section className="space-y-6">
                    <h2 className="text-2xl font-bold">Course Settings</h2>
                    
                    {/* Edit Course Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Edit Course</CardTitle>
                        <CardDescription>Update your course details</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            await handleUpdateCourseInfo(editedCourse);
                          }}
                          className="space-y-4 max-w-xl"
                        >
                          <div>
                            <label className="block text-sm font-medium py-2">
                              Title
                            </label>
                            <input
                              type="text"
                              value={editedCourse?.title || selectedCourse.title}
                              onChange={(e) =>
                                setEditedCourse({
                                  ...editedCourse || selectedCourse,
                                  title: e.target.value,
                                })
                              }
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium py-2">
                              Code
                            </label>
                            <input
                              type="text"
                              value={editedCourse?.code || selectedCourse.code}
                              onChange={(e) =>
                                setEditedCourse({
                                  ...editedCourse || selectedCourse,
                                  code: e.target.value,
                                })
                              }
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium py-2">
                              Term
                            </label>
                            <select
                              value={editedCourse?.term || selectedCourse.term}
                              onChange={(e) =>
                                setEditedCourse({
                                  ...editedCourse || selectedCourse,
                                  term: e.target.value,
                                })
                              }
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select a term</option>
                              <option value="Fall 2024">Fall 2024</option>
                              <option value="Spring 2025">Spring 2025</option>
                              <option value="Summer 2025">Summer 2025</option>
                              <option value="Fall 2025">Fall 2025</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium py-2">
                              Description
                            </label>
                            <textarea
                              value={editedCourse?.description || selectedCourse.description}
                              onChange={(e) =>
                                setEditedCourse({
                                  ...editedCourse || selectedCourse,
                                  description: e.target.value,
                                })
                              }
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <Button type="submit">Save Changes</Button>
                          {saveSuccess && (
                            <span className="ml-4 text-green-600 text-sm font-medium">
                              Saved!
                            </span>
                          )}
                        </form>
                      </CardContent>
                    </Card>
                    
                    {/* Publish/Unpublish Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Course Visibility</CardTitle>
                        <CardDescription>Control whether your course is visible to others</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="py-4">
                          <Button
                            onClick={() => handlePublishToggle(selectedCourse.id)}
                            className={`\ ${
                              !selectedCourse.published ? " text-white" : ""
                            }`}
                            variant={
                              selectedCourse.published ? "outline" : "default"
                            }
                          >
                            {selectedCourse.published
                              ? "Unpublish Course"
                              : "Publish Course"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Delete Course Section */}
                    <Card className="border-red-100">
                      <CardHeader>
                        <CardTitle className="text-red-600">Danger Zone</CardTitle>
                        <CardDescription>Permanently delete this course</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!confirmingDelete ? (
                          <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setConfirmingDelete(true)}
                          >
                            Delete Course
                          </Button>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <p className="text-red-600 text-sm font-semibold">
                              Are you sure you want to delete this course?
                            </p>
                            <div className="flex gap-4">
                              <Button
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDeleteCourse(selectedCourse)}
                              >
                                Confirm Delete
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setConfirmingDelete(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </section>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Tabs defaultValue="all" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-muted">
                  <TabsTrigger 
                    value="all"
                    onClick={() => setDashboardTab('all')}
                  >
                    All Courses
                  </TabsTrigger>
                  <TabsTrigger 
                    value="enrolled"
                    onClick={() => setDashboardTab('enrolled')}
                  >
                    Enrolled Courses
                  </TabsTrigger>
                  <TabsTrigger 
                    value="created"
                    onClick={() => setDashboardTab('created')}
                  >
                    Created Courses
                  </TabsTrigger>
                </TabsList>
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-72 bg-muted border-border"
                />
              </div>

              <TabsContent
                value="all"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch"
              >
                {(filteredEnrolledCourses && filteredCreatedCourses && [...filteredEnrolledCourses, ...filteredCreatedCourses].length > 0) ? (
                  [...(filteredEnrolledCourses || []), ...(filteredCreatedCourses || [])]
                    // Remove duplicates (in case a course is both enrolled and created)
                    .filter((course, index, self) => 
                      course && course.id && index === self.findIndex(c => c && c.id === course.id)
                    )
                    .map((course: any) => (
                      <div
                        key={course.id}
                        onClick={() => handleCourseClick(course)}
                        className="cursor-pointer"
                      >
                        <CourseCard
                          course={{
                            id: course.id,
                            title: course.title || 'Untitled Course',
                            code: course.code || 'No Code',
                            term: course.term || 'No Term',
                            students: course.students || 0,
                            published: course.published || false,
                            lastUpdated: course.lastUpdated || new Date().toISOString()
                          }}
                          onClick={() => handleCourseClick(course)}
                        />
                      </div>
                    ))
                ) : (
                  <div className="col-span-3 text-center py-10">
                    <p className="text-gray-500">No courses found. Join a course using an access code or create your own.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent
                value="enrolled"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch"
              >
                {filteredEnrolledCourses.length > 0 ? (
                  filteredEnrolledCourses.map((course: any) => (
                    <div
                      key={course.id}
                      onClick={() => handleCourseClick(course)}
                      className="cursor-pointer"
                    >
                      <CourseCard
                        course={{
                          id: course.id,
                          title: course.title || 'Untitled Course',
                          code: course.code || 'No Code',
                          term: course.term || 'No Term',
                          students: course.students || 0,
                          published: course.published || false,
                          lastUpdated: course.lastUpdated || new Date().toISOString()
                        }}
                        onClick={() => handleCourseClick(course)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-10">
                    <p className="text-gray-500">No enrolled courses found. Join a course using an access code.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="created"
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch"
              >
                {filteredCreatedCourses.length > 0 ? (
                  filteredCreatedCourses.map((course: any) => (
                    <div
                      key={course.id}
                      onClick={() => handleCourseClick(course)}
                      className="cursor-pointer"
                    >
                      <CourseCard
                        course={{
                          id: course.id,
                          title: course.title || 'Untitled Course',
                          code: course.code || 'No Code',
                          term: course.term || 'No Term',
                          students: course.students || 0,
                          published: course.published || false,
                          lastUpdated: course.lastUpdated || new Date().toISOString()
                        }}
                        onClick={() => handleCourseClick(course)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-10">
                    <p className="text-gray-500">No created courses found. Create your first course!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          </main>
        <div className="h-1/4">
          <Footer />
        </div>
      </div>
      {isGenerating && (
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex flex-col items-center justify-center">
          <button
            className="absolute top-6 right-6 text-gray-500 hover:text-gray-800 text-3xl"
            onClick={() => {
              abortControllerRef.current?.abort();
              setIsGenerating(false);
            }}
            aria-label="Close"
          >
            ×
          </button>
          <h2 className="text-xl font-semibold text-blue-700 mb-4">
            Loading personalized content...
          </h2>
          <div className="w-1/2 bg-blue-100 rounded-full h-4 overflow-hidden">
            <div className="bg-blue-600 h-full animate-pulse w-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}