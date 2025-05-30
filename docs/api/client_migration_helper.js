/**
 * Learn-X API v1 to v2 Migration Helper
 * 
 * This helper library provides utilities to ease migration from API v1 to v2
 * It can be used as a drop-in replacement that handles both versions
 */

class LearnXAPIClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://api.learn-x.com';
    this.version = config.version || 'v2'; // Default to v2
    this.token = config.token || null;
    this.onDeprecationWarning = config.onDeprecationWarning || null;
    this.autoMigrate = config.autoMigrate !== false; // Default true
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Get base headers for requests
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Version': this.version
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Check response for deprecation warnings
   */
  checkDeprecationWarning(response, responseData) {
    if (response.headers.get('X-API-Deprecated') === 'true') {
      const warning = {
        deprecated: true,
        sunsetDate: response.headers.get('X-API-Sunset'),
        message: response.headers.get('X-API-Deprecation-Message'),
        migrationGuide: response.headers.get('X-API-Migration-Guide')
      };

      // Call custom handler if provided
      if (this.onDeprecationWarning) {
        this.onDeprecationWarning(warning);
      } else {
        console.warn('[LearnX API] Deprecation Warning:', warning.message);
      }
    }
  }

  /**
   * Make API request with version handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api/${this.version}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      const responseData = await response.json();

      // Check for deprecation warnings
      this.checkDeprecationWarning(response, responseData);

      // Handle v2 response format
      if (this.version === 'v2') {
        if (!response.ok) {
          throw new APIError(responseData.message, responseData.errors, response.status);
        }

        // Return just the data portion for v2
        return responseData.data || responseData;
      }

      // v1 response handling
      if (!response.ok) {
        throw new APIError(responseData.error || 'Request failed', null, response.status);
      }

      return responseData;

    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error', null, 0);
    }
  }

  /**
   * Authentication methods
   */
  async login(idToken) {
    const endpoint = this.version === 'v1' ? '/auth/sessionLogin' : '/auth/login';
    const response = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ idToken })
    });

    // Handle different response formats
    if (this.version === 'v2') {
      this.token = response.tokens.access_token;
      return response;
    } else {
      // v1 response - extract token if provided
      if (response.token) {
        this.token = response.token;
      }
      return response;
    }
  }

  async logout() {
    const endpoint = this.version === 'v1' ? '/auth/sessionLogout' : '/auth/logout';
    await this.request(endpoint, { method: 'POST' });
    this.token = null;
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  async updateProfile(data) {
    return this.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * Course methods
   */
  async getCourses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/courses${queryString ? '?' + queryString : ''}`;
    const response = await this.request(endpoint);

    // Normalize response format
    if (this.version === 'v1') {
      return {
        data: response.courses || response,
        pagination: null
      };
    }

    return response;
  }

  async getCourse(courseId) {
    return this.request(`/courses/${courseId}`);
  }

  async createCourse(courseData) {
    return this.request('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  }

  async updateCourse(courseId, updateData) {
    return this.request(`/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  async getCourseModules(courseId) {
    const endpoint = this.version === 'v1' 
      ? `/courses/${courseId}/moduleswithfiles`
      : `/courses/${courseId}/modules`;
    return this.request(endpoint);
  }

  /**
   * Module methods
   */
  async createModule(courseId, moduleData) {
    return this.request(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(moduleData)
    });
  }

  async getModule(moduleId) {
    return this.request(`/modules/${moduleId}`);
  }

  async updateModule(moduleId, updateData) {
    return this.request(`/modules/${moduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  /**
   * File methods
   */
  async uploadFile(file, moduleId, title) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module_id', moduleId);
    if (title) {
      formData.append('title', title);
    }

    // Don't set Content-Type for FormData
    const headers = this.getHeaders();
    delete headers['Content-Type'];

    return this.request('/files/upload', {
      method: 'POST',
      headers,
      body: formData
    });
  }

  async getFileContent(fileId) {
    return this.request(`/files/${fileId}/content`);
  }

  /**
   * Todo methods
   */
  async getTodos(params = {}) {
    const endpoint = this.version === 'v1' ? '/todo-items' : '/todos';
    const queryString = new URLSearchParams(params).toString();
    return this.request(`${endpoint}${queryString ? '?' + queryString : ''}`);
  }

  async createTodo(todoData) {
    const endpoint = this.version === 'v1' ? '/todo-items' : '/todos';
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(todoData)
    });
  }

  async updateTodo(todoId, updateData) {
    const endpoint = this.version === 'v1' ? `/todo-items/${todoId}` : `/todos/${todoId}`;
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  async deleteTodo(todoId) {
    const endpoint = this.version === 'v1' ? `/todo-items/${todoId}` : `/todos/${todoId}`;
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * Migration utilities
   */
  
  /**
   * Test if v2 is available and working
   */
  async testV2Availability() {
    try {
      const originalVersion = this.version;
      this.version = 'v2';
      
      const response = await this.request('/health');
      
      this.version = originalVersion;
      return true;
    } catch (error) {
      this.version = this.version;
      return false;
    }
  }

  /**
   * Gradually migrate to v2 with fallback
   */
  async migrateWithFallback(v2Func, v1Func) {
    if (this.version === 'v2') {
      try {
        return await v2Func();
      } catch (error) {
        if (this.autoMigrate && error.status === 404) {
          console.warn('[LearnX API] v2 endpoint not found, falling back to v1');
          this.version = 'v1';
          const result = await v1Func();
          this.version = 'v2'; // Switch back
          return result;
        }
        throw error;
      }
    } else {
      return await v1Func();
    }
  }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, errors = null, status = 0) {
    super(message);
    this.name = 'APIError';
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Export for different module systems
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LearnXAPIClient, APIError };
} else if (typeof window !== 'undefined') {
  window.LearnXAPIClient = LearnXAPIClient;
  window.APIError = APIError;
}

/**
 * Usage Examples:
 * 
 * // Initialize client (defaults to v2)
 * const client = new LearnXAPIClient({
 *   baseURL: 'https://api.learn-x.com',
 *   onDeprecationWarning: (warning) => {
 *     console.error('API Deprecation:', warning);
 *     // Send to analytics
 *   }
 * });
 * 
 * // Login
 * const { user, tokens } = await client.login(firebaseIdToken);
 * 
 * // Get courses with pagination (v2) or without (v1)
 * const coursesResponse = await client.getCourses({ page: 1, per_page: 20 });
 * const courses = coursesResponse.data || coursesResponse;
 * 
 * // Upload file
 * const file = document.getElementById('file-input').files[0];
 * const uploadedFile = await client.uploadFile(file, moduleId, 'Lecture Notes');
 * 
 * // Test migration readiness
 * const v2Ready = await client.testV2Availability();
 * if (v2Ready) {
 *   client.version = 'v2';
 * }
 */