import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseForm } from '@/components/dashboard/CourseForm';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  api: {
    courses: {
      createCourse: jest.fn(),
      updateCourse: jest.fn(),
    },
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

const mockToast = {
  toast: jest.fn(),
};

describe('CourseForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  const existingCourse = {
    id: 'course-123',
    title: 'Existing Course',
    code: 'CS101',
    term: 'Fall 2024',
    description: 'This is an existing course',
    maxStudents: 30,
    published: false,
  };

  beforeEach(() => {
    (useToast as jest.Mock).mockReturnValue(mockToast);
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders empty form for new course', () => {
      render(<CourseForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/course title/i)).toHaveValue('');
      expect(screen.getByLabelText(/course code/i)).toHaveValue('');
      expect(screen.getByLabelText(/term/i)).toHaveValue('');
      expect(screen.getByLabelText(/description/i)).toHaveValue('');
      expect(screen.getByLabelText(/maximum students/i)).toHaveValue(50);
      expect(screen.getByRole('button', { name: /create course/i })).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<CourseForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create course/i });
      await user.click(submitButton);
      
      expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/course code is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/term is required/i)).toBeInTheDocument();
    });

    it('validates course code format', async () => {
      const user = userEvent.setup();
      render(<CourseForm {...defaultProps} />);
      
      const codeInput = screen.getByLabelText(/course code/i);
      await user.type(codeInput, 'invalid code!');
      
      const submitButton = screen.getByRole('button', { name: /create course/i });
      await user.click(submitButton);
      
      expect(await screen.findByText(/course code must be alphanumeric/i)).toBeInTheDocument();
    });

    it('creates new course successfully', async () => {
      const user = userEvent.setup();
      const newCourse = {
        id: 'new-course-123',
        title: 'New Course',
        code: 'CS201',
        term: 'Spring 2024',
        description: 'A new course',
        maxStudents: 40,
      };
      
      (api.courses.createCourse as jest.Mock).mockResolvedValue(newCourse);
      
      render(<CourseForm {...defaultProps} />);
      
      // Fill out form
      await user.type(screen.getByLabelText(/course title/i), 'New Course');
      await user.type(screen.getByLabelText(/course code/i), 'CS201');
      await user.selectOptions(screen.getByLabelText(/term/i), 'Spring 2024');
      await user.type(screen.getByLabelText(/description/i), 'A new course');
      await user.clear(screen.getByLabelText(/maximum students/i));
      await user.type(screen.getByLabelText(/maximum students/i), '40');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      await waitFor(() => {
        expect(api.courses.createCourse).toHaveBeenCalledWith({
          title: 'New Course',
          code: 'CS201',
          term: 'Spring 2024',
          description: 'A new course',
          maxStudents: 40,
          published: false,
        });
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Course created successfully',
        });
        expect(mockOnSuccess).toHaveBeenCalledWith(newCourse);
      });
    });

    it('handles creation error', async () => {
      const user = userEvent.setup();
      (api.courses.createCourse as jest.Mock).mockRejectedValue(
        new Error('Course code already exists')
      );
      
      render(<CourseForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/course title/i), 'New Course');
      await user.type(screen.getByLabelText(/course code/i), 'CS101');
      await user.selectOptions(screen.getByLabelText(/term/i), 'Fall 2024');
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Course code already exists',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Edit Mode', () => {
    it('renders form with existing course data', () => {
      render(<CourseForm {...defaultProps} course={existingCourse} />);
      
      expect(screen.getByLabelText(/course title/i)).toHaveValue('Existing Course');
      expect(screen.getByLabelText(/course code/i)).toHaveValue('CS101');
      expect(screen.getByLabelText(/term/i)).toHaveValue('Fall 2024');
      expect(screen.getByLabelText(/description/i)).toHaveValue('This is an existing course');
      expect(screen.getByLabelText(/maximum students/i)).toHaveValue(30);
      expect(screen.getByRole('button', { name: /update course/i })).toBeInTheDocument();
    });

    it('disables course code field in edit mode', () => {
      render(<CourseForm {...defaultProps} course={existingCourse} />);
      
      const codeInput = screen.getByLabelText(/course code/i);
      expect(codeInput).toBeDisabled();
    });

    it('updates course successfully', async () => {
      const user = userEvent.setup();
      const updatedCourse = {
        ...existingCourse,
        title: 'Updated Course Title',
        description: 'Updated description',
      };
      
      (api.courses.updateCourse as jest.Mock).mockResolvedValue(updatedCourse);
      
      render(<CourseForm {...defaultProps} course={existingCourse} />);
      
      // Update form fields
      const titleInput = screen.getByLabelText(/course title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Course Title');
      
      const descInput = screen.getByLabelText(/description/i);
      await user.clear(descInput);
      await user.type(descInput, 'Updated description');
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /update course/i }));
      
      await waitFor(() => {
        expect(api.courses.updateCourse).toHaveBeenCalledWith(existingCourse.id, {
          title: 'Updated Course Title',
          code: 'CS101',
          term: 'Fall 2024',
          description: 'Updated description',
          maxStudents: 30,
          published: false,
        });
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Course updated successfully',
        });
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedCourse);
      });
    });
  });

  describe('Form Interactions', () => {
    it('handles cancel action', async () => {
      const user = userEvent.setup();
      render(<CourseForm {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      (api.courses.createCourse as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<CourseForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/course title/i), 'New Course');
      await user.type(screen.getByLabelText(/course code/i), 'CS201');
      await user.selectOptions(screen.getByLabelText(/term/i), 'Spring 2024');
      
      const submitButton = screen.getByRole('button', { name: /create course/i });
      await user.click(submitButton);
      
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('disables form during submission', async () => {
      const user = userEvent.setup();
      (api.courses.createCourse as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<CourseForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/course title/i), 'New Course');
      await user.type(screen.getByLabelText(/course code/i), 'CS201');
      await user.selectOptions(screen.getByLabelText(/term/i), 'Spring 2024');
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      expect(screen.getByLabelText(/course title/i)).toBeDisabled();
      expect(screen.getByLabelText(/course code/i)).toBeDisabled();
      expect(screen.getByLabelText(/term/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Term Selection', () => {
    it('provides current and future terms', () => {
      render(<CourseForm {...defaultProps} />);
      
      const termSelect = screen.getByLabelText(/term/i);
      const options = Array.from(termSelect.querySelectorAll('option'));
      
      expect(options).toHaveLength(5); // Empty option + 4 terms
      expect(options[1]).toHaveTextContent(/Fall \d{4}/);
      expect(options[2]).toHaveTextContent(/Spring \d{4}/);
      expect(options[3]).toHaveTextContent(/Summer \d{4}/);
    });

    it('generates correct year for terms', () => {
      const currentYear = new Date().getFullYear();
      render(<CourseForm {...defaultProps} />);
      
      const termSelect = screen.getByLabelText(/term/i);
      const options = Array.from(termSelect.querySelectorAll('option'));
      
      // Check that years are current or future
      options.slice(1).forEach(option => {
        const year = Number.parseInt(option.textContent?.match(/\d{4}/)?.[0]);
        expect(year).toBeGreaterThanOrEqual(currentYear);
      });
    });
  });

  describe('Validation Rules', () => {
    it('validates title length', async () => {
      const user = userEvent.setup();
      render(<CourseForm {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/course title/i);
      await user.type(titleInput, 'AB'); // Too short
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      expect(await screen.findByText(/title must be at least 3 characters/i)).toBeInTheDocument();
    });

    it('validates maximum title length', async () => {
      const user = userEvent.setup();
      render(<CourseForm {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/course title/i);
      await user.type(titleInput, 'A'.repeat(101)); // Too long
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      expect(await screen.findByText(/title must not exceed 100 characters/i)).toBeInTheDocument();
    });

    it('validates student limit range', async () => {
      const user = userEvent.setup();
      render(<CourseForm {...defaultProps} />);
      
      const studentInput = screen.getByLabelText(/maximum students/i);
      await user.clear(studentInput);
      await user.type(studentInput, '0');
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      expect(await screen.findByText(/must be at least 1/i)).toBeInTheDocument();
      
      await user.clear(studentInput);
      await user.type(studentInput, '501');
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      expect(await screen.findByText(/cannot exceed 500/i)).toBeInTheDocument();
    });

    it('trims whitespace from inputs', async () => {
      const user = userEvent.setup();
      (api.courses.createCourse as jest.Mock).mockResolvedValue({});
      
      render(<CourseForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/course title/i), '  Trimmed Title  ');
      await user.type(screen.getByLabelText(/course code/i), '  CS201  ');
      await user.selectOptions(screen.getByLabelText(/term/i), 'Spring 2024');
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      await waitFor(() => {
        expect(api.courses.createCourse).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Trimmed Title',
            code: 'CS201',
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<CourseForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/course title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/course code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/term/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximum students/i)).toBeInTheDocument();
    });

    it('shows error messages with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<CourseForm {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/course title/i);
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
        expect(titleInput).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
      });
    });

    it('focuses first error field on validation failure', async () => {
      const user = userEvent.setup();
      render(<CourseForm {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /create course/i }));
      
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/course title/i);
        expect(document.activeElement).toBe(titleInput);
      });
    });

    it('maintains focus management during loading', async () => {
      const user = userEvent.setup();
      (api.courses.createCourse as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<CourseForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/course title/i), 'New Course');
      await user.type(screen.getByLabelText(/course code/i), 'CS201');
      await user.selectOptions(screen.getByLabelText(/term/i), 'Spring 2024');
      
      const submitButton = screen.getByRole('button', { name: /create course/i });
      submitButton.focus();
      
      await user.click(submitButton);
      
      // Focus should remain on submit button during loading
      expect(document.activeElement).toBe(submitButton);
    });
  });
});