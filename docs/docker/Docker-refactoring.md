# Docker-Image Refactoring Plan

## Executive Summary

The docker-image folder requires significant refactoring to improve maintainability, reduce code duplication, and create a more scalable architecture. This document outlines a comprehensive plan to restructure the codebase following modern Python best practices.

## Current Issues Identified

### 1. Directory Structure Problems
- **Mixed responsibilities**: Root level contains both infrastructure files (Dockerfiles) and utility scripts
- **Duplicate test directories**: `/docker-image/tests/` and `/docker-image/src/tests/`
- **Script sprawl**: 14+ utility scripts scattered across root and src/
- **Inconsistent file placement**: Migration scripts mixed with application code

### 2. Code Duplication Issues
- **Authentication duplication**: 
  - `api/auth.py` and `api/auth_v2.py` - overlapping authentication endpoints
  - `services/auth_service.py` and `services/auth_service_v2.py` - duplicate services
  - `core/decorators.py` and `core/decorators_v2.py` - duplicate decorator sets
- **Multiple migration scripts**: Various migrate_*.py files with overlapping functionality
- **Test configuration duplication**: Two conftest.py files with different approaches

### 3. Architecture Issues
- **Tight coupling**: Services directly instantiate repositories
- **Session management**: BaseRepository handles its own sessions instead of using dependency injection
- **Mixed concerns**: Business logic mixed with database access in services
- **Configuration sprawl**: Hardcoded values throughout codebase (Redis localhost)

### 4. Dependency Management
- **Single large requirements.txt**: No separation between prod/dev dependencies
- **Version conflicts**: Comments in requirements.txt indicate compatibility issues
- **No dependency isolation**: Missing tools like pip-tools or poetry for lock file management

## Proposed Refactoring Plan

### Phase 1: Directory Structure Reorganization (Critical)

```
docker-image/
├── docker/                         # Docker-specific files
│   ├── Dockerfile                  # Production Dockerfile
│   ├── Dockerfile.dev              # Development Dockerfile
│   ├── Dockerfile.prod             # Optimized production build
│   └── entrypoint.sh               # Container entrypoint script
├── scripts/                        # Utility scripts organized by purpose
│   ├── migrations/                 # Database migration utilities
│   │   ├── run_migrations.py
│   │   ├── migrate_auth_endpoints.py
│   │   ├── migrate_files_to_s3.py
│   │   ├── migrate_to_auth_v2.py
│   │   └── migrate_to_pgvector.py
│   ├── maintenance/                # System maintenance scripts
│   │   ├── reset_db_content.py
│   │   ├── reset_db_content_force.py
│   │   ├── reprocess_all_files.py
│   │   └── reprocess_all_files_s3.py
│   ├── aws/                        # AWS-specific utilities
│   │   ├── check_s3_access.py
│   │   ├── cleanup_s3_test_files.py
│   │   ├── update_iam_policies.py
│   │   └── update_s3_cors.py
│   └── debug/                      # Debug and development tools
│       ├── debug_files.py
│       └── debug_user.py
├── src/                            # Application source code
│   ├── api/                        # API endpoints
│   │   ├── v1/                     # Version 1 endpoints (legacy)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── courses.py
│   │   │   └── legacy.py
│   │   └── v2/                     # Version 2 endpoints (current)
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── courses.py
│   │       └── streaming.py
│   ├── core/                       # Core framework components
│   │   ├── __init__.py
│   │   ├── auth.py                 # Unified authentication logic
│   │   ├── cache.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py         # Dependency injection container
│   │   ├── exceptions.py
│   │   ├── middleware.py
│   │   └── monitoring.py
│   ├── services/                   # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py         # Unified auth service
│   │   ├── course_service.py
│   │   ├── file_service.py
│   │   └── streaming_service.py
│   ├── repositories/               # Data access layer
│   │   ├── __init__.py
│   │   ├── base_repository.py
│   │   ├── user_repository.py
│   │   └── course_repository.py
│   └── db/                         # Database configuration
│       ├── __init__.py
│       ├── connection.py
│       ├── schema.py
│       └── migrations/             # Alembic migrations
│           ├── versions/
│           ├── alembic.ini
│           └── env.py
├── tests/                          # Consolidated test directory
│   ├── __init__.py
│   ├── conftest.py                 # Unified test configuration
│   ├── fixtures/
│   ├── integration/
│   │   ├── test_auth_endpoints.py
│   │   └── test_course_endpoints.py
│   └── unit/
│       ├── test_auth_service.py
│       └── test_course_service.py
├── config/                         # Environment-specific configurations
│   ├── base.txt                    # Base dependencies
│   ├── dev.txt                     # Development dependencies
│   └── prod.txt                    # Production dependencies
└── pyproject.toml                  # Modern Python project configuration
```

