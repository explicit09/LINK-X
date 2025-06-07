# Operational Runbooks

## Table of Contents
1. [High Priority Alerts](#high-priority-alerts)
2. [System Health Issues](#system-health-issues)
3. [Performance Problems](#performance-problems)
4. [Security Incidents](#security-incidents)
5. [Data Issues](#data-issues)
6. [Routine Maintenance](#routine-maintenance)

---

## High Priority Alerts

### 🚨 CRITICAL: Embedding Queue Depth > 50,000

**Symptoms:**
- Alert: "Embedding backlog > 50,000 pending jobs"
- Users report slow file processing
- Dashboard shows red status

**Immediate Actions (< 5 minutes):**
1. **Check system status**
   ```sql
   SELECT * FROM embedding_system_health;
   SELECT * FROM get_alert_status();
   ```

2. **Identify root cause**
   ```sql
   -- Check worker health
   SELECT * FROM worker_health WHERE status != 'healthy';
   
   -- Check for poison messages
   SELECT COUNT(*) FROM embedding_dead_letter_queue 
   WHERE created_at > NOW() - INTERVAL '1 hour';
   
   -- Check OpenAI API issues
   SELECT * FROM rate_limit_usage 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC LIMIT 10;
   ```

3. **Quick mitigation**
   ```sql
   -- If workers are down, restart them
   -- If poison messages detected:
   SELECT send_to_dlq(id, 'Manual intervention - queue clearing') 
   FROM embedding_jobs 
   WHERE status = 'pending' 
   AND attempt_count >= max_attempts;
   
   -- If API rate limited, activate additional keys:
   UPDATE system_config 
   SET value = '{"keys": ["key1", "key2", "backup_key"]}'
   WHERE key = 'OPENAI_API_KEYS';
   ```

**Follow-up Actions (< 30 minutes):**
1. Scale worker instances if infrastructure allows
2. Contact on-call if workers won't restart
3. Update incident channel with status

**Escalation:** Page on-call engineer if queue doesn't reduce within 15 minutes

---

### 🚨 CRITICAL: API Error Rate > 5%

**Symptoms:**
- Alert: "API error rate exceeds 5%"
- Users reporting 500 errors
- Monitoring shows high error count

**Immediate Actions (< 2 minutes):**
1. **Check system health**
   ```bash
   curl -f $API_URL/api/health
   ```

2. **Identify error patterns**
   ```sql
   -- Check recent errors
   SELECT 
       endpoint,
       error_type,
       COUNT(*) as error_count,
       sample_error_message
   FROM api_error_logs 
   WHERE created_at > NOW() - INTERVAL '10 minutes'
   GROUP BY endpoint, error_type, sample_error_message
   ORDER BY error_count DESC;
   ```

3. **Quick mitigation**
   ```bash
   # If specific endpoint failing, disable it temporarily
   # If database issues, check connections:
   docker exec backend psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"
   
   # If memory issues, restart service:
   docker-compose restart backend
   ```

**Follow-up Actions:**
1. Check application logs for stack traces
2. Verify database connectivity and performance
3. Check external service dependencies (OpenAI, Redis)

**Escalation:** Immediate page if errors affect user authentication or data corruption suspected

---

### 🚨 CRITICAL: Daily Cost > $50

**Symptoms:**
- Alert: "Daily budget exceeded: $X > $50"
- OpenAI usage spike detected

**Immediate Actions (< 1 minute):**
1. **Stop all embedding processing**
   ```sql
   UPDATE system_config SET value = 'false' WHERE key = 'EMBEDDINGS_ENABLED';
   ```

2. **Check cost breakdown**
   ```sql
   SELECT * FROM daily_budget_status WHERE tracking_date = CURRENT_DATE;
   
   -- Check recent high-cost operations
   SELECT 
       tenant_id,
       course_id,
       SUM(cost_cents) as total_cost_cents,
       COUNT(*) as operations
   FROM budget_tracking 
   WHERE tracking_date = CURRENT_DATE
   GROUP BY tenant_id, course_id
   ORDER BY total_cost_cents DESC;
   ```

3. **Identify cause**
   ```sql
   -- Check for unusual file uploads
   SELECT 
       f.filename,
       f.course_id,
       COUNT(fc.id) as chunk_count,
       f.created_at
   FROM files f
   JOIN file_chunks fc ON fc.file_id = f.id
   WHERE f.created_at > CURRENT_DATE
   GROUP BY f.id, f.filename, f.course_id, f.created_at
   ORDER BY chunk_count DESC;
   ```

**Follow-up Actions:**
1. Contact affected tenant if unusual usage detected
2. Implement emergency budget caps
3. Consider rotating API keys if abuse suspected

**Escalation:** Notify finance team and management immediately

---

## System Health Issues

### ⚠️ WARNING: No Healthy Workers

**Symptoms:**
- Alert: "Zero healthy workers detected"
- Embedding processing stopped

**Diagnosis Steps:**
1. **Check worker status**
   ```sql
   SELECT * FROM worker_health ORDER BY last_heartbeat DESC;
   ```

2. **Check worker processes**
   ```bash
   docker ps | grep worker
   docker-compose logs worker
   ```

3. **Check resource usage**
   ```bash
   docker stats
   free -h
   df -h
   ```

**Resolution Steps:**
1. **Restart workers**
   ```bash
   docker-compose restart worker
   # Or scale up:
   docker-compose up -d --scale worker=3
   ```

2. **Check dependencies**
   ```bash
   # Test database connection
   docker exec worker psql $DATABASE_URL -c "SELECT 1;"
   
   # Test Redis connection  
   docker exec worker redis-cli -u $REDIS_URL ping
   ```

3. **Clear any stuck jobs**
   ```sql
   -- Reset stuck processing jobs
   UPDATE embedding_jobs 
   SET status = 'pending', started_at = NULL 
   WHERE status = 'processing' 
   AND started_at < NOW() - INTERVAL '30 minutes';
   ```

---

### ⚠️ WARNING: High Database Connection Count

**Symptoms:**
- Alert: "Database connections > 90%"
- Slow query performance

**Diagnosis Steps:**
1. **Check current connections**
   ```sql
   SELECT 
       COUNT(*) as total_connections,
       COUNT(*) FILTER (WHERE state = 'active') as active_connections,
       COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
   FROM pg_stat_activity;
   
   -- Check connections by application
   SELECT 
       application_name,
       COUNT(*),
       state
   FROM pg_stat_activity 
   GROUP BY application_name, state
   ORDER BY count DESC;
   ```

2. **Identify long-running queries**
   ```sql
   SELECT 
       query,
       state,
       query_start,
       NOW() - query_start as duration
   FROM pg_stat_activity 
   WHERE state = 'active'
   ORDER BY query_start;
   ```

**Resolution Steps:**
1. **Kill problematic queries**
   ```sql
   -- Kill long-running queries (>5 minutes)
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity 
   WHERE NOW() - query_start > INTERVAL '5 minutes'
   AND state = 'active'
   AND query !~ 'VACUUM|REINDEX';
   ```

2. **Restart connection pools**
   ```bash
   docker-compose restart backend
   ```

3. **Check for connection leaks**
   ```bash
   # Review application logs for connection errors
   docker-compose logs backend | grep -i "connection\|pool"
   ```

---

## Performance Problems

### ⚠️ WARNING: Vector Search Latency > 500ms

**Symptoms:**
- Slow search responses
- User complaints about search performance

**Diagnosis Steps:**
1. **Check vector index health**
   ```sql
   SELECT * FROM vector_health_dashboard;
   SELECT * FROM check_vector_index_health();
   ```

2. **Check recent search patterns**
   ```sql
   SELECT 
       AVG(response_time_ms) as avg_response_time,
       COUNT(*) as search_count,
       DATE_TRUNC('hour', created_at) as hour
   FROM search_metrics 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY DATE_TRUNC('hour', created_at)
   ORDER BY hour;
   ```

**Resolution Steps:**
1. **Check for index fragmentation**
   ```sql
   -- If fragmentation > 30%, schedule reindex
   SELECT run_vector_maintenance();
   ```

2. **Optimize search queries**
   ```sql
   -- Check for missing indexes
   EXPLAIN ANALYZE 
   SELECT fc.id, fc.content <-> '[0.1,0.2...]'::vector as similarity
   FROM file_chunks fc
   WHERE fc.course_id = 'test-course-id'
   ORDER BY similarity LIMIT 10;
   ```

3. **Scale search infrastructure**
   ```bash
   # Add read replicas if available
   # Consider caching frequent searches
   ```

---

### ⚠️ WARNING: Quality Metrics Below Baseline

**Symptoms:**
- Alert: "Recall@5 dropped below 0.7"
- User reports of poor search quality

**Diagnosis Steps:**
1. **Check recent quality tests**
   ```sql
   SELECT * FROM quality_dashboard WHERE status != 'HEALTHY';
   
   -- Get detailed test results
   SELECT 
       test_run_id,
       course_id,
       avg_precision_at_k,
       avg_recall_at_k,
       executed_at
   FROM quality_test_results 
   WHERE executed_at > NOW() - INTERVAL '7 days'
   ORDER BY executed_at DESC;
   ```

2. **Compare with baseline**
   ```sql
   SELECT * FROM check_quality_regression('course-id', 'recent-test-run-id');
   ```

**Resolution Steps:**
1. **Run immediate quality assessment**
   ```sql
   SELECT run_course_quality_tests('affected-course-id', 'manual');
   ```

2. **Check for data changes**
   ```sql
   -- Check for recent large file uploads that might affect quality
   SELECT 
       f.filename,
       f.course_id,
       COUNT(fc.id) as chunk_count,
       f.created_at
   FROM files f
   JOIN file_chunks fc ON fc.file_id = f.id
   WHERE f.created_at > NOW() - INTERVAL '7 days'
   GROUP BY f.id
   ORDER BY chunk_count DESC;
   ```

3. **Trigger reprocessing if needed**
   ```sql
   -- Mark files for reprocessing if quality degraded
   UPDATE files SET status = 'pending_reprocess' 
   WHERE course_id = 'affected-course-id'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

---

## Security Incidents

### 🔴 CRITICAL: Suspected Data Breach

**Symptoms:**
- Unusual access patterns
- Failed authentication spikes
- Cross-tenant data access alerts

**Immediate Actions (< 1 minute):**
1. **Enable audit mode**
   ```sql
   UPDATE system_config SET value = 'audit_mode' WHERE key = 'SECURITY_MODE';
   ```

2. **Check recent suspicious activity**
   ```sql
   SELECT * FROM compliance_audit_log 
   WHERE event_timestamp > NOW() - INTERVAL '1 hour'
   AND action_type IN ('SELECT', 'DOWNLOAD')
   ORDER BY event_timestamp DESC;
   ```

3. **Rotate critical secrets**
   ```sql
   SELECT emergency_rotate_secret('openai_primary_key', 'Security incident');
   SELECT emergency_rotate_secret('jwt_signing_key', 'Security incident');
   ```

**Follow-up Actions (< 15 minutes):**
1. **Identify scope of access**
   ```sql
   -- Check cross-tenant access attempts
   SELECT 
       actor_id,
       tenant_id,
       table_name,
       COUNT(*) as access_count
   FROM compliance_audit_log 
   WHERE event_timestamp > NOW() - INTERVAL '24 hours'
   GROUP BY actor_id, tenant_id, table_name
   HAVING COUNT(*) > 100  -- Unusual access volume
   ORDER BY access_count DESC;
   ```

2. **Suspend suspicious accounts**
   ```sql
   UPDATE users SET status = 'suspended' 
   WHERE id IN ('suspicious-user-ids');
   ```

3. **Document incident**
   - Create incident ticket
   - Notify security team
   - Preserve audit logs

**Escalation:** Immediately notify CISO and legal team

---

### 🔴 CRITICAL: RLS Policy Violation

**Symptoms:**
- Alert: "Cross-tenant data access detected"
- Audit logs show unauthorized access

**Immediate Actions:**
1. **Verify the violation**
   ```sql
   SELECT * FROM compliance_audit_log 
   WHERE metadata->>'security_violation' IS NOT NULL
   AND event_timestamp > NOW() - INTERVAL '1 hour';
   ```

2. **Check affected data**
   ```sql
   -- Identify what data was accessed
   SELECT 
       table_name,
       record_id,
       content_hash,
       actor_id,
       tenant_id
   FROM compliance_audit_log 
   WHERE metadata->>'security_violation' IS NOT NULL;
   ```

3. **Block further access**
   ```sql
   -- Temporarily disable the affected user
   UPDATE users SET status = 'suspended' WHERE id = 'violating-user-id';
   ```

**Follow-up Actions:**
1. Test RLS policies manually
2. Run penetration tests
3. Review and strengthen policies if needed

---

## Data Issues

### ⚠️ WARNING: Vector Index Corruption

**Symptoms:**
- Search returns inconsistent results
- Vector similarity calculations failing

**Diagnosis Steps:**
1. **Check index integrity**
   ```sql
   SELECT * FROM check_vector_index_health();
   
   -- Check for null embeddings
   SELECT COUNT(*) FROM file_chunks WHERE embedding IS NULL;
   
   -- Check embedding dimensions
   SELECT 
       array_length(embedding, 1) as dimensions,
       COUNT(*)
   FROM file_chunks 
   WHERE embedding IS NOT NULL
   GROUP BY array_length(embedding, 1);
   ```

**Resolution Steps:**
1. **Reindex affected partitions**
   ```sql
   SELECT reindex_vector_indexes_concurrent('affected_partition');
   ```

2. **Regenerate corrupted embeddings**
   ```sql
   -- Mark files for re-embedding
   INSERT INTO embedding_jobs (chunk_id, priority, status)
   SELECT id, 1, 'pending' 
   FROM file_chunks 
   WHERE embedding IS NULL OR array_length(embedding, 1) != 1536;
   ```

---

### ⚠️ WARNING: File Processing Stuck

**Symptoms:**
- Files uploaded but not processed
- No embeddings generated for new files

**Diagnosis Steps:**
1. **Check processing pipeline**
   ```sql
   SELECT 
       f.status,
       COUNT(*) as file_count,
       AVG(EXTRACT(EPOCH FROM NOW() - f.created_at)) as avg_age_seconds
   FROM files f 
   WHERE f.created_at > NOW() - INTERVAL '6 hours'
   GROUP BY f.status;
   ```

2. **Check for stuck jobs**
   ```sql
   SELECT * FROM embedding_jobs 
   WHERE status = 'processing' 
   AND started_at < NOW() - INTERVAL '30 minutes';
   ```

**Resolution Steps:**
1. **Reset stuck jobs**
   ```sql
   UPDATE embedding_jobs 
   SET status = 'pending', started_at = NULL, attempt_count = 0
   WHERE status = 'processing' 
   AND started_at < NOW() - INTERVAL '30 minutes';
   ```

2. **Restart file processing workers**
   ```bash
   docker-compose restart worker
   ```

---

## Routine Maintenance

### Weekly Maintenance Tasks

1. **Database Cleanup**
   ```sql
   -- Clean up old audit logs (keep 180 days for compliance)
   SELECT cleanup_expired_audit_logs();
   
   -- Clean up old metrics (keep 30 days)
   SELECT cleanup_old_metrics(30);
   
   -- Vacuum analyze key tables
   VACUUM ANALYZE embedding_jobs;
   VACUUM ANALYZE file_chunks;
   VACUUM ANALYZE compliance_audit_log;
   ```

2. **Secret Rotation Check**
   ```sql
   SELECT * FROM check_secrets_for_rotation();
   
   -- Rotate any secrets due for rotation
   SELECT rotate_secret(secret_name, new_key_value, 'scheduled')
   FROM secrets_vault 
   WHERE rotation_scheduled_at <= NOW() AND is_active = true;
   ```

3. **Performance Review**
   ```sql
   -- Check slow queries
   SELECT 
       query,
       mean_time,
       calls,
       total_time
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 20;
   
   -- Reset stats for next week
   SELECT pg_stat_statements_reset();
   ```

### Monthly Maintenance Tasks

1. **Disaster Recovery Drill**
   ```bash
   python scripts/disaster_recovery.py drill
   ```

2. **Security Assessment**
   ```bash
   python scripts/penetration_testing.py
   ```

3. **Capacity Planning Review**
   ```sql
   -- Check storage usage trends
   SELECT 
       DATE_TRUNC('week', created_at) as week,
       COUNT(*) as files_uploaded,
       SUM(file_size_bytes) as total_bytes
   FROM files 
   WHERE created_at > NOW() - INTERVAL '3 months'
   GROUP BY week
   ORDER BY week;
   ```

---

## Emergency Contacts

### Escalation Matrix

| Issue Type | Primary Contact | Secondary Contact | Escalation Time |
|------------|----------------|-------------------|-----------------|
| System Down | On-call Engineer | Lead Engineer | 15 minutes |
| Security Incident | Security Team | CISO | 5 minutes |
| Data Breach | CISO | Legal Team | Immediate |
| Cost Overrun | Finance Team | CTO | 30 minutes |
| Database Issues | DBA Team | Infrastructure | 10 minutes |

### Contact Information
- **On-call Engineering**: +1-xxx-xxx-xxxx (PagerDuty)
- **Security Team**: security@learnx.com, +1-xxx-xxx-xxxx
- **Database Team**: dba@learnx.com
- **Infrastructure**: infrastructure@learnx.com

---

## Runbook Maintenance

This runbook should be:
- Reviewed monthly by the engineering team
- Updated after each incident or major change
- Tested during quarterly disaster recovery drills
- Version controlled with the main codebase

**Last Updated**: 2024-12-07  
**Next Review Date**: 2025-01-07  
**Document Owner**: Engineering Team