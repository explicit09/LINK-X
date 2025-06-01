import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentDash } from '@/components/dashboard/StudentDash';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    courses: {
      listCourses: jest.fn(),
      enrollInCourse: jest.fn(),
      getMyCourses: jest.fn(),
    },
    users: {
      getProfile: jest.fn(),
    },
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

describe('StudentDash', () => {
  const mockUser = {
    id: 'student-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'student',
  };

  const mockCourses = [
    {
      id: 'course-1',
      title: 'Introduction to React',
      code: 'CS201',
      term: 'Spring 2024',
      instructor: 'Dr. Smith',
      students: 30,
      modules: 12,
      progress: 45,
      enrolled: true,
    },
    {
      id: 'course-2',
      title: 'Advanced JavaScript',
      code: 'CS301',
      term: 'Spring 2024',
      instructor: 'Prof. Johnson',
      students: 25,
      modules: 10,
      progress: 0,
      enrolled: false,
    },
  ];

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders student dashboard with user info', async () => {
      (api.users.getProfile as jest.Mock).mockResolvedValue(mockUser);
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses.filter(c => c.enrolled));
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      expect(screen.getByText(`Welcome back, ${mockUser.name}!`)).toBeInTheDocument();
      expect(screen.getByText('My Courses')).toBeInTheDocument();
      expect(screen.getByText('Available Courses')).toBeInTheDocument();
    });

    it('shows loading state while fetching courses', () => {
      (api.courses.getMyCourses as jest.Mock).mockImplementation(() => new Promise(() => {}));
      
      render(<StudentDash user={mockUser} />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('displays enrolled courses correctly', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([mockCourses[0]]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to React')).toBeInTheDocument();
        expect(screen.getByText('45% Complete')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue learning/i })).toBeInTheDocument();
      });
    });

    it('displays available courses for enrollment', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enroll now/i })).toBeInTheDocument();
      });
    });
  });

  describe('Course Enrollment', () => {
    it('handles course enrollment with access code', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.enrollInCourse as jest.Mock).mockResolvedValue({ success: true });

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
      });

      // Click enroll button
      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      // Access code dialog should appear
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/access code/i)).toBeInTheDocument();

      // Enter access code
      const accessCodeInput = screen.getByLabelText(/access code/i);
      await user.type(accessCodeInput, 'TESTCODE123');

      // Submit enrollment
      const submitButton = screen.getByRole('button', { name: /enroll/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.courses.enrollInCourse).toHaveBeenCalledWith('course-2', 'TESTCODE123');
        expect(mockRouter.push).toHaveBeenCalledWith('/courses/course-2');
      });
    });

    it('handles enrollment errors', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.enrollInCourse as jest.Mock).mockRejectedValue(new Error('Invalid access code'));

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
      });

      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      const accessCodeInput = screen.getByLabelText(/access code/i);
      await user.type(accessCodeInput, 'WRONGCODE');

      const submitButton = screen.getByRole('button', { name: /enroll/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid access code/i)).toBeInTheDocument();
      });
    });

    it('validates access code input', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
      });

      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      // Try to submit without access code
      const submitButton = screen.getByRole('button', { name: /enroll/i });
      await user.click(submitButton);

      expect(screen.getByText(/access code is required/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to course page when continue learning is clicked', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([mockCourses[0]]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue learning/i });
      await user.click(continueButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/learn/course-1');
    });

    it('shows view all courses link', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.listCourses as jest.Mock).mockResolvedValue([]);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        const viewAllLink = screen.getByRole('link', { name: /view all courses/i });
        expect(viewAllLink).toBeInTheDocument();
        expect(viewAllLink).toHaveAttribute('href', '/courses');
      });
    });
  });

  describe('Statistics Display', () => {
    it('displays course statistics correctly', async () => {
      const enrolledCourses = [
        { ...mockCourses[0], progress: 100 },
        { ...mockCourses[1], progress: 50, enrolled: true },
      ];

      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(enrolledCourses);
      (api.courses.listCourses as jest.Mock).mockResolvedValue([]);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Total courses
        expect(screen.getByText('1')).toBeInTheDocument(); // Completed courses
        expect(screen.getByText('75%')).toBeInTheDocument(); // Average progress
      });
    });

    it('shows zero stats for new students', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument(); // No courses
        expect(screen.getByText('Get started by enrolling in a course!')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter', () => {
    it('filters courses by search term', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
        expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search courses/i);
      await user.type(searchInput, 'React');

      await waitFor(() => {
        expect(screen.getByText('Introduction to React')).toBeInTheDocument();
        expect(screen.queryByText('Advanced JavaScript')).not.toBeInTheDocument();
      });
    });

    it('filters courses by term', async () => {
      const user = userEvent.setup();
      const coursesWithTerms = [
        { ...mockCourses[0], term: 'Fall 2023' },
        { ...mockCourses[1], term: 'Spring 2024' },
      ];

      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(coursesWithTerms);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      });

      const termFilter = screen.getByRole('combobox', { name: /filter by term/i });
      await user.selectOptions(termFilter, 'Spring 2024');

      await waitFor(() => {
        expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
        expect(screen.queryByText('Introduction to React')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when courses fail to load', async () => {
      (api.courses.getMyCourses as jest.Mock).mockRejectedValue(new Error('Network error'));
      (api.courses.listCourses as jest.Mock).mockResolvedValue([]);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load courses/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('retries loading courses when retry button is clicked', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([mockCourses[0]]);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load courses/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Introduction to React')).toBeInTheDocument();
        expect(api.courses.getMyCourses).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([mockCourses[0]]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent(`Welcome back, ${mockUser.name}!`);
        expect(headings[1]).toHaveTextContent('My Courses');
        expect(headings[2]).toHaveTextContent('Available Courses');
      });
    });

    it('has accessible form controls', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue([]);
      (api.courses.listCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<StudentDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Advanced JavaScript')).toBeInTheDocument();
      });

      const enrollButton = screen.getByRole('button', { name: /enroll now/i });
      await user.click(enrollButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');

      const accessCodeInput = screen.getByLabelText(/access code/i);
      expect(accessCodeInput).toHaveAttribute('aria-required', 'true');
    });
  });
});