### Phase 2: Authentication System Consolidation (Critical)

#### 2.1 Merge Authentication Endpoints
```python
# api/auth.py - Unified authentication API
@bp.route('/login', methods=['POST'])
@api_version('v1', 'v2')  # Support both versions
def login():
    """Unified login endpoint supporting both Firebase and JWT"""
    version = get_api_version()
    if version == 'v2':
        return _login_v2()
    return _login_v1()

def _login_v1():
    """Legacy login implementation"""
    # Current auth.py logic

def _login_v2():
    """Enhanced login with refresh tokens"""
    # Current auth_v2.py logic
```

#### 2.2 Unified Authentication Service
```python
# services/auth_service.py
class AuthService:
    def __init__(self, user_repo: UserRepository, cache: Cache):
        self.user_repo = user_repo
        self.cache = cache
    
    def authenticate_firebase(self, id_token: str, version: str = 'v1'):
        """Authenticate with Firebase, version-aware"""
        if version == 'v2':
            return self._authenticate_v2(id_token)
        return self._authenticate_v1(id_token)
```

#### 2.3 Unified Decorators
```python
# core/auth.py
def auth_required(version='v1', roles=None, optional=False):
    """Unified authentication decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if version == 'v2':
                return _auth_required_v2(f, roles, optional)(*args, **kwargs)
            return _auth_required_v1(f, roles, optional)(*args, **kwargs)
        return decorated_function
    return decorator
```

### Phase 3: Dependency Injection Implementation (Important)

#### 3.1 Create Dependency Container
```python
# core/dependencies.py
from dependency_injector import containers, providers
from sqlalchemy.orm import sessionmaker

class Container(containers.DeclarativeContainer):
    # Configuration
    config = providers.Configuration()
    
    # Database
    db_session_factory = providers.Singleton(
        sessionmaker,
        bind=providers.Resource(create_engine, config.database_url)
    )
    
    # Cache
    redis_client = providers.Singleton(
        Redis,
        host=config.redis.host,
        port=config.redis.port
    )
    
    # Repositories
    user_repository = providers.Factory(
        UserRepository,
        session_factory=db_session_factory
    )
    
    # Services
    auth_service = providers.Factory(
        AuthService,
        user_repo=user_repository,
        cache=redis_client
    )
```

#### 3.2 Repository Base Class Refactoring
```python
# repositories/base_repository.py
class BaseRepository(Generic[T]):
    def __init__(self, session_factory: sessionmaker):
        self.session_factory = session_factory
    
    @contextmanager
    def get_session(self):
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
```

### Phase 4: Configuration Management (Important)

#### 4.1 Environment-Specific Configuration
```python
# core/config.py
class BaseConfig:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

class DevelopmentConfig(BaseConfig):
    DEBUG = True
    REDIS_HOST = 'localhost'
    TESTING = False

class ProductionConfig(BaseConfig):
    DEBUG = False
    REDIS_HOST = os.environ.get('REDIS_HOST', 'redis')
    
class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
```

#### 4.2 Pydantic Configuration Validation
```python
# core/settings.py
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    database_url: str
    redis_host: str = 'localhost'
    redis_port: int = 6379
    jwt_secret_key: str
    
    @validator('database_url')
    def database_url_must_be_postgres(cls, v):
        if not v.startswith(('postgresql://', 'postgres://')):
            raise ValueError('Database URL must be PostgreSQL')
        return v
    
    class Config:
        env_file = '.env'
```

### Phase 5: Database Migration System (Important)

#### 5.1 Implement Alembic
```bash
# Initialize Alembic
alembic init src/db/migrations

# Generate migration from existing schema
alembic revision --autogenerate -m "Initial migration"

# Create migration script template
alembic revision -m "Add user profiles"
```

#### 5.2 Migration Management
```python
# scripts/migrations/run_migrations.py
import alembic.config
import alembic.command

def run_migrations():
    alembic_cfg = alembic.config.Config("src/db/migrations/alembic.ini")
    alembic.command.upgrade(alembic_cfg, "head")

def rollback_migration(revision):
    alembic_cfg = alembic.config.Config("src/db/migrations/alembic.ini")
    alembic.command.downgrade(alembic_cfg, revision)
```

### Phase 6: Requirements Management (Enhancement)

#### 6.1 Split Requirements Files
```txt
# config/base.txt
Flask==2.3.2
SQLAlchemy==2.0.23
psycopg2-binary==2.9.7
pydantic==2.5.0
dependency-injector==4.41.0

# config/dev.txt
-r base.txt
pytest==7.4.3
black==23.11.0
isort==5.12.0
mypy==1.7.0
pre-commit==3.5.0

# config/prod.txt
-r base.txt
gunicorn==21.2.0
gevent==23.9.1
```

