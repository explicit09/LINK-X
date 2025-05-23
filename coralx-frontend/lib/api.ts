import { auth } from '../firebaseconfig';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Auth helpers
export async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Session login - establishes a session cookie with the backend
export async function sessionLogin() {
  const token = await getAuthToken();
  if (!token) return false;
  
  try {
    const response = await fetch(`${API_URL}/sessionLogin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: token }),
      credentials: 'include',
      mode: 'cors',
    });
    
    if (!response.ok) {
      console.error('Session login failed:', await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Session login error:', error);
    return false;
  }
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}, retryWithSessionLogin = true) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    console.log(`Making request to: ${API_URL}${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors',
    });

    // If we get a 401 and we haven't tried session login yet, try to establish a session
    if (response.status === 401 && retryWithSessionLogin) {
      console.log('Received 401, attempting to establish session...');
      const sessionSuccess = await sessionLogin();
      
      if (sessionSuccess) {
        // Retry the original request with the new session cookie
        console.log('Session established, retrying original request');
        return fetchWithAuth(endpoint, options, false);  // Prevent infinite recursion
      }
    }

    if (!response.ok) {
      let errorMessage = '';
      try {
        const errorData = await response.text();
        errorMessage = errorData;
      } catch (e) {
        errorMessage = 'Unknown error';
      }
      console.error(`API error: ${response.status}`, errorMessage);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
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
  getMe: () => api.get('/me'),
  updateMe: (data: any) => api.patch('/me', data),
  deleteMe: () => api.delete('/me'),
};

// Student-specific APIs
export const studentAPI = {
  // Course creation and management
  getCourses: () => api.get('/student/courses'),
  createCourse: (data: any) => api.post('/student/courses', data),
  getCourse: (courseId: string) => api.get(`/student/courses/${courseId}`),
  updateCourse: (courseId: string, data: any) => api.patch(`/student/courses/${courseId}`, data),
  deleteCourse: (courseId: string) => api.delete(`/student/courses/${courseId}`),
  
  // Course content upload - for students creating their own courses
  uploadCourseContent: (courseId: string, data: FormData) => {
    return fetchWithAuth(`/student/courses/${courseId}/upload-content`, {
      method: 'POST', 
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  
  // Bulk course upload - for students uploading entire course packages
  uploadCoursePackage: (data: FormData) => {
    return fetchWithAuth(`/student/courses/upload-package`, {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  
  // Profile management
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data: any) => api.patch('/student/profile', data),
  
  // Course modules management
  getCourseModules: (courseId: string) => api.get(`/student/courses/${courseId}/modules`),
  createModule: (courseId: string, data: any) => api.post(`/student/courses/${courseId}/modules`, data),
  getModule: (courseId: string, moduleId: string) => api.get(`/student/courses/${courseId}/modules/${moduleId}`),
  
  // File operations
  downloadFile: (fileId: string) => api.get(`/student/files/${fileId}/download`),
  uploadFile: (courseId: string, data: FormData) => {
    return fetchWithAuth(`/student/courses/${courseId}/files`, {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  getFileContent: (fileId: string) => api.get(`/student/files/${fileId}/content`),
  getFileUrl: async (fileId: string) => {
    try {
      // For direct file access, we need to use the API call to get proper authentication
      // Return the direct content URL but note that authentication will be handled by cookies
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // First try to access the file to make sure it exists and we have permission
      try {
        await api.get(`/student/files/${fileId}`);
        return {
          url: `${baseUrl}/student/files/${fileId}/content`
        };
      } catch (studentError) {
        // If student endpoint fails, the file might be instructor-owned, try instructor endpoint
        await api.get(`/instructor/files/${fileId}`);
        return {
          url: `${baseUrl}/instructor/files/${fileId}/content`
        };
      }
    } catch (error) {
      console.warn('Failed to access file through any endpoint:', error);
      throw new Error('File not accessible');
    }
  },
  
  // Submissions
  submitAssignment: (assignmentId: string, data: any) => api.post(`/student/assignments/${assignmentId}/submit`, data),
  getSubmissions: (assignmentId: string) => api.get(`/student/assignments/${assignmentId}/submissions`),
  
  // Discussions and chat
  getCourseDiscussions: (courseId: string) => api.get(`/student/courses/${courseId}/discussions`),
  postDiscussion: (courseId: string, data: any) => api.post(`/student/courses/${courseId}/discussions`, data),
  chatWithAI: (data: any) => api.post('/student/ai/chat', data),
  
  // Quizzes (to be implemented)
  getCourseQuizzes: (courseId: string) => api.get(`/student/courses/${courseId}/quizzes`),
  generateCourseQuiz: (courseId: string, options?: any) => api.post(`/student/courses/${courseId}/quizzes/generate`, options),
  getQuiz: (quizId: string) => api.get(`/student/quizzes/${quizId}`),
  startQuizSession: (quizId: string) => api.post(`/student/quizzes/${quizId}/start`),
  submitQuizAnswer: (quizId: string, questionId: string, answer: any) => api.post(`/student/quizzes/${quizId}/questions/${questionId}/answer`, { answer }),
  submitQuiz: (quizId: string) => api.post(`/student/quizzes/${quizId}/submit`),
  getQuizResults: (quizId: string) => api.get(`/student/quizzes/${quizId}/results`),
};

// Instructor-specific APIs
export const instructorAPI = {
  getProfile: () => api.get('/instructor/profile'),
  createProfile: (data: any) => api.post('/instructor/profile', data),
  updateProfile: (data: any) => api.patch('/instructor/profile', data),
  deleteProfile: () => api.delete('/instructor/profile'),
  
  // Courses
  getCourses: () => api.get('/instructor/courses'),
  createCourse: (data: any) => api.post('/instructor/courses', data),
  getCourse: (courseId: string) => api.get(`/instructor/courses/${courseId}`),
  updateCourse: (courseId: string, data: any) => api.patch(`/instructor/courses/${courseId}`, data),
  deleteCourse: (courseId: string) => api.delete(`/instructor/courses/${courseId}`),
  
  // Course management
  getCourseStudents: (courseId: string) => api.get(`/instructor/courses/${courseId}/students`),
  unenrollStudent: (enrollmentId: string) => api.delete(`/instructor/enrollments/${enrollmentId}`),
  
  // Modules
  getCourseModules: (courseId: string) => api.get(`/instructor/courses/${courseId}/modules`),
  createModule: (courseId: string, data: any) => api.post(`/instructor/courses/${courseId}/modules`, data),
  updateModule: (moduleId: string, data: any) => api.patch(`/instructor/modules/${moduleId}`, data),
  deleteModule: (moduleId: string) => api.delete(`/instructor/modules/${moduleId}`),
  
  // Files
  getModuleFiles: (moduleId: string) => api.get(`/instructor/modules/${moduleId}/files`),
  uploadFile: (moduleId: string, formData: FormData) => {
    return fetchWithAuth(`/instructor/modules/${moduleId}/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  getFile: (fileId: string) => api.get(`/instructor/files/${fileId}`),
  updateFile: (fileId: string, data: any) => api.patch(`/instructor/files/${fileId}`, data),
  deleteFile: (fileId: string) => api.delete(`/instructor/files/${fileId}`),
  getFileContent: (fileId: string) => api.get(`/instructor/files/${fileId}/content`),
  downloadFile: (fileId: string) => api.get(`/instructor/files/${fileId}/download`),
  getFileUrl: async (fileId: string) => {
    try {
      // For direct file access, we need to use the API call to get proper authentication
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // First try to access the file to make sure it exists and we have permission
      await api.get(`/instructor/files/${fileId}`);
      
      return {
        url: `${baseUrl}/instructor/files/${fileId}/content`
      };
    } catch (error) {
      console.warn('Failed to access instructor file:', error);
      throw new Error('File not accessible');
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