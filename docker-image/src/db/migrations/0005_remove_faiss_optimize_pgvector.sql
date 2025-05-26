-- Migration: Remove FAISS blob columns and optimize pgvector
-- This migration must be run during a maintenance window

-- Step 1: Add new columns and optimize storage
ALTER TABLE "FileChunk" 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS chunk_metadata JSONB;

-- Optimize vector storage to prevent TOAST bloat
ALTER TABLE "FileChunk" ALTER COLUMN embedding SET STORAGE PLAIN;

-- Step 2: Create indexes CONCURRENTLY (can be run before maintenance)
-- Note: Run these OUTSIDE the transaction before the main migration
-- CREATE INDEX CONCURRENTLY idx_filechunk_course_id ON "FileChunk" (course_id);
-- CREATE INDEX CONCURRENTLY idx_filechunk_file_id ON "FileChunk" (file_id);
-- CREATE INDEX CONCURRENTLY idx_filechunk_created_at ON "FileChunk" (created_at);

-- Step 3: Main migration - RUN DURING MAINTENANCE WINDOW
BEGIN;

-- Drop FAISS blob columns from Course table
ALTER TABLE "Course" 
  DROP COLUMN IF EXISTS index_pkl,
  DROP COLUMN IF EXISTS index_faiss;

-- Drop FAISS blob columns from File table  
ALTER TABLE "File"
  DROP COLUMN IF EXISTS index_pkl,
  DROP COLUMN IF EXISTS index_faiss;

COMMIT;

-- Step 4: After migration and some data ingestion, create vector index
-- Wait until you have at least 1000 chunks, then run:
-- CREATE INDEX CONCURRENTLY idx_filechunk_embedding_hnsw 
--   ON "FileChunk" 
--   USING hnsw (embedding vector_cosine_ops) 
--   WITH (m = 16, ef_construction = 64);

-- For ivfflat alternative (if HNSW not available):
-- CREATE INDEX CONCURRENTLY idx_filechunk_embedding_ivfflat
--   ON "FileChunk" 
--   USING ivfflat (embedding vector_cosine_ops) 
--   WITH (lists = 100);

-- Step 5: Vacuum and analyze
-- VACUUM ANALYZE "FileChunk";
-- VACUUM ANALYZE "Course";
-- VACUUM ANALYZE "File";

-- Rollback plan:
-- ALTER TABLE "Course" ADD COLUMN index_pkl BYTEA, ADD COLUMN index_faiss BYTEA;
-- ALTER TABLE "File" ADD COLUMN index_pkl BYTEA, ADD COLUMN index_faiss BYTEA;