# LINK-X1 Scripts Guide

## Consolidated Management System

All common operations are now handled through the unified `manage.sh` script.

### Quick Start

```bash
# Make the script executable (first time only)
chmod +x manage.sh

# Show all available commands
./manage.sh help
```

### Common Operations

#### Running the Application

```bash
# Development mode (default)
./manage.sh backend

# Production mode
./manage.sh backend production

# Frontend development
./manage.sh frontend
```

#### Database Management

```bash
# Run migrations
./manage.sh db-migrate

# Reset database (interactive)
./manage.sh db-reset

# Reset database (no confirmation)
./manage.sh db-reset-force

# Backup database (production only)
./manage.sh db-backup
```

#### File Processing

```bash
# Reprocess all files in S3
./manage.sh reprocess
```

#### Testing

```bash
# Run all tests
./manage.sh test

# Run backend tests only
./manage.sh test-backend

# Run frontend tests only
./manage.sh test-frontend
```

#### Deployment

```bash
# Deploy to staging
./manage.sh deploy staging

# Deploy to production
./manage.sh deploy production
```

#### Development Utilities

```bash
# View logs (all services)
./manage.sh logs

# View logs for specific service
./manage.sh logs backend
./manage.sh logs celery-worker

# Open shell in container
./manage.sh shell backend

# Clean up Docker resources
./manage.sh clean
```

## Specialized Python Scripts

For more advanced operations, use the consolidated Python utilities:

### Database Manager

```bash
# Inside Docker container
python -m src.db_manager reset
python -m src.db_manager migrate
python -m src.db_manager migrate-pgvector
python -m src.db_manager migrate-s3
python -m src.db_manager backup --output backup.sql
```

### File Processor

```bash
# Inside Docker container
python -m src.file_processor reprocess
python -m src.file_processor reprocess-local
python -m src.file_processor cleanup-s3
python -m src.file_processor check-s3
```

## Docker Compose Files

- `docker-compose.yml` - Base configuration
- `docker-compose.dev.yml` - Development overrides
- `docker-compose.staging.yml` - Staging configuration
- `docker-compose.production.yml` - Production configuration
- `docker-compose.optimized.yml` - Performance-optimized configuration
- `docker-compose.monitoring.yml` - Monitoring stack (Prometheus, Grafana)

## Directory Structure

```
LINK-X1/
├── manage.sh                    # Main management script
├── scripts/                     # Deployment and utility scripts
│   ├── deploy-staging.sh
│   ├── deploy-production.sh
│   └── backup-database.sh
├── docker-image/
│   └── src/
│       ├── db_manager.py       # Database utilities
│       └── file_processor.py   # File processing utilities
└── monitoring/                  # Monitoring configuration
    ├── prometheus.yml
    └── grafana-dashboard.json
```

## Removed Scripts

The following redundant scripts have been removed and replaced by `manage.sh`:

- `run_backend.sh`, `run_backend_clean.sh`, `run_backend_fast.sh`, `run_backend_streaming.sh`
- `reset_db.sh`
- `test_streaming.py`, `verify_streaming.py`
- `update_api_urls.sh`, `cleanup_codebase.sh`, `APPLY_OPTIMIZATIONS.sh`
- `rebuild_and_restart.sh`, `run_reprocessing.sh`, `run_reprocessing_direct.py`

All functionality from these scripts is now available through the unified management interface.