#### 6.2 Use pip-tools for Lock Files
```bash
# Generate lock files
pip-compile config/base.txt
pip-compile config/dev.txt
pip-compile config/prod.txt
```

### Phase 7: Service Layer Refactoring (Enhancement)

#### 7.1 Service Interfaces
```python
# services/interfaces.py
from abc import ABC, abstractmethod
from typing import Protocol

class AuthServiceInterface(Protocol):
    def authenticate_firebase(self, id_token: str) -> UserData: ...
    def create_user(self, user_data: UserCreateData) -> User: ...
    def get_user_by_id(self, user_id: str) -> Optional[User]: ...
```

#### 7.2 Service Implementation
```python
# services/auth_service.py
class AuthService:
    def __init__(self, user_repo: UserRepositoryInterface, cache: CacheInterface):
        self.user_repo = user_repo
        self.cache = cache
    
    @cached(expiration=300)
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self.user_repo.find_by_id(user_id)
```

### Phase 8: Testing Infrastructure (Enhancement)

#### 8.1 Unified Test Configuration
```python
# tests/conftest.py
@pytest.fixture(scope="session")
def app():
    """Create application for testing"""
    app = create_app('testing')
    with app.app_context():
        yield app

@pytest.fixture
def db_session(app):
    """Create database session for testing"""
    with app.app_context():
        db.create_all()
        yield db.session
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()
```

#### 8.2 Test Factories
```python
# tests/factories.py
import factory
from src.db.schema import User, Role

class RoleFactory(factory.Factory):
    class Meta:
        model = Role
    
    role_type = 'student'

class UserFactory(factory.Factory):
    class Meta:
        model = User
    
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    firebase_uid = factory.LazyAttribute(lambda obj: f"firebase_{obj.email}")
    role = factory.SubFactory(RoleFactory)
```

### Phase 9: Docker Optimization (Enhancement)

#### 9.1 Multi-stage Dockerfile
```dockerfile
# docker/Dockerfile.prod
# Stage 1: Build dependencies
FROM python:3.11-slim as builder
WORKDIR /app
COPY config/prod.txt .
RUN pip install --no-cache-dir -r prod.txt

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY src/ ./src/
COPY docker/entrypoint.sh .
EXPOSE 8000
CMD ["./entrypoint.sh"]
```

#### 9.2 Development Docker Compose
```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    volumes:
      - ./src:/app/src
    environment:
      - FLASK_ENV=development
      - DEBUG=True
```

## Implementation Timeline

### Week 1-2: Phase 1 (Directory Reorganization)
- Move files to new directory structure
- Update import statements
- Test basic functionality

### Week 3-4: Phase 2 (Authentication Consolidation)
- Merge auth endpoints and services
- Create unified decorators
- Update all auth-related tests

### Week 5-6: Phase 3 (Dependency Injection)
- Implement dependency container
- Refactor repositories and services
- Update application initialization

### Week 7-8: Phase 4-6 (Configuration, Migrations, Requirements)
- Implement environment-specific configs
- Set up Alembic migrations
- Split and optimize requirements

### Week 9-10: Phase 7-9 (Services, Testing, Docker)
- Refactor service layer
- Consolidate testing infrastructure
- Optimize Docker builds

## Migration Strategy

### 1. Backward Compatibility
- Maintain existing API endpoints during transition
- Use feature flags for new implementations
- Gradual deprecation of old code

### 2. Testing Strategy
- Comprehensive test coverage before refactoring
- Integration tests for critical paths
- Performance testing for database changes

### 3. Deployment Strategy
- Blue-green deployment for production
- Staged rollout with monitoring
- Rollback plan for each phase

## Risk Mitigation

### 1. Data Safety
- Database backup before migrations
- Transaction-based migration scripts
- Rollback procedures tested

### 2. Performance Impact
- Load testing after major changes
- Database query optimization
- Caching strategy review

### 3. Team Coordination
- Clear communication of changes
- Documentation updates
- Code review requirements

## Success Metrics

### 1. Code Quality
- Reduce code duplication by 60%
- Improve test coverage to 90%
- Eliminate hardcoded configurations

### 2. Maintainability
- Faster onboarding for new developers
- Easier feature development
- Reduced bug resolution time

### 3. Performance
- Improved application startup time
- Better resource utilization
- Enhanced monitoring capabilities

## Conclusion

This refactoring plan addresses the major architectural issues in the docker-image folder while maintaining system stability and backward compatibility. The phased approach allows for gradual implementation with continuous testing and validation.

The end result will be a more maintainable, scalable, and robust codebase that follows modern Python development best practices and supports future growth and feature development.