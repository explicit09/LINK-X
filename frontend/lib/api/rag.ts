import { apiClient } from './client';

export interface SearchParams {
  query: string;
  courseId?: string;
  fileId?: string;
  searchType?: 'hybrid' | 'vector' | 'keyword';
  intent?: 'definition' | 'example' | 'explanation' | 'factual' | 'procedural' | 'conceptual';
  limit?: number;
}

export interface SearchResult {
  content: string;
  fileId: string;
  fileTitle: string;
  moduleTitle: string;
  chunkType?: string;
  score: number;
  vectorScore: number;
  keywordScore: number;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
  query: string;
  searchType: string;
}

export const ragAPI = {
  /**
   * Perform hybrid search on course content
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const response = await apiClient.post('/api/v2/rag/search', params);
    return response.data.data;
  },

  /**
   * Process a file with semantic chunking
   */
  async processFile(fileId: string, force: boolean = false): Promise<any> {
    const response = await apiClient.post(`/api/v2/rag/process/file/${fileId}`, { force });
    return response.data.data;
  },

  /**
   * Reprocess entire course with enhancements
   */
  async processCourse(courseId: string): Promise<any> {
    const response = await apiClient.post(`/api/v2/rag/process/course/${courseId}`);
    return response.data.data;
  },

  /**
   * Get chunk details including metadata
   */
  async getChunkDetails(fileId: string, chunkIndex: number): Promise<any> {
    const response = await apiClient.get(`/api/v2/rag/chunk/${fileId}/${chunkIndex}`);
    return response.data.data;
  }
};