// Re-export all API types from the main types file
export type {
  Course,
  Module,
  FileInfo,
  TodoItem,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateModuleRequest,
  UpdateModuleRequest,
  UpdateFileRequest,
  CreateTodoRequest,
  UpdateTodoRequest,
  UserProfile,
  ChatRequest,
  CreateDiscussionRequest,
  CreateActivityRequest,
  GenerateQuizRequest,
  SubmitQuizAnswerRequest,
  UpdateUserRequest,
  CreateNewsRequest,
  UpdateNewsRequest,
  CreateMarketDataRequest,
  UpdateMarketDataRequest,
  GenerateTitleRequest,
} from '../../../types/api';

// Additional types for API client
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  retryCount?: number;
  retryWithAuth?: boolean;
}
