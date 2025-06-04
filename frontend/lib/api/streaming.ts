import { apiClient } from './client';

export interface DocumentOutline {
  fileId: string;
  fileName: string;
  title: string;
  sections: OutlineSection[];
}

export interface OutlineSection {
  id: string;
  title: string;
  subsections?: OutlineSubsection[];
}

export interface OutlineSubsection {
  id: string;
  title: string;
}

export interface StreamingMessage {
  type:
    | 'content'
    | 'section'
    | 'example'
    | 'quiz'
    | 'status'
    | 'error'
    | 'complete';
  data?: unknown;
  message?: string;
}

export interface LearningProgress {
  section_progress: number;
  overall_progress: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

class StreamingAPI {
  private eventSources: Map<string, EventSource> = new Map();

  // Document outline
  async getDocumentOutline(fileId: string): Promise<DocumentOutline> {
    return apiClient.get<DocumentOutline>(
      `/api/v2/streaming/outline/${fileId}`,
    );
  }

  // Streaming endpoints
  streamLearningContent(
    fileId: string,
    options: { style?: string },
    onMessage: (message: StreamingMessage) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const params = new URLSearchParams();
    if (options.style) params.append('style', options.style);

    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const url = `${baseURL}/api/v2/streaming/learn/${fileId}?${params}`;

    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as StreamingMessage;
        onMessage(message);
      } catch (error) {
        console.error('Failed to parse streaming message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Streaming error:', error);
      if (onError) onError(new Error('Streaming connection failed'));
      eventSource.close();
      this.eventSources.delete(fileId);
    };

    this.eventSources.set(fileId, eventSource);

    // Return cleanup function
    return () => {
      eventSource.close();
      this.eventSources.delete(fileId);
    };
  }

  streamSectionContent(
    fileId: string,
    sectionId: string,
    includeExamples: boolean = true,
    onMessage: (message: StreamingMessage) => void,
  ): () => void {
    const response = apiClient.post('/api/v2/streaming/section', {
      fileId,
      sectionId,
      includeExamples,
    });

    // This would be converted to SSE in production
    // For now, simulate streaming
    response
      .then((data) => {
        onMessage({ type: 'content', data });
        onMessage({ type: 'complete' });
      })
      .catch((error) => {
        onMessage({ type: 'error', message: error.message });
      });

    return () => {}; // Cleanup function
  }

  streamChatResponse(
    message: string,
    context: Record<string, unknown>,
    onMessage: (message: StreamingMessage) => void,
  ): () => void {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const eventSource = new EventSource(`${baseURL}/api/v2/streaming/chat`, {
      withCredentials: true,
    });

    // Send message via POST then listen to stream
    apiClient
      .post('/api/v2/streaming/chat', { message, context })
      .catch((error) => {
        onMessage({ type: 'error', message: error.message });
      });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse chat message:', error);
      }
    };

    return () => eventSource.close();
  }

  async streamQuizQuestions(
    fileId: string,
    options: { difficulty?: string; count?: number } = {},
  ): Promise<QuizQuestion[]> {
    const params = new URLSearchParams();
    if (options.difficulty) params.append('difficulty', options.difficulty);
    if (options.count) params.append('count', options.count.toString());

    // This would be SSE in production
    return apiClient.get<QuizQuestion[]>(`/api/v2/streaming/quiz/${fileId}`, {
      params,
    });
  }

  async streamSummary(
    fileId: string,
    type: 'brief' | 'detailed' | 'key-points' = 'brief',
  ): Promise<{
    summary: string;
    keyPoints?: string[];
    metadata?: Record<string, unknown>;
  }> {
    const params = new URLSearchParams({ type });
    return apiClient.get(`/api/v2/streaming/summary/${fileId}`, { params });
  }

  async updateProgress(
    fileId: string,
    sectionId: string,
    progress: number,
  ): Promise<LearningProgress> {
    return apiClient.post<LearningProgress>('/api/v2/streaming/progress', {
      fileId,
      sectionId,
      progress,
    });
  }

  // Cleanup all event sources
  cleanup(): void {
    this.eventSources.forEach((source) => source.close());
    this.eventSources.clear();
  }
}

export const streamingAPI = new StreamingAPI();
