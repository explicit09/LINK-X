import { useState, useEffect } from 'react';
import { instructorAPI } from '@/lib/api';
import { toast } from 'sonner';

export interface Student {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  enrollmentId: string;
}

export function useStudentManagement(courseId: string | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch enrolled students
  const fetchStudents = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await instructorAPI.getEnrolledStudents(courseId);
      setStudents(response);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students');
      toast.error('Failed to load enrolled students');
    } finally {
      setLoading(false);
    }
  };

  // Remove student from course
  const removeStudent = async (enrollmentId: string): Promise<boolean> => {
    try {
      await instructorAPI.removeStudentFromCourse(enrollmentId);
      setStudents(prev => prev.filter(student => student.enrollmentId !== enrollmentId));
      toast.success('Student removed from course');
      return true;
    } catch (err) {
      console.error('Error removing student:', err);
      toast.error('Failed to remove student');
      return false;
    }
  };

  // Get student count
  const getStudentCount = () => students.length;

  // Search students
  const searchStudents = (query: string) => {
    if (!query.trim()) return students;
    
    const lowercaseQuery = query.toLowerCase();
    return students.filter(student =>
      student.name.toLowerCase().includes(lowercaseQuery) ||
      student.email.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Get student by ID
  const getStudentById = (studentId: string) => {
    return students.find(student => student.id === studentId);
  };

  // Load students when courseId changes
  useEffect(() => {
    if (courseId) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [courseId]);

  return {
    students,
    loading,
    error,
    removeStudent,
    getStudentCount,
    searchStudents,
    getStudentById,
    refetch: fetchStudents
  };
}