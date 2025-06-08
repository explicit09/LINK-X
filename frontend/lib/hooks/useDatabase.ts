'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  courseOperations,
  moduleOperations,
  fileOperations,
  enrollmentOperations,
  accessCodeOperations,
  searchOperations,
} from '@/lib/db/operations'
import type {
  Course,
  CourseWithDetails,
  Module,
  ModuleWithFiles,
  File,
  Enrollment,
  AccessCode,
  CreateCourseData,
  CreateModuleData,
  PaginationParams,
  SearchParams,
} from '@/lib/db/types'

// Course Hooks
export function useCourses(params: SearchParams & PaginationParams = {}) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  })

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await courseOperations.getUserCourses(params)
      setCourses(result.courses)
      setPagination({
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('courses')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'courses' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCourses(prev => [payload.new as Course, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setCourses(prev => prev.map(c => 
              c.id === payload.new.id ? payload.new as Course : c
            ))
          } else if (payload.eventType === 'DELETE') {
            setCourses(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const createCourse = useCallback(async (courseData: CreateCourseData) => {
    try {
      const newCourse = await courseOperations.createCourse(courseData)
      setCourses(prev => [newCourse, ...prev])
      return newCourse
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create course')
    }
  }, [])

  const updateCourse = useCallback(async (courseId: string, updates: Partial<CreateCourseData>) => {
    try {
      const updatedCourse = await courseOperations.updateCourse(courseId, updates)
      setCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c))
      return updatedCourse
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update course')
    }
  }, [])

  const deleteCourse = useCallback(async (courseId: string) => {
    try {
      await courseOperations.deleteCourse(courseId)
      setCourses(prev => prev.filter(c => c.id !== courseId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete course')
    }
  }, [])

  return {
    courses,
    loading,
    error,
    pagination,
    refetch: loadCourses,
    createCourse,
    updateCourse,
    deleteCourse,
  }
}

export function useCourse(courseId: string) {
  const [course, setCourse] = useState<CourseWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCourse = useCallback(async () => {
    if (!courseId) return
    
    try {
      setLoading(true)
      setError(null)
      const courseData = await courseOperations.getCourseDetails(courseId)
      setCourse(courseData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadCourse()
  }, [loadCourse])

  // Real-time subscription for course updates
  useEffect(() => {
    if (!courseId) return

    const subscription = supabase
      .channel(`course:${courseId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'courses', filter: `id=eq.${courseId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCourse(prev => prev ? { ...prev, ...payload.new } : null)
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'modules', filter: `course_id=eq.${courseId}` },
        () => {
          // Refetch course when modules change
          loadCourse()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [courseId, loadCourse])

  return {
    course,
    loading,
    error,
    refetch: loadCourse,
  }
}

// Module Hooks
export function useModules(courseId: string) {
  const [modules, setModules] = useState<ModuleWithFiles[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadModules = useCallback(async () => {
    if (!courseId) return

    try {
      setLoading(true)
      setError(null)
      const moduleData = await moduleOperations.getCourseModules(courseId)
      setModules(moduleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modules')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadModules()
  }, [loadModules])

  // Real-time subscription
  useEffect(() => {
    if (!courseId) return

    const subscription = supabase
      .channel(`modules:${courseId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'modules', filter: `course_id=eq.${courseId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadModules() // Reload to get files data
          } else if (payload.eventType === 'UPDATE') {
            setModules(prev => prev.map(m => 
              m.id === payload.new.id ? { ...m, ...payload.new } : m
            ))
          } else if (payload.eventType === 'DELETE') {
            setModules(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [courseId, loadModules])

  const createModule = useCallback(async (moduleData: CreateModuleData) => {
    try {
      const newModule = await moduleOperations.createModule(courseId, moduleData)
      await loadModules() // Reload to get updated ordering
      return newModule
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create module')
    }
  }, [courseId, loadModules])

  const updateModule = useCallback(async (moduleId: string, updates: Partial<CreateModuleData>) => {
    try {
      const updatedModule = await moduleOperations.updateModule(moduleId, updates)
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, ...updatedModule } : m))
      return updatedModule
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update module')
    }
  }, [])

  const deleteModule = useCallback(async (moduleId: string) => {
    try {
      await moduleOperations.deleteModule(moduleId)
      setModules(prev => prev.filter(m => m.id !== moduleId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete module')
    }
  }, [])

  const reorderModules = useCallback(async (moduleOrders: { id: string; ordering: number }[]) => {
    try {
      await moduleOperations.reorderModules(courseId, moduleOrders)
      await loadModules() // Reload with new ordering
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to reorder modules')
    }
  }, [courseId, loadModules])

  return {
    modules,
    loading,
    error,
    refetch: loadModules,
    createModule,
    updateModule,
    deleteModule,
    reorderModules,
  }
}

// File Hooks
export function useFiles(moduleId: string) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadFiles = useCallback(async () => {
    if (!moduleId) return

    try {
      setLoading(true)
      setError(null)
      const fileData = await fileOperations.getModuleFiles(moduleId)
      setFiles(fileData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Real-time subscription
  useEffect(() => {
    if (!moduleId) return

    const subscription = supabase
      .channel(`files:${moduleId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'files', filter: `module_id=eq.${moduleId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFiles(prev => [payload.new as File, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setFiles(prev => prev.map(f => 
              f.id === payload.new.id ? payload.new as File : f
            ))
          } else if (payload.eventType === 'DELETE') {
            setFiles(prev => prev.filter(f => f.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [moduleId])

  const uploadFile = useCallback(async (file: globalThis.File, title?: string) => {
    try {
      setUploading(true)
      setError(null)
      const newFile = await fileOperations.uploadFile(file, moduleId, title)
      setFiles(prev => [newFile, ...prev])
      return newFile
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      throw err
    } finally {
      setUploading(false)
    }
  }, [moduleId])

  const updateFile = useCallback(async (fileId: string, updates: Partial<File>) => {
    try {
      const updatedFile = await fileOperations.updateFile(fileId, updates)
      setFiles(prev => prev.map(f => f.id === fileId ? updatedFile : f))
      return updatedFile
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update file')
    }
  }, [])

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      await fileOperations.deleteFile(fileId)
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete file')
    }
  }, [])

  const getFileUrl = useCallback(async (storagePath: string) => {
    try {
      return await fileOperations.getFileUrl(storagePath)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get file URL')
    }
  }, [])

  return {
    files,
    loading,
    error,
    uploading,
    refetch: loadFiles,
    uploadFile,
    updateFile,
    deleteFile,
    getFileUrl,
  }
}

// Enrollment Hooks
export function useEnrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEnrollments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const enrollmentData = await enrollmentOperations.getUserEnrollments()
      setEnrollments(enrollmentData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enrollments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEnrollments()
  }, [loadEnrollments])

  const enrollWithCode = useCallback(async (accessCode: string) => {
    try {
      const enrollment = await enrollmentOperations.enrollWithAccessCode(accessCode)
      setEnrollments(prev => [enrollment, ...prev])
      return enrollment
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to enroll in course')
    }
  }, [])

  const updateProgress = useCallback(async (courseId: string, progress: number) => {
    try {
      await enrollmentOperations.updateProgress(courseId, progress)
      setEnrollments(prev => prev.map(e => 
        e.course_id === courseId ? { ...e, progress } : e
      ))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update progress')
    }
  }, [])

  const leaveCourse = useCallback(async (courseId: string) => {
    try {
      await enrollmentOperations.leaveCourse(courseId)
      setEnrollments(prev => prev.filter(e => e.course_id !== courseId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to leave course')
    }
  }, [])

  return {
    enrollments,
    loading,
    error,
    refetch: loadEnrollments,
    enrollWithCode,
    updateProgress,
    leaveCourse,
  }
}

// Access Code Hooks
export function useAccessCodes(courseId: string) {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAccessCodes = useCallback(async () => {
    if (!courseId) return

    try {
      setLoading(true)
      setError(null)
      const codeData = await accessCodeOperations.getCourseAccessCodes(courseId)
      setAccessCodes(codeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load access codes')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadAccessCodes()
  }, [loadAccessCodes])

  const generateCode = useCallback(async (options: {
    expiresAt?: string
    maxUses?: number
  } = {}) => {
    try {
      const newCode = await accessCodeOperations.generateAccessCode(courseId, options)
      setAccessCodes(prev => [newCode, ...prev])
      return newCode
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to generate access code')
    }
  }, [courseId])

  const deleteCode = useCallback(async (codeId: string) => {
    try {
      await accessCodeOperations.deleteAccessCode(codeId)
      setAccessCodes(prev => prev.filter(c => c.id !== codeId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete access code')
    }
  }, [])

  return {
    accessCodes,
    loading,
    error,
    refetch: loadAccessCodes,
    generateCode,
    deleteCode,
  }
}

// ✅ NEW: AI Search Hook
export function useSearch() {
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const searchCourseContent = useCallback(async (
    query: string, 
    courseIds: string[], 
    options: { limit?: number; threshold?: number; useVector?: boolean } = {}
  ) => {
    try {
      setSearching(true)
      setSearchError(null)
      const results = await searchOperations.searchCourseContent(query, courseIds, options)
      setSearchResults(results)
      return results
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Search failed'
      setSearchError(error)
      throw err
    } finally {
      setSearching(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setSearchResults([])
    setSearchError(null)
  }, [])

  return {
    searchResults,
    searching,
    searchError,
    searchCourseContent,
    clearResults,
  }
}

// ✅ NEW: AI Content Generation Hook
export function useAIContentGeneration() {
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<any>(null)

  const generateContent = useCallback(async (
    courseId: string,
    persona: string,
    options: {
      contentType?: 'study_guide' | 'summary' | 'quiz'
      streamCallback?: (chunk: string) => void
    } = {}
  ) => {
    try {
      setGenerating(true)
      setGenerationError(null)
      const content = await searchOperations.generateCourseContent(courseId, persona, options)
      setGeneratedContent(content)
      return content
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Content generation failed'
      setGenerationError(error)
      throw err
    } finally {
      setGenerating(false)
    }
  }, [])

  const clearContent = useCallback(() => {
    setGeneratedContent(null)
    setGenerationError(null)
  }, [])

  return {
    generating,
    generationError,
    generatedContent,
    generateContent,
    clearContent,
  }
}

// ✅ NEW: Processing Status Hook
export function useProcessingStatus(resourceId: string, resourceType: 'file' | 'course' | 'job') {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    if (!resourceId) return

    try {
      setLoading(true)
      setError(null)
      const statusData = await searchOperations.getProcessingStatus(resourceId, resourceType)
      setStatus(statusData)
      return statusData
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get status'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [resourceId, resourceType])

  // Auto-refresh for active processing
  useEffect(() => {
    if (!resourceId) return

    checkStatus()

    // Set up polling for active processing
    const interval = setInterval(() => {
      if (status?.status === 'processing' || status?.status === 'pending') {
        checkStatus()
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [resourceId, status?.status, checkStatus])

  return {
    status,
    loading,
    error,
    checkStatus,
    isProcessing: status?.status === 'processing' || status?.status === 'pending',
    isComplete: status?.status === 'completed',
    hasError: status?.status === 'error',
    progress: status?.progress || 0,
  }
} 
 