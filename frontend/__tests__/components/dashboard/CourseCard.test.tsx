import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseCard } from '@/components/dashboard/CourseCard';

describe('CourseCard', () => {
  const mockCourse = {
    id: 'course-123',
    title: 'Introduction to Computer Science',
    code: 'CS101',
    term: 'Fall 2024',
    students: 45,
    published: true,
    lastUpdated: '2024-01-15T10:30:00Z',
  };

  const mockProps = {
    course: mockCourse,
    uploading: false,
    onEdit: jest.fn(),
    onPublishToggle: jest.fn(),
    onUploadPdf: jest.fn(),
    showUploadButton: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders course information correctly', () => {
      render(<CourseCard {...mockProps} />);

      expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
      expect(screen.getByText(mockCourse.code)).toBeInTheDocument();
      expect(screen.getByText(mockCourse.term)).toBeInTheDocument();
      expect(
        screen.getByText(`${mockCourse.students} students`),
      ).toBeInTheDocument();
    });

    it('displays published badge when course is published', () => {
      render(<CourseCard {...mockProps} />);

      const badge = screen.getByText('Published');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('displays draft badge when course is not published', () => {
      const unpublishedProps = {
        ...mockProps,
        course: { ...mockCourse, published: false },
      };

      render(<CourseCard {...unpublishedProps} />);

      const badge = screen.getByText('Draft');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('shows upload button when showUploadButton is true', () => {
      render(<CourseCard {...mockProps} />);

      expect(
        screen.getByRole('button', { name: /upload pdf/i }),
      ).toBeInTheDocument();
    });

    it('hides upload button when showUploadButton is false', () => {
      render(<CourseCard {...mockProps} showUploadButton={false} />);

      expect(
        screen.queryByRole('button', { name: /upload pdf/i }),
      ).not.toBeInTheDocument();
    });

    it('displays last updated time correctly', () => {
      render(<CourseCard {...mockProps} />);

      // The component should format the date
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<CourseCard {...mockProps} />);

      // Open dropdown menu
      const menuButton = screen.getByRole('button', { name: /more options/i });
      await user.click(menuButton);

      // Click edit option
      const editButton = screen.getByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      expect(mockProps.onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onPublishToggle when publish toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<CourseCard {...mockProps} />);

      // Open dropdown menu
      const menuButton = screen.getByRole('button', { name: /more options/i });
      await user.click(menuButton);

      // Click unpublish option (since course is published)
      const unpublishButton = screen.getByRole('menuitem', {
        name: /unpublish/i,
      });
      await user.click(unpublishButton);

      expect(mockProps.onPublishToggle).toHaveBeenCalledTimes(1);
    });

    it('shows publish option when course is not published', async () => {
      const user = userEvent.setup();
      const unpublishedProps = {
        ...mockProps,
        course: { ...mockCourse, published: false },
      };

      render(<CourseCard {...unpublishedProps} />);

      const menuButton = screen.getByRole('button', { name: /more options/i });
      await user.click(menuButton);

      expect(
        screen.getByRole('menuitem', { name: /publish/i }),
      ).toBeInTheDocument();
    });

    it('handles file upload correctly', async () => {
      const user = userEvent.setup();
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      render(<CourseCard {...mockProps} />);

      // Find the hidden file input
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Upload file
      await user.upload(fileInput, file);

      expect(mockProps.onUploadPdf).toHaveBeenCalledWith(mockCourse.id, file);
    });

    it('shows uploading state when uploading is true', () => {
      render(<CourseCard {...mockProps} uploading={true} />);

      const uploadButton = screen.getByRole('button', { name: /uploading/i });
      expect(uploadButton).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('triggers file input when upload button is clicked', async () => {
      const user = userEvent.setup();
      render(<CourseCard {...mockProps} />);

      const uploadButton = screen.getByRole('button', { name: /upload pdf/i });
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.click(uploadButton);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover styles on mouse enter', async () => {
      const user = userEvent.setup();
      render(<CourseCard {...mockProps} />);

      const card = screen.getByRole('article');

      await user.hover(card);

      expect(card).toHaveClass('shadow-lg');
    });

    it('removes hover styles on mouse leave', async () => {
      const user = userEvent.setup();
      render(<CourseCard {...mockProps} />);

      const card = screen.getByRole('article');

      await user.hover(card);
      await user.unhover(card);

      expect(card).not.toHaveClass('shadow-lg');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<CourseCard {...mockProps} />);

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        expect.stringContaining(mockCourse.title),
      );
    });

    it('has keyboard accessible dropdown menu', async () => {
      render(<CourseCard {...mockProps} />);

      const menuButton = screen.getByRole('button', { name: /more options/i });

      // Focus and open with keyboard
      menuButton.focus();
      fireEvent.keyDown(menuButton, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('accepts only PDF files for upload', () => {
      render(<CourseCard {...mockProps} />);

      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toHaveAttribute('accept', '.pdf');
    });
  });

  describe('Error Handling', () => {
    it('handles upload errors gracefully', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Upload failed');
      const errorProps = {
        ...mockProps,
        onUploadPdf: jest.fn().mockRejectedValue(mockError),
      };

      render(<CourseCard {...errorProps} />);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(errorProps.onUploadPdf).toHaveBeenCalled();
      });
    });

    it('handles missing course data gracefully', () => {
      const incompleteCourse = {
        id: 'course-123',
        title: 'Test Course',
        code: 'TEST101',
        term: 'Fall 2024',
        students: 0,
        published: false,
        lastUpdated: '',
      };

      render(<CourseCard {...mockProps} course={incompleteCourse} />);

      expect(screen.getByText('Test Course')).toBeInTheDocument();
      expect(screen.getByText('0 students')).toBeInTheDocument();
    });
  });
});
