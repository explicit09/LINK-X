# Scripts Directory

## Purpose
Essential scripts for LEARN-X platform maintenance and operations.

## Directory Structure

### `/aws/`
- **check_s3_access.py** - Verify S3 bucket access
- **cleanup_s3_test_files.py** - Remove test files from S3
- **update_iam_policies.py** - Update AWS IAM policies
- **update_s3_cors.py** - Configure S3 CORS settings

### `/debug/`
- **debug_files.py** - Debug file storage issues
- **debug_user.py** - Debug user authentication issues

### `/maintenance/`
- **reprocess_all_files.py** - Reprocess all files in database
- **reprocess_all_files_s3.py** - Reprocess S3 stored files
- **reset_db_content.py** - Reset database content (careful!)
- **reset_db_content_force.py** - Force reset database

### `/migrations/`
- **alembic_manager.py** - Manage database migrations

### Root Scripts
- **monitor_performance.py** - Real-time performance dashboard
- **docker-build-optimize.sh** - Optimize Docker build process

## Usage Examples

```bash
# Check S3 access
docker-compose exec backend python scripts/aws/check_s3_access.py

# Monitor performance
docker-compose exec backend python scripts/monitor_performance.py

# Debug user issues
docker-compose exec backend python scripts/debug/debug_user.py <user_email>

# Run migrations
docker-compose exec backend python scripts/migrations/alembic_manager.py upgrade
```

## Note
Most routine operations should be done through `manage.sh` in the project root.