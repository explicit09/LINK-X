# LINK-X Architecture Optimization Proposal

## Executive Summary

This proposal outlines a phased approach to optimize LINK-X's architecture by consolidating data storage into Supabase while maintaining the sophisticated AI/RAG capabilities through background workers.

## Current Pain Points

1. **Dual Database Complexity**: Managing two PostgreSQL instances (Supabase + Backend)
2. **Authentication Overhead**: JWT verification on every backend request
3. **Data Synchronization**: User profiles duplicated across databases
4. **Deployment Complexity**: Multiple services to orchestrate
5. **Network Latency**: Multiple hops for common operations

## Proposed Architecture

### Target State
```
Frontend → Supabase (Direct Access)
    ↓         ↓
  Auth    Educational Data
    ↓         ↓
  [RLS]   [Vector Search]
              ↓
         Background Workers (AI/Embeddings Only)
```

## Implementation Plan

### Phase 1: Database Consolidation (Week 1-2)

#### 1.1 Migrate Core Tables to Supabase
```sql
-- migrations/consolidate_to_supabase.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_jsonschema";

-- Migrate course-related tables
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(128) NOT NULL,
  description TEXT,
  code VARCHAR(32),
  term VARCHAR(32),
  published BOOLEAN NOT NULL DEFAULT false,
  category VARCHAR(64),
  tags TEXT[],
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID, -- For future multi-tenant support
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modules with enhanced metadata
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title VARCHAR(128) NOT NULL,
  description TEXT,
  ordering INTEGER NOT NULL DEFAULT 0,
  type VARCHAR(50) DEFAULT 'content', -- content, quiz, assignment
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files with Supabase Storage integration
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  title VARCHAR(128) NOT NULL,
  filename VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'course-files',
  storage_metadata JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  processing_status VARCHAR(50) DEFAULT 'pending',
  transcription TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced file chunks with better search capabilities
CREATE TABLE IF NOT EXISTS public.file_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_type VARCHAR(50), -- paragraph, heading, list, code, etc.
  metadata JSONB DEFAULT '{}', -- section, page number, etc.
  embedding vector(1536),
  embedding_model VARCHAR(50) DEFAULT 'text-embedding-3-small',
  embedding_generated_at TIMESTAMPTZ,
  search_text tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, chunk_index)
);

-- Indexes for performance
CREATE INDEX idx_file_chunks_embedding ON public.file_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_file_chunks_search ON public.file_chunks USING GIN (search_text);
CREATE INDEX idx_file_chunks_course ON public.file_chunks(course_id);

-- Function for hybrid search
CREATE OR REPLACE FUNCTION search_file_chunks(
  query_embedding vector(1536),
  query_text TEXT,
  course_ids UUID[],
  limit_count INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  content TEXT,
  metadata JSONB,
  file_id UUID,
  similarity FLOAT,
  rank FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      fc.id,
      fc.content,
      fc.metadata,
      fc.file_id,
      1 - (fc.embedding <=> query_embedding) AS similarity
    FROM file_chunks fc
    WHERE 
      fc.course_id = ANY(course_ids)
      AND fc.embedding IS NOT NULL
      AND 1 - (fc.embedding <=> query_embedding) > similarity_threshold
    ORDER BY fc.embedding <=> query_embedding
    LIMIT limit_count * 2
  ),
  text_search AS (
    SELECT 
      fc.id,
      fc.content,
      fc.metadata,
      fc.file_id,
      ts_rank(fc.search_text, plainto_tsquery('english', query_text)) AS rank
    FROM file_chunks fc
    WHERE 
      fc.course_id = ANY(course_ids)
      AND fc.search_text @@ plainto_tsquery('english', query_text)
    ORDER BY rank DESC
    LIMIT limit_count * 2
  )
  SELECT DISTINCT ON (id)
    id AS chunk_id,
    content,
    metadata,
    file_id,
    COALESCE(vs.similarity, 0) AS similarity,
    COALESCE(ts.rank, 0) + COALESCE(vs.similarity, 0) AS rank
  FROM (
    SELECT * FROM vector_search
    UNION ALL
    SELECT id, content, metadata, file_id, 0 AS similarity FROM text_search
  ) combined
  LEFT JOIN vector_search vs ON combined.id = vs.id
  LEFT JOIN text_search ts ON combined.id = ts.id
  ORDER BY rank DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 Create Optimized RLS Policies
```sql
-- RLS policies for direct frontend access
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_chunks ENABLE ROW LEVEL SECURITY;

