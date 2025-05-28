"""
Enhanced Frontend API Client V2
Implements proper authentication flow with retry logic and session management
"""
import { auth } from '../firebaseconfig';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const API_VERSION = '/api/v2';

// Token management
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  setTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    // JWT tokens typically expire in 15 minutes
    this.tokenExpiry = new Date(Date.now() + 14 * 60 * 1000);
  }

  getAccessToken(): string | null {
    // Check if token is expired
    if (this.tokenExpiry && new Date() > this.tokenExpiry) {
      this.accessToken = null;
    }
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  isTokenExpired(): boolean {
    return !this.tokenExpiry || new Date() > this.tokenExpiry;
  }
}

const tokenManager = new TokenManager();

// Authentication state
export enum AuthState {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  AUTHENTICATED = 'AUTHENTICATED',
  REGISTERING = 'REGISTERING',
  REFRESHING = 'REFRESHING',
}

let currentAuthState = AuthState.UNAUTHENTICATED;

// Get Firebase ID token
export async function getFirebaseToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
}

// Authentication functions
export async function login(): Promise<boolean> {
  const firebaseToken = await getFirebaseToken();
  if (!firebaseToken) {
    console.error('No Firebase token available');
    return false;
  }

  try {
    const response = await fetch(`${API_URL}${API_VERSION}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: firebaseToken }),
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      tokenManager.setTokens(data.access_token, data.refresh_token);
      currentAuthState = AuthState.AUTHENTICATED;
      return true;
    }

    if (response.status === 404) {
      const error = await response.json();
      if (error.code === 'USER_NOT_REGISTERED') {
        currentAuthState = AuthState.REGISTERING;
        console.log('User needs to complete registration');
      }
    }

    return false;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

export async function register(role: string, profileData: any): Promise<boolean> {
  const firebaseToken = await getFirebaseToken();
  if (!firebaseToken) {
    console.error('No Firebase token available');
    return false;
  }

  try {
    const response = await fetch(`${API_URL}${API_VERSION}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: firebaseToken,
        role,
        profile: profileData,
      }),
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      tokenManager.setTokens(data.access_token, data.refresh_token);
      currentAuthState = AuthState.AUTHENTICATED;
      return true;
    }

    const error = await response.json();
    console.error('Registration failed:', error);
    return false;
  } catch (error) {
    console.error('Registration error:', error);
    return false;
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  try {
    currentAuthState = AuthState.REFRESHING;
    
    const response = await fetch(`${API_URL}${API_VERSION}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      tokenManager.setTokens(data.access_token);
      currentAuthState = AuthState.AUTHENTICATED;
      return true;
    }

    // If refresh fails, try to re-authenticate with Firebase
    currentAuthState = AuthState.UNAUTHENTICATED;
    return await login();
  } catch (error) {
    console.error('Token refresh error:', error);
    currentAuthState = AuthState.UNAUTHENTICATED;
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    const token = tokenManager.getAccessToken();
    if (token) {
      await fetch(`${API_URL}${API_VERSION}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    tokenManager.clearTokens();
    currentAuthState = AuthState.UNAUTHENTICATED;
  }
}

// Enhanced fetch with authentication
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<any> {
  // Ensure we have authentication
  if (currentAuthState === AuthState.UNAUTHENTICATED) {
    const loginSuccess = await login();
    if (!loginSuccess) {
      throw new Error('Authentication required');
    }
  }

  let retries = 0;
  while (retries <= maxRetries) {
    // Refresh token if expired
    if (tokenManager.isTokenExpired()) {
      const refreshSuccess = await refreshAccessToken();
      if (!refreshSuccess) {
        throw new Error('Failed to refresh authentication');
      }
    }

    const token = tokenManager.getAccessToken();
    const isFormData = options.body instanceof FormData;

    const headers = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Handle 401 Unauthorized
      if (response.status === 401 && retries < maxRetries) {
        console.log('Received 401, attempting to refresh token...');
        const refreshSuccess = await refreshAccessToken();
        if (refreshSuccess) {
          retries++;
          continue;
        }
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      if (retries < maxRetries && error instanceof Error && error.message.includes('401')) {
        retries++;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

// API wrapper functions
export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint, { method: 'GET' }),
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
  delete: (endpoint: string) => fetchWithAuth(endpoint, { method: 'DELETE' }),
  upload: (endpoint: string, formData: FormData) => fetchWithAuth(endpoint, {
    method: 'POST',
    body: formData,
  }),
};

// User API
export const userAPI = {
  getMe: () => api.get(`${API_VERSION}/auth/me`),
  updateMe: (data: any) => api.patch(`${API_VERSION}/auth/me`, data),
  verifyAuth: () => api.get(`${API_VERSION}/auth/verify`),
};

// Course API
export const courseAPI = {
  list: () => api.get(`${API_VERSION}/courses`),
  create: (data: any) => api.post(`${API_VERSION}/courses`, data),
  get: (id: string) => api.get(`${API_VERSION}/courses/${id}`),
  update: (id: string, data: any) => api.patch(`${API_VERSION}/courses/${id}`, data),
  delete: (id: string) => api.delete(`${API_VERSION}/courses/${id}`),
  
  // Modules
  getModules: (courseId: string) => api.get(`${API_VERSION}/courses/${courseId}/modules`),
  createModule: (courseId: string, data: any) => 
    api.post(`${API_VERSION}/courses/${courseId}/modules`, data),
  
  // Files
  uploadFile: (courseId: string, moduleId: string, formData: FormData) =>
    api.upload(`${API_VERSION}/courses/${courseId}/modules/${moduleId}/files`, formData),
};

// Activity API
export const activityAPI = {
  getRecent: () => api.get(`${API_VERSION}/activities/recent`),
  getStats: () => api.get(`${API_VERSION}/activities/stats`),
  log: (data: any) => api.post(`${API_VERSION}/activities/log`, data),
};

// Todo API
export const todoAPI = {
  list: () => api.get(`${API_VERSION}/todo-items`),
  create: (data: any) => api.post(`${API_VERSION}/todo-items`, data),
  update: (id: string, data: any) => api.patch(`${API_VERSION}/todo-items/${id}`, data),
  delete: (id: string) => api.delete(`${API_VERSION}/todo-items/${id}`),
};

// Export auth state helpers
export function getAuthState(): AuthState {
  return currentAuthState;
}

export function isAuthenticated(): boolean {
  return currentAuthState === AuthState.AUTHENTICATED;
}

export function needsRegistration(): boolean {
  return currentAuthState === AuthState.REGISTERING;
}

// Initialize auth state on module load
(async () => {
  if (auth.currentUser) {
    await login();
  }
})();