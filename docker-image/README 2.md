# LINK-X1 Backend - Flask API Service

## 📋 Overview

The LINK-X1 backend is a Flask-based REST API service that powers the learning management system. It provides comprehensive APIs for course management, AI-powered content generation, file processing, and real-time streaming capabilities.

## 🏗️ Architecture

The backend follows a clean architecture pattern with clear separation of concerns:

```
src/
├── api/                    # API Layer - HTTP endpoints
├── services/              # Business Logic Layer
├── repositories/          # Data Access Layer
├── core/                  # Core utilities and middleware
├── db/                    # Database schemas and migrations
└── tasks/                 # Asynchronous background tasks
```

## 📁 Directory Structure

### API Layer (`/api`)
```
api/
├── v2_endpoints/          # Version 2 API endpoints
│   ├── auth.py           # Authentication endpoints
│   ├── courses.py        # Course management
│   ├── files.py          # File operations
│   ├── todos.py          # Todo management
│   └── activities.py     # Learning activities
├── metrics/              # Metrics collection
│   ├── collectors/       # Metric collectors
│   ├── queries/          # Metric queries
│   └── endpoints.py      # Metrics API
├── auth_unified.py       # Unified auth handling
├── health.py             # Health check endpoints
└── docs.py              # API documentation
```

### Services Layer (`/services`)
```
services/
├── ai/                   # AI Services
│   ├── ai_service.py    # Main AI coordinator
│   ├── chat/            # Chat services
│   ├── clients/         # AI provider clients
│   ├── generators/      # Content generators
│   └── utils/           # AI utilities
├── streaming/           # Streaming Services
│   ├── streaming_handler.py
│   └── recommendation_engine.py
├── file_service/        # File Management
│   ├── upload_service.py
│   ├── streaming_service.py
│   └── access_service.py
├── auth_service_unified.py  # Authentication
├── course_service_optimized.py  # Courses
└── module_service.py    # Course modules
```

### Repository Layer (`/repositories`)
```
repositories/
├── base_repository.py    # Base repository pattern
├── user_repository.py    # User data access
├── course_repository.py  # Course data access
├── file_repository.py    # File data access
├── module_repository.py  # Module data access
├── enrollment_repository.py  # Enrollments
└── todo_repository.py    # Todo items
```

### Core Components (`/core`)
```
core/
├── monitoring/          # Monitoring setup
│   ├── metrics_definitions.py
│   ├── security_monitor.py
│   └── trackers.py
├── database.py         # Database configuration
├── decorators_unified.py  # Auth decorators
├── middleware.py       # Flask middleware
├── rate_limiter_v2.py  # Rate limiting
├── circuit_breaker.py  # Circuit breaker pattern
├── cache.py           # Redis caching
└── exceptions.py      # Custom exceptions
```

### Database (`/db`)
```
db/
├── schema.py          # SQLAlchemy models
├── migrations/        # SQL migrations
├── alembic/          # Alembic migrations
└── queries/          # Database queries
    ├── user_queries.py
    ├── course_queries.py
    └── file_queries.py
```

### Background Tasks (`/tasks`)
```
tasks/
├── file_processing.py  # File processing tasks
├── embedding.py       # AI embedding generation
└── maintenance.py     # Maintenance tasks
```

## 🔑 Key Features

### 1. **API Versioning**
- Support for v1 and v2 API endpoints
- Backward compatibility maintained
- Version-specific request/response formats

### 2. **Authentication & Authorization**
- Firebase Authentication integration
- JWT token management with refresh tokens
- Role-based access control (Student, Instructor, Admin)
- Session management with Redis

### 3. **AI Integration**
- OpenAI GPT-4 for content generation
- Personalized learning paths
- Quiz and assessment generation
- Smart content recommendations
- Vector embeddings for semantic search

### 4. **File Management**
- AWS S3 integration for file storage
- Support for PDFs, documents, audio, and video
- Streaming file delivery
- Signed URL generation for secure access

### 5. **Real-time Features**
- Server-sent events for live updates
- Streaming content generation
- Progress tracking
- Activity monitoring

### 6. **Performance & Reliability**
- Redis caching for frequently accessed data
- Circuit breaker pattern for external services
- Rate limiting per user/endpoint
- Database connection pooling
- Async task processing with Celery

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- PostgreSQL 14+ with pgvector extension
- Redis 6+
- AWS S3 bucket
- Firebase project for authentication