-- Course access policy
CREATE POLICY "course_access" ON public.courses
FOR ALL USING (
  -- Instructors/creators have full access
  auth.uid() = instructor_id OR auth.uid() = creator_id OR
  -- Enrolled students can view
  (auth.uid() IN (
    SELECT user_id FROM public.enrollments WHERE course_id = courses.id
  ) AND (CURRENT_SETTING('request.method', true) = 'GET'))
);

-- Module access inherits from course
CREATE POLICY "module_access" ON public.modules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = modules.course_id
    AND (
      auth.uid() = courses.instructor_id OR 
      auth.uid() = courses.creator_id OR
      auth.uid() IN (
        SELECT user_id FROM public.enrollments WHERE course_id = courses.id
      )
    )
  )
);
```

### Phase 2: Frontend Optimization (Week 3)

#### 2.1 Create Supabase Database Hooks
```typescript
// lib/hooks/useSupabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Type-safe Supabase client
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Course operations hook
export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial load
    loadCourses()

    // Real-time subscription
    const subscription = supabase
      .channel('courses')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'courses' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCourses(prev => [...prev, payload.new as Course])
          } else if (payload.eventType === 'UPDATE') {
            setCourses(prev => prev.map(c => 
              c.id === payload.new.id ? payload.new as Course : c
            ))
          } else if (payload.eventType === 'DELETE') {
            setCourses(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules(count),
        enrollments!inner(user_id)
      `)
      .eq('enrollments.user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })

    if (!error) setCourses(data || [])
    setLoading(false)
  }

  return { courses, loading, refetch: loadCourses }
}

// File operations with progress tracking
export function useFileUpload() {
  const uploadFile = async (
    file: File, 
    moduleId: string,
    onProgress?: (progress: number) => void
  ) => {
    // Generate unique storage path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${file.name}`
    const { data: module } = await supabase
      .from('modules')
      .select('course_id')
      .eq('id', moduleId)
      .single()

    const storagePath = `courses/${module.course_id}/modules/${moduleId}/${fileName}`

    // Upload to Supabase Storage with progress
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-files')
      .upload(storagePath, file, {
        onProgress: (progress) => {
          onProgress?.(progress.loaded / progress.total * 100)
        }
      })

    if (uploadError) throw uploadError

    // Create file record
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        module_id: moduleId,
        title: file.name,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        storage_bucket: 'course-files'
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Trigger processing via Edge Function
    await supabase.functions.invoke('process-file', {
      body: { fileId: fileRecord.id }
    })

    return fileRecord
  }

  return { uploadFile }
}
```

#### 2.2 Implement Hybrid Search in Frontend
```typescript
// lib/search/hybridSearch.ts
export async function searchCourseContent(
  query: string,
  courseIds: string[],
  options: {
    limit?: number
    threshold?: number
  } = {}
) {
  // Generate query embedding via Edge Function
  const { data: embedding } = await supabase.functions.invoke('generate-embedding', {
    body: { text: query }
  })

  // Perform hybrid search
  const { data, error } = await supabase.rpc('search_file_chunks', {
    query_embedding: embedding,
    query_text: query,
    course_ids: courseIds,
    limit_count: options.limit || 10,
    similarity_threshold: options.threshold || 0.7
  })

  if (error) throw error
  return data
}
```

### Phase 3: Backend Simplification (Week 4)

#### 3.1 Convert Backend to Microservices
```python
# services/embedding_service.py
from supabase import create_client
import os

