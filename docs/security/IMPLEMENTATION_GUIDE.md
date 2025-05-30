# Security Improvements Implementation Guide

This guide provides step-by-step instructions for implementing and verifying the security improvements in the LEARN-X platform.

## Prerequisites

- Docker and Docker Compose installed
- Python 3.9+ for scripts
- AWS CLI configured (for S3 operations)
- Access to environment variables/secrets

## Step 1: Environment Setup

### 1.1 Generate JWT Secret Key

```bash
# Generate a secure JWT secret
python scripts/generate_jwt_secret.py

# Add to your .env file
echo "JWT_SECRET_KEY=your-generated-key-here" >> .env
```

### 1.2 Configure Environment Variables

```bash
# Copy the complete example
cp .env.example.complete .env

# Edit with your values
nano .env
```

Required variables:
- `JWT_SECRET_KEY` - Generated in step 1.1
- `DATABASE_URL` or individual DB variables
- `REDIS_URL` - Redis connection string
- `AWS_ACCESS_KEY_ID` - For S3 access
- `AWS_SECRET_ACCESS_KEY` - For S3 access
- `FIREBASE_*` - Firebase credentials (or set FIREBASE_DISABLED=true)

## Step 2: Update S3 CORS Configuration

### 2.1 Development Environment

```bash
# Update S3 CORS for development
export S3_BUCKET_NAME=your-bucket-name
aws s3api put-bucket-cors \
  --bucket $S3_BUCKET_NAME \
  --cors-configuration file://docker-image/config/s3_cors_config.json
```

### 2.2 Production Environment

```bash
# Use the production script
export S3_BUCKET_NAME=your-production-bucket
export FLASK_ENV=production
./scripts/update_s3_cors_production.sh
```

## Step 3: Build and Deploy

### 3.1 Build Docker Images

```bash
# Build development image
docker-compose build

# Build production image
DOCKER_ENV=prod docker-compose build
```

### 3.2 Run Database Migrations

```bash
# Start only the database
docker-compose up -d db

# Run migrations
docker-compose run --rm backend python -m scripts.execute_migrations
```

### 3.3 Start Services

```bash
# Development mode
docker-compose --profile dev up

# Production mode
DOCKER_ENV=prod FLASK_ENV=production docker-compose --profile prod up -d

# With monitoring
docker-compose --profile prod --profile monitoring up -d
```

## Step 4: Verify Security Improvements

### 4.1 Check JWT Configuration

```bash
# This should fail without JWT_SECRET_KEY
docker-compose run --rm -e JWT_SECRET_KEY="" backend python -c "from app import create_app; create_app()"
# Expected: ValueError about missing JWT_SECRET_KEY
```

### 4.2 Test Rate Limiting

```bash
# Test rate limiting is working
for i in {1..15}; do
  curl -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done
# Expected: 429 errors after limit exceeded
```

### 4.3 Verify Security Headers

```bash
# Check security headers
curl -I http://localhost:8080/health

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: ...
```

### 4.4 Test File Upload Validation

```bash
# Test with invalid file type
curl -X POST http://localhost:8080/api/v1/files/upload \
  -H "Authorization: Bearer your-token" \
  -F "file=@test.exe" \
  -F "moduleId=test-module"
# Expected: 400 error - file type not allowed

# Test with oversized file
dd if=/dev/zero of=large.pdf bs=1M count=60
curl -X POST http://localhost:8080/api/v1/files/upload \
  -H "Authorization: Bearer your-token" \
  -F "file=@large.pdf" \
  -F "moduleId=test-module"
# Expected: 400 error - file too large
```

## Step 5: Monitor Circuit Breakers

### 5.1 Check Circuit Breaker Status

```python
# In Python shell or script
from core.circuit_breaker import get_all_circuit_breakers

breakers = get_all_circuit_breakers()
for name, breaker in breakers.items():
    stats = breaker.get_stats()
    print(f"{name}: {stats['state']}")
```

### 5.2 Simulate S3 Failure