### Installation

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r src/requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   cd src
   alembic upgrade head
   ```

5. **Start the development server**
   ```bash
   python src/app.py
   ```

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run specific service
docker-compose up backend

# View logs
docker-compose logs -f backend
```

## 🔧 Configuration

### Environment Variables

```env
# Flask
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key

# Database
DATABASE_URL=postgresql://user:pass@localhost/linkx
SQLALCHEMY_DATABASE_URI=${DATABASE_URL}

# Redis
REDIS_URL=redis://localhost:6379/0

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

# OpenAI
OPENAI_API_KEY=your-openai-key

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## 📊 API Documentation

### Base URLs
- Development: `http://localhost:8080`
- Production: `https://api.linkx.example.com`

### API Versions
- v1: `/api/v1/` - Legacy endpoints
- v2: `/api/v2/` - Current version

### Authentication
All API requests require authentication via:
- Bearer token in Authorization header
- Session cookie for web clients

### Main Endpoints

#### Authentication
- `POST /api/v2/auth/login` - User login
- `POST /api/v2/auth/logout` - User logout
- `POST /api/v2/auth/refresh` - Refresh token
- `GET /api/v2/auth/me` - Get current user

#### Courses
- `GET /api/v2/courses` - List courses
- `POST /api/v2/courses` - Create course
- `GET /api/v2/courses/{id}` - Get course details
- `PUT /api/v2/courses/{id}` - Update course
- `DELETE /api/v2/courses/{id}` - Delete course

#### Files
- `POST /api/v2/files/upload` - Upload file
- `GET /api/v2/files/{id}` - Get file info
- `GET /api/v2/files/{id}/stream` - Stream file
- `DELETE /api/v2/files/{id}` - Delete file

#### AI Features
- `POST /api/v2/ai/generate-content` - Generate content
- `POST /api/v2/ai/generate-quiz` - Generate quiz
- `POST /api/v2/ai/chat` - AI chat interaction
- `GET /api/v2/ai/recommendations` - Get recommendations

## 🧪 Testing

### Run Tests
```bash
# All tests
cd src && python -m pytest

# Unit tests only
python -m pytest tests/unit/

# Integration tests
python -m pytest tests/integration/

# With coverage
python -m pytest --cov=.
```

### Test Structure
```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── isolated/         # Isolated component tests
├── conftest_unified.py  # Test configuration
└── factories.py      # Test data factories
```

## 📈 Monitoring & Debugging

### Health Checks
- `/health` - Basic health check
- `/health/detailed` - Detailed system status

### Metrics
- `/metrics` - Prometheus metrics
- Business metrics tracked:
  - Request rate and latency
  - Error rates
  - Database query performance
  - Cache hit rates
  - Background task status

### Logging
- Structured JSON logging
- Log levels: DEBUG, INFO, WARNING, ERROR
- Logs shipped to Loki for aggregation

### Debugging Tools
- Flask Debug Toolbar (development only)
- Request ID tracking
- Performance profiling endpoints
- Database query logging

## 🔒 Security

### Authentication
- Firebase Authentication for user management
- JWT tokens with 30-minute expiry
- Refresh tokens with rotation
- Session invalidation on logout

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- API key authentication for services

### Input Validation
- Request schema validation with Pydantic
- SQL injection prevention via ORM
- XSS protection in responses
- File type and size validation

### Rate Limiting
- Per-user rate limits
- Endpoint-specific limits
- Distributed rate limiting with Redis

## 🚀 Deployment

### Production Checklist
- [ ] Set `FLASK_ENV=production`
- [ ] Use strong SECRET_KEY
- [ ] Enable HTTPS only
- [ ] Configure proper CORS origins
- [ ] Set up monitoring alerts
- [ ] Enable Sentry error tracking
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Configure CDN for static files

### Docker Production
```bash
# Build production image
docker build -f docker/Dockerfile.prod -t linkx-backend:latest .

# Run with production config
docker run -d \
  --env-file .env.production \
  -p 8080:8080 \
  linkx-backend:latest
```

### Scaling Considerations
- Horizontal scaling with load balancer
- Database read replicas
- Redis cluster for caching
- Celery workers for background tasks
- CDN for file delivery

## 🤝 Contributing

1. Follow PEP 8 style guide
2. Write tests for new features
3. Update documentation
4. Use type hints
5. Run linters before committing

---

For more detailed documentation, see the [docs](/docs) directory.