# Utility Scripts

This directory contains all utility and maintenance scripts organized by purpose:

## Directory Structure

### `/migrations`
Database migration scripts:
- `migrate_auth_endpoints.py` - Migrates authentication endpoints
- `migrate_files_to_s3.py` - Migrates files to S3 storage
- `migrate_to_auth_v2.py` - Migrates to new authentication system
- `migrate_to_pgvector.py` - Migrates from FAISS to pgvector
- `run_migrations.py` - Main migration runner
- `run_migrations_db.py` - Database-specific migrations

### `/maintenance`
System maintenance scripts:
- `reset_db_content.py` - Resets database content
- `reset_db_content_force.py` - Force resets database content
- `reprocess_all_files.py` - Reprocesses all files
- `reprocess_all_files_s3.py` - Reprocesses S3 files

### `/aws`
AWS-specific utilities:
- `check_s3_access.py` - Checks S3 access permissions
- `cleanup_s3_test_files.py` - Cleans up test files from S3
- `update_iam_policies.py` - Updates IAM policies
- `update_s3_cors.py` - Updates S3 CORS configuration

### `/debug`
Debug and development tools:
- `debug_files.py` - Debug file operations
- `debug_user.py` - Debug user operations

## Usage

All scripts should be run from the docker-image directory:
```bash
cd docker-image
python scripts/migrations/run_migrations.py
```