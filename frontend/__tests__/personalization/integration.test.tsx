import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import PersonalizedStreamingPage from '@/app/personalize/[fileId]/page';
import { useAuthUser } from '@/hooks/useAuthUser';
import { apiClient } from '@/lib/api';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({ fileId: 'test-file-123' })),
}));

jest.mock('@/hooks/useAuthUser', () => ({
  useAuthUser: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    getAuthToken: jest.fn(),
  },
}));

// Mock EventSource
global.EventSource = jest.fn(() => ({
  onopen: jest.fn(),
  onmessage: jest.fn(),
  onerror: jest.fn(),
  close: jest.fn(),
})) as any;

// Mock navigator.sendBeacon
global.navigator.sendBeacon = jest.fn();

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  roles: ['student'],
};

const mockOutline = [
  {
    title: 'Introduction',
    level: 1,
    chunk_start: 0,
    chunk_end: 10,
    content_preview: 'This is the introduction...',
    anchor: 'introduction',
    keywords: ['intro', 'overview'],
    type: 'intro',
  },
  {
    title: 'Main Concepts',
    level: 1,
    chunk_start: 11,
    chunk_end: 30,
    content_preview: 'The main concepts are...',
    anchor: 'main-concepts',
    keywords: ['concepts', 'theory'],
    type: 'definition',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('PersonalizationPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      back: jest.fn(),
    });
    (useAuthUser as jest.Mock).mockReturnValue({ user: mockUser });
    (apiClient.getAuthToken as jest.Mock).mockResolvedValue('test-token');
  });

  it('should render the page and generate outline on load', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { outline: mockOutline },
    });

    render(<PersonalizedStreamingPage />, { wrapper: createWrapper() });

    // Check initial render
    expect(screen.getByText('Personalized Learning')).toBeInTheDocument();
    expect(screen.getByText('AI-powered personalized content based on your learning style')).toBeInTheDocument();

    // Wait for outline to be generated
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/personalization/v2/outline/test-file-123');
    });

    // Verify success toast (mocked)
    await waitFor(() => {
      expect(screen.getByText('Document outline generated successfully')).toBeInTheDocument();
    });
  });

  it('should handle streaming when user clicks start', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { outline: mockOutline },
    });

    const mockEventSource = {
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      close: jest.fn(),
    };

    (global.EventSource as jest.Mock).mockImplementation((url: string) => {
      expect(url).toContain('/api/personalization/v2/stream/test-file-123');
      expect(url).toContain('token=test-token');
      return mockEventSource;
    });

    render(<PersonalizedStreamingPage />, { wrapper: createWrapper() });

    // Wait for outline
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    // Click start personalization
    const startButton = screen.getByText('Start Personalization');
    fireEvent.click(startButton);

    // Verify EventSource was created
    expect(global.EventSource).toHaveBeenCalled();

    // Simulate streaming events
    mockEventSource.onopen?.();

    // Simulate section start
    mockEventSource.onmessage?.({
      data: JSON.stringify({
        type: 'section_start',
        section_id: 'introduction',
      }),
    });

    // Simulate content streaming
    mockEventSource.onmessage?.({
      data: JSON.stringify({
        type: 'content',
        section_id: 'introduction',
        data: { content: 'Welcome to this personalized introduction...' },
      }),
    });

    // Verify content appears
    await waitFor(() => {
      expect(screen.getByText(/Welcome to this personalized introduction/)).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<PersonalizedStreamingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to generate outline')).toBeInTheDocument();
    });

    // Verify analytics tracking
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/personalization/v2/analytics',
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            event_type: 'error',
            file_id: 'test-file-123',
          }),
        ]),
      })
    );
  });

  it('should save content when streaming completes', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { outline: mockOutline },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    const mockEventSource = {
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      close: jest.fn(),
    };

    (global.EventSource as jest.Mock).mockImplementation(() => mockEventSource);

    render(<PersonalizedStreamingPage />, { wrapper: createWrapper() });

    // Wait for outline
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    // Start streaming
    fireEvent.click(screen.getByText('Start Personalization'));

    // Simulate completion
    mockEventSource.onmessage?.({
      data: JSON.stringify({
        type: 'section_complete',
        section_id: 'introduction',
      }),
    });

    mockEventSource.onmessage?.({
      data: JSON.stringify({
        type: 'section_complete',
        section_id: 'main-concepts',
      }),
    });

    mockEventSource.onmessage?.({
      data: JSON.stringify({
        type: 'complete',
      }),
    });

    // Verify save was called
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/personalization/v2/save/test-file-123',
        expect.objectContaining({
          outline: expect.any(Array),
          sections: expect.any(Array),
        })
      );
    });

    // Verify completion message
    expect(screen.getByText('Your personalized content has been saved')).toBeInTheDocument();
  });

  it('should handle connection retry', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { outline: mockOutline },
    });

    const mockEventSource = {
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      close: jest.fn(),
    };

    let connectionAttempt = 0;
    (global.EventSource as jest.Mock).mockImplementation(() => {
      connectionAttempt++;
      return mockEventSource;
    });

    render(<PersonalizedStreamingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start Personalization'));

    // Simulate connection error
    mockEventSource.onerror?.({});

    // Wait for retry
    await waitFor(() => {
      expect(screen.getByText(/Connection lost. Retrying/)).toBeInTheDocument();
    });

    // Verify retry attempt
    await waitFor(() => {
      expect(connectionAttempt).toBeGreaterThan(1);
    });
  });

  it('should navigate between sections', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { outline: mockOutline },
    });

    const { container } = render(<PersonalizedStreamingPage />, { 
      wrapper: createWrapper() 
    });

    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    // Create mock element for scrollIntoView
    const mockElement = document.createElement('div');
    mockElement.id = 'main-concepts';
    mockElement.scrollIntoView = jest.fn();
    container.appendChild(mockElement);

    // Click on second section
    fireEvent.click(screen.getByText('Main Concepts'));

    // Verify scroll was called
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('should track analytics events throughout session', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { outline: mockOutline },
    });

    render(<PersonalizedStreamingPage />, { wrapper: createWrapper() });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });

    // Simulate user completing session
    const completeButton = await screen.findByText('Complete Session');
    fireEvent.click(completeButton);

    // Verify analytics were sent
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/personalization/v2/analytics',
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              event_type: 'session_complete',
            }),
          ]),
        })
      );
    });
  });
});