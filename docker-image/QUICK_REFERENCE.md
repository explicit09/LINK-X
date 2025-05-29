# Docker Refactoring - Quick Reference Guide

## 🚀 Quick Start

### Development
```bash
# Start development environment
docker-compose -f docker-compose.optimized.yml up backend-dev

# Run with all tools (includes Flower, PostgreSQL)
docker-compose -f docker-compose.optimized.yml --profile dev-tools up
```

### Production
```bash
# Build production image
docker build -f docker/Dockerfile.multistage -t linkx:prod docker-image/

# Run production
docker-compose -f docker-compose.optimized.yml --profile production up
```

## 📁 New File Locations

| Old Location | New Location | Purpose |
|--------------|--------------|---------|
| `/docker-image/Dockerfile` | `/docker-image/docker/Dockerfile` | Main Dockerfile |
| `/docker-image/requirements.txt` | `/docker-image/config/base.txt` | Base requirements |
| `/docker-image/src/config.py` | `/docker-image/src/core/settings.py` | Configuration |
| `/docker-image/tests/` | `/docker-image/src/tests/` | Test files |
| Scripts in `/docker-image/` | `/docker-image/scripts/*/` | Organized by type |

## 🔑 Key Changes

### Authentication
```python
# Old
from api.auth import auth_required
from api.auth_v2 import jwt_required

# New (unified)
from api.auth_unified import auth_required
```

### Configuration
```python
# Old
from config import Config
app.config.from_object(Config)

# New
from core.settings import get_settings
settings = get_settings()
```

### Services with DI
```python
# Old
service = CourseService()

# New
from core.dependencies import get_container
container = get_container()
service = container.course_service()
```

## 🗄️ Database Migrations

```bash
# Create migration
python scripts/migrations/alembic_manager.py create "Description"

# Apply migrations
python scripts/migrations/alembic_manager.py upgrade

# Rollback
python scripts/migrations/alembic_manager.py downgrade

# View history
python scripts/migrations/alembic_manager.py history
```

## 🧪 Testing

```bash
# Run all tests
pytest src/tests/

# With coverage
pytest src/tests/ --cov=src --cov-report=html

# Specific tests
pytest src/tests/unit/
pytest src/tests/integration/
```

## 🐳 Docker Commands

```bash
# Build optimization
./scripts/docker-build-optimize.sh build prod
./scripts/docker-build-optimize.sh analyze prod
./scripts/docker-build-optimize.sh compare

# Clean up
docker system prune -af
docker volume prune -f
```

## 📦 Requirements Management

```bash
# Install development dependencies
pip install -r config/dev.txt

# Install production dependencies
pip install -r config/prod.txt

# Update dependencies
pip-compile config/base.txt
```

## 🔧 Environment Variables

### Required
- `SECRET_KEY` - Flask secret key
- `DATABASE_URL` or `POSTGRES_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection (default: redis://localhost:6379/0)

### Optional
- `FLASK_ENV` - Environment (development/production/testing)
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `S3_BUCKET_NAME` - S3 bucket for files
- `OPENAI_API_KEY` - OpenAI API key
- `SENTRY_DSN` - Sentry error tracking

## 🏗️ Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   API       │────▶│   Services   │────▶│ Repositories│
│  Endpoints  │     │  (Business)  │     │   (Data)    │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       └────────────────────┼─────────────────────┘
                           │
                    ┌──────▼──────┐
                    │     DI      │
                    │  Container  │
                    └─────────────┘
```

## ⚡ Performance Tips

1. **Development**: Use volume mounts for hot-reload
2. **Production**: Use multi-stage builds
3. **Caching**: Redis is configured for all environments
4. **Database**: Use connection pooling (configured in SQLAlchemy)

## 🐛 Common Issues

### Import Errors
```bash
# Run migration script
python scripts/migrations/migrate_to_unified_auth.py
```

### Docker Build Issues
```bash
# Clear cache and rebuild
docker builder prune -af
docker-compose build --no-cache
```

### Database Issues
```bash
# Reset database
python scripts/maintenance/reset_db_content.py

# Force reset
python scripts/maintenance/reset_db_content_force.py
```

## 📚 More Information

- Full documentation: `REFACTORING_COMPLETE.md`
- Original plan: `Docker-refactoring.md`
- Migration guides: `docs/guides/`

## 🎯 Next Steps

1. Update your imports to use unified modules
2. Switch to new configuration system
3. Adopt dependency injection for new code
4. Use new test factories for testing
5. Migrate to multi-stage Docker builds