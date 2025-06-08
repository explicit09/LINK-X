import { useState, useEffect } from 'react';

export type UserRole = 'instructor' | 'student' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mock: Use default user in no-auth mode
        const response = { 
          data: { 
            role: 'student',
            email: 'user@example.com',
            name: 'Default User'
          } 
        };
        // The backend returns { success: true, data: {...}, message: "Success", timestamp: "..." }
        const userData = response.data;
        
        setRole(userData?.role as UserRole);
      } catch (err: any) {
        console.error('Error fetching user role:', err);
        // Don't log error for 404 as user might not be registered yet
        if (err?.status !== 404) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return {
    role,
    loading,
    error,
    isInstructor: role === 'instructor',
    isStudent: role === 'student',
  };
}
