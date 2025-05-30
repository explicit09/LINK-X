# LEARN-X Educational Platform v2

A modern, AI-powered educational platform built with security, scalability, and user experience at its core.

## 🚀 Overview

LEARN-X is a comprehensive educational platform that combines traditional course management with AI-powered learning assistance. The platform supports students, instructors, and administrators with features ranging from course creation to personalized learning experiences.

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript, TailwindCSS
- **Backend**: Flask, SQLAlchemy, Celery
- **Database**: PostgreSQL with pgvector extension (Neon hosted)
- **Cache**: Redis
- **Authentication**: Firebase Auth + PostgreSQL sync
- **Storage**: AWS S3
- **AI/ML**: OpenAI GPT-4, LangChain, pgvector
- **Monitoring**: Sentry, Prometheus, Grafana
- **CDN**: Cloudflare

### Key Features

- 🔐 **Secure Authentication**: Firebase + PostgreSQL dual sync
- 📚 **Course Management**: Create, enroll, and manage courses
- 🤖 **AI Assistant**: Personalized learning with GPT-4
- 📄 **Document Processing**: PDF, DOCX, PPTX support with vector search
- 🎯 **Smart Recommendations**: AI-powered content suggestions
- 📊 **Analytics**: Real-time metrics and insights
- 🔄 **Background Processing**: Async tasks with Celery
- 🌐 **Global CDN**: Fast content delivery via Cloudflare

## 🛠️ Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- PostgreSQL 16 (or use Neon cloud)
- Redis 7+

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/LINK-X1.git
cd LINK-X1
```

2. Copy environment files:
```bash
cp .env.example .env
cp .env.production.example .env.production
```

3. Generate secure secrets:
```bash
python scripts/generate_secrets.py
```

4. Update `.env` with your configuration:
- Database URLs (provided Neon URLs)
- Firebase credentials
- AWS S3 credentials
- OpenAI API key

### Development Setup

```bash
# Start all services
docker-compose up -d

# Run database migrations
cd docker-image/src
python scripts/execute_migrations.py --env dev

# Start frontend development server
cd frontend
npm install
npm run dev

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/api/docs
```

### Production Deployment

```bash
# Run comprehensive tests first
./scripts/run-all-tests.sh

# Deploy to production
./deploy_production_v2.sh
```

## 📁 Project Structure

```
LINK-X1/
├── frontend/               # Next.js frontend application
│   ├── app/               # App router pages
│   ├── components/        # Reusable components
│   ├── lib/              # Utilities and API clients
│   └── public/           # Static assets
├── docker-image/          # Backend application
│   ├── src/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core utilities
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Data access layer
│   │   ├── tasks/        # Celery tasks
│   │   └── tests/        # Test suites
│   └── docker/           # Docker configurations
├── infrastructure/        # Infrastructure as code
│   ├── cloudflare-cdn.tf # CDN configuration
│   └── cdn-worker.js     # Edge computing logic
├── monitoring/           # Monitoring configurations
│   ├── prometheus.yml    # Metrics collection
│   └── alerts/          # Alert rules
├── scripts/             # Utility scripts
└── docs/               # Documentation
```

## 🔒 Security Features

- **Authentication**: Dual Firebase + PostgreSQL auth with JWT
- **Rate Limiting**: Sliding window rate limiter with Redis
- **CSRF Protection**: Token-based CSRF protection
- **SQL Injection Prevention**: Parameterized queries via SQLAlchemy
- **XSS Protection**: Content Security Policy headers
- **Secrets Management**: Environment-based configuration
- **Audit Logging**: Comprehensive activity tracking

## 🚀 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user

### Courses
- `GET /api/v1/courses` - List courses
- `POST /api/v1/courses` - Create course
- `GET /api/v1/courses/:id` - Get course details
- `PUT /api/v1/courses/:id` - Update course
- `DELETE /api/v1/courses/:id` - Delete course

### Files
- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files/:id` - Get file
- `DELETE /api/v1/files/:id` - Delete file

Full API documentation available at `/api/docs` when running the backend.

## 📊 Monitoring & Observability

### Metrics
- Prometheus metrics at `:9090`
- Grafana dashboards at `:3001`
- Custom application metrics

### Logging
- Structured JSON logging
- Sentry error tracking
- Audit trail for security events

### Alerts
- Database health
- API response times
- Error rates
- Resource utilization

## 🧪 Testing

```bash
# Run all tests
./scripts/run-all-tests.sh

# Run specific test suites
cd docker-image/src
pytest tests/unit/          # Unit tests
pytest tests/integration/   # Integration tests

cd frontend
npm test                    # Frontend tests
npm run test:e2e           # E2E tests
```

### Load Testing
```bash
./scripts/run-load-tests.sh
```

## 🔧 Maintenance

### Database Backups
```bash
# Automated backups (runs daily via cron)
./scripts/automated-backup.sh backup all

# Manual backup
./scripts/automated-backup.sh backup prod

# Restore backup
./scripts/automated-backup.sh restore prod 20240101_120000 $DATABASE_URL
```

### Migrations
```bash
cd docker-image/src
# Create new migration
alembic revision -m "description"

# Run migrations
python scripts/execute_migrations.py --env prod
```

## 📈 Performance Optimizations

- **Database**: Comprehensive indexes, query optimization
- **Caching**: Redis caching for sessions and frequent queries
- **CDN**: Cloudflare for static assets
- **Async Processing**: Celery for background tasks
- **Connection Pooling**: SQLAlchemy connection management
- **Compression**: Brotli compression via CDN

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint/Prettier for JavaScript/TypeScript
- Write tests for new features
- Update documentation
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@learnx.com

## 🔗 Links

- [API Documentation](http://localhost:8000/api/docs)
- [Grafana Dashboard](http://localhost:3001)
- [Prometheus Metrics](http://localhost:9090)

---

Built with ❤️ by the LEARN-X Team