# Backend Architecture Analysis - LINK-X

## Overview
This document analyzes the current backend architecture to identify what services are still running and needed versus what can be deprecated.

## Active Services in Docker Compose

### 1. **Redis** (REQUIRED)
- **Purpose**: Cache, session storage, Celery broker
- **Status**: Essential for performance and background tasks
- **Dependencies**: Backend, Celery workers

### 2. **Backend** (REQUIRED)
- **Purpose**: Main Flask API server
- **Key Features**:
  - API v2 endpoints (modular structure)
  - Supabase authentication integration
  - File management (with Supabase storage)
  - Course and module management
  - AI/RAG endpoints for content generation
- **Configuration**: 
  - Uses Supabase for database and storage
  - Disabled Redis/Celery flags available but not recommended

### 3. **Celery Worker** (REQUIRED)
- **Purpose**: Background task processing
- **Key Tasks**:
  - File processing and indexing
  - Maintenance tasks (cleanup, database vacuum)
  - Health monitoring
- **Note**: Still references embedding tasks but those are migrated to PGMQ

### 4. **Celery Beat** (REQUIRED)
- **Purpose**: Scheduled task orchestration
- **Key Schedules**:
  - Daily file cleanup
  - Weekly S3 orphan cleanup
  - Database maintenance
  - Health checks every 5 minutes

### 5. **PGMQ Worker** (REQUIRED)
- **Purpose**: PostgreSQL Message Queue for embedding generation
- **Key Features**:
  - Processes embeddings using Supabase's pgvector
  - Rate limiting and budget protection
  - Poison message detection
  - Scalable (configurable replicas)
- **Critical**: This is the main AI processing worker

### 6. **Flower** (OPTIONAL)
- **Purpose**: Celery monitoring UI
- **Status**: Only runs with monitoring/prod profiles

## Key API Endpoints Still in Use

### Authentication (`/api/v2/auth/*`)
- `/api/v2/auth/unified/*` - Unified auth system
- `/api/v2/auth/simple/*` - Simple auth for development
- Login, logout, profile management

### Core Learning (`/api/v2/*`)
- `/courses` - Course management
- `/files` - File upload and management (Supabase storage)
- `/modules` - Module organization
- `/activities` - Learning activities
- `/todos` - Task management

### AI/Content Generation (`/api/v2/*`)
- `/ai/query` - AI-powered Q&A
- `/rag/*` - Enhanced RAG (Retrieval Augmented Generation)
- `/content/*` - Content personalization
- `/embeddings/*` - Embedding management

### Student Features (`/api/v2/*`)
- `/dashboard` - Dashboard data
- `/gamification` - XP and achievements
- `/study-plans` - Personalized study plans
- `/schedule` - Learning schedule
- `/analytics` - Learning analytics
- `/collaboration` - Study groups and sharing

### Streaming (`/api/streaming/*`)
- Real-time content streaming
- Personalized content generation

## What Can Be Deprecated

### 1. **Firebase Dependencies**
- All Firebase auth code (migrated to Supabase)
- Firebase admin SDK references
- Firebase configuration files

### 2. **Old API v1 Endpoints**
- Legacy endpoints that redirect to v2
- Old session management code
- Deprecated authentication flows

### 3. **Local Embedding Services**
- Old embedding generation in Celery (moved to PGMQ)
- Local vector storage (using Supabase pgvector)
- Manual embedding management code

### 4. **Deprecated Storage**
- S3 direct access code (using Supabase storage)
- Local file storage handlers
- Old file chunk management

## What Must Remain

### 1. **Core Services**
- Flask backend server
- Redis for caching and Celery
- Celery workers for background tasks
- PGMQ workers for AI/embeddings

### 2. **AI Processing**
- OpenAI integration for content generation
- RAG system for contextual answers
- Embedding generation pipeline
- Rate limiting and budget protection

### 3. **Supabase Integration**
- Authentication (replacing Firebase)
- Database (PostgreSQL)
- Storage (replacing S3)
- Vector storage (pgvector)

### 4. **Background Processing**
- File processing and chunking
- Scheduled maintenance
- Health monitoring
- Async task handling

## Recommendations

1. **Keep All Docker Services**: All services in docker-compose.yml are actively used and required

2. **Migration Priorities**:
   - Complete Firebase removal
   - Consolidate embedding tasks to PGMQ only
   - Remove v1 API endpoints after frontend migration

3. **Performance Optimizations**:
   - PGMQ workers are scalable (use EMBEDDING_WORKERS env var)
   - Redis is configured with memory limits
   - Database has proper indexing and maintenance

4. **Security Considerations**:
   - JWT blacklisting is implemented
   - Rate limiting on AI endpoints
   - Budget protection for OpenAI usage
   - Proper CORS and security headers

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `REDIS_URL` (auto-configured in Docker)