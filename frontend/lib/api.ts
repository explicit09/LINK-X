import { auth } from '../firebaseconfig';
import { authService } from './auth-service';
import type { 
  Course, 
  Module, 
  FileInfo, 
  TodoItem, 
  CreateCourseRequest, 
  UpdateCourseRequest,
  CreateModuleRequest,
  UpdateModuleRequest,
  UpdateFileRequest,
  CreateTodoRequest,
  UpdateTodoRequest,
  UserProfile,
  ChatRequest,
  CreateDiscussionRequest,
  CreateActivityRequest,
  GenerateQuizRequest,
  SubmitQuizAnswerRequest,
  UpdateUserRequest,
  CreateNewsRequest,
  UpdateNewsRequest,
  CreateMarketDataRequest,
  UpdateMarketDataRequest,
  GenerateTitleRequest
} from '../types/api';

// API configuration - use backend URL from environment
const API_URL = 'http://localhost:8080';

// Auth helpers
export async function getAuthToken() {
  return await authService.getValidToken();
}

// Session login - now handled by auth service
export async function sessionLogin(forceEstablish = false) {
  console.warn('sessionLogin is deprecated, use authService.login() instead');
  if (!auth.currentUser) {
    return false;
  }
  return await authService.login(auth.currentUser);
}

// Default timeout and retry settings
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 2;

export async function fetchWithAuth(
  endpoint: string, 
  options: RequestInit = {}, 
  retryWithSessionLogin = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = MAX_RETRIES
) {
  const token = await getAuthToken();
  // Don't include Content-Type for FormData requests
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Create an AbortController for request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // For retry handling
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      // Add a small delay between retries, increasing with each attempt
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
        mode: 'cors',
        signal: controller.signal
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      // If we get a 401, use auth service to handle it properly
      if (response.status === 401 && retryWithSessionLogin) {
        // Check if we should retry with refreshed tokens
        if (authService.isAuthenticated()) {
          const refreshed = await authService.refreshTokens();
          
          if (refreshed) {
            // Get new token and retry
            const newToken = await authService.getValidToken();
            if (newToken) {
              headers['Authorization'] = `Bearer ${newToken}`;
              
              const retryResponse = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
                credentials: 'include',
                mode: 'cors',
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              return retryResponse;
            }
          }
        }
        
        // If not authenticated or refresh failed, don't auto-redirect on public pages
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const publicPaths = ['/', '/login', '/register', '/forgot-password'];
        const isPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith(path));
        
        if (!isPublicPage && typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        }
      }

      // Check if the response indicates a server error (5xx) that might be retryable
      if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
        console.warn(`Server error ${response.status} for ${endpoint}, retrying...`);
        attempt++;
        continue;
      }

      if (!response.ok) {
        let errorMessage = '';
        try {
          // Try to parse as JSON first
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = JSON.stringify(errorData);
          } else {
            errorMessage = await response.text();
          }
        } catch (e) {
          errorMessage = 'Unknown error';
        }
        console.error(`API error: ${response.status}`, errorMessage);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        return await response.text();
      }
    } catch (error) {
      // Clear timeout if we got an error
      clearTimeout(timeoutId);
      
      lastError = error;
      
      // Handle timeout abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error(`Request to ${endpoint} timed out after ${timeoutMs}ms`);
        if (attempt < maxRetries) {
          attempt++;
          continue;
        }
        throw new Error(`Request to ${endpoint} timed out after ${timeoutMs}ms and ${attempt} retries`);
      }
      
      // Handle network errors with retry
      if (error instanceof TypeError && error.message.includes('network')) {
        console.error(`Network error for ${endpoint}:`, error);
        if (attempt < maxRetries) {
          attempt++;
          continue;
        }
      }
      
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  // This should never be reached if retries are working correctly
  throw lastError || new Error(`Failed after ${maxRetries} retries`);
}

