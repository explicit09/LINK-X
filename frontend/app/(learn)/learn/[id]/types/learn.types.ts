// Extend existing streaming types for learn page
export interface Subsection {
  title: string;
  fullText: string;
  type: 'text' | 'video' | 'quiz';
  completed: boolean;
  timeToComplete: number;
  lastVisited?: string;
  score?: number;
}

export interface Chapter {
  chapterTitle: string;
  subsections: Subsection[];
  progress: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface CourseData {
  courseName: string;
  chapters: Chapter[];
}
