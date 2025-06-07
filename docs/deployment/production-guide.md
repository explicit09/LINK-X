# Production Deployment Guide

## Overview

This guide provides the complete step-by-step process for deploying LEARN-X to production with all the production-readiness features implemented.

## Pre-Deployment Checklist

### Infrastructure Requirements
- [ ] PostgreSQL 13+ with pgvector extension
- [ ] Redis 6+ for caching and queuing
- [ ] S3-compatible storage for file uploads
- [ ] Monitoring infrastructure (Prometheus, Grafana)
- [ ] SSL certificates configured
- [ ] DNS properly configured
- [ ] Load balancer configured

### Security Requirements
- [ ] OpenAI API keys secured in vault
- [ ] Database credentials rotated
- [ ] JWT secrets generated and secured
- [ ] CORS policies configured
- [ ] Rate limiting configured
- [ ] Firewall rules in place

### Compliance Requirements
- [ ] FERPA compliance procedures documented
- [ ] GDPR data processing agreements in place
- [ ] Audit logging enabled
- [ ] Data retention policies configured
- [ ] Backup and recovery procedures tested

## Deployment Steps

### Step 1: Database Setup

1. **Create Production Database**
   ```bash
   # Create database
   createdb learnx_production
   
   # Enable required extensions
   psql learnx_production -c "CREATE EXTENSION IF NOT EXISTS vector;"
   psql learnx_production -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
   psql learnx_production -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"
   ```

2. **Run Database Migrations**
   ```bash
   cd docker-image
   
   # Set production database URL
   export DATABASE_URL="postgresql://user:pass@host:5432/learnx_production"
   
   # Run migrations in order
   psql $DATABASE_URL -f migrations/remove_embedding_trigger.sql
   psql $DATABASE_URL -f migrations/embedding_jobs_transactional.sql
   psql $DATABASE_URL -f migrations/add_dead_letter_queue.sql
   psql $DATABASE_URL -f migrations/budget_protection.sql
   psql $DATABASE_URL -f migrations/rate_limiting_infrastructure.sql
   psql $DATABASE_URL -f migrations/vector_index_optimization.sql
   psql $DATABASE_URL -f migrations/schema_validation_infrastructure.sql
   psql $DATABASE_URL -f migrations/capped_restart_processing.sql
   psql $DATABASE_URL -f migrations/compliance_audit_logging.sql
   psql $DATABASE_URL -f migrations/golden_set_quality_monitoring.sql
   psql $DATABASE_URL -f migrations/secrets_rotation_infrastructure.sql
   psql $DATABASE_URL -f migrations/automated_vector_reindexing.sql
   psql $DATABASE_URL -f migrations/production_monitoring.sql
   ```

3. **Configure System Settings**
   ```sql
   -- Set production configuration
   INSERT INTO system_config (key, value, description) VALUES
       ('EMBEDDINGS_ENABLED', 'true', 'Enable embedding processing'),
       ('MAX_BATCH_SIZE', '100', 'Maximum embedding batch size'),
       ('DAILY_BUDGET_LIMIT', '5000', 'Daily budget limit in cents'),
       ('OPENAI_MODEL', 'text-embedding-3-small', 'OpenAI embedding model')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```

### Step 2: Secrets Management

1. **Store OpenAI API Keys**
   ```sql
   -- Store OpenAI API keys (replace with actual keys)
   SELECT store_secret(
       'openai_primary_key',
       'api_key',
       'sk-your-actual-openai-key-here',
       90,  -- rotation interval days
       NULL,
       '{"provider": "openai", "tier": "primary"}'::jsonb
   );
   ```

2. **Configure JWT Secrets**
   ```sql
   SELECT store_secret(
       'jwt_signing_key',
       'jwt_secret',
       'your-secure-jwt-secret-here',
       180,
       NULL,
       '{"algorithm": "RS256"}'::jsonb
   );
   ```

### Step 3: Application Deployment

