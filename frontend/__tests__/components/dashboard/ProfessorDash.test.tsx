import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfessorDash } from '@/components/dashboard/ProfessorDash';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    courses: {
      getMyCourses: jest.fn(),
      createCourse: jest.fn(),
      updateCourse: jest.fn(),
      deleteCourse: jest.fn(),
      publishCourse: jest.fn(),
      unpublishCourse: jest.fn(),
      getCourseStats: jest.fn(),
    },
    files: {
      uploadFile: jest.fn(),
    },
    modules: {
      createModule: jest.fn(),
      updateModule: jest.fn(),
      deleteModule: jest.fn(),
      getModules: jest.fn(),
    },
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

const mockToast = {
  toast: jest.fn(),
};

describe('ProfessorDash', () => {
  const mockUser = {
    id: 'prof-123',
    name: 'Dr. Smith',
    email: 'smith@university.edu',
    role: 'instructor',
  };

  const mockCourses = [
    {
      id: 'course-1',
      title: 'Introduction to Programming',
      code: 'CS101',
      term: 'Fall 2024',
      students: 45,
      published: true,
      lastUpdated: '2024-01-15T10:00:00Z',
      modules: 12,
      assignments: 8,
    },
    {
      id: 'course-2',
      title: 'Data Structures',
      code: 'CS201',
      term: 'Fall 2024',
      students: 30,
      published: false,
      lastUpdated: '2024-01-10T10:00:00Z',
      modules: 8,
      assignments: 5,
    },
    {
      id: 'course-3',
      title: 'Algorithms',
      code: 'CS301',
      term: 'Spring 2024',
      students: 25,
      published: true,
      lastUpdated: '2024-01-05T10:00:00Z',
      modules: 10,
      assignments: 6,
    },
  ];

  const mockStats = {
    totalStudents: 100,
    activeCourses: 2,
    totalAssignments: 19,
    averageCompletion: 75,
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useToast as jest.Mock).mockReturnValue(mockToast);
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders professor dashboard with user info', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.getCourseStats as jest.Mock).mockResolvedValue(mockStats);

      render(<ProfessorDash user={mockUser} />);

      expect(screen.getByText(`Welcome, ${mockUser.name}`)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create new course/i }),
      ).toBeInTheDocument();
    });

    it('shows loading state while fetching courses', () => {
      (api.courses.getMyCourses as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      render(<ProfessorDash user={mockUser} />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('displays course statistics', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.getCourseStats as jest.Mock).mockResolvedValue(mockStats);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // Total students
        expect(screen.getByText('2')).toBeInTheDocument(); // Active courses
        expect(screen.getByText('19')).toBeInTheDocument(); // Total assignments
        expect(screen.getByText('75%')).toBeInTheDocument(); // Average completion
      });
    });

    it('displays courses grouped by term', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.getCourseStats as jest.Mock).mockResolvedValue(mockStats);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Fall 2024')).toBeInTheDocument();
        expect(screen.getByText('Spring 2024')).toBeInTheDocument();
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
        expect(screen.getByText('Algorithms')).toBeInTheDocument();
      });
    });
  });

  describe('Course Management', () => {
    it('opens create course modal', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<ProfessorDash user={mockUser} />);

      const createButton = screen.getByRole('button', {
        name: /create new course/i,
      });
      await user.click(createButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/create new course/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/course title/i)).toBeInTheDocument();
    });

    it('creates new course successfully', async () => {
      const user = userEvent.setup();
      const newCourse = {
        id: 'course-4',
        title: 'Machine Learning',
        code: 'CS401',
        term: 'Fall 2024',
      };

      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.createCourse as jest.Mock).mockResolvedValue(newCourse);

      render(<ProfessorDash user={mockUser} />);

      // Open create modal
      await user.click(
        screen.getByRole('button', { name: /create new course/i }),
      );

      // Fill form
      await user.type(
        screen.getByLabelText(/course title/i),
        'Machine Learning',
      );
      await user.type(screen.getByLabelText(/course code/i), 'CS401');
      await user.selectOptions(screen.getByLabelText(/term/i), 'Fall 2024');

      // Submit
      await user.click(screen.getByRole('button', { name: /create course/i }));

      await waitFor(() => {
        expect(api.courses.createCourse).toHaveBeenCalled();
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Course created successfully',
        });
        expect(api.courses.getMyCourses).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });

    it('handles course edit', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.updateCourse as jest.Mock).mockResolvedValue({
        ...mockCourses[0],
        title: 'Updated Title',
      });

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      // Open course menu
      const courseCard = screen.getByTestId(`course-card-${mockCourses[0].id}`);
      const menuButton = within(courseCard).getByRole('button', {
        name: /more options/i,
      });
      await user.click(menuButton);

      // Click edit
      const editButton = screen.getByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      // Should open edit modal
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Introduction to Programming'),
      ).toBeInTheDocument();
    });

    it('handles course deletion with confirmation', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.deleteCourse as jest.Mock).mockResolvedValue({});

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      // Open course menu for unpublished course
      const courseCard = screen.getByTestId(`course-card-${mockCourses[1].id}`);
      const menuButton = within(courseCard).getByRole('button', {
        name: /more options/i,
      });
      await user.click(menuButton);

      // Click delete
      const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteButton);

      // Confirmation dialog
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to delete/i),
      ).toBeInTheDocument();

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(api.courses.deleteCourse).toHaveBeenCalledWith(
          mockCourses[1].id,
        );
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Course deleted successfully',
        });
      });
    });

    it('prevents deletion of published courses', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      // Open course menu for published course
      const courseCard = screen.getByTestId(`course-card-${mockCourses[0].id}`);
      const menuButton = within(courseCard).getByRole('button', {
        name: /more options/i,
      });
      await user.click(menuButton);

      // Delete option should be disabled
      const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
      expect(deleteButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Course Publishing', () => {
    it('publishes a draft course', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.publishCourse as jest.Mock).mockResolvedValue({
        ...mockCourses[1],
        published: true,
      });

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      const courseCard = screen.getByTestId(`course-card-${mockCourses[1].id}`);
      const menuButton = within(courseCard).getByRole('button', {
        name: /more options/i,
      });
      await user.click(menuButton);

      const publishButton = screen.getByRole('menuitem', { name: /publish/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(api.courses.publishCourse).toHaveBeenCalledWith(
          mockCourses[1].id,
        );
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Course published successfully',
        });
      });
    });

    it('unpublishes a published course', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.unpublishCourse as jest.Mock).mockResolvedValue({
        ...mockCourses[0],
        published: false,
      });

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      const courseCard = screen.getByTestId(`course-card-${mockCourses[0].id}`);
      const menuButton = within(courseCard).getByRole('button', {
        name: /more options/i,
      });
      await user.click(menuButton);

      const unpublishButton = screen.getByRole('menuitem', {
        name: /unpublish/i,
      });
      await user.click(unpublishButton);

      // Should show confirmation
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(
        screen.getByText(/students will lose access/i),
      ).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /unpublish/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(api.courses.unpublishCourse).toHaveBeenCalledWith(
          mockCourses[0].id,
        );
      });
    });
  });

  describe('File Upload', () => {
    it('handles PDF upload to course', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'lecture.pdf', {
        type: 'application/pdf',
      });

      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.files.uploadFile as jest.Mock).mockResolvedValue({
        id: 'file-123',
        filename: 'lecture.pdf',
      });

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      const courseCard = screen.getByTestId(`course-card-${mockCourses[0].id}`);
      const fileInput = within(courseCard).getByLabelText(
        /upload file/i,
      ) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(api.files.uploadFile).toHaveBeenCalledWith(
          mockCourses[0].id,
          undefined, // No module ID for course-level upload
          file,
          expect.any(Function),
        );
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'File uploaded successfully',
        });
      });
    });

    it('shows upload progress', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'lecture.pdf', {
        type: 'application/pdf',
      });

      let progressCallback: (progress: number) => void;
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.files.uploadFile as jest.Mock).mockImplementation(
        (courseId, moduleId, file, onProgress) => {
          progressCallback = onProgress;
          return new Promise((resolve) => {
            setTimeout(() => {
              progressCallback(50);
              setTimeout(() => {
                progressCallback(100);
                resolve({ id: 'file-123' });
              }, 10);
            }, 10);
          });
        },
      );

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      const courseCard = screen.getByTestId(`course-card-${mockCourses[0].id}`);
      const fileInput = within(courseCard).getByLabelText(
        /upload file/i,
      ) as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
          'aria-valuenow',
          '50',
        );
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to course details page', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      const courseCard = screen.getByTestId(`course-card-${mockCourses[0].id}`);
      const viewButton = within(courseCard).getByRole('button', {
        name: /view course/i,
      });

      await user.click(viewButton);

      expect(mockRouter.push).toHaveBeenCalledWith(
        `/courses/${mockCourses[0].id}`,
      );
    });

    it('opens course in new tab with middle click', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      const courseCard = screen.getByTestId(`course-card-${mockCourses[0].id}`);
      const viewButton = within(courseCard).getByRole('button', {
        name: /view course/i,
      });

      // Middle click
      fireEvent.mouseDown(viewButton, { button: 1 });

      // Should open in new tab (implementation depends on component)
      expect(window.open).toHaveBeenCalledWith(
        `/courses/${mockCourses[0].id}`,
        '_blank',
      );
    });
  });

  describe('Search and Filter', () => {
    it('filters courses by search term', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search courses/i);
      await user.type(searchInput, 'Programming');

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Data Structures')).not.toBeInTheDocument();
      });
    });

    it('filters courses by published status', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      const filterSelect = screen.getByRole('combobox', {
        name: /filter by status/i,
      });
      await user.selectOptions(filterSelect, 'draft');

      await waitFor(() => {
        expect(
          screen.queryByText('Introduction to Programming'),
        ).not.toBeInTheDocument();
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });
    });

    it('sorts courses by different criteria', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      const sortSelect = screen.getByRole('combobox', { name: /sort by/i });
      await user.selectOptions(sortSelect, 'students');

      // Check that courses are reordered by student count
      const courseCards = screen.getAllByTestId(/course-card-/);
      expect(courseCards[0]).toHaveTextContent('Introduction to Programming'); // 45 students
      expect(courseCards[1]).toHaveTextContent('Data Structures'); // 30 students
    });
  });

  describe('Error Handling', () => {
    it('shows error message when courses fail to load', async () => {
      (api.courses.getMyCourses as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load courses/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /retry/i }),
        ).toBeInTheDocument();
      });
    });

    it('handles course creation error', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.createCourse as jest.Mock).mockRejectedValue(
        new Error('Course code already exists'),
      );

      render(<ProfessorDash user={mockUser} />);

      await user.click(
        screen.getByRole('button', { name: /create new course/i }),
      );

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

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.getCourseStats as jest.Mock).mockResolvedValue(mockStats);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings[0]).toHaveTextContent(`Welcome, ${mockUser.name}`);
        expect(headings[0].tagName).toBe('H1');
      });
    });

    it('announces course actions to screen readers', async () => {
      const user = userEvent.setup();
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);
      (api.courses.publishCourse as jest.Mock).mockResolvedValue({});

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Data Structures')).toBeInTheDocument();
      });

      const courseCard = screen.getByTestId(`course-card-${mockCourses[1].id}`);
      const menuButton = within(courseCard).getByRole('button', {
        name: /more options/i,
      });
      await user.click(menuButton);

      const publishButton = screen.getByRole('menuitem', { name: /publish/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(
          /course published successfully/i,
        );
      });
    });

    it('supports keyboard navigation', async () => {
      (api.courses.getMyCourses as jest.Mock).mockResolvedValue(mockCourses);

      render(<ProfessorDash user={mockUser} />);

      await waitFor(() => {
        expect(
          screen.getByText('Introduction to Programming'),
        ).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', {
        name: /create new course/i,
      });
      createButton.focus();

      // Tab to first course card
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });

      const firstCourseCard = screen.getByTestId(
        `course-card-${mockCourses[0].id}`,
      );
      expect(document.activeElement).toBeInTheDocument();
      expect(firstCourseCard).toContainElement(document.activeElement!);
    });
  });
});
