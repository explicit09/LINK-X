export interface Subsection {
  id: string;
  title: string;
  content?: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  type?: 'text' | 'video' | 'quiz';
  completed?: boolean;
  timeToComplete?: number;
  lastVisited?: string;
  score?: number;
  estimatedTokens?: number;
}

export interface Chapter {
  id: string;
  title: string;
  subsections: Subsection[];
  progress?: number;
  estimatedTokens?: number;
}

export interface StreamToken {
  type: 'start' | 'token' | 'complete' | 'error';
  content?: string;
  message?: string;
  chapterId?: string;
  subsectionId?: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}