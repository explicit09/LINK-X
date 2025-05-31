# LINK-X1 System Architecture

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   App Router│  │  Components  │  │  API Client (Modular)  │ │
│  │   (Pages)   │  │  (Reusable)  │  │  - Auth, Courses, etc  │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS/REST API
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      API Gateway / Load Balancer                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                     Backend (Flask + Gunicorn)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ API Routes  │  │   Services   │  │    Repositories        │ │
│  │  (v1 & v2)  │  │ (Business)   │  │  (Data Access)         │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└────────┬──────────────┬─────────────────┬──────────────────────┘
         │              │                 │
    ┌────┴────┐    ┌────┴────┐      ┌────┴────┐
    │ Redis   │    │PostgreSQL│      │   S3    │
    │ (Cache) │    │(Database)│      │(Storage)│
    └─────────┘    └──────────┘      └─────────┘
         │              │                 │
    ┌────┴────────────────────────────────┴────┐
    │           Celery Workers                 │
    │     (Background Task Processing)         │
    └──────────────────────────────────────────┘
```

## 🔄 Request Flow

### 1. **Client Request Flow**
```
User Browser → CDN (Static Assets) → Next.js Frontend
     ↓
Firebase Auth → API Request with JWT
     ↓
Flask Backend → Middleware (Auth, Rate Limit, CORS)
     ↓
API Endpoint → Service Layer → Repository Layer
     ↓
PostgreSQL / Redis / S3
     ↓
Response → Client
```

### 2. **Authentication Flow**
```
User Login → Firebase Auth → ID Token
     ↓
Backend Verification → JWT Creation
     ↓
Session Storage (Redis) → Access + Refresh Tokens
     ↓
Subsequent Requests → JWT Validation → User Context
```

### 3. **File Processing Flow**
```
File Upload → S3 Direct Upload → Success Callback
     ↓
Celery Task → File Processing (PDF, Audio, Video)
     ↓
Text Extraction → OpenAI Embeddings
     ↓
pgvector Storage → Semantic Search Ready
```

## 🗄️ Data Architecture

### Database Schema (PostgreSQL)

```sql
-- Core Tables
users
├── id (UUID, PK)
├── email
├── firebase_uid
├── role_id (FK)
└── created_at

courses
├── id (UUID, PK)
├── title
├── instructor_id (FK → users)
├── access_code
└── published

modules
├── id (UUID, PK)
├── course_id (FK → courses)
├── title
└── ordering

files
├── id (UUID, PK)
├── module_id (FK → modules)
├── s3_key
├── file_type
└── processed

-- Relationships
enrollments
├── user_id (FK → users)
├── course_id (FK → courses)
└── enrolled_at

-- AI/Vector Data
embeddings (pgvector)
├── id (UUID, PK)
├── file_id (FK → files)
├── embedding (vector(1536))
└── metadata (JSONB)
```

### Caching Strategy (Redis)

```
Cache Keys:
- user:{id}:profile → User profile data (TTL: 1h)
- course:{id}:details → Course information (TTL: 30m)
- user:{id}:courses → User's course list (TTL: 15m)
- file:{id}:signed_url → S3 signed URLs (TTL: 1h)
- rate_limit:{user}:{endpoint} → Rate limiting (TTL: 1m)
```

### File Storage (S3)

```
Bucket Structure:
/courses
  /{course_id}
    /modules
      /{module_id}
        /materials
          /{file_id}_{filename}
        /processed
          /{file_id}_processed.json
```

## 🔐 Security Architecture

### Defense in Depth

1. **Network Layer**
   - HTTPS everywhere
   - CDN with DDoS protection
   - Web Application Firewall (WAF)

2. **Application Layer**
   - Firebase Authentication
   - JWT with short expiry (30m)
   - Refresh token rotation
   - CORS whitelist
   - Rate limiting per user/endpoint

3. **Data Layer**
   - Encrypted at rest (RDS, S3)
   - Encrypted in transit (TLS 1.3)
   - Database connection pooling
   - Parameterized queries (SQLAlchemy)

4. **Access Control**
   - Role-Based Access Control (RBAC)
   - Resource-level permissions
   - API key authentication for services
   - Signed URLs for file access

## 🚀 Scalability Architecture

### Horizontal Scaling

```
                    Load Balancer
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Backend-1        Backend-2        Backend-3
        │                │                │
        └────────────────┼────────────────┘
                         │
                 Shared Services
           (PostgreSQL, Redis, S3)
```

### Caching Layers

1. **CDN Cache** - Static assets, images
2. **Redis Cache** - Session data, frequent queries
3. **Application Cache** - In-memory caching
4. **Database Cache** - Query result cache

### Background Processing

```
Task Queue (Redis) → Celery Workers → Task Execution
                          │
                    ┌─────┴─────┐
                    │ Worker Pool│
                    │ - Default  │
                    │ - AI Tasks │
                    │ - Files    │
                    └───────────┘
```

## 🔍 Monitoring Architecture

### Observability Stack

```
Application Metrics → Prometheus → Grafana Dashboards
Application Logs → Promtail → Loki → Grafana
Distributed Traces → OpenTelemetry → Jaeger
Errors & Exceptions → Sentry → Alerts
```

### Key Metrics Tracked

1. **Application Metrics**
   - Request rate and latency
   - Error rates by endpoint
   - Active users
   - Database query performance

2. **Business Metrics**
   - User registrations
   - Course enrollments
   - File uploads
   - AI usage

3. **Infrastructure Metrics**
   - CPU/Memory usage
   - Database connections
   - Redis memory usage
   - S3 bandwidth

## 🤖 AI Architecture

### AI Service Integration

```
User Request → AI Service Router
                    │
         ┌──────────┴──────────┐
         │                     │
    OpenAI API            Local Models
         │                     │
    ┌────┴────┐          ┌────┴────┐
    │ GPT-4   │          │Embeddings│
    │ Chat    │          │Generator │
    └─────────┘          └─────────┘
```

### AI Features

1. **Content Generation**
   - Course outlines
   - Quiz generation
   - Study guides
   - Personalized content

2. **Semantic Search**
   - Document embeddings
   - Vector similarity search
   - Context-aware responses

3. **Personalization**
   - Learning path recommendations
   - Difficulty adjustment
   - Progress-based suggestions

## 🔄 Deployment Architecture

### Container Structure

```
docker-compose.yml
├── frontend (Next.js)
├── backend (Flask)
├── postgres (Database)
├── redis (Cache)
├── celery (Workers)
└── nginx (Reverse Proxy)
```

### CI/CD Pipeline

```
GitHub Push → GitHub Actions → Build & Test
                                    │
                              ┌─────┴─────┐
                              │  Success  │
                              └─────┬─────┘
                                    │
                            Docker Registry
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                    Staging Env          Production Env
```

## 📊 Performance Considerations

### Frontend Optimization
- Server-side rendering for initial load
- Code splitting by route
- Image optimization with next/image
- Progressive Web App features
- Bundle size monitoring

### Backend Optimization
- Database query optimization
- Connection pooling
- Async task processing
- Response compression
- API response caching

### Database Optimization
- Proper indexing strategy
- Query performance monitoring
- Read replicas for scaling
- Materialized views for reports
- Partitioning for large tables

---

This architecture is designed to be scalable, maintainable, and secure while providing excellent performance for the AI-powered learning platform.