1. **Build Production Images**
   ```bash
   # Build backend image
   docker build -t learnx-backend:v1.0 -f docker-image/Dockerfile .
   
   # Build frontend image
   cd frontend
   docker build -t learnx-frontend:v1.0 .
   ```

2. **Deploy with Blue/Green Strategy**
   ```bash
   cd docker-image/scripts
   
   # Deploy to green environment
   python blue_green_deployment.py deploy green v1.0
   
   # Validate deployment
   python blue_green_deployment.py status
   
   # Promote to production (when ready)
   python blue_green_deployment.py promote green
   ```

### Step 4: Monitoring Setup

1. **Configure Production Monitoring**
   ```bash
   # Start monitoring stack
   docker-compose -f docker-compose.monitoring.yml up -d
   
   # Import Grafana dashboards
   curl -X POST \
     http://admin:admin@grafana:3000/api/dashboards/db \
     -H 'Content-Type: application/json' \
     -d @monitoring/grafana/comprehensive-dashboard.json
   ```

2. **Set Up Alerting**
   ```yaml
   # alertmanager.yml
   global:
     smtp_smarthost: 'smtp.company.com:587'
     smtp_from: 'alerts@learnx.com'
   
   route:
     group_by: ['alertname']
     group_wait: 10s
     group_interval: 10s
     repeat_interval: 1h
     receiver: 'web.hook'
   
   receivers:
   - name: 'web.hook'
     email_configs:
     - to: 'oncall@learnx.com'
       subject: 'LEARN-X Alert: {{ .GroupLabels.alertname }}'
   ```

### Step 5: Quality Monitoring Setup

1. **Create Golden Set QA Pairs**
   ```sql
   -- Example golden set questions for quality monitoring
   INSERT INTO golden_set_qa_pairs (course_id, question, expected_answer, expected_chunk_ids, difficulty_level) VALUES
   (
       'course-uuid-here',
       'What is machine learning?',
       'Machine learning is a subset of artificial intelligence...',
       ARRAY['chunk-uuid-1', 'chunk-uuid-2'],
       'easy'
   );
   ```

2. **Schedule Quality Tests**
   ```bash
   # Add cron job for nightly quality tests
   echo "0 2 * * * cd /app && python -c \"from services.quality_monitoring import run_nightly_quality_tests; run_nightly_quality_tests()\"" | crontab -
   ```

### Step 6: Disaster Recovery Setup

1. **Configure Backup Strategy**
   ```bash
   # Setup automated backups
   python scripts/disaster_recovery.py backup --type full
   
   # Schedule daily backups
   echo "0 3 * * * cd /app && python scripts/disaster_recovery.py backup --type incremental" | crontab -
   ```

2. **Test Disaster Recovery**
   ```bash
   # Run DR drill
   python scripts/disaster_recovery.py drill
   ```

### Step 7: Security Validation

1. **Run Penetration Tests**
   ```bash
   # Execute security testing
   python scripts/penetration_testing.py
   
   # Review results
   cat pentest_results.json
   ```

2. **Validate RLS Policies**
   ```sql
   -- Test row level security
   SET app.current_user_id = 'test-user-id';
   
   -- This should only return user's own data
   SELECT * FROM courses;
   SELECT * FROM files;
   ```

## Post-Deployment Verification

### Step 1: Health Checks

1. **System Health**
   ```bash
   curl -f http://your-domain.com/api/health
   ```

2. **Database Health**
   ```sql
   SELECT * FROM embedding_system_health;
   ```

3. **Monitoring Health**
   ```bash
   curl -f http://prometheus:9090/-/healthy
   curl -f http://grafana:3000/api/health
   ```

### Step 2: Functionality Tests

1. **File Upload Test**
   ```bash
   # Test file upload and processing
   curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -F "file=@test.pdf" \
     -F "course_id=test-course-id" \
     http://your-domain.com/api/v2/files/upload
   ```

