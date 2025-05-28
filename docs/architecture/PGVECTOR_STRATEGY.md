# PgVector Strategy for LEARN-X

## Overview

LEARN-X has standardized on pgvector for all vector storage and retrieval operations. This document outlines our strategy and implementation details.

## Why PgVector?

1. **Real-time Updates**: Student uploads are immediately searchable without index rebuilding
2. **Unified Storage**: Single database system for all data (PostgreSQL)
3. **Performance**: Sub-30ms retrieval with proper indexing
4. **Scalability**: PostgreSQL's mature concurrency model handles high load
5. **Simplicity**: Standard SQL operations for all CRUD operations

## Architecture

### Data Model

```sql
FileChunk:
  - id: UUID (primary key)
  - content: TEXT (chunk text)
  - embedding: VECTOR(1536) (OpenAI embeddings)
  - file_id: UUID (foreign key)
  - course_id: UUID (foreign key)
  - chunk_index: INTEGER
  - created_at: TIMESTAMP
  - chunk_metadata: JSONB (extensible metadata)
```

### Indexing Strategy

We use HNSW (Hierarchical Navigable Small World) indexes for optimal performance:

```sql
CREATE INDEX idx_filechunk_embedding_hnsw 
  ON "FileChunk" 
  USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);
```

Fallback to IVFFlat if HNSW is not available:

```sql
CREATE INDEX idx_filechunk_embedding_ivfflat
  ON "FileChunk" 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
```

### Query Pattern

All vector queries use a CTE (Common Table Expression) for optimization:

```sql
WITH q AS (SELECT :query_vec::vector AS v)
SELECT 
    fc.content,
    fc.chunk_index,
    fc.chunk_metadata,
    f.title as file_title,
    m.title as module_title,
    1 - (fc.embedding <=> q.v) AS similarity
FROM q
JOIN "FileChunk" fc ON TRUE
JOIN "File" f ON fc.file_id = f.id
JOIN "Module" m ON f.module_id = m.id
WHERE fc.course_id = :course_id
  AND 1 - (fc.embedding <=> q.v) > 0.3
ORDER BY fc.embedding <=> q.v
LIMIT 15;
```

## Migration Guide

### From FAISS to PgVector

1. **Run Migration Script**:
   ```bash
   python migrate_to_pgvector.py
   ```

2. **Deploy Updated Code**:
   - Remove all FAISS imports and dependencies
   - Update retrieval logic to use pgvector queries

3. **Monitor Performance**:
   ```bash
   python monitor_pgvector.py
   ```

### Migration Checklist

- [x] Create indexes CONCURRENTLY before main migration
- [x] Run migration during maintenance window
- [x] Verify FAISS columns are removed
- [x] Deploy code without FAISS references
- [x] Run performance benchmarks
- [x] Monitor p95 latency < 60ms

## Performance Tuning

### PostgreSQL Settings

```sql
-- Increase work memory for vector operations
SET work_mem = '256MB';

-- For index builds
SET maintenance_work_mem = '1GB';

-- Enable parallel workers
SET max_parallel_workers_per_gather = 4;

-- Tune vector search (for IVFFlat)
SET ivfflat.probes = 20;

-- Tune vector search (for HNSW)
SET hnsw.ef_search = 100;
```

### Monitoring

Use `monitor_pgvector.py` to track:
- Query latency (p50, p95, p99)
- Index health and usage
- Table statistics
- Optimization suggestions

### Performance Targets

- p95 query latency: < 60ms
- p99 query latency: < 100ms
- Throughput: > 1000 queries/second
- Recall@10: > 0.95

## Best Practices

1. **Chunk Size**: Keep chunks between 200-500 tokens for optimal retrieval
2. **Similarity Threshold**: Use 0.3 as default, adjust based on use case
3. **Result Limit**: Default to 15 results, increase for more context
4. **Index Maintenance**: Run `REINDEX CONCURRENTLY` monthly
5. **Monitoring**: Track query performance and adjust settings

## Troubleshooting

### Slow Queries

1. Check if vector indexes exist:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'FileChunk' 
   AND indexdef LIKE '%vector%';
   ```

2. Analyze query plan:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) <your_query>;
   ```

3. Increase probes/ef_search for better recall at cost of speed

### High Memory Usage

1. Reduce work_mem if OOM errors occur
2. Consider partitioning FileChunk table by course_id
3. Use connection pooling to limit concurrent queries

## Future Enhancements

1. **Hybrid Search**: Combine vector search with keyword search
2. **Reranking**: Add cross-encoder reranking for top results
3. **Quantization**: Reduce embedding size with product quantization
4. **Sharding**: Horizontal sharding by course_id for massive scale