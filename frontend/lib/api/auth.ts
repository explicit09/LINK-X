import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  profile?: UserProfile;
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

  // User profile
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/api/v2/auth/me');
  }

  async updateCurrentUser(data: Partial<UserProfile>): Promise<User> {
    return apiClient.patch<User>('/api/v2/auth/me', data);
  }

  async deleteCurrentUser(): Promise<void> {
    await apiClient.delete('/api/v2/auth/me');
  }
}

export const authAPIClass = new AuthAPI();
