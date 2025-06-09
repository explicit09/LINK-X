// Direct Supabase Database Operations
// Replaces localhost:8000 API calls with direct database access

import { supabase } from '@/lib/supabase'
import type {
  Course,
  CourseWithDetails,
  Module,
  ModuleWithFiles,
  File,
  FileWithChunks,
  Enrollment,
  AccessCode,
  SearchResult,
  CreateCourseData,
  UpdateCourseData,
  CreateModuleData,
  UpdateModuleData,
  UploadFileData,
  PaginationParams,
  SearchParams,
} from './types'

// Course Operations
export const courseOperations = {
  // Get all courses user has access to
  async getUserCourses(params: SearchParams & PaginationParams = {}) {
    const { query, category, tags, published, page = 1, limit = 20 } = params
    const offset = (page - 1) * limit

    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Query courses directly - RLS policies will handle access control
    let queryBuilder = supabase
      .from('courses')
      .select(`
        *
      `)

    // Apply filters
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    }
    if (category) {
      queryBuilder = queryBuilder.eq('category', category)
    }
    if (tags && tags.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', tags)
    }
    if (published !== undefined) {
      queryBuilder = queryBuilder.eq('published', published)
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      courses: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  },

  // Get single course with full details
  async getCourseDetails(courseId: string): Promise<CourseWithDetails | null> {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules(
          *,
          files(*)
        ),
        enrollments(
          user_id,
          role,
          enrolled_at,
          progress
        ),
        access_codes(
          code,
          expires_at,
          max_uses,
          current_uses
        )
      `)
      .eq('id', courseId)
      .single()

    if (error) throw error
    return data
  },

  // Create new course
  async createCourse(courseData: CreateCourseData): Promise<Course> {
    const userResponse = await supabase.auth.getUser()
    
    if (!userResponse.data.user) {
      throw new Error('User not authenticated')
    }
    
    const userId = userResponse.data.user.id;

    // Start with basic course data
    const insertData: any = {
      title: courseData.title,
      description: courseData.description,
      code: courseData.code,
      term: courseData.term,
      published: courseData.published || false,
      creator_id: userId,
      // Set instructor_id to null initially - can be updated later if user has instructor profile
      instructor_id: null
    };
    
    const { data, error } = await supabase
      .from('courses')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      
      // Check for RLS infinite recursion error
      if (error.message?.includes('infinite recursion')) {
        throw new Error('There is a database configuration issue. Please run the SQL fix provided in fix-course-rls-immediate.sql in your Supabase dashboard.');
      }
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' && error.message.includes('instructor_id')) {
        throw new Error('You need an instructor profile to create courses. Please contact support.');
      }
      
      throw error
    }
    
    // Award XP for creating a course (this will trigger all metric updates)
    try {
      await supabase.from('user_activities').insert({
        user_id: userId,
        activity_type: 'course_create',
        xp_earned: 100, // 100 XP for creating a course
        metadata: {
          course_id: data.id,
          course_title: data.title
        }
      });
    } catch (xpError) {
      // Don't fail the course creation if XP awarding fails
    }
    
    return data
  },

  // Update course
  async updateCourse(courseId: string, updates: UpdateCourseData): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete course
  async deleteCourse(courseId: string): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (error) throw error
  },

  // Search all published courses
  async searchPublicCourses(params: SearchParams & PaginationParams = {}) {
    const { query, category, tags, page = 1, limit = 20 } = params
    const offset = (page - 1) * limit

    let queryBuilder = supabase
      .from('courses')
      .select(`
        *,
        modules(count),
        enrollments(count)
      `)
      .eq('published', true)

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    }
    if (category) {
      queryBuilder = queryBuilder.eq('category', category)
    }
    if (tags && tags.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', tags)
    }

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      courses: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  },
}

// Module Operations
export const moduleOperations = {
  // Get modules for a course
  async getCourseModules(courseId: string): Promise<ModuleWithFiles[]> {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        *,
        files(*)
      `)
      .eq('course_id', courseId)
      .order('ordering')

    if (error) throw error
    return data || []
  },

  // Create new module
  async createModule(courseId: string, moduleData: CreateModuleData): Promise<Module> {
    // Get next ordering number
    const { data: lastModule } = await supabase
      .from('modules')
      .select('ordering')
      .eq('course_id', courseId)
      .order('ordering', { ascending: false })
      .limit(1)
      .single()

    const nextOrdering = (lastModule?.ordering || 0) + 1

    const { data, error } = await supabase
      .from('modules')
      .insert({
        ...moduleData,
        course_id: courseId,
        ordering: moduleData.ordering ?? nextOrdering,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update module
  async updateModule(moduleId: string, updates: UpdateModuleData): Promise<Module> {
    const { data, error } = await supabase
      .from('modules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', moduleId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete module
  async deleteModule(moduleId: string): Promise<void> {
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId)

    if (error) throw error
  },

  // Reorder modules
  async reorderModules(courseId: string, moduleOrders: { id: string; ordering: number }[]): Promise<void> {
    const updates = moduleOrders.map(({ id, ordering }) =>
      supabase
        .from('modules')
        .update({ ordering })
        .eq('id', id)
    )

    await Promise.all(updates)
  },
}

// File Operations
export const fileOperations = {
  // Get files for a module
  async getModuleFiles(moduleId: string): Promise<File[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Upload file to Supabase Storage and create database record with AI processing
  async uploadFile(file: globalThis.File, moduleId: string, title?: string): Promise<File> {
    // Generate unique storage path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${file.name}`
    
    // Get module to find course_id
    const { data: module } = await supabase
      .from('modules')
      .select('course_id')
      .eq('id', moduleId)
      .single()

    if (!module) throw new Error('Module not found')

    const storagePath = `courses/${module.course_id}/modules/${moduleId}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(storagePath, file)

    if (uploadError) throw uploadError

    // Get current user for ownership tracking
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Create file record in database with AI processing trigger
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        module_id: moduleId,
        title: title || file.name,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        storage_bucket: 'course-files',
        processing_status: 'pending', // Mark for AI processing
        uploaded_by: user.id, // ✅ ADD: Track who uploaded the file
        created_by: user.id,  // ✅ ADD: Track file creator
      })
      .select()
      .single()

    if (dbError) throw dbError

    // ✅ NEW: Trigger AI processing via processing queue
    await this.triggerFileProcessing(fileRecord.id, module.course_id)

    return fileRecord
  },

  // ✅ NEW: Trigger AI processing for uploaded files
  async triggerFileProcessing(fileId: string, courseId: string): Promise<void> {
    try {
      // Insert processing job into queue
      const { error } = await supabase
        .from('processing_queue')
        .insert({
          job_type: 'file_processing',
          payload: {
            file_id: fileId,
            course_id: courseId,
            processing_steps: ['content_extraction', 'semantic_chunking', 'embedding_generation'],
            priority: 5
          },
          status: 'pending'
        })

      if (error) throw error
    } catch (err) {
      // Don't throw - file upload succeeded, processing can be retried later
    }
  },

  // Get file download URL
  async getFileUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('course-files')
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    if (error) throw error
    return data.signedUrl
  },

  // Update file metadata
  async updateFile(fileId: string, updates: Partial<File>): Promise<File> {
    const { data, error } = await supabase
      .from('files')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete file
  async deleteFile(fileId: string): Promise<void> {
    // Get file info first
    const { data: file } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', fileId)
      .single()

    if (file) {
      // Delete from storage
      await supabase.storage
        .from('course-files')
        .remove([file.storage_path])
    }

    // Delete from database
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (error) throw error
  },
}

// Enrollment Operations
export const enrollmentOperations = {
  // Enroll user in course via access code
  async enrollWithAccessCode(accessCode: string): Promise<Enrollment> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Get course by access code
    const { data: accessCodeData, error: codeError } = await supabase
      .from('access_codes')
      .select('course_id, max_uses, current_uses, expires_at')
      .eq('code', accessCode)
      .single()

    if (codeError) throw new Error('Invalid access code')

    // Check if code is still valid
    if (accessCodeData.expires_at && new Date(accessCodeData.expires_at) < new Date()) {
      throw new Error('Access code has expired')
    }

    if (accessCodeData.max_uses && accessCodeData.current_uses >= accessCodeData.max_uses) {
      throw new Error('Access code has reached maximum uses')
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .insert({
        course_id: accessCodeData.course_id,
        user_id: user.data.user.id,
        role: 'student',
      })
      .select()
      .single()

    if (enrollError) {
      if (enrollError.code === '23505') { // Unique constraint violation
        throw new Error('Already enrolled in this course')
      }
      throw enrollError
    }

    // Update access code usage
    await supabase
      .from('access_codes')
      .update({ current_uses: (accessCodeData.current_uses || 0) + 1 })
      .eq('code', accessCode)

    return enrollment
  },

  // Get user's enrollments
  async getUserEnrollments(): Promise<Enrollment[]> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses(*)
      `)
      .eq('user_id', user.data.user.id)
      .order('enrolled_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Update enrollment progress
  async updateProgress(courseId: string, progress: number): Promise<void> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('enrollments')
      .update({ progress })
      .eq('course_id', courseId)
      .eq('user_id', user.data.user.id)

    if (error) throw error
  },

  // Leave course
  async leaveCourse(courseId: string): Promise<void> {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', user.data.user.id)

    if (error) throw error
  },
}

// Search Operations
export const searchOperations = {
  // ✅ ENHANCED: Hybrid vector + text search using Phase 1 function
  async searchCourseContent(
    query: string,
    courseIds: string[],
    options: { limit?: number; threshold?: number; useVector?: boolean } = {}
  ): Promise<SearchResult[]> {
    const { limit = 10, threshold = 0.7, useVector = true } = options

    try {
      if (useVector) {
        // Use the advanced hybrid search function from Phase 1
        const { data, error } = await supabase.rpc('search_file_chunks', {
          query_text: query,
          course_ids: courseIds,
          limit_count: limit,
          similarity_threshold: threshold,
          // query_embedding will be generated by the function
        })

        if (error) {
          console.warn('Vector search failed, falling back to text search:', error)
          return this.searchCourseContent(query, courseIds, { ...options, useVector: false })
        }

        return (data || []).map((result: any) => ({
          chunk_id: result.chunk_id,
          content: result.content,
          metadata: result.metadata || {},
          file_id: result.file_id,
          file_title: result.file_title,
          module_title: result.module_title,
          similarity: result.similarity,
          rank: result.rank,
        }))
      } else {
        // Fallback to simple text search
        const { data, error } = await supabase
          .from('file_chunks')
          .select(`
            id,
            content,
            metadata,
            file_id,
            files!inner(
              title,
              modules!inner(title)
            )
          `)
          .in('course_id', courseIds)
          .textSearch('content', query)
          .limit(limit)

        if (error) throw error

        return (data || []).map(chunk => ({
          chunk_id: chunk.id,
          content: chunk.content,
          metadata: chunk.metadata || {},
          file_id: chunk.file_id,
          file_title: (chunk.files as any)?.title || '',
          module_title: (chunk.files as any)?.modules?.title || '',
          similarity: 0.8, // Text search placeholder
          rank: 0.8,
        }))
      }
    } catch (err) {
      console.error('Search error:', err)
      throw err
    }
  },

  // ✅ NEW: Generate AI-powered course content
  async generateCourseContent(
    courseId: string,
    persona: string,
    options: {
      contentType?: 'study_guide' | 'summary' | 'quiz'
      streamCallback?: (chunk: string) => void
    } = {}
  ): Promise<{ content: string; title: string; metadata: any }> {
    try {
      // Get course materials for context
      const { data: modules } = await supabase
        .from('modules')
        .select(`
          *,
          files(
            *,
            file_chunks(content, metadata)
          )
        `)
        .eq('course_id', courseId)

      if (!modules || modules.length === 0) {
        throw new Error('No course content available for AI generation')
      }

      // Prepare content context
      const courseContent = modules
        .flatMap(module => module.files)
        .flatMap(file => file.file_chunks)
        .map(chunk => chunk.content)
        .join('\n\n')

      // Queue AI content generation job
      const { data: job, error } = await supabase
        .from('processing_queue')
        .insert({
          job_type: 'content_generation',
          payload: {
            course_id: courseId,
            persona,
            content_type: options.contentType || 'study_guide',
            course_content: courseContent.substring(0, 10000), // Limit context size
            streaming: !!options.streamCallback
          },
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      // For now, return a placeholder - in production this would poll for results
      return {
        content: `AI content generation queued for course ${courseId}. Job ID: ${job.id}`,
        title: `Generated ${options.contentType || 'study_guide'} for ${persona}`,
        metadata: {
          job_id: job.id,
          status: 'processing',
          course_id: courseId,
          persona
        }
      }
    } catch (err) {
      console.error('AI content generation error:', err)
      throw err
    }
  },

  // ✅ NEW: Get processing status for files and AI jobs
  async getProcessingStatus(
    resourceId: string,
    resourceType: 'file' | 'course' | 'job'
  ): Promise<{
    status: string
    progress?: number
    steps_completed?: string[]
    error_message?: string
    estimated_completion?: string
  }> {
    try {
      if (resourceType === 'file') {
        // Get file processing status
        const { data: file } = await supabase
          .from('files')
          .select('processing_status, id')
          .eq('id', resourceId)
          .single()

        if (!file) throw new Error('File not found')

        // Get associated processing jobs
        const { data: jobs } = await supabase
          .from('processing_queue')
          .select('*')
          .eq('payload->file_id', file.id)
          .order('created_at', { ascending: false })
          .limit(5)

        const latestJob = jobs?.[0]
        
        return {
          status: file.processing_status || 'unknown',
          progress: this._calculateProgress(jobs || []),
          steps_completed: this._getCompletedSteps(jobs || []),
          error_message: latestJob?.error_message,
          estimated_completion: this._estimateCompletion(jobs || [])
        }
      } else if (resourceType === 'job') {
        // Get specific job status
        const { data: job } = await supabase
          .from('processing_queue')
          .select('*')
          .eq('id', resourceId)
          .single()

        if (!job) throw new Error('Job not found')

        return {
          status: job.status,
          error_message: job.error_message,
          progress: job.status === 'completed' ? 100 : job.status === 'processing' ? 50 : 0
        }
      } else {
        // Get course-wide processing status
        const { data: jobs } = await supabase
          .from('processing_queue')
          .select('*')
          .eq('payload->course_id', resourceId)
          .order('created_at', { ascending: false })

        return {
          status: this._aggregateStatus(jobs || []),
          progress: this._calculateProgress(jobs || []),
          steps_completed: this._getCompletedSteps(jobs || [])
        }
      }
    } catch (err) {
      console.error('Error getting processing status:', err)
      throw err
    }
  },

  // Helper methods for processing status
  _calculateProgress(jobs: any[]): number {
    if (!jobs.length) return 0
    const completed = jobs.filter(j => j.status === 'completed').length
    return Math.round((completed / jobs.length) * 100)
  },

  _getCompletedSteps(jobs: any[]): string[] {
    return jobs
      .filter(j => j.status === 'completed')
      .map(j => j.job_type)
  },

  _aggregateStatus(jobs: any[]): string {
    if (!jobs.length) return 'none'
    if (jobs.some(j => j.status === 'error')) return 'error'
    if (jobs.some(j => j.status === 'processing')) return 'processing'
    if (jobs.every(j => j.status === 'completed')) return 'completed'
    return 'pending'
  },

  _estimateCompletion(jobs: any[]): string | undefined {
    const processingJobs = jobs.filter(j => j.status === 'processing')
    if (processingJobs.length === 0) return undefined
    
    // Simple estimation: 2 minutes per processing job
    const estimatedMinutes = processingJobs.length * 2
    const completionTime = new Date(Date.now() + estimatedMinutes * 60000)
    return completionTime.toISOString()
  }
}

// Access Code Operations
export const accessCodeOperations = {
  // Generate access code for course
  async generateAccessCode(courseId: string, options: {
    expiresAt?: string
    maxUses?: number
  } = {}): Promise<AccessCode> {
    // Generate random code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data, error } = await supabase
      .from('access_codes')
      .insert({
        course_id: courseId,
        code,
        expires_at: options.expiresAt,
        max_uses: options.maxUses,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get access codes for course
  async getCourseAccessCodes(courseId: string): Promise<AccessCode[]> {
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Delete access code
  async deleteAccessCode(codeId: string): Promise<void> {
    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', codeId)

    if (error) throw error
  },
} 