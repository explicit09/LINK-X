"use client";

import { useState, useEffect, useRef, useMemo, useCallback, ChangeEvent } from "react";
import { LayoutDashboard, Upload, Plus } from "lucide-react";

import Sidebar from "@/components/dashboard/DashSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AudioUpload from "@/components/dashboard/AudioUpload";
import { Button } from "@/components/ui/button";
import Footer from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CourseCard } from "@/components/dashboard/StudentCourseCard";

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
  const [activeTab, setActiveTab] = useState<'enrolled' | 'created'>('enrolled');
  const [activeTabContent, setActiveTabContent] = useState<"home" | "modules" | "people">("home");
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null);
  const [loadingPeople, setLoadingPeople] = useState(false);
  
  // Form State
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
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
      toast.error("Failed to load courses");
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    const fetchModules = async () => {
      if (!selectedCourse) return;
      try {
        const res = await fetch(
          `http://localhost:8080/student/courses/${selectedCourse.id}/modules`,
          {
            credentials: "include",
          }
        );
        const data = await res.json();

        if (Array.isArray(data)) {
          setModules(data);
        } else if (Array.isArray(data.modules)) {
          setModules(data.modules);
        } else {
          console.error("Unexpected module format:", data);
          setModules([]); // fallback
        }
      } catch (err) {
        console.error("Error fetching modules:", err);
        setModules([]); // fallback
      }
    };

    fetchModules();
  }, [selectedCourse]);

  useEffect(() => {
    const fetchClassmates = async () => {
      if (activeTabContent !== "people" || !selectedCourse?.id) return;
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
  }, [activeTabContent, selectedCourse]);

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
    enrolledCourses.filter((course: any) => {
      const query = searchQuery.toLowerCase();
      return (
        course.title?.toLowerCase().includes(query) ||
        (course.code && course.code.toLowerCase().includes(query))
      );
    }),
    [enrolledCourses, searchQuery]
  );

  const filteredCreatedCourses = useMemo(() =>
    createdCourses.filter((course: any) => {
      const query = searchQuery.toLowerCase();
      return (
        course.title?.toLowerCase().includes(query) ||
        (course.code && course.code.toLowerCase().includes(query))
      );
    }),
    [createdCourses, searchQuery]
  );

  const handleCourseClick = (course: any) => {
    setSelectedCourse(course);
  };

  const handleBackToDashboard = () => {
    setSelectedCourse(null);
  };

  const handleCreateCourse = useCallback(async () => {
    if (!newCourseTitle.trim()) {
      toast.error('Please enter a course title');
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
          title: newCourseTitle,
          description: newCourseDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const newCourse = await response.json();
      setCreatedCourses(prev => [...prev, newCourse]);
      setNewCourseTitle('');
      setNewCourseDescription('');
      setIsCreatingCourse(false);
      toast.success('Course created successfully!');
    } catch (err) {
      console.error('Create course error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create course');
    }
  }, [newCourseTitle, newCourseDescription]);

  const handlePersonalize = useCallback(async () => {
    if (!previewingFile || !onboardingData) return;

    try {
      setIsGenerating(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // First check if we already have a personalized version of this file
      const checkRes = await fetch(
        `http://localhost:8080/student/personalized-files`,
        {
          credentials: "include",
          signal: controller.signal,
        }
      );

      if (!checkRes.ok) throw new Error("Failed to check personalized files");

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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Personalization failed");

      toast.success("Personalized content generated!");
      router.push(`/learn/${data.id}`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn("❌ Personalization aborted by user.");
        toast.info("Personalization cancelled.");
      } else {
        console.error("Personalization failed:", err);
        toast.error("Something went wrong during personalization.");
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
          toast.error("Failed to load module files");
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

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onCollapseChange={(value) => setIsCollapsed(value)}
          userRole="student"
        />
        <div
          className={`transition-all duration-300 flex-1 flex flex-col overflow-auto ${
            isCollapsed ? "ml-20" : "ml-60"
          }`}
        >
          <main className="flex-1 p-6 md:p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-gradient">
                Welcome back, Student!
              </h2>
              <p className="text-gray-600">Manage your courses and learning materials</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                  <Plus size={18} />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-title">Course Title</Label>
                    <Input
                      id="course-title"
                      value={newCourseTitle}
                      onChange={(e) => setNewCourseTitle(e.target.value)}
                      placeholder="Enter course title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-description">Description (Optional)</Label>
                    <Textarea
                      id="course-description"
                      value={newCourseDescription}
                      onChange={(e) => setNewCourseDescription(e.target.value)}
                      placeholder="Enter course description"
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewCourseTitle('');
                      setNewCourseDescription('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCourse}
                    disabled={!newCourseTitle.trim() || isCreatingCourse}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreatingCourse ? 'Creating...' : 'Create Course'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          </main>
        </div>
      </div>
      <div className="mt-auto">
        <Footer />
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