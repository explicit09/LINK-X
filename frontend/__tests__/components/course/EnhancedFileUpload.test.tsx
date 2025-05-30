import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedFileUpload } from '@/components/course/EnhancedFileUpload';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  api: {
    files: {
      uploadFile: jest.fn(),
      getUploadProgress: jest.fn(),
    },
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

describe('EnhancedFileUpload', () => {
  const mockProps = {
    courseId: 'course-123',
    moduleId: 'module-456',
    userRole: 'student' as const,
    onUploadComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM state
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('renders upload area correctly', () => {
      render(<EnhancedFileUpload {...mockProps} />);
      
      expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument();
      expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument();
    });

    it('displays accepted file types for students', () => {
      render(<EnhancedFileUpload {...mockProps} />);
      
      expect(screen.getByText(/accepted: pdf, audio, video, powerpoint/i)).toBeInTheDocument();
    });

    it('displays instructor-specific file types', () => {
      render(<EnhancedFileUpload {...mockProps} userRole="instructor" />);
      
      expect(screen.getByText(/accepted: pdf, audio, video, powerpoint/i)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<EnhancedFileUpload {...mockProps} className="custom-class" />);
      
      const uploadArea = screen.getByTestId('upload-area');
      expect(uploadArea).toHaveClass('custom-class');
    });
  });

  describe('File Selection', () => {
    it('handles file selection via button click', async () => {
      const user = userEvent.setup();
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.pdf,.mp3,.wav,.m4a,.aac,.mp4,.mov,.avi,.ppt,.pptx');
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('handles multiple file selection', async () => {
      const user = userEvent.setup();
      const files = [
        new File(['pdf content'], 'document.pdf', { type: 'application/pdf' }),
        new File(['audio content'], 'audio.mp3', { type: 'audio/mp3' }),
      ];
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, files);
      
      await waitFor(() => {
        expect(screen.getByText('document.pdf')).toBeInTheDocument();
        expect(screen.getByText('audio.mp3')).toBeInTheDocument();
      });
    });

    it('rejects unsupported file types', async () => {
      const user = userEvent.setup();
      const file = new File(['text content'], 'document.txt', { type: 'text/plain' });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Unsupported file type'));
        expect(screen.queryByText('document.txt')).not.toBeInTheDocument();
      });
    });

    it('enforces file size limits', async () => {
      const user = userEvent.setup();
      // Create a large file (over 100MB)
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 101 * 1024 * 1024 });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, largeFile);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('File size exceeds limit'));
      });
    });
  });

  describe('Drag and Drop', () => {
    it('handles drag over events', () => {
      render(<EnhancedFileUpload {...mockProps} />);
      
      const dropZone = screen.getByTestId('drop-zone');
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { items: [{ kind: 'file' }] },
      });
      
      expect(dropZone).toHaveClass('border-primary', 'bg-primary/5');
    });

    it('handles drag leave events', () => {
      render(<EnhancedFileUpload {...mockProps} />);
      
      const dropZone = screen.getByTestId('drop-zone');
      
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { items: [{ kind: 'file' }] },
      });
      
      fireEvent.dragLeave(dropZone);
      
      expect(dropZone).not.toHaveClass('border-primary', 'bg-primary/5');
    });

    it('handles file drop', async () => {
      const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });
      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', getAsFile: () => file }],
      };
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const dropZone = screen.getByTestId('drop-zone');
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      await waitFor(() => {
        expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
      });
    });

    it('prevents default drag behavior', () => {
      render(<EnhancedFileUpload {...mockProps} />);
      
      const dropZone = screen.getByTestId('drop-zone');
      
      const dragOverEvent = new Event('dragover', { bubbles: true });
      const preventDefaultSpy = jest.spyOn(dragOverEvent, 'preventDefault');
      
      dropZone.dispatchEvent(dragOverEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('File Upload Process', () => {
    it('uploads files successfully', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      (api.files.uploadFile as jest.Mock).mockResolvedValue({
        id: 'file-123',
        filename: 'test.pdf',
        status: 'completed',
      });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
        expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(api.files.uploadFile).toHaveBeenCalledWith(
          mockProps.courseId,
          mockProps.moduleId,
          file,
          expect.any(Function)
        );
        expect(mockProps.onUploadComplete).toHaveBeenCalledWith({
          id: 'file-123',
          filename: 'test.pdf',
          status: 'completed',
        });
        expect(toast.success).toHaveBeenCalledWith('File uploaded successfully');
      });
    });

    it('shows upload progress', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      let progressCallback: (progress: number) => void;
      (api.files.uploadFile as jest.Mock).mockImplementation((courseId, moduleId, file, onProgress) => {
        progressCallback = onProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            progressCallback(50);
            setTimeout(() => {
              progressCallback(100);
              resolve({ id: 'file-123', filename: 'test.pdf' });
            }, 10);
          }, 10);
        });
      });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      });
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      });
    });

    it('handles upload errors', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      (api.files.uploadFile as jest.Mock).mockRejectedValue(new Error('Upload failed'));
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith('Failed to upload test.pdf');
      });
    });

    it('shows processing stages', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      
      (api.files.uploadFile as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ id: 'file-123', status: 'processing' }), 100);
        });
      });
      
      (api.files.getUploadProgress as jest.Mock)
        .mockResolvedValueOnce({ stage: 'extracting', progress: 30 })
        .mockResolvedValueOnce({ stage: 'analyzing', progress: 60 })
        .mockResolvedValueOnce({ stage: 'complete', progress: 100 });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/extracting content/i)).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText(/analyzing with ai/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Management', () => {
    it('allows removing files from queue', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
      
      const removeButton = screen.getByRole('button', { name: /remove file/i });
      await user.click(removeButton);
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });

    it('disables remove button during upload', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      (api.files.uploadFile as jest.Mock).mockImplementation(() => new Promise(() => {}));
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      // Start upload
      const uploadButton = screen.getByRole('button', { name: /start upload/i });
      await user.click(uploadButton);
      
      await waitFor(() => {
        const removeButton = screen.getByRole('button', { name: /remove file/i });
        expect(removeButton).toBeDisabled();
      });
    });

    it('clears completed uploads when requested', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      (api.files.uploadFile as jest.Mock).mockResolvedValue({
        id: 'file-123',
        filename: 'test.pdf',
        status: 'completed',
      });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/upload complete/i)).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button', { name: /clear completed/i });
      await user.click(clearButton);
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible file input', () => {
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveAttribute('aria-label', 'Upload files');
    });

    it('announces upload status to screen readers', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      (api.files.uploadFile as jest.Mock).mockResolvedValue({
        id: 'file-123',
        filename: 'test.pdf',
      });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent(/uploading test.pdf/i);
      });
    });

    it('supports keyboard navigation', async () => {
      render(<EnhancedFileUpload {...mockProps} />);
      
      const browseButton = screen.getByRole('button', { name: /browse files/i });
      
      browseButton.focus();
      expect(document.activeElement).toBe(browseButton);
      
      fireEvent.keyDown(browseButton, { key: 'Enter' });
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');
      
      browseButton.click();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Error States', () => {
    it('displays network error message', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      (api.files.uploadFile as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('allows retrying failed uploads', async () => {
      const user = userEvent.setup();
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      (api.files.uploadFile as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'file-123', filename: 'test.pdf' });
      
      render(<EnhancedFileUpload {...mockProps} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(api.files.uploadFile).toHaveBeenCalledTimes(2);
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });
});