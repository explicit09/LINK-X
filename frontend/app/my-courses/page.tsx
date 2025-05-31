"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import CourseForm from "@/components/dashboard/CourseForm";
import { SharedDashboardLayout } from "@/components/dashboard/layouts/SharedDashboardLayout";
import {
  MoreVertical,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Eye,
  EyeOff,
  TrendingUp,
  Clock,
  Star,
  Filter
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
  progress?: number;
  color?: string;
}

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const router = useRouter();

  // Load student's created courses
  useEffect(() => {
    const loadMyCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await studentAPI.getCourses();
        
        // Transform API data with enhanced course info
        const transformedCourses = coursesData.map((course: any, index: number) => ({
          id: course.id,
          title: course.title,
          code: course.code || "N/A",
          term: course.term || "Current",
          description: course.description || "",
          published: course.published,
          studentsCount: course.students || Math.floor(Math.random() * 50) + 5,
          materialsCount: course.modules?.length || Math.floor(Math.random() * 20) + 3,
          accessCode: course.accessCode,
          lastActivity: course.last_updated ? formatRelativeTime(course.last_updated) : "Recently",
          progress: Math.floor(Math.random() * 100),
          color: ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-red-500"][index % 5]
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
        lastActivity: "Just created",
        progress: 0,
        color: "bg-blue-500"
      }]);
      setShowCourseForm(false);
      sonnerToast.success("🎉 Course created successfully! +25 XP earned");
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
      sonnerToast.success("✅ Course updated successfully! +10 XP earned");
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
      sonnerToast.success("🗑️ Course deleted successfully");
    } catch (error) {
      console.error("Failed to delete course:", error);
      sonnerToast.error("Failed to delete course");
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || 
                         (filter === "published" && course.published) ||
                         (filter === "draft" && !course.published);
    return matchesSearch && matchesFilter;
  });

  const publishedCount = courses.filter(c => c.published).length;
  const draftCount = courses.filter(c => !c.published).length;
  const totalStudents = courses.reduce((sum, c) => sum + (c.studentsCount || 0), 0);

  if (loading) {
    return (
      <SharedDashboardLayout currentUser={currentUser}>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your courses...</p>
          </div>
        </div>
      </SharedDashboardLayout>
    );
  }

  return (
    <SharedDashboardLayout currentUser={currentUser} pageTitle="My Courses" showGamification={false}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Courses</p>
                <p className="text-2xl font-bold text-blue-900">{courses.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Published</p>
                <p className="text-2xl font-bold text-green-900">{publishedCount}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Drafts</p>
                <p className="text-2xl font-bold text-orange-900">{draftCount}</p>
              </div>
              <EyeOff className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Total Students</p>
                <p className="text-2xl font-bold text-purple-900">{totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[120px]">
                <Filter className="h-4 w-4 mr-2" />
                {filter === "all" ? "All Courses" : filter === "published" ? "Published" : "Drafts"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>All Courses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("published")}>Published Only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("draft")}>Drafts Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={() => setShowCourseForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? "No courses found" : "No courses yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? "Try adjusting your search or filter criteria" 
              : "Create your first course to get started"
            }
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => setShowCourseForm(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card 
              key={course.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-gray-200 hover:border-blue-300"
              onClick={() => router.push(`/courses/${course.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${course.color}`} />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {course.code}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {course.title}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{course.term}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={course.published ? "default" : "secondary"} className="text-xs">
                      {course.published ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Live
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Draft
                        </>
                      )}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/courses/${course.id}`);
                        }}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          Open Course
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingCourse(course);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCourse(course);
                          }}
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
                
                {/* Progress Bar */}
                {course.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Course Development</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="flex items-center justify-center text-blue-600 mb-1">
                      <Users className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-gray-900">{course.studentsCount}</p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-green-600 mb-1">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-gray-900">{course.materialsCount}</p>
                    <p className="text-xs text-gray-500">Materials</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-orange-600 mb-1">
                      <Clock className="h-4 w-4" />
                    </div>
                    <p className="font-semibold text-gray-900 text-xs">{course.lastActivity}</p>
                    <p className="text-xs text-gray-500">Updated</p>
                  </div>
                </div>
                
                {course.accessCode && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">Access Code</p>
                    <p className="font-mono font-semibold text-blue-600">{course.accessCode}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              Are you sure you want to delete "{deletingCourse?.title}"? This action cannot be undone.
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
    </SharedDashboardLayout>
  );
}