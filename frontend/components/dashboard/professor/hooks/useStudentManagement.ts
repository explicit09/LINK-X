import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();

  // Fetch enrolled students
  const fetchStudents = async () => {
    if (!courseId || !user) return;

    try {
      setLoading(true);
      setError(null);
      
      // ✅ NEW: Query enrollments and profiles separately from Supabase
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id, user_id, enrolled_at')
        .eq('course_id', courseId)
        .eq('role', 'student');

      if (enrollmentError) {
        throw enrollmentError;
      }

      if (!enrollments || enrollments.length === 0) {
        setStudents([]);
        return;
      }

      // Get user profiles for enrolled students
      const userIds = enrollments.map(e => e.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profileError) {
        console.warn('Failed to load profiles:', profileError);
      }

      // Transform to match interface
      const transformedStudents: Student[] = enrollments.map(enrollment => {
        const profile = profiles?.find(p => p.id === enrollment.user_id);
        return {
          id: enrollment.user_id,
          name: profile?.full_name || profile?.email?.split('@')[0] || 'Unknown Student',
          email: profile?.email || 'No email',
          enrolledAt: enrollment.enrolled_at,
          enrollmentId: enrollment.id,
        };
      });

      setStudents(transformedStudents);
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
    if (!user) return false;

    try {
      // ✅ NEW: Delete enrollment directly from Supabase
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) {
        throw error;
      }

      setStudents((prev) =>
        prev.filter((student) => student.enrollmentId !== enrollmentId),
      );
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
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(lowercaseQuery) ||
        student.email.toLowerCase().includes(lowercaseQuery),
    );
  };

  // Get student by ID
  const getStudentById = (studentId: string) => {
    return students.find((student) => student.id === studentId);
  };

  // Load students when courseId changes
  useEffect(() => {
    if (courseId && user) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [courseId, user]);

  return {
    students,
    loading,
    error,
    removeStudent,
    getStudentCount,
    searchStudents,
    getStudentById,
    refetch: fetchStudents,
  };
}