// Generic API methods
export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint),
  post: (endpoint: string, data?: unknown) => fetchWithAuth(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  put: (endpoint: string, data?: unknown) => fetchWithAuth(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),
  patch: (endpoint: string, data?: unknown) => fetchWithAuth(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  }),
  delete: (endpoint: string) => fetchWithAuth(endpoint, {
    method: 'DELETE',
  }),
  
  // Streaming API
  streaming: {
    streamLearningContent: (
      fileId: string,
      options: { style?: string } = {},
      onMessage: (message: unknown) => void,
      onError: (error: Error) => void
    ) => {
      // Create a cleanup function that can be called to stop the stream
      let isCancelled = false;
      
      const cleanup = () => {
        isCancelled = true;
      };
      
      // Start the streaming process
      (async () => {
        try {
          const token = await getAuthToken();
          const response = await fetch(`${API_URL}/api/v2/files/${fileId}/stream-content`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(options),
            credentials: 'include',
          });
          
          if (!response.ok) {
            throw new Error(`Streaming failed: ${response.status} ${response.statusText}`);
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body is not readable');
          }
          
          const decoder = new TextDecoder();
          
          while (!isCancelled) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            if (isCancelled) {
              reader.cancel();
              break;
            }
            
            // Decode the chunk and parse as JSON lines
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (isCancelled) break;
              
              try {
                const message = JSON.parse(line);
                onMessage(message);
              } catch (e) {
                // Skip invalid JSON lines
                console.warn('Invalid JSON in stream:', line);
              }
            }
          }
        } catch (error) {
          if (!isCancelled) {
            onError(error instanceof Error ? error : new Error('Unknown streaming error'));
          }
        }
      })();
      
      return cleanup;
    }
  }
};

// User management
export const userAPI = {
  getMe: (): Promise<UserProfile> => api.get('/auth/me'),
  updateMe: (data: Partial<UserProfile>) => api.patch('/auth/me', data),
  deleteMe: () => api.delete('/auth/me'),
};

