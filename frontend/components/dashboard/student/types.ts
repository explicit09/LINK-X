export interface Student {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  enrollmentId: string;
}

export type FileSummary = {
  id: string;
  title: string;
  filename: string;
};

export interface OnboardingData {
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

export interface Course {
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

export interface StudentDashProps {
  currentUser?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
}