```bash
# Temporarily block S3 access (development only)
docker-compose exec backend iptables -A OUTPUT -d s3.amazonaws.com -j DROP

# Try file upload - should see circuit breaker open
# Check logs for fallback behavior

# Restore access
docker-compose exec backend iptables -D OUTPUT -d s3.amazonaws.com -j DROP
```

## Step 6: Test Resilience

### 6.1 Redis Failure Simulation

```bash
# Stop Redis
docker-compose stop redis

# Test rate limiting - should use local fallback
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Expected: Still rate limited using local fallback

# Check JWT blacklist - should fail open
# Expected: Users can still access with valid tokens

# Restart Redis
docker-compose start redis
```

### 6.2 Database Connection Test

```bash
# Simulate database connection issues
docker-compose exec db psql -U postgres -c "ALTER SYSTEM SET max_connections = 1;"
docker-compose restart db

# Test API - should see connection pool exhaustion handling
# Check logs for retry behavior

# Restore
docker-compose exec db psql -U postgres -c "ALTER SYSTEM RESET max_connections;"
docker-compose restart db
```

## Step 7: Security Audit

### 7.1 Check for Sensitive Data in Logs

```bash
# Search for potential sensitive data
docker-compose logs backend | grep -i "password\|token\|secret\|key" | grep -v "INFO\|DEBUG"
# Expected: No actual secrets in logs
```

### 7.2 Verify Frontend Console Logs

```javascript
// In browser console
// Check for any remaining sensitive console.logs
// Open Developer Tools > Console
// Navigate through the application
// Expected: No tokens, passwords, or user data logged
```

## Step 8: Performance Testing

### 8.1 Load Test with Circuit Breakers

```bash
# Install k6 for load testing
brew install k6  # macOS
# or download from https://k6.io/docs/getting-started/installation/

# Run load test
k6 run tests/load/k6-load-test.js
```

### 8.2 Monitor Metrics

```bash
# Access monitoring dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)

# Key metrics to watch:
# - Circuit breaker state changes
# - Rate limit rejections
# - Response times during failures
# - Error rates
```

## Troubleshooting

### Issue: JWT Secret Key Error on Startup

```bash
# Ensure JWT_SECRET_KEY is set
echo $JWT_SECRET_KEY

# If missing, generate and export
export JWT_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(64))')
```

### Issue: Redis Connection Errors

```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
# Expected: PONG
```

### Issue: S3 Access Denied

```bash
# Verify AWS credentials
aws s3 ls s3://your-bucket-name/

# Check CORS configuration
aws s3api get-bucket-cors --bucket your-bucket-name
```

### Issue: Celery Workers Not Starting

```bash
# Check Celery logs
docker-compose logs celery-worker

# Verify entrypoint is executable
ls -la docker-image/docker/celery-entrypoint.sh
# Should show executable permissions

# If not, make executable
chmod +x docker-image/docker/celery-entrypoint.sh
```

## Production Deployment Checklist

- [ ] Generate and secure production JWT secret key
- [ ] Set all required environment variables
- [ ] Update S3 CORS for production domains
- [ ] Configure Firebase credentials (or disable)
- [ ] Set FLASK_ENV=production
- [ ] Enable HTTPS/TLS
- [ ] Configure production database with connection pooling
- [ ] Set up Redis with persistence
- [ ] Configure monitoring and alerting
- [ ] Run security scan on container images
- [ ] Test all circuit breakers
- [ ] Verify rate limiting works
- [ ] Check all security headers present
- [ ] Audit logs for sensitive data
- [ ] Load test the system
- [ ] Document incident response procedures

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review circuit breaker statistics
   - Check for failed uploads in S3
   - Monitor rate limit effectiveness

2. **Monthly**
   - Rotate JWT secret key
   - Review and update CORS policies
   - Audit user permissions
   - Update dependencies

3. **Quarterly**
   - Security audit
   - Penetration testing
   - Performance review
   - Disaster recovery drill

## Security Contacts

- Security issues: security@learn-x.com
- Incident response: incidents@learn-x.com
- On-call engineer: +1-XXX-XXX-XXXX

---

Remember: Security is an ongoing process. Regular reviews and updates are essential to maintain the security posture of the platform.