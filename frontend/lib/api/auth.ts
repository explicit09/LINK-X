import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  profile?: UserProfile;
  firebase_uid?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  user_id: string;
  name: string;
  university?: string;
  onboard_answers?: Record<string, string | number | boolean>;
  want_quizzes?: boolean;
  model_preference?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  access_token: string;
  refresh_token?: string;
  csrf_token?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'student' | 'instructor';
  university?: string;
}

class AuthAPI {
  // New unified auth endpoints
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    // Tokens are now stored in httpOnly cookies by the server
    // Store CSRF token if provided
    if (response.csrf_token) {
      sessionStorage.setItem('csrf_token', response.csrf_token);
    }
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    // Tokens are now stored in httpOnly cookies by the server
    // Store CSRF token if provided
    if (response.csrf_token) {
      sessionStorage.setItem('csrf_token', response.csrf_token);
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Clear CSRF token
      sessionStorage.removeItem('csrf_token');
      // Clear any legacy tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    // Refresh token is in httpOnly cookie, server will handle it
    const response = await apiClient.post<AuthResponse>('/auth/refresh');

    // Update CSRF token if provided
    if (response.csrf_token) {
      sessionStorage.setItem('csrf_token', response.csrf_token);
    }

    return response;
  }

  // Firebase session management (for Firebase Auth integration)
  async sessionLogin(idToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/auth/firebase-login',
      {
        idToken,
      },
    );

    // Store tokens
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
    }

    return response;
  }

  // User profile
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  }

  async updateCurrentUser(data: Partial<UserProfile>): Promise<User> {
    return apiClient.patch<User>('/auth/me', data);
  }

  async deleteCurrentUser(): Promise<void> {
    await apiClient.delete('/auth/me');
    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Legacy registration endpoints (backward compatibility)
  async registerStudent(idToken: string, data: RegisterData): Promise<User> {
    const response = await this.register({
      ...data,
      role: 'student',
    });
    return response.user;
  }

  async registerInstructor(idToken: string, data: RegisterData): Promise<User> {
    const response = await this.register({
      ...data,
      role: 'instructor',
    });
    return response.user;
  }

  // Password management
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password });
  }

  // Token management helpers
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

export const authAPI = new AuthAPI();