// Student-specific APIs
export const studentAPI = {
  // Course creation and management
  getCourses: async (): Promise<Course[]> => {
    const response = await api.get('/api/v2/courses');
    return response.courses || [];
  },
  createCourse: (data: CreateCourseRequest): Promise<Course> => api.post('/api/v2/courses', data),
  getCourse: (courseId: string): Promise<Course> => api.get(`/api/v2/courses/${courseId}`),
  updateCourse: (courseId: string, data: UpdateCourseRequest): Promise<Course> => api.patch(`/api/v2/courses/${courseId}`, data),
  deleteCourse: (courseId: string) => api.delete(`/api/v2/courses/${courseId}`),
  
  // Course content upload - for students creating their own courses
  uploadCourseContent: (courseId: string, data: FormData) => {
    return fetchWithAuth(`/api/v2/courses/${courseId}/upload-content`, {
      method: 'POST', 
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  
  // Bulk course upload - for students uploading entire course packages
  uploadCoursePackage: (data: FormData) => {
    return fetchWithAuth(`/api/v2/courses/upload-package`, {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  
  // Profile management
  getProfile: (): Promise<UserProfile> => api.get('/api/v2/auth/me'),
  updateProfile: (data: Partial<UserProfile>) => api.patch('/api/v2/auth/me', data),
  
  // Course modules management
  getCourseModules: (courseId: string): Promise<Module[]> => api.get(`/api/v2/courses/${courseId}/modules`),
  createModule: (courseId: string, data: CreateModuleRequest): Promise<Module> => api.post(`/api/v2/courses/${courseId}/modules`, data),
  getModule: (moduleId: string): Promise<Module> => api.get(`/api/v2/modules/${moduleId}`),
  updateModule: (moduleId: string, data: UpdateModuleRequest): Promise<Module> => api.patch(`/api/v2/modules/${moduleId}`, data),
  deleteModule: (moduleId: string) => api.delete(`/api/v2/modules/${moduleId}`),
  getModuleFiles: (moduleId: string): Promise<FileInfo[]> => api.get(`/api/v2/modules/${moduleId}/files`),
  
  // File operations - COMPLETE CRUD
  uploadFile: (moduleId: string, formData: FormData) => {
    // Add moduleId to form data
    formData.append('moduleId', moduleId);
    return fetchWithAuth(`/api/v2/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  getFile: (fileId: string): Promise<FileInfo> => api.get(`/api/v2/files/${fileId}`),
  updateFile: (fileId: string, data: UpdateFileRequest): Promise<FileInfo> => api.patch(`/api/v2/files/${fileId}`, data),
  deleteFile: (fileId: string) => api.delete(`/api/v2/files/${fileId}`),
  downloadFile: (fileId: string) => api.get(`/api/v2/files/${fileId}/download`),
  getFileContent: (fileId: string) => api.get(`/api/v2/files/${fileId}/content`),
  
  // Get file URL for viewing/downloading
  getFileUrl: async (fileId: string) => {
    try {
      // Use fetchWithAuth to include authentication headers
      const response = await fetchWithAuth(`/api/v2/files/${fileId}/content`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }, false); // Don't retry with session login for file access
      
      // fetchWithAuth already handles the response parsing, but we need raw response for content-type check
      // So let's use the raw fetch with auth token
      const token = await getAuthToken();
      const rawResponse = await fetch(`http://localhost:8080/api/v2/files/${fileId}/content`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        }
      });
      
      if (!rawResponse.ok) {
        throw new Error(`Failed to access file: ${rawResponse.status} ${rawResponse.statusText}`);
      }
      
      const contentType = rawResponse.headers.get('content-type');
      
      // If response is JSON, it could be a presigned URL or error message
      if (contentType && contentType.includes('application/json')) {
        const data = await rawResponse.json();
        if (data.type === 'presigned' && data.url) {
          return { url: data.url };
        }
      }
      
      // Otherwise, it's traditional file storage - include auth token in URL
      return {
        url: `http://localhost:8080/api/v2/files/${fileId}/content${token ? `?token=${token}` : ''}`
      };
    } catch (error) {
      console.error('Failed to access student file:', error);
      throw new Error(error instanceof Error ? error.message : 'File not accessible');
    }
  },
  
  // Legacy file upload for course-level uploads (backward compatibility)
  uploadCourseFile: (courseId: string, formData: FormData) => {
    return fetchWithAuth(`/student/courses/${courseId}/files`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  
  // Search
  searchFiles: (query: string, courseId?: string, fileType?: string) => {
    const params = new URLSearchParams({ q: query });
    if (courseId) params.append('courseId', courseId);
    if (fileType) params.append('type', fileType);
    return api.get(`/api/v2/files/search?${params.toString()}`);
  },
  
  // Enrollment
  enrollInCourse: (accessCode: string) => api.post('/api/v2/enrollments', { accessCode }),
  getEnrollments: () => api.get('/api/v2/enrollments'),
  unenrollFromCourse: (enrollmentId: string) => api.delete(`/api/v2/enrollments/${enrollmentId}`),
  
  // Discussions and chat
  getCourseDiscussions: (courseId: string) => api.get(`/api/v2/courses/${courseId}/discussions`),
  postDiscussion: (courseId: string, data: CreateDiscussionRequest) => api.post(`/api/v2/courses/${courseId}/discussions`, data),
  chatWithAI: (data: ChatRequest) => api.post('/api/v2/ai/chat', data),
  
  // Dashboard statistics
  getCourseProgress: (courseId: string) => api.get(`/api/v2/courses/${courseId}/progress`),
  logActivity: (data: CreateActivityRequest) => api.post('/api/v2/activities/log', data),
  
  // Dashboard content
  getRecentActivities: async () => {
    return api.get('/api/v2/activities/recent');
  },
  getTodoItems: async () => {
    return api.get('/api/v2/todo-items');
  },
  getDashboardStats: async () => {
    return api.get('/api/v2/activities/stats');
  },
  createTodoItem: (data: CreateTodoRequest): Promise<TodoItem> => api.post('/api/v2/todo-items', data),
  updateTodoItem: (todoId: string, data: UpdateTodoRequest): Promise<TodoItem> => api.patch(`/api/v2/todo-items/${todoId}`, data),
  deleteTodoItem: (todoId: string) => api.delete(`/api/v2/todo-items/${todoId}`),
  
  // Quizzes (to be implemented)
  getCourseQuizzes: (courseId: string) => api.get(`/api/v2/courses/${courseId}/quizzes`),
  generateCourseQuiz: (courseId: string, options?: GenerateQuizRequest) => api.post(`/api/v2/courses/${courseId}/quizzes/generate`, options),
  getQuiz: (quizId: string) => api.get(`/api/v2/quizzes/${quizId}`),
  startQuizSession: (quizId: string) => api.post(`/api/v2/quizzes/${quizId}/start`),
  submitQuizAnswer: (quizId: string, questionId: string, answer: string) => api.post(`/api/v2/quizzes/${quizId}/questions/${questionId}/answer`, { answer }),
  submitQuiz: (quizId: string) => api.post(`/api/v2/quizzes/${quizId}/submit`),
  getQuizResults: (quizId: string) => api.get(`/api/v2/quizzes/${quizId}/results`),
};

// Instructor-specific APIs
export const instructorAPI = {
  getProfile: () => api.get('/api/v2/auth/me'),
  createProfile: (data: Partial<UserProfile>) => api.post('/api/v2/auth/me', data),
  updateProfile: (data: Partial<UserProfile>) => api.patch('/api/v2/auth/me', data),
  deleteProfile: () => api.delete('/api/v2/auth/me'),
  
  // Courses (using the same endpoints as students, backend handles role-based filtering)
  getCourses: async () => {
    const response = await api.get('/api/v2/courses');
    return response.courses || [];
  },
  createCourse: (data: CreateCourseRequest) => api.post('/api/v2/courses', data),
  getCourse: (courseId: string) => api.get(`/api/v2/courses/${courseId}`),
  updateCourse: (courseId: string, data: UpdateCourseRequest) => api.patch(`/api/v2/courses/${courseId}`, data),
  deleteCourse: (courseId: string) => api.delete(`/api/v2/courses/${courseId}`),
  
  // Course management
  getCourseStudents: (courseId: string) => api.get(`/api/v2/courses/${courseId}/students`),
  unenrollStudent: (enrollmentId: string) => api.delete(`/api/v2/enrollments/${enrollmentId}`),
  
  // Modules
  getCourseModules: (courseId: string) => api.get(`/api/v2/courses/${courseId}/modules`),
  createModule: (courseId: string, data: CreateModuleRequest) => api.post(`/api/v2/courses/${courseId}/modules`, data),
  updateModule: (courseId: string, moduleId: string, data: UpdateModuleRequest) => {
    return api.patch(`/api/v2/modules/${moduleId}`, data);
  },
  deleteModule: (moduleId: string) => api.delete(`/api/v2/modules/${moduleId}`),
  
  // Files
  getModuleFiles: (moduleId: string) => api.get(`/api/v2/modules/${moduleId}/files`),
  uploadFile: (moduleId: string, formData: FormData) => {
    return fetchWithAuth(`/api/v2/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  getFile: (fileId: string) => api.get(`/api/v2/files/${fileId}`),
  updateFile: (fileId: string, data: UpdateFileRequest) => api.patch(`/api/v2/files/${fileId}`, data),
  deleteFile: (fileId: string) => api.delete(`/api/v2/files/${fileId}`),
  getFileContent: (fileId: string) => api.get(`/api/v2/files/${fileId}/content`),
  downloadFile: (fileId: string) => api.get(`/api/v2/files/${fileId}/download`),
  getFileUrl: async (fileId: string) => {
    try {
      // Use proper authentication
      const token = await getAuthToken();
      const rawResponse = await fetch(`http://localhost:8080/api/v2/files/${fileId}/content`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        }
      });
      
      if (!rawResponse.ok) {
        throw new Error(`Failed to access file: ${rawResponse.status} ${rawResponse.statusText}`);
      }
      
      const contentType = rawResponse.headers.get('content-type');
      
      // If response is JSON, it could be a presigned URL or error message
      if (contentType && contentType.includes('application/json')) {
        const data = await rawResponse.json();
        if (data.type === 'presigned' && data.url) {
          return { url: data.url };
        }
      }
      
      // Otherwise, it's traditional file storage - include auth token in URL
      return {
        url: `http://localhost:8080/api/v2/files/${fileId}/content${token ? `?token=${token}` : ''}`
      };
    } catch (error) {
      console.error('Failed to access instructor file:', error);
      throw new Error(error instanceof Error ? error.message : 'File not accessible');
    }
  },
  
  // Reports
  getCourseReport: (courseId: string) => api.get(`/instructor/courses/${courseId}/reports`),
  generateCourseReport: (courseId: string) => api.post(`/instructor/courses/${courseId}/reports`),
  generateCourseFAQs: (courseId: string) => api.post(`/instructor/courses/${courseId}/faqs`),
};

// Course-specific APIs (accessible to both students and instructors)
export const courseAPI = {
  search: (courseId: string, query: string) => api.post(`/courses/${courseId}/search`, { query }),
  getCitations: (courseId: string) => api.get(`/courses/${courseId}/citations`),
};

// Admin APIs
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getUser: (userId: string) => api.get(`/admin/users/${userId}`),
  updateUser: (userId: string, data: UpdateUserRequest) => api.patch(`/admin/users/${userId}`, data),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  
  // News management
  getNews: () => api.get('/admin/news'),
  createNews: (data: CreateNewsRequest) => api.post('/admin/news', data),
  getNewsItem: (newsId: string) => api.get(`/admin/news/${newsId}`),
  updateNews: (newsId: string, data: UpdateNewsRequest) => api.patch(`/admin/news/${newsId}`, data),
  deleteNews: (newsId: string) => api.delete(`/admin/news/${newsId}`),
  
  // Market data
  getMarketData: () => api.get('/admin/market'),
  createMarketData: (data: CreateMarketDataRequest) => api.post('/admin/market', data),
  getMarketEntry: (marketId: string) => api.get(`/admin/market/${marketId}`),
  updateMarketData: (marketId: string, data: UpdateMarketDataRequest) => api.patch(`/admin/market/${marketId}`, data),
  deleteMarketData: (marketId: string) => api.delete(`/admin/market/${marketId}`),
};

// Utility functions
export const utilityAPI = {
  generateTitle: (data: GenerateTitleRequest) => api.post('/generate-title', data),
};

// Public/general APIs
export const publicAPI = {
  getMarketRecent: () => fetch(`${API_URL}/market/recent`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  }).then(res => res.json()),
};

// Export everything
export default api;