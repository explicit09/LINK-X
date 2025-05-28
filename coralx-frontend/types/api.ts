// API Response Types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// User Types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  firebase_uid?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  suspended?: boolean;
  profile?: UserProfile;
}

export type UserRole = 'student' | 'instructor' | 'admin';

export interface UserProfile {
  user_id: string;
  name: string;
}

export interface StudentProfile extends UserProfile {
  grade_level?: string;
  learning_style?: string;
  onboard_answers?: Record<string, any>;
  want_quizzes?: boolean;
  model_preference?: string;
}

export interface InstructorProfile extends UserProfile {
  university?: string;
  department?: string;
  bio?: string;
}

export interface AdminProfile extends UserProfile {
  permissions?: string[];
}

// Course Types
export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  category?: string;
  tags?: string[];
  published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  instructor?: InstructorProfile;
  modules?: Module[];
  enrollments?: Enrollment[];
  stats?: CourseStatistics;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  ordering: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  files?: FileInfo[];
}

export interface FileInfo {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  filename: string;
  file_type: string;
  file_size: number;
  s3_key?: string;
  s3_bucket?: string;
  processed: boolean;
  processed_at?: string;
  processing_error?: string;
  extracted_text?: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalizedFile {
  id: string;
  user_id: string;
  original_file_id: string;
  personalized_content?: string;
  processed: boolean;
  processed_at?: string;
  created_at: string;
}

// Enrollment Types
export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at?: string;
  progress?: number;
  
  // Relations
  user?: User;
  course?: Course;
}

export interface AccessCode {
  id: string;
  course_id: string;
  code: string;
  created_at: string;
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
}

// Learning Types
export interface LearningProgress {
  user_id: string;
  file_id: string;
  section_id: string;
  progress: number;
  started_at: string;
  completed_at?: string;
  time_spent: number;
}

export interface Quiz {
  id: string;
  course_id: string;
  module_id?: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  time_limit?: number;
  attempts_allowed?: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  points?: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  score?: number;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  question_id: string;
  answer: string;
  is_correct: boolean;
  time_taken: number;
}

// Chat Types
export interface ChatMessage {
  id: string;
  user_id: string;
  course_id?: string;
  file_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  context?: Record<string, any>;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

// Statistics Types
export interface CourseStatistics {
  total_students: number;
  total_modules: number;
  total_files: number;
  completion_rate: number;
  average_progress: number;
  last_activity?: string;
}

export interface UserStatistics {
  courses_enrolled?: number;
  courses_completed?: number;
  total_study_time?: number;
  average_quiz_score?: number;
  streak_days?: number;
  last_active?: string;
}

export interface PlatformStatistics {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  active_users_30d: number;
  new_users_7d: number;
  popular_courses: Course[];
}

// Activity Types
export interface Activity {
  id: string;
  user_id: string;
  type: ActivityType;
  entity_type: 'course' | 'module' | 'file' | 'quiz';
  entity_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type ActivityType = 
  | 'course_enrolled'
  | 'course_completed'
  | 'module_started'
  | 'module_completed'
  | 'file_viewed'
  | 'file_downloaded'
  | 'quiz_started'
  | 'quiz_completed'
  | 'achievement_earned';

// Todo Types
export interface TodoItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  course_id?: string;
  module_id?: string;
  created_at: string;
  updated_at: string;
}

// News/Market Types
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  author_id: string;
  published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  updated_at: string;
}