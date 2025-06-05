import { Button } from '@/components/ui/button';
import { Plus, GraduationCap } from 'lucide-react';
import { ModernCourseCard } from '@/components/dashboard/ModernCourseCard';
import { useRouter } from 'next/navigation';
import { courseAPI } from '@/lib/api/courses';
import { toast as sonnerToast } from 'sonner';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Course {
  id: string;
  title: string;
  code: string;
  term?: string;
  description?: string;
  published?: boolean;
  color?: string;
  lastActivity?: string;
  unreadCount?: number;
  materialsCount?: number;
  studentsCount?: number;
  creator_id?: string;
  instructor_id?: string;
}

interface CoursesSectionProps {
  userRole: string;
  filteredCourses: Course[];
  setShowCourseForm: (show: boolean) => void;
  setShowAccessCodeDialog: (show: boolean) => void;
  onCourseClick: (course: Course) => void;
  onUpload: (courseId: string) => void;
  onAIChat: (courseId: string) => void;
  onQuiz: (courseId: string) => void;
}

export const CoursesSection = ({
  userRole,
  filteredCourses,
  setShowCourseForm,
  setShowAccessCodeDialog,
  onCourseClick,
  onUpload,
  onAIChat,
  onQuiz,
}: CoursesSectionProps) => {
  const router = useRouter();
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const handleEditCourse = (courseId: string) => {
    // For now, navigate to a course edit page
    // You could also open an edit modal here
    router.push(`/courses/${courseId}/edit`);
  };

  const handleDeleteCourse = async (courseId: string) => {
    const course = filteredCourses.find(c => c.id === courseId);
    if (course) {
      setCourseToDelete(course);
      setDeletingCourseId(courseId);
    }
  };

  const confirmDelete = async () => {
    if (!courseToDelete || !deletingCourseId) return;

    try {
      await courseAPI.deleteCourse(deletingCourseId);
      sonnerToast.success('Course deleted successfully');
      // Refresh the page to update the course list
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete course:', error);
      sonnerToast.error('Failed to delete course. Please try again.');
    } finally {
      setDeletingCourseId(null);
      setCourseToDelete(null);
    }
  };

  return (
    <div className="lg:col-span-3">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="canvas-heading-2">My Courses</h2>
          <GraduationCap className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCourseForm(true)}
            variant="outline"
            className="modern-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/courses')}
            className="modern-hover"
          >
            View All
          </Button>
        </div>
      </div>

      {/* Add helpful message for students */}
      {userRole === 'student' && filteredCourses.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200 mb-6">
          <div className="max-w-md mx-auto">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Get Started with Learning
            </h3>
            <p className="text-gray-600 mb-4">
              Create your own course to organize your learning materials, or
              join an existing course with an access code.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setShowCourseForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your Course
              </Button>
              <Button
                onClick={() => setShowAccessCodeDialog(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Join Course
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredCourses.map((course, index) => (
          <ModernCourseCard
            key={course.id}
            course={course}
            colorIndex={index}
            onClick={onCourseClick}
            onUpload={onUpload}
            onAIChat={onAIChat}
            onQuiz={onQuiz}
            onEdit={handleEditCourse}
            onDelete={handleDeleteCourse}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}"? This action cannot be undone.
              All modules and files associated with this course will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCourseToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
