import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type UserRole = 'instructor' | 'student' | null;

export function useUserRole() {
  const { user, profile, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const getUserRole = async () => {
      try {
        setLoading(true);
        setError(null);

        // Wait for auth to load
        if (authLoading) {
          return;
        }

        // If no user, set role to null
        if (!user || !profile) {
          setRole(null);
          return;
        }

        // Get role from profile
        const userRole = profile.role || 'student';
        setRole(userRole as UserRole);
      } catch (err: any) {
        console.error('Error getting user role:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    getUserRole();
  }, [user, profile, authLoading]);

  return {
    role,
    loading,
    error,
    isInstructor: role === 'instructor',
    isStudent: role === 'student',
  };
}
