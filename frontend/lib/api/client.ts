// REFACTORED API CLIENT - Phase 5 Complete
// This file now imports from the modular client system
// The original 386-line client has been split into focused modules:
//
// - BaseAPIClient (base-client.ts) - Core HTTP functionality
// - AuthAPIClient (auth-client.ts) - Authentication handling  
// - CourseAPIClient (course-client.ts) - Course operations
// - StudyPlanAPIClient (study-plan-client.ts) - Study plan management
// - StreamingAPIClient (streaming-client.ts) - Streaming operations
// - Main APIClient (clients/index.ts) - Coordinates all clients
//
// PRESERVE exact compatibility with existing code - all imports still work

export { apiClient, APIError, type RequestConfig } from './clients/index';

// For any code that imports the APIClient class directly
export { APIClient } from './clients/index';