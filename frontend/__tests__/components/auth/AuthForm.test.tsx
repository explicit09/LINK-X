import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthForm } from '@/components/auth-form';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/lib/api/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    forgotPassword: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

const mockToast = {
  toast: jest.fn(),
};

describe('AuthForm', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useToast as jest.Mock).mockReturnValue(mockToast);
    jest.clearAllMocks();
  });

  describe('Login Mode', () => {
    it('renders login form correctly', () => {
      render(<AuthForm mode="login" />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="login" />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);
      
      expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="login" />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    });

    it('handles successful login', async () => {
      const { authApi } = require('@/lib/api/auth');
      authApi.login.mockResolvedValue({
        user: { id: '123', email: 'test@example.com', role: 'student' },
        token: 'fake-token',
      });

      const user = userEvent.setup();
      render(<AuthForm mode="login" />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Logged in successfully',
        });
      });
    });

    it('handles login error', async () => {
      const { authApi } = require('@/lib/api/auth');
      authApi.login.mockRejectedValue(new Error('Invalid credentials'));

      const user = userEvent.setup();
      render(<AuthForm mode="login" />);
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Invalid credentials',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Register Mode', () => {
    it('renders register form correctly', () => {
      render(<AuthForm mode="register" />);
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/i am an instructor/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('validates password match', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="register" />);
      
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password456');
      await user.click(screen.getByRole('button', { name: /create account/i }));
      
      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('validates password strength', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="register" />);
      
      await user.type(screen.getByLabelText(/^password$/i), '123');
      await user.click(screen.getByRole('button', { name: /create account/i }));
      
      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('handles successful registration', async () => {
      const { authApi } = require('@/lib/api/auth');
      authApi.register.mockResolvedValue({
        user: { id: '123', email: 'new@example.com', role: 'student' },
        token: 'fake-token',
      });

      const user = userEvent.setup();
      render(<AuthForm mode="register" />);
      
      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'new@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));
      
      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'new@example.com',
          password: 'password123',
          role: 'student',
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('handles instructor registration', async () => {
      const { authApi } = require('@/lib/api/auth');
      authApi.register.mockResolvedValue({
        user: { id: '123', email: 'instructor@example.com', role: 'instructor' },
        token: 'fake-token',
      });

      const user = userEvent.setup();
      render(<AuthForm mode="register" />);
      
      await user.type(screen.getByLabelText(/name/i), 'Prof. Smith');
      await user.type(screen.getByLabelText(/email/i), 'instructor@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByLabelText(/i am an instructor/i));
      await user.click(screen.getByRole('button', { name: /create account/i }));
      
      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith({
          name: 'Prof. Smith',
          email: 'instructor@example.com',
          password: 'password123',
          role: 'instructor',
        });
      });
    });
  });

  describe('Forgot Password Mode', () => {
    it('renders forgot password form correctly', () => {
      render(<AuthForm mode="forgot-password" />);
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
      expect(screen.getByText(/remember your password/i)).toBeInTheDocument();
    });

    it('handles password reset request', async () => {
      const { authApi } = require('@/lib/api/auth');
      authApi.forgotPassword.mockResolvedValue({ message: 'Reset link sent' });

      const user = userEvent.setup();
      render(<AuthForm mode="forgot-password" />);
      
      await user.type(screen.getByLabelText(/email/i), 'forgot@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));
      
      await waitFor(() => {
        expect(authApi.forgotPassword).toHaveBeenCalledWith({
          email: 'forgot@example.com',
        });
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Password reset link sent to your email',
        });
      });
    });
  });

  describe('Google OAuth', () => {
    it('renders Google sign-in button', () => {
      render(<AuthForm mode="login" />);
      
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });

    it('handles Google OAuth flow', async () => {
      const user = userEvent.setup();
      render(<AuthForm mode="login" />);
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);
      
      // Google OAuth is handled by GoogleAuthButton component
      // Just verify the button exists and is clickable
      expect(googleButton).toBeEnabled();
    });
  });

  describe('Form Navigation', () => {
    it('navigates from login to register', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AuthForm mode="login" />);
      
      const registerLink = screen.getByText(/don't have an account/i).parentElement;
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('navigates from register to login', () => {
      render(<AuthForm mode="register" />);
      
      const loginLink = screen.getByText(/already have an account/i).parentElement;
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('navigates to forgot password', () => {
      render(<AuthForm mode="login" />);
      
      const forgotLink = screen.getByText(/forgot password/i);
      expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    });
  });
});