2. **Vector Search Test**
   ```bash
   # Test search functionality
   curl -X POST \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "test search", "course_id": "test-course-id"}' \
     http://your-domain.com/api/v2/search/vector
   ```

### Step 3: Performance Validation

1. **Load Testing**
   ```bash
   # Run load tests
   ab -n 1000 -c 10 http://your-domain.com/api/health
   ```

2. **Embedding Throughput**
   ```sql
   -- Check embedding processing rate
   SELECT 
       COUNT(*) as embeddings_last_hour,
       COUNT(*) / 60.0 as embeddings_per_minute
   FROM embedding_jobs 
   WHERE completed_at > NOW() - INTERVAL '1 hour'
   AND status = 'completed';
   ```

## Monitoring and Alerting

### Critical Alerts
- Embedding queue depth > 10,000 (page immediately)
- API error rate > 2% (page within 5 minutes)
- Database connections > 90% (alert within 15 minutes)
- Daily cost > $50 (page immediately)

### Warning Alerts
- Embedding processing latency > 5 seconds
- Vector search latency > 500ms
- Quality metrics below baseline

### Dashboards
1. **System Overview**: Overall health, throughput, errors
2. **Embedding Performance**: Queue depth, processing times, quality metrics
3. **Cost Monitoring**: Daily/hourly spend, budget utilization
4. **Security**: Failed auth attempts, RLS violations

## Operational Procedures

### Daily Operations
1. Check system health dashboard
2. Review overnight alerts
3. Monitor cost metrics
4. Check quality test results

### Weekly Operations
1. Review performance trends
2. Check backup completion
3. Rotate API keys if scheduled
4. Review security logs

### Monthly Operations
1. Run disaster recovery drill
2. Review and update runbooks
3. Conduct security audit
4. Update documentation

## Troubleshooting

### Common Issues

1. **High Embedding Queue Depth**
   ```sql
   -- Check worker health
   SELECT * FROM worker_health;
   
   -- Check for poison messages
   SELECT * FROM embedding_dead_letter_queue;
   
   -- Emergency queue drain
   UPDATE system_config SET value = 'false' WHERE key = 'EMBEDDINGS_ENABLED';
   ```

2. **API Performance Issues**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

3. **Budget Exceeded**
   ```sql
   -- Check budget status
   SELECT * FROM daily_budget_status;
   
   -- Emergency cost control
   UPDATE budget_limits SET limit_cents = 1000 WHERE scope_type = 'global';
   ```

### Emergency Procedures

1. **System Down**
   ```bash
   # Immediate rollback
   python scripts/blue_green_deployment.py rollback
   ```

2. **Data Breach Suspected**
   ```bash
   # Rotate all secrets immediately
   python scripts/emergency_key_rotation.py
   
   # Enable audit mode
   UPDATE system_config SET value = 'audit_mode' WHERE key = 'SECURITY_MODE';
   ```

3. **Cost Runaway**
   ```sql
   -- Emergency cost halt
   UPDATE system_config SET value = 'false' WHERE key = 'EMBEDDINGS_ENABLED';
   SELECT emergency_rotate_secret('openai_primary_key', 'Cost runaway detected');
   ```

## Compliance and Legal

### FERPA Compliance
- All student data access is logged
- Data destruction procedures are automated
- Access controls prevent cross-tenant data exposure

### GDPR Compliance  
- Data processing agreements in place
- User consent mechanisms implemented
- Data portability and deletion capabilities available

### SOC 2 Requirements
- Access controls documented and tested
- Audit logging comprehensive and immutable
- Incident response procedures defined

## Support Contacts

- **On-Call Engineering**: +1-xxx-xxx-xxxx
- **Database DBA**: dba@learnx.com  
- **Security Team**: security@learnx.com
- **Infrastructure**: infrastructure@learnx.com

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-07 | Initial production deployment guide |

---

**Note**: This guide should be kept up-to-date with any changes to the production environment or procedures.