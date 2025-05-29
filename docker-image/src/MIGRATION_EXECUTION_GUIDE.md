# PgVector Migration Execution Guide

## Pre-Migration Checklist

- [ ] Backup database
- [ ] Test migration script in staging environment
- [ ] Notify users of maintenance window
- [ ] Ensure POSTGRES_URL environment variable is set
- [ ] Have rollback plan ready

## Step-by-Step Execution

### Step 1: Create Indexes (Live - No Downtime)

Run this first to create the supporting indexes. This can be done while the system is live:

```bash
cd /Users/explicit/Documents/GitHub/LINK-X1/docker-image/src
export POSTGRES_URL="your-postgres-connection-string"
python migrate_to_pgvector.py
```

When prompted, this will:
1. Create B-tree indexes on course_id, file_id, and created_at
2. Check current chunk count
3. Skip the main migration (answer 'no' when prompted)

Expected output:
```
Step 1: Creating indexes concurrently...
  Creating index idx_filechunk_course_id...
  ✓ Index idx_filechunk_course_id created
  Creating index idx_filechunk_file_id...
  ✓ Index idx_filechunk_file_id created
  Creating index idx_filechunk_created_at...
  ✓ Index idx_filechunk_created_at created

Step 2: FileChunk count check
  Current chunks: 12345
  
Step 3: Main migration (MAINTENANCE WINDOW REQUIRED)
  ⚠️  This will lock tables briefly. Ensure uploads are disabled!
  Continue with migration? (yes/no): no
  Migration cancelled.
```

### Step 2: Schedule Maintenance Window

Choose a low-traffic time (e.g., 2-4 AM) and:
1. Send notification to users
2. Prepare deployment package with updated code
3. Set up monitoring

### Step 3: Disable Uploads

Add a maintenance banner to the frontend:

```javascript
// In your upload components
if (MAINTENANCE_MODE) {
  return <div>System maintenance in progress. Uploads will be available shortly.</div>
}
```

Or at the API level in app.py:

```python
MAINTENANCE_MODE = os.getenv('MAINTENANCE_MODE', 'false').lower() == 'true'

# In upload endpoints
if MAINTENANCE_MODE:
    return jsonify({'error': 'System maintenance in progress'}), 503
```

### Step 4: Run Main Migration

```bash
# Set maintenance mode
export MAINTENANCE_MODE=true

# Run migration
python migrate_to_pgvector.py
```

When prompted, answer 'yes' to continue with migration:

```
Step 3: Main migration (MAINTENANCE WINDOW REQUIRED)
  ⚠️  This will lock tables briefly. Ensure uploads are disabled!
  Continue with migration? (yes/no): yes
  Adding new columns...
  Optimizing vector storage...
  Dropping FAISS columns from Course...
  Dropping FAISS columns from File...
  ✓ Migration completed successfully

Step 4: Vector index creation
  Creating HNSW index (recommended for PostgreSQL 16+)...
  Chunk count: 12345, calculated lists: 50
  ✓ HNSW index created

Step 5: Vacuum and analyze
  Analyzing FileChunk...
  ✓ FileChunk analyzed
  Analyzing Course...
  ✓ Course analyzed
  Analyzing File...
  ✓ File analyzed

Verification:
  ✓ FAISS columns successfully removed
  ✓ FileChunk indexes: idx_filechunk_course_id, idx_filechunk_file_id, idx_filechunk_embedding_hnsw

✅ Migration completed successfully!
```

### Step 5: Deploy Updated Code

Deploy the code with FAISS references removed:

```bash
# Deploy your application
# This depends on your deployment method (Docker, K8s, etc.)

# For Docker:
docker build -t learnx-api:pgvector .
docker stop learnx-api
docker run -d --name learnx-api learnx-api:pgvector

# Verify the app starts without errors
docker logs learnx-api
```

### Step 6: Run Benchmarks

Verify performance meets targets:

```bash
python monitor_pgvector.py
```

Expected output:
```
📊 Table Statistics:
  Total chunks: 12,345
  Unique courses: 50
  Unique files: 523
  Table size: 1.2 GB

⏱️  Performance Metrics:
  Average query time: 22.34 ms
  Median query time: 18.45 ms
  95th percentile: 45.23 ms
  99th percentile: 67.89 ms
  ✅ Good performance

📄 Results saved to: pgvector_benchmark_20240126_143022.json
```

### Step 7: Re-enable Uploads

```bash
# Disable maintenance mode
export MAINTENANCE_MODE=false

# Or remove the environment variable entirely
unset MAINTENANCE_MODE
```

Test upload functionality:
1. Upload a test file
2. Verify it's immediately searchable
3. Check performance metrics

## Rollback Plan

If issues occur, rollback with:

```sql
-- Restore FAISS columns (data will be null)
ALTER TABLE "Course" 
  ADD COLUMN index_pkl BYTEA, 
  ADD COLUMN index_faiss BYTEA;

ALTER TABLE "File" 
  ADD COLUMN index_pkl BYTEA, 
  ADD COLUMN index_faiss BYTEA;

-- Deploy previous code version
```

## Post-Migration Checklist

- [ ] All uploads working correctly
- [ ] Search/retrieval functioning properly
- [ ] Performance metrics within targets (p95 < 60ms)
- [ ] No errors in application logs
- [ ] Remove old FAISS data from backups (after 30 days)

## Monitoring Commands

```bash
# Check query performance over time
python monitor_pgvector.py

# Database health check
psql $POSTGRES_URL -c "
  SELECT 
    schemaname, tablename, indexname 
  FROM pg_indexes 
  WHERE tablename = 'FileChunk';
"

# Check for slow queries
psql $POSTGRES_URL -c "
  SELECT 
    query, 
    calls, 
    mean_exec_time 
  FROM pg_stat_statements 
  WHERE query LIKE '%FileChunk%' 
  ORDER BY mean_exec_time DESC 
  LIMIT 10;
"
```

## Troubleshooting

### Issue: Migration fails at index creation
**Solution**: Indexes might already exist. Check and drop if needed:
```sql
DROP INDEX IF EXISTS idx_filechunk_course_id;
```

### Issue: Poor query performance after migration
**Solution**: 
1. Ensure vector index was created
2. Run `ANALYZE "FileChunk";`
3. Increase work_mem: `SET work_mem = '256MB';`
4. Tune index parameters

### Issue: Out of memory errors
**Solution**:
1. Reduce work_mem
2. Limit concurrent connections
3. Consider table partitioning

## Success Criteria

- ✅ Zero data loss
- ✅ p95 query latency < 60ms
- ✅ Successful file uploads and immediate searchability
- ✅ No increase in error rates
- ✅ Positive user feedback