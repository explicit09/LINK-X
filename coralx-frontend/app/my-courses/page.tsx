"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ModernSidebar from "@/components/dashboard/ModernSidebar";
import CourseForm from "@/components/dashboard/CourseForm";
import {
  MoreVertical,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast as sonnerToast } from 'sonner';
import { studentAPI } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  code: string;
  term: string;
  description: string;
  published: boolean;
  studentsCount?: number;
  materialsCount?: number;
  accessCode?: string;
  lastActivity?: string;
}

export default function MyCoursesPage() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  // Load student's created courses
  useEffect(() => {
    const loadMyCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await studentAPI.getCourses();
        
        // Transform API data to match our interface
        const transformedCourses = coursesData.map((course: any) => ({
          id: course.id,
          title: course.title,
          code: course.code || "N/A",
          term: course.term || "Current",
          description: course.description || "",
          published: course.published,
          studentsCount: course.students || 0,
          materialsCount: course.modules?.length || 0,
          accessCode: course.accessCode,
          lastActivity: course.last_updated ? formatRelativeTime(course.last_updated) : "Recently",
        }));
        
        setCourses(transformedCourses);
      } catch (error) {
        console.error("Failed to load courses:", error);
        sonnerToast.error("Failed to load your courses");
      } finally {
        setLoading(false);
      }
    };

    loadMyCourses();
  }, []);

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

  const handleCreateCourse = async (courseData: any) => {
    try {
      const newCourse = await studentAPI.createCourse(courseData);
      setCourses(prev => [...prev, {
        ...courseData,
        id: newCourse.id,
        accessCode: newCourse.accessCode,
        studentsCount: 0,
        materialsCount: 0,
        lastActivity: "Just created"
      }]);
      setShowCourseForm(false);
      sonnerToast.success("Course created successfully!");
    } catch (error) {
      console.error("Failed to create course:", error);
      sonnerToast.error("Failed to create course");
    }
  };

  const handleEditCourse = async (courseData: any) => {
    if (!editingCourse) return;
    
    try {
      await studentAPI.updateCourse(editingCourse.id, courseData);
      setCourses(prev => prev.map(course => 
        course.id === editingCourse.id 
          ? { ...course, ...courseData }
          : course
      ));
      setEditingCourse(null);
      sonnerToast.success("Course updated successfully!");
    } catch (error) {
      console.error("Failed to update course:", error);
      sonnerToast.error("Failed to update course");
    }
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    
    try {
      await studentAPI.deleteCourse(deletingCourse.id);
      setCourses(prev => prev.filter(course => course.id !== deletingCourse.id));
      setDeletingCourse(null);
      sonnerToast.success("Course deleted successfully!");
    } catch (error) {
      console.error("Failed to delete course:", error);
      sonnerToast.error("Failed to delete course");
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="canvas-body">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex">
      <ModernSidebar
        userRole="student"
        onCollapseChange={setIsCollapsed}
        courses={courses}
        currentUser={currentUser}
      />
      
      <div className={cn("flex-1 transition-all duration-300", isCollapsed ? "ml-16" : "ml-64")}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="canvas-heading-1">My Courses</h1>
                <p className="canvas-body mt-1">
                  Manage the courses you&apos;ve created
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search your courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button 
                  onClick={() => setShowCourseForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="p-6">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="canvas-heading-3 mb-2">No courses yet</h3>
              <p className="canvas-body text-gray-500 mb-4">
                Create your first course to get started
              </p>
              <Button 
                onClick={() => setShowCourseForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="canvas-card modern-hover group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="canvas-heading-3 line-clamp-1">
                          {course.title}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {course.code} • {course.term}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={course.published ? "default" : "secondary"}>
                          {course.published ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Draft
                            </>
                          )}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}`)}>
                              <BookOpen className="h-4 w-4 mr-2" />
                              Open Course
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingCourse(course)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingCourse(course)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {course.description || "No description provided"}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {course.studentsCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {course.materialsCount}
                        </div>
                      </div>
                      <p>{course.lastActivity}</p>
                    </div>
                    
                    {course.accessCode && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-center">
                        <p className="text-xs text-gray-500">Access Code</p>
                        <p className="font-mono font-semibold">{course.accessCode}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create Course Dialog */}
      <Dialog open={showCourseForm} onOpenChange={setShowCourseForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
          </DialogHeader>
          <CourseForm 
            userRole="student"
            onSave={handleCreateCourse} 
            onCancel={() => setShowCourseForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      {editingCourse && (
        <Dialog open={!!editingCourse} onOpenChange={() => setEditingCourse(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
            </DialogHeader>
            <CourseForm 
              course={editingCourse}
              userRole="student"
              onSave={handleEditCourse} 
              onCancel={() => setEditingCourse(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCourse} onOpenChange={() => setDeletingCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCourse?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCourse} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 