class EmbeddingService:
    """Standalone service for embedding generation"""
    
    def __init__(self):
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_KEY')
        )
        
    def process_file(self, file_id: str):
        """Process file and generate embeddings"""
        # Get file from Supabase
        file = self.supabase.table('files').select('*').eq('id', file_id).execute()
        
        # Download from storage
        file_content = self.supabase.storage.from_('course-files').download(
            file.data[0]['storage_path']
        )
        
        # Extract and chunk text
        chunks = self.extract_and_chunk(file_content)
        
        # Generate embeddings
        for i, chunk in enumerate(chunks):
            embedding = self.generate_embedding(chunk['content'])
            
            # Insert directly to Supabase
            self.supabase.table('file_chunks').insert({
                'file_id': file_id,
                'course_id': file.data[0]['course_id'],
                'content': chunk['content'],
                'chunk_index': i,
                'chunk_type': chunk['type'],
                'metadata': chunk['metadata'],
                'embedding': embedding
            }).execute()
            
        # Update file status
        self.supabase.table('files').update({
            'processed': True,
            'processing_status': 'completed'
        }).eq('id', file_id).execute()
```

#### 3.2 Supabase Edge Functions for Light Processing
```typescript
// supabase/functions/process-file/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { fileId } = await req.json()
  
  // Queue processing job
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Insert job into processing queue
  await supabase.from('processing_queue').insert({
    job_type: 'process_file',
    payload: { fileId },
    status: 'pending'
  })
  
  return new Response(JSON.stringify({ queued: true }))
})
```

### Phase 4: Migration Strategy (Week 5)

#### 4.1 Data Migration Script
```python
# scripts/migrate_to_supabase.py
import psycopg2
from supabase import create_client
import os

def migrate_data():
    # Connect to both databases
    backend_conn = psycopg2.connect(os.getenv('BACKEND_DATABASE_URL'))
    supabase = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_KEY')
    )
    
    # Migrate courses
    cursor = backend_conn.cursor()
    cursor.execute("SELECT * FROM courses")
    courses = cursor.fetchall()
    
    for course in courses:
        # Map backend user_ids to Supabase auth user_ids
        instructor_id = map_user_id(course['instructor_id'])
        creator_id = map_user_id(course['creator_id'])
        
        supabase.table('courses').insert({
            'id': course['id'],
            'title': course['title'],
            'description': course['description'],
            'instructor_id': instructor_id,
            'creator_id': creator_id,
            # ... other fields
        }).execute()
    
    # Similar for modules, files, enrollments, etc.
```

## Benefits of This Architecture

### 1. **Simplified Development**
- Frontend developers work directly with Supabase
- No API layer for basic CRUD operations
- Real-time updates out of the box
- Type-safe database queries

### 2. **Better Performance**
- Fewer network hops
- Supabase edge locations for global performance
- Built-in connection pooling
- Optimized query execution

### 3. **Reduced Complexity**
- Single database to manage
- Unified authentication and data access
- Simpler deployment (Frontend + Supabase + Workers)
- Less configuration overhead

### 4. **Enhanced Features**
- Real-time collaboration built-in
- Automatic backups and point-in-time recovery
- Built-in storage with CDN
- Database functions for complex operations

### 5. **Cost Optimization**
- Single database hosting cost
- Reduced compute for API servers
- Efficient resource utilization
- Pay-per-use model for Edge Functions

## Migration Timeline

- **Week 1-2**: Set up Supabase schema and migrate data
- **Week 3**: Update frontend to use Supabase directly
- **Week 4**: Convert backend to microservices
- **Week 5**: Run parallel systems and validate
- **Week 6**: Complete cutover and decommission old backend

## Risk Mitigation

1. **Gradual Migration**: Run both systems in parallel initially
2. **Feature Flags**: Toggle between old/new implementations
3. **Rollback Plan**: Keep backend operational until fully validated
4. **Data Integrity**: Checksums and validation during migration
5. **Performance Testing**: Load test before full cutover

This optimization maintains all your current functionality while dramatically simplifying the architecture and improving developer experience.