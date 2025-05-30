import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamingContent } from '@/components/streaming/StreamingContent';
import { StreamingProvider, useStreaming } from '@/components/streaming/StreamingContext';
import { api } from '@/lib/api';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  api: {
    streaming: {
      streamLearningContent: jest.fn(),
    },
  },
}));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => (
    <pre data-testid="code-block">{children}</pre>
  ),
}));

// Helper component to test with context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <StreamingProvider>
    {children}
  </StreamingProvider>
);

// Test component to control streaming state
const StreamingTestHelper = ({ fileId }: { fileId: string }) => {
  const { startStreaming, setActiveSection } = useStreaming();
  
  return (
    <div>
      <button onClick={() => setActiveSection('section-1')}>Set Active Section</button>
      <button onClick={() => startStreaming('section-1')}>Start Streaming</button>
      <StreamingContent fileId={fileId} />
    </div>
  );
};

describe('StreamingContent', () => {
  const mockFileId = 'file-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders loading state when no active section', () => {
      render(
        <TestWrapper>
          <StreamingContent fileId={mockFileId} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.getByText(/select a section to start learning/i)).toBeInTheDocument();
    });

    it('renders streaming content when section is active', async () => {
      const mockCleanup = jest.fn();
      (api.streaming.streamLearningContent as jest.Mock).mockReturnValue(mockCleanup);
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      // Set active section
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(screen.getByTestId('streaming-content')).toBeInTheDocument();
      });
    });

    it('applies custom className', () => {
      render(
        <TestWrapper>
          <StreamingContent fileId={mockFileId} className="custom-class" />
        </TestWrapper>
      );
      
      const container = screen.getByTestId('streaming-container');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Streaming Behavior', () => {
    it('starts streaming when active section changes', async () => {
      const mockCleanup = jest.fn();
      let streamCallback: (message: any) => void;
      
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          streamCallback = callback;
          return mockCleanup;
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      // Set active section
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(api.streaming.streamLearningContent).toHaveBeenCalledWith(
          mockFileId,
          { style: 'default' },
          expect.any(Function)
        );
      });
    });

    it('handles streaming messages correctly', async () => {
      let streamCallback: (message: any) => void;
      
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          streamCallback = callback;
          setTimeout(() => {
            callback({ type: 'content', data: 'Hello, this is streaming content!' });
          }, 10);
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(screen.getByText('Hello, this is streaming content!')).toBeInTheDocument();
      });
    });

    it('accumulates streamed content', async () => {
      let streamCallback: (message: any) => void;
      
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          streamCallback = callback;
          setTimeout(() => {
            callback({ type: 'content', data: 'First chunk. ' });
            callback({ type: 'content', data: 'Second chunk. ' });
            callback({ type: 'content', data: 'Third chunk.' });
          }, 10);
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(screen.getByText('First chunk. Second chunk. Third chunk.')).toBeInTheDocument();
      });
    });

    it('cleans up stream when component unmounts', async () => {
      const mockCleanup = jest.fn();
      (api.streaming.streamLearningContent as jest.Mock).mockReturnValue(mockCleanup);
      
      const { unmount } = render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(api.streaming.streamLearningContent).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('cleans up previous stream when section changes', async () => {
      const mockCleanup1 = jest.fn();
      const mockCleanup2 = jest.fn();
      let callCount = 0;
      
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockCleanup1 : mockCleanup2;
      });
      
      const { rerender } = render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      // Set first section
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(api.streaming.streamLearningContent).toHaveBeenCalledTimes(1);
      });
      
      // Change to different section
      act(() => {
        const { setActiveSection } = useStreaming.getState();
        setActiveSection('section-2');
      });
      
      await waitFor(() => {
        expect(mockCleanup1).toHaveBeenCalled();
        expect(api.streaming.streamLearningContent).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Content States', () => {
    it('shows loading state during streaming', async () => {
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(() => jest.fn());
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      fireEvent.click(screen.getByText('Start Streaming'));
      
      await waitFor(() => {
        expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
        expect(screen.getByText(/loading content/i)).toBeInTheDocument();
      });
    });

    it('shows completed state when streaming finishes', async () => {
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          setTimeout(() => {
            callback({ type: 'content', data: 'Complete content' });
            callback({ type: 'complete' });
          }, 10);
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(screen.getByText('Complete content')).toBeInTheDocument();
        expect(screen.queryByTestId('streaming-indicator')).not.toBeInTheDocument();
      });
    });

    it('shows error state on streaming error', async () => {
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          setTimeout(() => {
            callback({ type: 'error', error: 'Network error occurred' });
          }, 10);
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('does not re-stream completed sections', async () => {
      const mockCleanup = jest.fn();
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          callback({ type: 'content', data: 'Cached content' });
          callback({ type: 'complete' });
          return mockCleanup;
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      // First activation
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(screen.getByText('Cached content')).toBeInTheDocument();
      });
      
      // Deactivate and reactivate
      act(() => {
        const { setActiveSection } = useStreaming.getState();
        setActiveSection(null);
      });
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      // Should not stream again
      expect(api.streaming.streamLearningContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Markdown Rendering', () => {
    it('renders markdown content correctly', async () => {
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          callback({ type: 'content', data: '# Heading\n\nThis is **bold** text.' });
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        const markdown = screen.getByTestId('markdown');
        expect(markdown).toHaveTextContent('# Heading\n\nThis is **bold** text.');
      });
    });

    it('renders code blocks with syntax highlighting', async () => {
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          callback({ 
            type: 'content', 
          });
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(screen.getByTestId('code-block')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles retry action correctly', async () => {
      let attempts = 0;
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          attempts++;
          if (attempts === 1) {
            callback({ type: 'error', error: 'First attempt failed' });
          } else {
            callback({ type: 'content', data: 'Success on retry!' });
          }
          return jest.fn();
        }
      );
      
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        expect(screen.getByText(/first attempt failed/i)).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Success on retry!')).toBeInTheDocument();
        expect(api.streaming.streamLearningContent).toHaveBeenCalledTimes(2);
      });
    });

    it('handles connection timeout', async () => {
      jest.useFakeTimers();
      
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(() => {
        // Never send any messages
        return jest.fn();
      });
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      // Fast-forward past timeout threshold
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/connection timeout/i)).toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });
  });

  describe('Performance', () => {
    it('debounces rapid section changes', async () => {
      const mockCleanup = jest.fn();
      (api.streaming.streamLearningContent as jest.Mock).mockReturnValue(mockCleanup);
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      // Rapidly change sections
      for (let i = 0; i < 5; i++) {
        act(() => {
          const { setActiveSection } = useStreaming.getState();
          setActiveSection(`section-${i}`);
        });
      }
      
      await waitFor(() => {
        // Should only stream once for the last section
        expect(api.streaming.streamLearningContent).toHaveBeenCalledTimes(1);
      });
    });

    it('handles large content efficiently', async () => {
      const largeContent = 'x'.repeat(100000);
      
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          // Simulate chunked delivery
          for (let i = 0; i < 10; i++) {
            callback({ 
              type: 'content', 
              data: largeContent.slice(i * 10000, (i + 1) * 10000) 
            });
          }
          callback({ type: 'complete' });
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        const content = screen.getByTestId('markdown');
        expect(content.textContent).toHaveLength(100000);
      });
    });
  });

  describe('Accessibility', () => {
    it('announces streaming status to screen readers', async () => {
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          setTimeout(() => {
            callback({ type: 'content', data: 'Accessible content' });
          }, 10);
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
        expect(status).toHaveTextContent(/streaming content/i);
      });
    });

    it('has keyboard accessible retry button', async () => {
      (api.streaming.streamLearningContent as jest.Mock).mockImplementation(
        (fileId, options, callback) => {
          callback({ type: 'error', error: 'Error occurred' });
          return jest.fn();
        }
      );
      
      render(
        <TestWrapper>
          <StreamingTestHelper fileId={mockFileId} />
        </TestWrapper>
      );
      
      fireEvent.click(screen.getByText('Set Active Section'));
      
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
        
        retryButton.focus();
        expect(document.activeElement).toBe(retryButton);
        
        fireEvent.keyDown(retryButton, { key: 'Enter' });
        expect(api.streaming.streamLearningContent).toHaveBeenCalledTimes(2);
      });
    });
  });
});