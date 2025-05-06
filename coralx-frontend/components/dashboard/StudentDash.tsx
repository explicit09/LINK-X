"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard } from "lucide-react";

import Sidebar from "@/components/link-x/DashSidebar";
import AudioUpload from "@/components/dashboard/AudioUpload";
import { Button } from "@/components/ui/button";
import Footer from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CourseCard } from "@/components/dashboard/StudentCourseCard";
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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("modules");
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [moduleFiles, setModuleFiles] = useState<Record<string, FileSummary[]>>(
    {}
  );
  const [previewingFile, setPreviewingFile] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const res = await fetch("http://localhost:8080/student/courses", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data = await res.json();
        setCourses(data); 
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };
    fetchEnrollments();
  }, []);

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
    const fetchEnrolledStudents = async () => {
      if (activeTab !== "people" || !selectedCourse?.id) return;

      try {
        const res = await fetch(
          `http://localhost:8080/instructor/courses/${selectedCourse.id}/students`,
          {
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch students");
        const students = await res.json();

        const formatted = students.map((s: any) => ({
          id: s.userId,
          name: s.name,
          email: s.email,
          enrolledAt: s.enrolledAt,
          enrollmentId: s.enrollmentId, // <-- include this
        }));

        setEnrolledStudents(formatted);
      } catch (err) {
        console.error("Error fetching enrolled students:", err);
        setEnrolledStudents([]);
      }
    };

    fetchEnrolledStudents();
  }, [activeTab, selectedCourse]);

  const filteredCourses = courses
    .filter(
      (course): course is Course =>
        !!course &&
        typeof course.title === "string" &&
        typeof course.code === "string"
    )
    .filter(
      (course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleCourseClick = (course: any) => {
    setSelectedCourse(course);
  };

  const handleBackToDashboard = () => {
    setSelectedCourse(null);
  };

  const handlePersonalize = async () => {
    if (!previewingFile) {
      console.warn("No file selected for personalization.");
      return;
    }

    const payload = {
      name: "Student",
      message: "personalize this PDF",
      fileId: previewingFile.id,
      userProfile: {
        role: "college student",
        traits: "clear and friendly",
        learningStyle: "visual",
        depth: "intermediate",
        interests: "psychology, neuroscience",
        personalization: "real-life examples",
        schedule: "evenings",
      },
    };

    console.log("Sending personalization payload:", payload);

    try {
      const res = await fetch(
        "http://localhost:8080/generatepersonalizedfilecontent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Personalization failed");

      toast.success("Personalized content generated!");
      console.log("Personalized content:", data.response);

      // Optionally display or store the content in your UI
      // setPersonalizedText(data.response);
    } catch (err) {
      console.error("Personalization failed:", err);
      toast.error("Something went wrong during personalization.");
    }
  };

  const handleToggleModule = async (modId: string) => {
    if (selectedModuleId === modId) {
      setSelectedModuleId(null); // collapse
    } else {
      setSelectedModuleId(modId); // expand

      if (!moduleFiles[modId]) {
        try {
          const res = await fetch(
            `http://localhost:8080/instructor/modules/${modId}/files`,
            {
              credentials: "include",
            }
          );

          if (!res.ok) throw new Error("Failed to fetch files");

          const data = await res.json();

          if (Array.isArray(data)) {
            setModuleFiles((prev) => ({ ...prev, [modId]: data }));
          } else {
            console.error("Unexpected response format:", data);
            setModuleFiles((prev) => ({ ...prev, [modId]: [] }));
          }
        } catch (err) {
          console.error("Fetch module files error:", err);
          setModuleFiles((prev) => ({ ...prev, [modId]: [] }));
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <Sidebar onCollapseChange={(value) => setIsCollapsed(value)} />
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isCollapsed ? "ml-14" : "ml-44"
        )}
      >
        <main className="flex-1 p-6 md:p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-gradient">
                Welcome back, Student!
              </h2>
              <p className="text-muted-foreground">
                Browse your enrolled courses below.
              </p>
            </div>
          </div>

          {selectedCourse ? (
            <div className="flex min-h-screen bg-white">
              <aside className="w-60 border-r border-gray-200 p-6 space-y-6">
                <div className="text-xl font-bold">{selectedCourse.title}</div>
                <nav className="flex flex-col space-y-4">
                  <button
                    className={`text-left ${
                      activeTab === "modules"
                        ? "font-semibold text-blue-600 border-l-4 pl-2 border-blue-600"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                    onClick={() => setActiveTab("modules")}
                  >
                    Modules
                  </button>
                  <button
                    className={`text-left ${
                      activeTab === "people"
                        ? "font-semibold text-blue-600 border-l-4 pl-2 border-blue-600"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                    onClick={() => setActiveTab("people")}
                  >
                    People
                  </button>
                </nav>
                <Button
                  variant="outline"
                  onClick={handleBackToDashboard}
                  className="mt-10"
                >
                  ← Back to Courses
                </Button>
              </aside>
              <main className="flex-1 p-8">
                {activeTab === "modules" && (
                  <section>
                    <h2 className="text-2xl font-bold mb-6">Modules</h2>

                    {/* For student only, make sure to take this out */}
                    {previewingFile ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mt-4 gap-4">
                          <Button
                            variant="outline"
                            onClick={() => setPreviewingFile(null)}
                          >
                            ← Back to Modules
                          </Button>
                          <Button onClick={handlePersonalize}>
                            Personalize
                          </Button>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900">
                          {previewingFile.title}
                        </h2>
                        <iframe
                          src={`http://localhost:8080/instructor/files/${previewingFile.id}/content`}
                          title={previewingFile.title}
                          className="w-full h-[80vh] border rounded-lg shadow-sm"
                        />
                      </div>
                    ) : (
                      <>
                        {/* Collapsible Modules */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-2">
                            Your Modules
                          </h3>
                          <ul className="space-y-2">
                            {modules.map((mod) => (
                              <li key={mod.id}>
                                <div
                                  className={`flex items-center justify-between p-3 rounded-md border cursor-pointer ${
                                    selectedModuleId === mod.id
                                      ? "bg-blue-100 border-blue-400"
                                      : "hover:bg-gray-50"
                                  }`}
                                  onClick={() => handleToggleModule(mod.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-black">
                                      {selectedModuleId === mod.id ? "▼" : "▶"}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {mod.title}
                                    </span>
                                  </div>
                                </div>

                                {/* Expanded Module Section */}
                                {selectedModuleId === mod.id && (
                                  <div className="mt-3 border border-gray-300 rounded-lg bg-gray-50 shadow-sm p-4 space-y-4">
                                    <div className="border-t pt-3 space-y-2">
                                      <h5 className="text-sm font-semibold text-gray-700">
                                        Files
                                      </h5>
                                      {Array.isArray(moduleFiles[mod.id]) &&
                                      moduleFiles[mod.id].length > 0 ? (
                                        moduleFiles[mod.id].map((file) => (
                                          <div
                                            key={file.id}
                                            onClick={() =>
                                              setPreviewingFile(file)
                                            }
                                            className="cursor-pointer text-blue-600 hover:underline"
                                          >
                                            📄 {file.title}
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-sm text-gray-500 italic">
                                          No files uploaded yet.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </section>
                )}

                {activeTab === "people" && (
                  <section>
                    <h2 className="text-2xl font-bold mb-4">People</h2>
                    <div className="space-y-4">
                      {enrolledStudents.map((student) => (
                        <div
                          key={student.enrollmentId}
                          className="p-4 border rounded-lg shadow-sm bg-white"
                        >
                          <div className="text-lg font-semibold">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {student.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </main>
            </div>
          ) : (
            <Tabs defaultValue="all" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-muted">
                  <TabsTrigger value="all">All Courses</TabsTrigger>
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
                {filteredCourses.map((course: any) => (
                  <div
                    key={course.id}
                    onClick={() => handleCourseClick(course)}
                    className="cursor-pointer"
                  >
                    <CourseCard course={course} />
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
          
        </main>
        <div className="h-1/4">
          <Footer />
          </div>
      </div>
    </div>
  );
}
