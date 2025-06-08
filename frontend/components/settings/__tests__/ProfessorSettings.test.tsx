import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfessorSettings from '../ProfessorSettings';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock components that might cause issues in tests
jest.mock('@/components/learn-x/Header', () => ({
  __esModule: true,
  default: () => <div>Header</div>,
}));

jest.mock('@/components/landing/Footer', () => ({
  __esModule: true,
  default: () => <div>Footer</div>,
}));

describe('ProfessorSettings', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ email: 'professor@example.com' }),
        });
      }
      if (url.includes('/professor/profile')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              email: 'professor@example.com',
              name: 'Professor Smith',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings component with all tabs', async () => {
    render(<ProfessorSettings />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
    });
  });

  it('shows account panel by default', async () => {
    render(<ProfessorSettings />);

    await waitFor(() => {
      expect(screen.getByText('Account Information')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter your email'),
      ).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(<ProfessorSettings />);

    await waitFor(() => {
      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });

    // Click on Notifications tab
    fireEvent.click(screen.getByRole('tab', { name: /Notifications/i }));

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    // Click on Privacy tab
    fireEvent.click(screen.getByRole('tab', { name: /Privacy/i }));

    await waitFor(() => {
      expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
    });
  });

  it('validates email input', async () => {
    render(<ProfessorSettings />);

    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address'),
      ).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    render(<ProfessorSettings />);

    await waitFor(() => {
      const passwordInput = screen.getByPlaceholderText(
        'Enter new password (leave blank to keep current)',
      );
      fireEvent.change(passwordInput, { target: { value: '123' } });
    });

    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 6 characters long.'),
      ).toBeInTheDocument();
    });
  });

  it('updates account information successfully', async () => {
    render(<ProfessorSettings />);

    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, {
        target: { value: 'newemail@example.com' },
      });
    });

    // Mock successful update
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
