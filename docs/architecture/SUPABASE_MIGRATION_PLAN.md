# Supabase Migration Plan

## Executive Summary

Migrating from Neon + Firebase + S3 to Supabase as a unified platform. Current data is development/testing data and will NOT be migrated.

**Timeline**: 2-3 weeks  
**Risk Level**: Medium (mitigated by not migrating data)  
**Cost Benefit**: Break-even at 30k MAU, cheaper above that

## Migration Phases

### Phase 1: Database Migration (Week 1)

#### 1.1 Supabase Project Setup
```bash
# Day 1-2
- [ ] Create Supabase project
- [ ] Enable pgvector extension
- [ ] Configure connection pooling
- [ ] Set up environments (dev/staging/prod)
```

#### 1.2 Schema Recreation
```sql
-- Recreate all tables in Supabase
-- Key differences from current schema:
-- 1. Use Supabase Auth user IDs (UUID)
-- 2. Add RLS policies from the start
-- 3. Optimize for Supabase's connection model

-- Example with RLS:
CREATE TABLE courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own courses" ON courses
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create courses" ON courses
    FOR INSERT WITH CHECK (auth.uid() = creator_id);
```

#### 1.3 Storage Configuration
```typescript
// Supabase Storage buckets to replace S3
const buckets = {
  'course-files': {
    public: false,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['application/pdf', 'audio/*', 'video/*']
  },
  'user-uploads': {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024
  }
};
```

### Phase 2: Backend Migration (Week 1-2)

#### 2.1 New Backend Structure
```
docker-image/src/
├── core/
│   ├── supabase.py         # Supabase client
│   ├── auth.py             # Unified auth
│   └── storage.py          # File handling
├── repositories/
│   └── base_repository.py  # Supabase-based repos
└── services/
    └── migration/          # Temporary migration helpers
```

#### 2.2 Supabase Client Setup
```python
# docker-image/src/core/supabase.py
from supabase import create_client, Client
import os

class SupabaseClient:
    _instance: Client = None
    
    @classmethod
    def get_client(cls) -> Client:
        if not cls._instance:
            url = os.getenv('SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_KEY')  # Service key for backend
            cls._instance = create_client(url, key)
        return cls._instance

# Auth middleware update
def verify_supabase_token(token: str):
    client = SupabaseClient.get_client()
    try:
        user = client.auth.get_user(token)
        return user
    except:
        return None
```

#### 2.3 Repository Pattern Update
```python
# docker-image/src/repositories/base_repository.py
from typing import Generic, TypeVar, List, Optional
from core.supabase import SupabaseClient

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.client = SupabaseClient.get_client()
    
    async def create(self, data: dict) -> T:
        result = self.client.table(self.table_name).insert(data).execute()
        return result.data[0]
    
    async def find_by_id(self, id: str) -> Optional[T]:
        result = self.client.table(self.table_name).select("*").eq('id', id).execute()
        return result.data[0] if result.data else None
    
    async def update(self, id: str, data: dict) -> T:
        result = self.client.table(self.table_name).update(data).eq('id', id).execute()
        return result.data[0]
```

### Phase 3: Frontend Migration (Week 2)

#### 3.1 Auth Migration
```typescript
// lib/auth/supabase-auth.ts
import { supabase } from '@/lib/supabase';

export class SupabaseAuthService {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  onAuthStateChange(callback: (event: any, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
```

#### 3.2 API Client Update
```typescript
// lib/api/supabase-client.ts
import { supabase } from '@/lib/supabase';

export class SupabaseAPIClient {
  // Direct database access for simple CRUD
  async getCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules (
          *,
          files (*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // File upload using Supabase Storage
  async uploadFile(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('course-files')
      .upload(path, file);
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('course-files')
      .getPublicUrl(path);
    
    return publicUrl;
  }

  // Realtime subscriptions
  subscribeToChanges(table: string, callback: (payload: any) => void) {
    return supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  }
}
```

### Phase 4: Feature Parity & Enhancement (Week 2-3)

#### 4.1 Vector Search Migration
```sql
-- Supabase function for similarity search
CREATE OR REPLACE FUNCTION search_similar_content(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.id,
    fc.content,
    1 - (fc.embedding <=> query_embedding) as similarity
  FROM file_chunks fc
  WHERE 1 - (fc.embedding <=> query_embedding) > match_threshold
  ORDER BY fc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### 4.2 Background Jobs (Replace Celery)
```typescript
// Use Supabase Edge Functions for background tasks
// supabase/functions/process-file/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  const { fileId } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Process file
  const { data: file } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single()
  
  // Generate embeddings using Supabase's vector capabilities
  // Process and chunk file
  // Store results
  
  return new Response(JSON.stringify({ success: true }))
})
```

## Migration Checklist

### Pre-Migration
- [ ] Set up Supabase project
- [ ] Document all current API endpoints
- [ ] List all background jobs
- [ ] Inventory all S3 assets (don't migrate, just track)

### Database Migration
- [ ] Create all tables with RLS
- [ ] Set up storage buckets
- [ ] Configure pgvector
- [ ] Create database functions
- [ ] Set up indexes

### Backend Migration
- [ ] Install Supabase Python client
- [ ] Create Supabase service layer
- [ ] Update all repositories
- [ ] Migrate auth middleware
- [ ] Update file handling to use Supabase Storage
- [ ] Replace Redis sessions with Supabase Auth

### Frontend Migration
- [ ] Update auth to use Supabase
- [ ] Replace API calls with Supabase client
- [ ] Implement realtime features
- [ ] Update file upload/download
- [ ] Remove Firebase dependencies

### Testing & Validation
- [ ] Auth flow (login, register, OAuth)
- [ ] File upload/processing
- [ ] Vector search functionality
- [ ] Course CRUD operations
- [ ] Realtime updates

### Cleanup
- [ ] Remove Firebase config
- [ ] Remove Neon connections
- [ ] Remove S3 integration
- [ ] Remove Redis/Celery
- [ ] Update environment variables
- [ ] Update deployment configs

## Cost Comparison at Scale

| MAU | Current Stack | Supabase |
|-----|--------------|----------|
| 0-10k | $10-25 | $0 (Free) |
| 10-50k | $25-50 | $25 (Pro) |
| 50-100k | $300-400 | $25 + $163 = $188 |
| 100-250k | $700-1200 | $513-893 |
| 250k+ | $1000+ | $813+ |

## Risk Mitigation

1. **No Data Migration**: Fresh start eliminates data corruption risk
2. **Feature Flags**: Deploy behind flags, gradual rollout
3. **Parallel Run**: Keep old system running during transition
4. **Rollback Plan**: Git branch allows instant rollback

## Benefits Post-Migration

1. **Unified Platform**: One dashboard, one bill, one support
2. **Built-in Features**: Realtime, auth, storage, vectors
3. **Better DX**: Direct DB access from frontend
4. **Compliance**: Single audit surface
5. **Cost Predictability**: Linear scaling, no surprise bills

## Next Steps

1. **Week 0**: Create Supabase project, review this plan
2. **Week 1**: Database schema and backend core
3. **Week 2**: Frontend migration and testing
4. **Week 3**: Final testing and cutover

## Success Metrics

- [ ] All tests passing
- [ ] <100ms p95 latency on key operations
- [ ] Zero data loss
- [ ] Successfully process files with embeddings
- [ ] Auth working with Google OAuth
- [ ] Storage costs reduced by 50%+