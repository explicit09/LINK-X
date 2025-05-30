import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { instructorAPI } from '@/lib/api';

export function useCourseDeleteHandler(courseId: string) {
  const router = useRouter();
  const [courseDeleteDialogOpen, setCourseDeleteDialogOpen] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const handleDeleteCourse = () => {
    setCourseDeleteDialogOpen(true);
  };

  const confirmDeleteCourse = async () => {
    try {
      setIsDeletingCourse(true);
      await instructorAPI.deleteCourse(courseId);
      toast.success("Course deleted successfully");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    } finally {
      setIsDeletingCourse(false);
      setCourseDeleteDialogOpen(false);
    }
  };

  return {
    courseDeleteDialogOpen,
    setCourseDeleteDialogOpen,
    isDeletingCourse,
    handleDeleteCourse,
    confirmDeleteCourse
  };
}