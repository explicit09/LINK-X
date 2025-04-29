
"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard } from "lucide-react";

import Sidebar from "@/components/link-x/DashSidebar";
import AudioUpload from "@/components/dashboard/AudioUpload";
import { Button } from "@/components/ui/button";
import Footer from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CourseCard } from "@/components/dashboard/StudentCourseCard";

export default function StudentDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("modules");

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const res = await fetch("http://localhost:8080/student/enrollments", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch enrollments");
        const data = await res.json();
        setCourses(data); 
      } catch (err) {
        console.error("Error fetching enrollments:", err);
      }
    };
    fetchEnrollments();
  }, []);
  

  const filteredCourses = courses.filter(
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
                    <h2 className="text-2xl font-bold mb-4">Modules</h2>
                    {/* Display modules */}
                  </section>
                )}
                {activeTab === "people" && (
                  <section>
                    <h2 className="text-2xl font-bold mb-4">People</h2>
                    <ul className="space-y-2">
                      {[{ name: "Alice Johnson", role: "Student" }].map(
                        (person, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between p-3 rounded-md border border-gray-200 shadow-sm hover:bg-gray-50 transition"
                          >
                            <span className="font-medium text-gray-900">
                              {person.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {person.role}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
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
          <Footer />
        </main>
      </div>
    </div>
  );
}
