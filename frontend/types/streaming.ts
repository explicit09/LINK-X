// Streaming Types

export interface StreamingState {
  isConnected: boolean;
  isStreaming: boolean;
  error?: string;
}

export interface StreamingMetrics {
  startTime: number;
  firstTokenTime?: number;
  completionTime?: number;
  tokensReceived: number;
  bytesReceived: number;
}

export interface StreamingOptions {
  style?: 'default' | 'visual' | 'auditory' | 'kinesthetic';
  difficulty?: 'easy' | 'medium' | 'hard';
  includeExamples?: boolean;
  includeQuizzes?: boolean;
  chunkSize?: number;
}

export interface DocumentOutline {
  fileId: string;
  fileName: string;
  title: string;
  sections: OutlineSection[];
  estimatedReadingTime?: number;
  totalTokens?: number;
}

export interface OutlineSection {
  id: string;
  title: string;
  level: number;
  estimatedTokens?: number;
  subsections?: OutlineSubsection[];
  content?: string;
  metadata?: SectionMetadata;
}

export interface OutlineSubsection {
  id: string;
  title: string;
  parentId: string;
  estimatedTokens?: number;
}

export interface SectionMetadata {
  difficulty?: 'easy' | 'medium' | 'hard';
  prerequisites?: string[];
  learningObjectives?: string[];
  keyConcepts?: string[];
  estimatedTime?: number;
}

export interface StreamingMessage {
  type: StreamingMessageType;
  data?: unknown;
  message?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export type StreamingMessageType =
  | 'connected'
  | 'disconnected'
  | 'content'
  | 'section'
  | 'example'
  | 'quiz'
  | 'summary'
  | 'progress'
  | 'status'
  | 'error'
  | 'complete';

export interface StreamingContent {
  sectionId: string;
  content: string;
  format: 'text' | 'markdown' | 'html';
  highlights?: string[];
  annotations?: ContentAnnotation[];
}

export interface ContentAnnotation {
  start: number;
  end: number;
  type: 'definition' | 'example' | 'important' | 'tip';
  content: string;
}

export interface StreamingExample {
  id: string;
  title: string;
  description: string;
  code?: string;
  language?: string;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface StreamingQuiz {
  id: string;
  sectionId: string;
  questions: StreamingQuizQuestion[];
  passingScore?: number;
}

export interface StreamingQuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface LearningProgress {
  fileId: string;
  userId: string;
  sections: SectionProgress[];
  overallProgress: number;
  startedAt: string;
  lastAccessedAt: string;
  completedAt?: string;
  totalTimeSpent: number;
}

export interface SectionProgress {
  sectionId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  timeSpent: number;
  quizScore?: number;
}

export interface StreamingSession {
  id: string;
  fileId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  sectionsViewed: string[];
  totalTokensStreamed: number;
  averageSpeed: number;
  metrics: StreamingMetrics;
}

export interface PersonalizationSettings {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  includeExamples: boolean;
  exampleComplexity: 'simple' | 'detailed' | 'comprehensive';
  summaryLength: 'brief' | 'standard' | 'detailed';
  quizFrequency: 'none' | 'section' | 'chapter' | 'frequent';
  streamingSpeed: 'slow' | 'normal' | 'fast';
}

export interface StreamingError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
  suggestedAction?: string;
}