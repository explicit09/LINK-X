-- Migration: Add enhanced RAG fields for semantic chunking and style profiles
-- Date: 2025-01-06

-- Add teaching_style to Course table (using existing metadata field)
-- No change needed - we'll use the existing metadata JSONB field

-- Add semantic_processed flag to File metadata
-- No change needed - we'll use the existing metadata JSONB field on File table

-- Create full-text search index on FileChunk content if not exists
CREATE INDEX IF NOT EXISTS idx_filechunk_content_fts 
ON "FileChunk" 
USING gin(to_tsvector('english', content));

-- Create index on chunk_metadata for faster filtering
CREATE INDEX IF NOT EXISTS idx_filechunk_metadata 
ON "FileChunk" 
USING gin(chunk_metadata);

-- Create composite index for hybrid search
CREATE INDEX IF NOT EXISTS idx_filechunk_hybrid_search 
ON "FileChunk" (course_id, file_id, chunk_index);

-- Future: Concept graph tables (Phase 3)
-- CREATE TABLE IF NOT EXISTS concept_graph (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     concept TEXT NOT NULL,
--     course_id UUID REFERENCES "Course"(id),
--     embedding vector(1536),
--     metadata JSONB,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE IF NOT EXISTS concept_relationships (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     source_id UUID REFERENCES concept_graph(id),
--     target_id UUID REFERENCES concept_graph(id),
--     relationship_type TEXT NOT NULL,
--     strength FLOAT DEFAULT 1.0,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );