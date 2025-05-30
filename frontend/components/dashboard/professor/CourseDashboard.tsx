import { useState } from "react";
import { Plus, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CourseCard } from "@/components/dashboard/CourseCard";
import CourseForm from "@/components/dashboard/CourseForm";
import { Course } from "./hooks/useCourses";

interface CourseDashboardProps {
  courseHooks: {
    courses: Course[];
    loading: boolean;
    error: string | null;
    createCourse: (courseData: any) => Promise<Course | null>;
    updateCourse: (courseId: string, updateData: any) => Promise<Course | null>;
    deleteCourse: (courseId: string) => Promise<boolean>;
    togglePublish: (courseId: string) => Promise<boolean>;
    getPublishedCourses: () => Course[];
    getUnpublishedCourses: () => Course[];
    searchCourses: (query: string) => Course[];
    refetch: () => void;
  };
  onSelectCourse: (course: Course) => void;
}

export function CourseDashboard({ courseHooks, onSelectCourse }: CourseDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const {
    courses,
    loading,
    createCourse,
    updateCourse,
    deleteCourse,
    togglePublish,
    getPublishedCourses,
    getUnpublishedCourses,
    searchCourses
  } = courseHooks;

  // Filter courses based on search
  const filteredCourses = searchQuery.trim() 
    ? searchCourses(searchQuery)
    : courses;

  const publishedCourses = getPublishedCourses();
  const unpublishedCourses = getUnpublishedCourses();

  const handleCreateCourse = async (courseData: any) => {
    const newCourse = await createCourse(courseData);
    if (newCourse) {
      setIsCreateDialogOpen(false);
    }
  };

  const handleUpdateCourse = async (courseId: string, updateData: any) => {
    const updatedCourse = await updateCourse(courseId, updateData);
    if (updatedCourse) {
      setEditingCourse(null);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    await deleteCourse(courseId);
  };

  const handleTogglePublish = async (courseId: string) => {
    await togglePublish(courseId);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Course Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your courses and track student progress
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Course</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Set up a new course for your students
              </DialogDescription>
            </DialogHeader>
            <CourseForm
              onSubmit={handleCreateCourse}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search courses by title, code, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Course Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>All Courses ({filteredCourses.length})</span>
          </TabsTrigger>
          <TabsTrigger value="published">
            Published ({publishedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="unpublished">
            Unpublished ({unpublishedCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CourseGrid
            courses={filteredCourses}
            onSelectCourse={onSelectCourse}
            onEditCourse={setEditingCourse}
            onDeleteCourse={handleDeleteCourse}
            onTogglePublish={handleTogglePublish}
          />
        </TabsContent>

        <TabsContent value="published">
          <CourseGrid
            courses={publishedCourses.filter(course =>
              searchQuery.trim() ? searchCourses(searchQuery).includes(course) : true
            )}
            onSelectCourse={onSelectCourse}
            onEditCourse={setEditingCourse}
            onDeleteCourse={handleDeleteCourse}
            onTogglePublish={handleTogglePublish}
          />
        </TabsContent>

        <TabsContent value="unpublished">
          <CourseGrid
            courses={unpublishedCourses.filter(course =>
              searchQuery.trim() ? searchCourses(searchQuery).includes(course) : true
            )}
            onSelectCourse={onSelectCourse}
            onEditCourse={setEditingCourse}
            onDeleteCourse={handleDeleteCourse}
            onTogglePublish={handleTogglePublish}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Course Dialog */}
      {editingCourse && (
        <Dialog open={!!editingCourse} onOpenChange={() => setEditingCourse(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
              <DialogDescription>
                Update course information
              </DialogDescription>
            </DialogHeader>
            <CourseForm
              initialData={editingCourse}
              onSubmit={(data) => handleUpdateCourse(editingCourse.id, data)}
              onCancel={() => setEditingCourse(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Course Grid Component
interface CourseGridProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => Promise<void>;
  onTogglePublish: (courseId: string) => Promise<void>;
}

function CourseGrid({ 
  courses, 
  onSelectCourse, 
  onEditCourse, 
  onDeleteCourse, 
  onTogglePublish 
}: CourseGridProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <LayoutDashboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
        <p className="text-gray-600">
          Create your first course to get started with teaching
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onSelect={() => onSelectCourse(course)}
          onEdit={() => onEditCourse(course)}
          onDelete={() => onDeleteCourse(course.id)}
          onTogglePublish={() => onTogglePublish(course.id)}
        />
      ))}
    </div>
  );
}