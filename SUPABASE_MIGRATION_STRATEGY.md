# Supabase Migration Strategy for LEARN-X

## Overview
This document outlines the migration strategy from Neon Database + Firebase Auth to Supabase (database + auth).

## Current Architecture
- **Database**: Neon PostgreSQL with pgvector extension
- **Authentication**: Firebase Authentication
- **Storage**: AWS S3 for files
- **Backend**: Flask with SQLAlchemy
- **Frontend**: Next.js with Firebase SDK

## Target Architecture
- **Database**: Supabase PostgreSQL with pgvector extension
- **Authentication**: Supabase Auth
- **Storage**: AWS S3 (no change) + optional Supabase Storage
- **Backend**: Flask with SQLAlchemy (minimal changes)
- **Frontend**: Next.js with Supabase SDK

## Migration Phases

### Phase 1: Setup and Preparation
1. Create Supabase project
2. Enable pgvector extension in Supabase
3. Set up environment configurations
4. Create migration scripts

### Phase 2: Database Migration
1. Export schema from Neon (excluding Market and News tables)
2. Create tables in Supabase
3. Update database connection strings
4. Test database connectivity

### Phase 3: Authentication Migration
1. Configure Supabase Auth settings
2. Create user migration strategy (Firebase UID mapping)
3. Update backend auth middleware
4. Update frontend auth hooks

### Phase 4: Code Updates
1. Backend services update
2. Frontend authentication update
3. API endpoint updates
4. Environment variable updates

### Phase 5: Testing and Validation
1. Unit test updates
2. Integration testing
3. End-to-end testing
4. Performance validation

## Tables to Migrate (41 tables)

### Core Tables (REQUIRED)
- User (with Firebase UID migration)
- Role
- InstructorProfile, StudentProfile, AdminProfile
- Course
- Module
- File
- FileChunk (with pgvector embeddings)
- Enrollment
- AccessCode

### Learning Features (REQUIRED)
- Todo
- Chat
- Message
- PersonalizedFile
- Report

### Gamification (REQUIRED)
- UserStats
- UserActivity
- UserAchievement
- ApiUsageLog

### Study Planning (REQUIRED)
- StudyPlan
- StudyGoal
- StudySession
- StudyRecommendation
- GoalProgress

### Scheduling (REQUIRED)
- SessionNote
- UserSchedulePreferences
- SessionAnalytics
- AISessionSuggestion

### Collaboration (REQUIRED)
- StudyGroup
- StudyGroupMember
- SharedAnnotation
- PeerDiscussion
- DiscussionReply
- CollaborativeNote
- NoteEditOperation
- CollaborativeStudySession
- StudySessionParticipant
- UserCollaborationPreferences
- AnnotationReaction
- DiscussionVote

### Analytics (REQUIRED)
- LearningPattern
- EngagementInsight

### Tables to EXCLUDE
- Market (S&P 500 data - not used)
- News (news articles - not used)

## Authentication Migration Strategy

### Current Firebase Auth Flow
1. User signs in with Firebase
2. Firebase returns ID token
3. Backend validates Firebase token
4. Local JWT issued for API access

### New Supabase Auth Flow
1. User signs in with Supabase
2. Supabase returns access token + refresh token
3. Backend validates Supabase token
4. Use Supabase JWT directly (no local JWT needed)

### User Migration Approach
Since we're not migrating actual user data (only test data):
1. Create fresh Supabase auth accounts
2. Map Firebase UIDs to Supabase UUIDs in User table
3. Update all foreign key references

## Code Changes Required

### Backend Changes

#### 1. Database Configuration
```python
# From:
POSTGRES_URL = os.getenv('POSTGRES_URL')

# To:
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_DB_URL = os.getenv('SUPABASE_DB_URL')
```

#### 2. Authentication Middleware
- Replace `firebase_config.py` with `supabase_config.py`
- Update JWT validation to use Supabase tokens
- Update user creation/retrieval logic

#### 3. Service Layer Updates
- Update auth_service_unified.py
- Update user_repository.py
- Update all services using Firebase admin SDK

### Frontend Changes

#### 1. Replace Firebase SDK
```typescript
// From:
import { auth } from '@/lib/firebase'

// To:
import { createClient } from '@supabase/supabase-js'
```

#### 2. Update Auth Hooks
- useAuthUser.ts
- useAuthService.ts
- AuthContext.tsx

#### 3. Update API Client
- Update token handling
- Update auth headers

## Environment Variables

### Remove:
```
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

### Add:
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
SUPABASE_JWT_SECRET
```

## Migration Scripts

### 1. Schema Export (schema_export.sql)
- Export all table definitions
- Export indexes and constraints
- Exclude Market and News tables

### 2. Supabase Setup (supabase_setup.sql)
- Enable pgvector extension
- Create schema
- Set up RLS policies

### 3. Data Migration (Not needed - no production data)

## Testing Strategy

### Unit Tests
- Update auth mocks
- Update database connection mocks
- Verify all tests pass

### Integration Tests
- Test auth flow end-to-end
- Test database operations
- Test API endpoints

### Performance Tests
- Compare query performance
- Test connection pooling
- Validate pgvector performance

## Rollback Plan

### Database Rollback
1. Keep Neon connection active during migration
2. Update environment variables to point back to Neon
3. Restart services

### Auth Rollback
1. Keep Firebase project active
2. Revert code changes via git
3. Update environment variables

## Timeline Estimate

- Phase 1: 1 day (Setup)
- Phase 2: 1 day (Database)
- Phase 3: 2 days (Authentication)
- Phase 4: 3 days (Code Updates)
- Phase 5: 2 days (Testing)

**Total: ~9 days**

## Success Criteria

1. All 41 required tables migrated successfully
2. Authentication working end-to-end
3. All tests passing
4. No performance degradation
5. Successful deployment to staging environment

## Next Steps

1. Create Supabase project
2. Generate migration scripts
3. Set up development environment
4. Begin Phase 1 implementation