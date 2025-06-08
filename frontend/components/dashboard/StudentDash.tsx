"use client";

import ModernDashboard from "./ModernDashboard";
import { StudentDashProps } from "./student/types";
import { useStudentData } from "./student/hooks";
import { LoadingState, OnboardingPrompt } from "./student/components";
import { toComponentUser } from "@/types/auth";

export default function StudentDash({ currentUser }: StudentDashProps) {
  const {
    courses,
    loading,
    userProfile,
    showOnboardingPrompt,
    handleOnboardingComplete,
    dismissOnboardingPrompt
  } = useStudentData();

  if (loading) {
    return <LoadingState />;
  }

  if (showOnboardingPrompt) {
    return (
      <OnboardingPrompt
        onComplete={handleOnboardingComplete}
        onDismiss={dismissOnboardingPrompt}
      />
    );
  }

  // Convert userProfile to our unified format or use passed currentUser
  const componentUser = userProfile ? toComponentUser(
    {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.profile?.name,
      role: userProfile.role as 'student' | 'instructor' | 'admin'
    },
    null
  ) : currentUser;

  return (
    <ModernDashboard
      userRole="student"
      currentUser={componentUser}
    />
  );
}