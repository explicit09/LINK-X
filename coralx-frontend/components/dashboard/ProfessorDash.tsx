"use client";

import { useState } from "react";
import { Plus, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import Sidebar from "@/components/link-x/DashSidebar";
import AudioUpload from "@/components/dashboard/AudioUpload";
import { Button } from "@/components/ui/button";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CourseCard } from "@/components/dashboard/CourseCard";
import { CourseForm } from "@/components/dashboard/CourseForm";

// Sample courses
const initialCourses = [
  { id: "1", title: "Introduction to Computer Science", code: "CS101", term: "Fall 2024", students: 45, published: true, lastUpdated: "2024-04-15" },
  { id: "2", title: "Data Structures and Algorithms", code: "CS201", term: "Fall 2024", students: 32, published: true, lastUpdated: "2024-04-10" },
  { id: "3", title: "Database Systems", code: "CS301", term: "Fall 2024", students: 28, published: false, lastUpdated: "2024-04-05" },
  { id: "4", title: "Machine Learning", code: "CS401", term: "Spring 2025", students: 0, published: false, lastUpdated: "2024-04-01" },
];

export default function ProfessorDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [courses, setCourses] = useState(initialCourses);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null); // 🆕

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCourse = (newCourse: any) => {
    const courseWithId = {
      ...newCourse,
      id: (courses.length + 1).toString(),
      students: 0,
      published: false,
      lastUpdated: new Date().toISOString().split("T")[0],
    };
    setCourses([...courses, courseWithId]);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateCourse = (updatedCourse: any) => {
    setCourses(courses.map((course) => (course.id === updatedCourse.id ? { ...course, ...updatedCourse } : course)));
    setEditingCourse(null);
  };

  const handlePublishToggle = (id: string) => {
    setCourses(
      courses.map((course) =>
        course.id === id
          ? { ...course, published: !course.published, lastUpdated: new Date().toISOString().split("T")[0] }
          : course
      )
    );
  };

  const handleCourseClick = (course: any) => {
    setSelectedCourse(course); // 🆕 set the clicked course
  };

  const handleBackToDashboard = () => {
    setSelectedCourse(null); // 🆕 clear selection
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      {/* Sidebar */}
      <Sidebar onCollapseChange={(value) => setIsCollapsed(value)} />

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300", isCollapsed ? "ml-14" : "ml-44")}>
        <main className="flex-1 p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-gradient">Welcome back, Professor!</h2>
              <p className="text-muted-foreground">Manage your courses and upload materials below.</p>
            </div>
            <div className="flex items-center gap-2">
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
                    <DialogDescription>Fill in the details below to create your course.</DialogDescription>
                  </DialogHeader>
                  <CourseForm onSubmit={handleCreateCourse} onCancel={() => setIsCreateDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* 🧠 CONDITIONAL CONTENT */}
          {selectedCourse ? (
            <div className="space-y-8">
              {/* Selected Course Details */}
              <Button variant="outline" onClick={handleBackToDashboard} className="mb-4">
                ← Back to All Courses
              </Button>

              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle>{selectedCourse.title}</CardTitle>
                  <CardDescription>
                    {selectedCourse.code} • {selectedCourse.term}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Students Enrolled:</strong> {selectedCourse.students}</div>
                  <div><strong>Last Updated:</strong> {selectedCourse.lastUpdated}</div>
                  <div><strong>Status:</strong> {selectedCourse.published ? "Published" : "Unpublished"}</div>
                </CardContent>
              </Card>

              {/* Upload Section */}
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle>Upload Materials for {selectedCourse.title}</CardTitle>
                  <CardDescription>Upload PDFs, audio lectures, or resources below.</CardDescription>
                </CardHeader>
                <CardContent>
                  <AudioUpload />
                </CardContent>
              </Card>
            </div>
          ) : (
            // Default Dashboard with Courses Tabs
            <Tabs defaultValue="all" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="bg-muted">
                  <TabsTrigger value="all">All Courses</TabsTrigger>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  <TabsTrigger value="unpublished">Unpublished</TabsTrigger>
                </TabsList>
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-72 bg-muted border-border"
                />
              </div>

              <TabsContent value="all" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((course: any) => (
                  <div key={course.id} onClick={() => handleCourseClick(course)} className="cursor-pointer">
                    <CourseCard
                      course={course}
                      onEdit={() => setEditingCourse(course)}
                      onPublishToggle={() => handlePublishToggle(course.id)}
                    />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="published" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCourses
                  .filter((c: any) => c.published)
                  .map((course: any) => (
                    <div key={course.id} onClick={() => handleCourseClick(course)} className="cursor-pointer">
                      <CourseCard
                        course={course}
                        onEdit={() => setEditingCourse(course)}
                        onPublishToggle={() => handlePublishToggle(course.id)}
                      />
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="unpublished" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCourses
                  .filter((c: any) => !c.published)
                  .map((course: any) => (
                    <div key={course.id} onClick={() => handleCourseClick(course)} className="cursor-pointer">
                      <CourseCard
                        course={course}
                        onEdit={() => setEditingCourse(course)}
                        onPublishToggle={() => handlePublishToggle(course.id)}
                      />
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          )}

          <Footer />
        </main>
      </div>

      {/* Edit Course Dialog */}
      {editingCourse && (
        <Dialog open={!!editingCourse} onOpenChange={(open) => !open && setEditingCourse(null)}>
          <DialogContent className="sm:max-w-[600px] bg-white shadow-lg rounded-xl border border-gray-200">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
              <DialogDescription>Update your course details below.</DialogDescription>
            </DialogHeader>
            <CourseForm course={editingCourse} onSubmit={handleUpdateCourse} onCancel={() => setEditingCourse(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
