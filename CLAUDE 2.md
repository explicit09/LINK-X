# CLAUDE.md - AI Assistant Development Guide for LEARN-X

## Project Overview

LEARN-X is an AI-powered educational platform that integrates with learning management systems (LMS) like Canvas and Blackboard to deliver personalized learning experiences. It adapts in real-time to each student's learning style using course-specific content like slides, PDFs, and lecture audio.

## Quick Start Commands

### Running the Application

```bash
# Full stack with Docker
docker-compose up -d

# Frontend only
cd frontend && npm run dev

# Backend only  
cd docker-image && python src/app.py

# Production
docker-compose -f docker-compose.production.yml up -d
```

### Testing

```bash
# All tests
./run_tests.sh

# Backend tests
./run_backend_tests.sh
cd docker-image && pytest

# Frontend tests
cd frontend && npm test

# Load tests
./scripts/run-load-tests.sh
```

### Linting & Type Checking

```bash
# Frontend
cd frontend
npm run lint          # ESLint/Biome
npm run type-check    # TypeScript

# Backend
cd docker-image
ruff check src/      # Python linting
mypy src/           # Type checking
```

## Project Structure

### Frontend (Next.js 14)
```
frontend/
├── app/              # Next.js app router pages
│   ├── (auth)/      # Authentication pages
│   ├── (dash)/      # Dashboard
│   ├── (learn)/     # Learning interface
│   └── courses/     # Course management
├── components/       # Reusable React components
│   ├── ai/          # AI-powered components
│   ├── course/      # Course-related components
│   ├── streaming/   # Real-time streaming
│   └── ui/          # shadcn/ui components
├── hooks/           # Custom React hooks
└── lib/             # Utilities and API clients
```

### Backend (Flask + PostgreSQL)
```
docker-image/src/
├── api/             # API endpoints
│   └── v2_endpoints/ # Version 2 API
├── core/            # Core functionality
├── repositories/    # Database layer
├── services/        # Business logic
└── tasks/           # Celery background tasks
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create endpoint in `docker-image/src/api/v2_endpoints/`
2. Add service logic in `docker-image/src/services/`
3. Create repository methods in `docker-image/src/repositories/`
4. Add tests in `docker-image/src/tests/`

### Creating a New Component

1. Create component in appropriate `frontend/components/` subdirectory
2. Export from index file
3. Add tests in `frontend/__tests__/`
4. Use in pages or other components

### Database Migrations

```bash
cd docker-image/src
alembic revision -m "description"
alembic upgrade head
```

### Environment Setup

1. Copy environment files:
   ```bash
   cp docker-image/.env.example docker-image/.env
   cp frontend/.env.example frontend/.env.local
   ```

2. Set required variables:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `OPENAI_API_KEY`
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
   - `FIREBASE_*` credentials

## Testing Strategies

### Unit Tests
- Frontend: Jest + React Testing Library
- Backend: pytest with factories

### Integration Tests
- API endpoints: `docker-image/src/tests/integration/`
- Critical user paths: `frontend/__tests__/integration/`

### E2E Tests
- Playwright tests in `frontend/e2e/`

### Coverage
```bash
# Backend coverage
cd docker-image && pytest --cov=src

# Frontend coverage  
cd frontend && npm run test:coverage
```

## API Information

### Version Strategy
- v1: Legacy endpoints (deprecated)
- v2: Current version with improved error handling and response format
- All v2 endpoints follow `/api/v2/*` pattern

### Standard Response Format
```json
{
  "data": {},
  "message": "Success",
  "status": "success"
}
```

### Error Format
```json
{
  "error": "Error message",
  "status": "error",
  "code": "ERROR_CODE"
}
```

## Key Features to Understand

### Real-time Streaming
- WebSocket connections for live content updates
- Streaming endpoints in `api/v2_endpoints/streaming.py`
- Frontend streaming components in `components/streaming/`

### AI Integration
- OpenAI for content generation
- Embeddings stored in PostgreSQL with pgvector
- AI services in `services/ai/`

### File Processing
- S3 for file storage
- Celery for async processing
- Support for PDFs, audio, video

### Authentication
- Firebase Auth for user management
- JWT tokens for API access
- Role-based access control (student/professor/admin)

## Development Best Practices

### Performance
- Use React.lazy() for code splitting
- Implement pagination for large datasets
- Cache frequently accessed data in Redis
- Use database indexes (see migrations)

### Security
- Never commit secrets (use environment variables)
- Validate all user inputs
- Use parameterized database queries
- Follow CORS configuration in production

### Code Style
- TypeScript for frontend type safety
- Python type hints for backend
- Follow existing patterns in codebase
- Write tests for new features

## Debugging Tips

### Common Issues
1. **CORS errors**: Check `docker-image/src/core/cors.py`
2. **Auth failures**: Verify Firebase config and JWT settings
3. **File upload issues**: Check S3 permissions and CORS
4. **Database errors**: Run migrations, check connection

### Useful Commands
```bash
# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Database console
docker-compose exec postgres psql -U postgres

# Redis CLI
docker-compose exec redis redis-cli

# Reset database
./scripts/reset_db.sh
```

## Git Workflow

1. Create feature branch from `main`
2. Make changes with clear commits
3. Run tests before pushing
4. Create PR with description
5. Ensure CI passes

## Monitoring & Observability

- Prometheus metrics at `/metrics`
- Grafana dashboards in `monitoring/grafana/`
- Sentry for error tracking
- Custom monitoring in `docker-image/src/monitoring/`

## Important Notes

- Always run linting and tests before committing
- Update API documentation when adding endpoints
- Follow existing patterns for consistency
- Consider performance implications of changes
- Test with both student and professor roles
- Ensure mobile responsiveness for frontend changes

## Useful Resources

- [API Migration Guide](docs/api/v2_migration_guide.md)
- [Frontend Testing Guide](docs/frontend/TESTING_GUIDE.md)
- [S3 Implementation Guide](docs/guides/S3_IMPLEMENTATION_GUIDE.md)
- [Security Checklist](docs/security/SECURITY_CHECKLIST.md)