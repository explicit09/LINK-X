"use client";

import ModernDashboard from "./ModernDashboard";
import { StudentDashProps } from "./student/types";
import { useStudentData } from "./student/hooks";
import { LoadingState, OnboardingPrompt } from "./student/components";

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