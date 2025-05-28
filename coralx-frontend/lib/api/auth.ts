import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  profile?: UserProfile;
}

export interface UserProfile {
  user_id: string;
  name: string;
  university?: string;
  onboard_answers?: Record<string, any>;
  want_quizzes?: boolean;
  model_preference?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  access_token: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  university?: string;
}

class AuthAPI {
  // Session management
  async sessionLogin(idToken: string): Promise<boolean> {
    try {
      await apiClient.post('/api/v1/auth/sessionLogin', { idToken });
      return true;
    } catch {
      return false;
    }
  }

  // User profile
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/api/v1/auth/me');
  }

  async updateCurrentUser(data: Partial<UserProfile>): Promise<User> {
    return apiClient.patch<User>('/api/v1/auth/me', data);
  }

  async deleteCurrentUser(): Promise<void> {
    await apiClient.delete('/api/v1/auth/me');
  }

  // Registration
  async registerStudent(idToken: string, data: RegisterData): Promise<User> {
    return apiClient.post<User>('/api/v1/auth/register/student', {
      idToken,
      ...data
    });
  }

  async registerInstructor(idToken: string, data: RegisterData): Promise<User> {
    return apiClient.post<User>('/api/v1/auth/register/instructor', {
      idToken,
      ...data
    });
  }

  // Password management
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/api/v1/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/api/v1/auth/reset-password', { token, password });
  }
}

export const authAPI = new AuthAPI();