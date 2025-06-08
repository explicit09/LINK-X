# Backend API Migration Analysis

## Summary of Remaining Backend API Usage

### Direct localhost:8000 Usage (26 files found)

#### 1. AI Chat/Streaming Endpoints
- **SimpleStreamingChat.tsx**: Uses `/ai-chat-stream` for AI chat streaming
- **FloatingAIAssistant.tsx**: Uses `/ai-chat-stream` for AI chat streaming
- **ChunkedDocumentViewer.tsx**: 
  - `/documents/${documentId}/outline`
  - `/chunks?doc_id=${documentId}&from=${chunkIndex}&limit=1`

#### 2. Course Creation
- **LearnPrompt.tsx**: Uses `/create-course` for AI-powered course creation

#### 3. Market Data
- **MarketTrends.tsx**: Uses `/market/recent` for market price data

#### 4. Personalization Streaming
- **useStreamingPersonalization.ts**: Uses `/api/v2/personalization/stream` with EventSource
- **usePersonalizedStreaming.ts**: Similar personalization streaming
- **useEnhancedPersonalization.ts**: Similar personalization streaming

### API v2 Endpoints (41 files using /api/v2/)

#### Core API Services:
1. **Authentication**: `/api/v2/auth/*`
2. **Courses**: `/api/v2/courses/*`
3. **Files**: `/api/v2/files/*`
4. **Modules**: `/api/v2/modules/*`
5. **Enrollments**: `/api/v2/enrollments/*`
6. **Activities**: `/api/v2/activities/*`
7. **Quizzes**: `/api/v2/quizzes/*`
8. **Study Plans**: `/api/v2/study-plans/*`
9. **Todos**: `/api/v2/todos/*`
10. **Schedule**: `/api/v2/schedule/*`
11. **Gamification**: `/api/v2/gamification/*`
12. **Streaming**: `/api/v2/streaming/*`
13. **Analytics**: Various analytics endpoints
14. **Health Check**: `/api/v2/health`

### Key Components Still Using Backend API:

#### 1. AI/Chat Components
- SimpleStreamingChat
- FloatingAIAssistant
- ChunkedDocumentViewer

#### 2. Course/Learning Features
- LearnPrompt (AI course creation)
- Personalization pages and hooks
- Streaming personalization

#### 3. Analytics/Data
- MarketTrends
- ProfessorInsights
- EngagementDashboard

#### 4. File Operations
- File upload/download
- S3FileViewer
- UniversalFileViewer

### Migration Priority

#### High Priority (Core Functionality):
1. **AI Chat Streaming** (`/ai-chat-stream`)
   - Used by: SimpleStreamingChat, FloatingAIAssistant
   - Migration: Needs WebSocket or SSE implementation in Supabase Edge Functions

2. **Document Streaming** (`/documents/*/outline`, `/chunks`)
   - Used by: ChunkedDocumentViewer
   - Migration: Needs chunked content delivery via Supabase

3. **Personalization Streaming** (`/api/v2/personalization/*`)
   - Used by: Multiple personalization hooks
   - Migration: Complex AI processing, needs Edge Functions

#### Medium Priority:
1. **Course Creation** (`/create-course`)
   - Used by: LearnPrompt
   - Migration: AI-powered course generation needs Edge Functions

2. **File Operations** (`/api/v2/files/*`)
   - Already partially migrated to Supabase Storage
   - Need to complete migration for all file operations

#### Low Priority:
1. **Market Data** (`/market/recent`)
   - Used by: MarketTrends
   - Migration: Could be replaced with external API or Edge Function

### Technical Challenges:

1. **Streaming/SSE**: Many endpoints use Server-Sent Events (SSE) for real-time streaming
2. **AI Processing**: Complex AI operations require significant compute
3. **File Processing**: Large file handling and processing
4. **Authentication**: Currently using mixed auth (some Supabase, some backend)

### Recommended Migration Path:

1. **Phase 1**: Migrate simple CRUD operations (already mostly done)
2. **Phase 2**: Implement Supabase Edge Functions for AI operations
3. **Phase 3**: Set up WebSocket/SSE infrastructure for streaming
4. **Phase 4**: Migrate file processing to Supabase Storage + Functions
5. **Phase 5**: Complete authentication consolidation