# Supabase Deployment Checklist

## Pre-Deployment
- [ ] Backup your Supabase database
- [ ] Ensure you have admin access to Supabase dashboard
- [ ] Have your OpenAI API keys ready
- [ ] Review current system load (if production)

## Step 1: Enable Extensions
1. Go to Supabase Dashboard → Database → Extensions
2. Enable the following extensions:
   - [ ] `vector` (for pgvector)
   - [ ] `pgcrypto` (for UUID generation)
   - [ ] `uuid-ossp` (for UUID functions)
   - [ ] `pgmq` (if available - for message queuing)
   - [ ] `pg_net` (if available - for HTTP requests)
   - [ ] `pg_cron` (if available - for scheduled jobs)

3. If `pgmq`, `pg_net`, or `pg_cron` are not available, note this for alternative implementation

## Step 2: Run Migration Files
Execute in Supabase SQL Editor **in this exact order**:

1. [ ] `supabase_setup.sql` - Enable extensions
2. [ ] `migrations/remove_embedding_trigger.sql` - Remove problematic trigger
3. [ ] `migrations/embedding_jobs_transactional.sql` - Transactional outbox
4. [ ] `migrations/add_dead_letter_queue.sql` - Poison message handling
5. [ ] `migrations/rate_limiting_infrastructure.sql` - Rate limiting
6. [ ] `migrations/vector_index_optimization.sql` - Vector optimization
7. [ ] `migrations/schema_validation_infrastructure.sql` - Schema validation
8. [ ] `migrations/capped_restart_processing.sql` - Kill switch improvements

## Step 3: Configure System
1. [ ] Run `configure_openai_keys.sql` with your actual API keys
2. [ ] Run `setup_rls_policies.sql` for security
3. [ ] Update any environment variables in your backend service

## Step 4: Verification
1. [ ] Run `verify_setup.sql` to check everything is working
2. [ ] Check that no critical alerts are showing
3. [ ] Verify schema validation passes
4. [ ] Test creating a test embedding job

## Step 5: Backend Service Configuration
Update your backend service with:

```python
# Environment variables to set
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key  # Also stored in database

# Start the PGMQ worker
python src/workers/pgmq_embedding_worker.py
```

## Step 6: Monitoring Setup
1. [ ] Set up alerting for system health
2. [ ] Monitor the embedding queue
3. [ ] Check worker health regularly
4. [ ] Set up automated backups

## Rollback Plan
If something goes wrong:
1. [ ] Disable embeddings: `UPDATE system_config SET value = 'false' WHERE key = 'EMBEDDINGS_ENABLED';`
2. [ ] Check system health: `SELECT * FROM embedding_system_health;`
3. [ ] Review alerts: `SELECT * FROM check_embedding_alerts();`
4. [ ] Restore from backup if necessary

## Success Criteria
- [ ] `embedding_system_health` shows status = 'HEALTHY'
- [ ] No critical alerts in monitoring
- [ ] Schema validation passes for all functions
- [ ] Test embedding jobs process successfully
- [ ] Kill switch works (test disable/enable)

## Notes
- The system processes embeddings asynchronously via PGMQ
- Rate limiting prevents OpenAI API throttling
- Kill switch allows immediate system disable if needed
- Schema validation prevents outbox drift
- Vector partitioning handles large datasets efficiently