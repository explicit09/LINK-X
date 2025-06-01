import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Mock Firebase
jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  getAuth: jest.fn(() => ({})),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock API
jest.mock('@/lib/api/auth', () => ({
  authApi: {
    loginWithGoogle: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

const mockToast = {
  toast: jest.fn(),
};

describe('GoogleAuthButton', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useToast as jest.Mock).mockReturnValue(mockToast);
    jest.clearAllMocks();
  });

  it('renders Google sign-in button', () => {
    render(<GoogleAuthButton />);

    const button = screen.getByRole('button', {
      name: /continue with google/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('w-full');
  });

  it('renders with custom text', () => {
    render(<GoogleAuthButton text="Sign up with Google" />);

    expect(screen.getByText(/sign up with google/i)).toBeInTheDocument();
  });

  it('handles successful Google authentication', async () => {
    const mockUser = {
      uid: 'google-user-123',
      email: 'user@gmail.com',
      displayName: 'Google User',
      getIdToken: jest.fn().mockResolvedValue('google-token'),
    };

    const mockCredential = {
      user: mockUser,
    };

    (signInWithPopup as jest.Mock).mockResolvedValue(mockCredential);

    const { authApi } = require('@/lib/api/auth');
    authApi.loginWithGoogle.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'user@gmail.com',
        role: 'student',
      },
      token: 'api-token',
    });

    const user = userEvent.setup();
    render(<GoogleAuthButton />);

    const button = screen.getByRole('button', {
      name: /continue with google/i,
    });
    await user.click(button);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
      expect(authApi.loginWithGoogle).toHaveBeenCalledWith('google-token');
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Signed in with Google successfully',
      });
    });
  });

  it('handles new user registration flow', async () => {
    const mockUser = {
      uid: 'new-google-user',
      email: 'newuser@gmail.com',
      displayName: 'New User',
      getIdToken: jest.fn().mockResolvedValue('google-token'),
    };

    (signInWithPopup as jest.Mock).mockResolvedValue({ user: mockUser });

    const { authApi } = require('@/lib/api/auth');
    authApi.loginWithGoogle.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'newuser@gmail.com',
        role: 'student',
        isNewUser: true,
      },
      token: 'api-token',
    });

    const user = userEvent.setup();
    render(<GoogleAuthButton />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('handles Google popup cancellation', async () => {
    const cancelError = new Error('Popup closed by user');
    (cancelError as any).code = 'auth/popup-closed-by-user';

    (signInWithPopup as jest.Mock).mockRejectedValue(cancelError);

    const user = userEvent.setup();
    render(<GoogleAuthButton />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockToast.toast).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  it('handles authentication errors', async () => {
    const authError = new Error('Authentication failed');
    (authError as any).code = 'auth/operation-not-allowed';

    (signInWithPopup as jest.Mock).mockRejectedValue(authError);

    const user = userEvent.setup();
    render(<GoogleAuthButton />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Authentication Error',
        description: 'Google sign-in is not enabled. Please contact support.',
        variant: 'destructive',
      });
    });
  });

  it('handles API errors after Google auth', async () => {
    const mockUser = {
      uid: 'google-user-123',
      email: 'user@gmail.com',
      getIdToken: jest.fn().mockResolvedValue('google-token'),
    };

    (signInWithPopup as jest.Mock).mockResolvedValue({ user: mockUser });

    const { authApi } = require('@/lib/api/auth');
    authApi.loginWithGoogle.mockRejectedValue(new Error('Server error'));

    const user = userEvent.setup();
    render(<GoogleAuthButton />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Server error',
        variant: 'destructive',
      });
    });
  });

  it('shows loading state during authentication', async () => {
    let resolveAuth: any;
    const authPromise = new Promise((resolve) => {
      resolveAuth = resolve;
    });

    (signInWithPopup as jest.Mock).mockReturnValue(authPromise);

    const user = userEvent.setup();
    render(<GoogleAuthButton />);

    const button = screen.getByRole('button');
    await user.click(button);

    // Check loading state
    expect(button).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // Resolve authentication
    resolveAuth({ user: { getIdToken: jest.fn().mockResolvedValue('token') } });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('applies custom className', () => {
    render(<GoogleAuthButton className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('handles missing user email gracefully', async () => {
    const mockUser = {
      uid: 'no-email-user',
      displayName: 'No Email User',
      getIdToken: jest.fn().mockResolvedValue('google-token'),
      // email is undefined
    };

    (signInWithPopup as jest.Mock).mockResolvedValue({ user: mockUser });

    const user = userEvent.setup();
    render(<GoogleAuthButton />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'No email associated with this Google account',
        variant: 'destructive',
      });
    });
  });
});
