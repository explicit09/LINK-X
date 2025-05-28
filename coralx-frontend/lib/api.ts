import { auth } from '../firebaseconfig';
import { authService } from './auth-service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
        console.log(`Retry attempt ${attempt}/${maxRetries} for ${endpoint}`);
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
      
      console.log(`Making request to: ${API_URL}${endpoint}`);
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
          console.log('Received 401, attempting to refresh tokens...');
          const refreshed = await authService.refreshTokens();
          
          if (refreshed) {
            // Get new token and retry
            const newToken = await authService.getValidToken();
            if (newToken) {
              headers['Authorization'] = `Bearer ${newToken}`;
              console.log('Retrying request with refreshed token');
              
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
          console.log('Authentication required, redirecting to login...');
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
  post: (endpoint: string, data?: any) => fetchWithAuth(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  put: (endpoint: string, data?: any) => fetchWithAuth(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),
  patch: (endpoint: string, data?: any) => fetchWithAuth(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  }),
  delete: (endpoint: string) => fetchWithAuth(endpoint, {
    method: 'DELETE',
  }),
};

// User management
export const userAPI = {
  getMe: () => api.get('/api/v1/auth/me'),
  updateMe: (data: any) => api.patch('/api/v1/auth/me', data),
  deleteMe: () => api.delete('/api/v1/auth/me'),
};

// Student-specific APIs
export const studentAPI = {
  // Course creation and management
  getCourses: async () => {
    const response = await api.get('/api/v1/courses');
    return response.courses || [];
  },
  createCourse: (data: any) => api.post('/api/v1/courses', data),
  getCourse: (courseId: string) => api.get(`/api/v1/courses/${courseId}`),
  updateCourse: (courseId: string, data: any) => api.patch(`/api/v1/courses/${courseId}`, data),
  deleteCourse: (courseId: string) => api.delete(`/api/v1/courses/${courseId}`),
  
  // Course content upload - for students creating their own courses
  uploadCourseContent: (courseId: string, data: FormData) => {
    return fetchWithAuth(`/api/v1/courses/${courseId}/upload-content`, {
      method: 'POST', 
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  
  // Bulk course upload - for students uploading entire course packages
  uploadCoursePackage: (data: FormData) => {
    return fetchWithAuth(`/api/v1/courses/upload-package`, {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  
  // Profile management
  getProfile: () => api.get('/api/v1/auth/me'),
  updateProfile: (data: any) => api.patch('/api/v1/auth/me', data),
  
  // Course modules management
  getCourseModules: (courseId: string) => api.get(`/api/v1/courses/${courseId}/modules`),
  createModule: (courseId: string, data: any) => api.post(`/api/v1/courses/${courseId}/modules`, data),
  getModule: (courseId: string, moduleId: string) => api.get(`/api/v1/courses/${courseId}/modules/${moduleId}`),
  updateModule: (courseId: string, moduleId: string, data: any) => api.patch(`/api/v1/modules/${moduleId}`, data),
  getModuleFiles: (moduleId: string) => api.get(`/api/v1/modules/${moduleId}/files`),
  
  // File operations
  downloadFile: (fileId: string) => api.get(`/api/v1/files/${fileId}/download`),
  uploadFile: (courseId: string, data: FormData) => {
    return fetchWithAuth(`/api/v1/files/upload`, {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  getFileContent: (fileId: string) => api.get(`/api/v1/files/${fileId}/content`),
  deleteFile: (fileId: string) => api.delete(`/api/v1/files/${fileId}`),
  getFileUrl: async (fileId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // First check if it's S3 storage by trying to get metadata
      const response = await fetch(`${baseUrl}/api/v1/files/${fileId}/content`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to access file: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      // If response is JSON, it's likely a presigned URL
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.type === 'presigned' && data.url) {
          return { url: data.url };
        }
      }
      
      // Otherwise, use direct URL with credentials
      return {
        url: `${baseUrl}/api/v1/files/${fileId}/content`
      };
    } catch (error) {
      console.error('Failed to get file URL:', error);
      throw new Error(error instanceof Error ? error.message : 'File not accessible');
    }
  },

  // Personalized files
  deletePersonalizedFile: (pfId: string) => api.delete(`/api/v1/personalized-files/${pfId}`),
  
  // Submissions
  submitAssignment: (assignmentId: string, data: any) => api.post(`/api/v1/assignments/${assignmentId}/submit`, data),
  getSubmissions: (assignmentId: string) => api.get(`/api/v1/assignments/${assignmentId}/submissions`),
  
  // Discussions and chat
  getCourseDiscussions: (courseId: string) => api.get(`/api/v1/courses/${courseId}/discussions`),
  postDiscussion: (courseId: string, data: any) => api.post(`/api/v1/courses/${courseId}/discussions`, data),
  chatWithAI: (data: any) => api.post('/api/v1/ai/chat', data),
  
  // Dashboard statistics (TODO: implement backend endpoints)
  getDashboardStats: async () => {
    // Mock data until backend endpoints are implemented
    return {
      totalCourses: 0,
      completedCourses: 0,
      inProgressCourses: 0,
      totalHoursLearned: 0,
      averageScore: 0,
      weeklyProgress: []
    };
  },
  getCourseProgress: (courseId: string) => api.get(`/api/v1/courses/${courseId}/progress`),
  logActivity: (data: any) => api.post('/api/v1/activity/log', data),
  
  // Dashboard content (TODO: implement backend endpoints)
  getRecentActivities: async () => {
    return api.get('/api/v1/activities/recent');
  },
  getTodoItems: async () => {
    return api.get('/api/v1/todo-items');
  },
  getDashboardStats: async () => {
    return api.get('/api/v1/activities/stats');
  },
  createTodoItem: (data: any) => api.post('/api/v1/todo-items', data),
  updateTodoItem: (todoId: string, data: any) => api.patch(`/api/v1/todo-items/${todoId}`, data),
  deleteTodoItem: (todoId: string) => api.delete(`/api/v1/todo-items/${todoId}`),
  
  // Quizzes (to be implemented)
  getCourseQuizzes: (courseId: string) => api.get(`/api/v1/courses/${courseId}/quizzes`),
  generateCourseQuiz: (courseId: string, options?: any) => api.post(`/api/v1/courses/${courseId}/quizzes/generate`, options),
  getQuiz: (quizId: string) => api.get(`/api/v1/quizzes/${quizId}`),
  startQuizSession: (quizId: string) => api.post(`/api/v1/quizzes/${quizId}/start`),
  submitQuizAnswer: (quizId: string, questionId: string, answer: any) => api.post(`/api/v1/quizzes/${quizId}/questions/${questionId}/answer`, { answer }),
  submitQuiz: (quizId: string) => api.post(`/api/v1/quizzes/${quizId}/submit`),
  getQuizResults: (quizId: string) => api.get(`/api/v1/quizzes/${quizId}/results`),
};

// Instructor-specific APIs
export const instructorAPI = {
  getProfile: () => api.get('/api/v1/auth/me'),
  createProfile: (data: any) => api.post('/api/v1/auth/me', data),
  updateProfile: (data: any) => api.patch('/api/v1/auth/me', data),
  deleteProfile: () => api.delete('/api/v1/auth/me'),
  
  // Courses (using the same endpoints as students, backend handles role-based filtering)
  getCourses: async () => {
    const response = await api.get('/api/v1/courses');
    return response.courses || [];
  },
  createCourse: (data: any) => api.post('/api/v1/courses', data),
  getCourse: (courseId: string) => api.get(`/api/v1/courses/${courseId}`),
  updateCourse: (courseId: string, data: any) => api.patch(`/api/v1/courses/${courseId}`, data),
  deleteCourse: (courseId: string) => api.delete(`/api/v1/courses/${courseId}`),
  
  // Course management
  getCourseStudents: (courseId: string) => api.get(`/api/v1/courses/${courseId}/students`),
  unenrollStudent: (enrollmentId: string) => api.delete(`/api/v1/enrollments/${enrollmentId}`),
  
  // Modules
  getCourseModules: (courseId: string) => api.get(`/api/v1/courses/${courseId}/modules`),
  createModule: (courseId: string, data: any) => api.post(`/api/v1/courses/${courseId}/modules`, data),
  updateModule: (courseId: string, moduleId: string, data: any) => {
    return api.patch(`/api/v1/modules/${moduleId}`, data);
  },
  deleteModule: (moduleId: string) => api.delete(`/api/v1/modules/${moduleId}`),
  
  // Files
  getModuleFiles: (moduleId: string) => api.get(`/api/v1/modules/${moduleId}/files`),
  uploadFile: (moduleId: string, formData: FormData) => {
    return fetchWithAuth(`/api/v1/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  getFile: (fileId: string) => api.get(`/api/v1/files/${fileId}`),
  updateFile: (fileId: string, data: any) => api.patch(`/api/v1/files/${fileId}`, data),
  deleteFile: (fileId: string) => api.delete(`/api/v1/files/${fileId}`),
  getFileContent: (fileId: string) => api.get(`/api/v1/files/${fileId}/content`),
  downloadFile: (fileId: string) => api.get(`/api/v1/files/${fileId}/download`),
  getFileUrl: async (fileId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Check if file has S3 storage
      const response = await fetch(`${baseUrl}/api/v1/files/${fileId}/content`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to access file: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      // If response is JSON, it could be a presigned URL or error message
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.type === 'presigned' && data.url) {
          return { url: data.url };
        }
      }
      
      // Otherwise, it's traditional file storage
      return {
        url: `${baseUrl}/api/v1/files/${fileId}/content`
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
  updateUser: (userId: string, data: any) => api.patch(`/admin/users/${userId}`, data),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  
  // News management
  getNews: () => api.get('/admin/news'),
  createNews: (data: any) => api.post('/admin/news', data),
  getNewsItem: (newsId: string) => api.get(`/admin/news/${newsId}`),
  updateNews: (newsId: string, data: any) => api.patch(`/admin/news/${newsId}`, data),
  deleteNews: (newsId: string) => api.delete(`/admin/news/${newsId}`),
  
  // Market data
  getMarketData: () => api.get('/admin/market'),
  createMarketData: (data: any) => api.post('/admin/market', data),
  getMarketEntry: (marketId: string) => api.get(`/admin/market/${marketId}`),
  updateMarketData: (marketId: string, data: any) => api.patch(`/admin/market/${marketId}`, data),
  deleteMarketData: (marketId: string) => api.delete(`/admin/market/${marketId}`),
};

// Utility functions
export const utilityAPI = {
  generateTitle: (data: any) => api.post('/generate-title', data),
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