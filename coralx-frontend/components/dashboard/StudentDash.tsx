"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ModernDashboard from "./ModernDashboard";
import { studentAPI, userAPI } from "@/lib/api";
import { toast as sonnerToast } from 'sonner';

// Keep existing interfaces for backward compatibility
  interface Student {
    id: string;
    name: string;
    email: string;
    enrolledAt: string;
    enrollmentId: string;
  }

  type FileSummary = {
    id: string;
    title: string;
    filename: string;
  };

  interface OnboardingData {
    name: string;
    job: string;
    traits: string;
    learningStyle: string;
    depth: string;
    topics: string;
    interests: string;
    schedule: string;
    quizzes: boolean;
  }

interface Course {
    id: string;
    title: string;
    code: string;
    term?: string;
    description?: string;
  color?: string;
  lastActivity?: string;
  unreadCount?: number;
  materialsCount?: number;
  studentsCount?: number;
}

interface StudentDashProps {
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}

export default function StudentDash({ currentUser }: StudentDashProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setLoading(true);
        
        // Load user profile and courses
        const [user, coursesData] = await Promise.all([
          userAPI.getMe(),
          studentAPI.getCourses()
        ]);
        
        setUserProfile(user);

        // Check if student has completed onboarding by checking for student profile
        if (user.role === 'student') {
          try {
            const profileResponse = await fetch('http://localhost:8080/student/profile', {
              method: 'GET',
              credentials: 'include',
            });
            
            if (!profileResponse.ok) {
              // Student profile doesn't exist, redirect to onboarding
              console.log("No student profile found, redirecting to onboarding");
              router.push('/onboarding');
              return;
            }
          } catch (error) {
            // Error fetching profile, likely doesn't exist
            console.log("Error fetching student profile, redirecting to onboarding");
            router.push('/onboarding');
            return;
          }
        }
        
        // Transform API data to match our interface
        const transformedCourses = coursesData.map((course: any, index: number) => ({
          id: course.id,
          title: course.title,
          code: course.code || "N/A",
          term: course.term || "Current",
          description: course.description || "",
          color: `course-${["blue", "green", "purple", "orange", "red", "teal"][index % 6]}`,
          lastActivity: course.last_updated ? formatRelativeTime(course.last_updated) : "Recently",
          materialsCount: course.modules?.length || 0,
          studentsCount: course.students || 0,
          unreadCount: Math.floor(Math.random() * 3), // TODO: Implement real unread count
        }));
        
        setCourses(transformedCourses);
        
      } catch (error) {
        console.error("Failed to load student data:", error);
        sonnerToast.error("Failed to load courses. Please try again.");
        setCourses([]); // Fallback to empty state
    } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, []);

  // Helper function to format relative time
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

  if (loading) {
  return (
      <div className="flex justify-center items-center min-h-screen">
                                      <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your courses...</p>
        </div>
    </div>
  );
}

  return (
    <ModernDashboard
      userRole="student"
      currentUser={userProfile ? {
        name: userProfile.profile?.name || userProfile.email,
        email: userProfile.email,
        avatar: userProfile.profile?.avatar
      } : currentUser}
      courses={courses}
    />
  );
}