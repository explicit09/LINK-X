// Database Types for Direct Supabase Access
// Matches the Phase 1 database schema created in Supabase

export interface Course {
  id: string
  title: string
  description?: string
  code?: string
  term?: string
  published: boolean
  category?: string
  tags?: string[]
  instructor_id?: string
  creator_id?: string
  organization_id?: string
  settings?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description?: string
  ordering: number
  type?: 'content' | 'quiz' | 'assignment'
  settings?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface File {
  id: string
  module_id: string
  title: string
  filename: string
  file_type: string
  file_size: number
  storage_path: string
  storage_bucket?: string
  storage_metadata?: Record<string, any>
  processed?: boolean
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  transcription?: string
  view_count?: number
  created_at?: string
  updated_at?: string
}

export interface FileChunk {
  id: string
  file_id: string
  course_id: string
  content: string
  chunk_index: number
  chunk_type?: string
  metadata?: Record<string, any>
  embedding?: number[] // vector(1536)
  embedding_model?: string
  embedding_generated_at?: string
  created_at?: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  role?: 'student' | 'ta' | 'instructor'
  enrolled_at?: string
  completed_at?: string
  progress?: number
  settings?: Record<string, any>
}

export interface AccessCode {
  id: string
  course_id: string
  code: string
  expires_at?: string
  max_uses?: number
  current_uses?: number
  created_at?: string
}

export interface ProcessingJob {
  id: string
  job_type: string
  payload: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts?: number
  max_attempts?: number
  error_message?: string
  created_at?: string
  processed_at?: string
}

// Extended types with relationships
export interface CourseWithDetails extends Course {
  modules?: ModuleWithFiles[]
  enrollments?: Enrollment[]
  access_codes?: AccessCode[]
  enrollment_count?: number
  user_enrollment?: Enrollment
}

export interface ModuleWithFiles extends Module {
  files?: File[]
  file_count?: number
}

export interface FileWithChunks extends File {
  file_chunks?: FileChunk[]
  chunk_count?: number
}

// Search result types
export interface SearchResult {
  chunk_id: string
  content: string
  metadata: Record<string, any>
  file_id: string
  file_title: string
  module_title: string
  similarity: number
  rank: number
}

// API operation types
export interface CreateCourseData {
  title: string
  description?: string
  code?: string
  term?: string
  category?: string
  tags?: string[]
  published?: boolean
  settings?: Record<string, any>
}

export interface UpdateCourseData {
  title?: string
  description?: string
  code?: string
  term?: string
  category?: string
  tags?: string[]
  published?: boolean
  settings?: Record<string, any>
}

export interface CreateModuleData {
  title: string
  description?: string
  ordering?: number
  type?: 'content' | 'quiz' | 'assignment'
  settings?: Record<string, any>
}

export interface UpdateModuleData {
  title?: string
  description?: string
  ordering?: number
  type?: 'content' | 'quiz' | 'assignment'
  settings?: Record<string, any>
}

export interface UploadFileData {
  title: string
  filename: string
  file_type: string
  file_size: number
  storage_path: string
  storage_metadata?: Record<string, any>
}

// Utility types
export type DatabaseTable = 'courses' | 'modules' | 'files' | 'file_chunks' | 'enrollments' | 'access_codes' | 'processing_queue'

export type CourseRole = 'student' | 'ta' | 'instructor' | 'creator'

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SearchParams {
  query?: string
  category?: string
  tags?: string[]
  published?: boolean
} 