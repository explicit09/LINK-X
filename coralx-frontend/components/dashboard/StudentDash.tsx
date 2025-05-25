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
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
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
            const profileResponse = await fetch('http://localhost:8081/student/profile', {
              method: 'GET',
              credentials: 'include',
            });
            
            if (!profileResponse.ok) {
              // Check if this is a 404 (profile doesn't exist) vs other errors
              if (profileResponse.status === 404) {
                // Profile truly doesn't exist - this is likely a new user
                // Check if user has previously completed onboarding (in case of data loss)
                const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`) === 'true';
                
                if (!hasCompletedOnboarding) {
                  console.log("No student profile found and no onboarding completion record, redirecting to onboarding");
                  router.push('/onboarding');
                  return;
                } else {
                  // User completed onboarding before but profile is missing - show a recreate prompt
                  console.log("Profile missing but user previously completed onboarding");
                  setShowOnboardingPrompt(true);
                }
              } else {
                // Server error (500, 503, etc.) - don't redirect, just log and continue
                console.error("Server error fetching student profile:", profileResponse.status);
                sonnerToast.error("Unable to load your profile. Some features may be limited.");
              }
            } else {
              // Profile exists - mark onboarding as completed in localStorage for future reference
              localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
            }
          } catch (error) {
            // Network error or other issues - don't redirect, just log and continue
            console.error("Network error fetching student profile:", error);
            sonnerToast.error("Connection issue loading your profile. Please check your internet connection.");
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
  }, [router]);

  // Function to handle onboarding completion
  const handleOnboardingComplete = () => {
    if (userProfile?.id) {
      localStorage.setItem(`onboarding_completed_${userProfile.id}`, 'true');
    }
    router.push('/onboarding');
  };

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

  // Show onboarding prompt if profile is missing but user previously completed onboarding
  if (showOnboardingPrompt) {
    return (
      <div className="flex justify-center items-center min-h-screen px-4">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Setup Needed</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find your learning profile. Would you like to set up your preferences to get personalized content?
          </p>
          <div className="space-y-3">
            <button
              onClick={handleOnboardingComplete}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Set Up Profile
            </button>
            <button
              onClick={() => setShowOnboardingPrompt(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Continue Without Profile
            </button>
          </div>
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