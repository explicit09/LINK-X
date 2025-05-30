export interface Subsection {
  title: string;
  fullText: string;
}

export interface Chapter {
  chapterTitle: string;
  subsections: Subsection[];
}

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

export interface OnboardingResponse {
  name: string;
  answers: string[];
  quizzes: boolean;
}

export interface SidebarProps {
  className?: string;
  onLessonSelect?: (title: string, response: string) => void;
  onLoadingStart?: () => void;
  onCollapseChange?: (value: boolean) => void;
  courseId?: string;
  pfId?: string;
}