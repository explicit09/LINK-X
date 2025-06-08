"""
Dependency Injection Container
Centralized dependency management using dependency-injector
"""

import os
import logging
from typing import Iterator, Optional

from dependency_injector import containers, providers
from dependency_injector.wiring import Provide, inject
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from redis import Redis
from flask import Flask
import openai
# Firebase imports removed - using Supabase for authentication

from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from repositories.enrollment_repository import EnrollmentRepository
from repositories.file_repository import FileRepository
from repositories.module_repository import ModuleRepository
from repositories.todo_repository import TodoRepository

from services.course_service_optimized import OptimizedCourseService as CourseService
from services.file_service_supabase import FileService
from services.module_service import ModuleService
from services.admin_service import AdminService
from services.ai_service import AIService
from services.streaming_service import StreamingService

from core.config import get_config

logger = logging.getLogger(__name__)


class Container(containers.DeclarativeContainer):
    """
    Main dependency injection container
    """
    
    # Configuration
    config = providers.Configuration()
    
    # Environment
    environment = providers.Singleton(
        lambda: os.environ.get('FLASK_ENV', 'development')
    )
    
    # App Configuration
    app_config = providers.Singleton(
        get_config,
        environment=environment
    )
    
    # Database Engine
    db_engine = providers.Singleton(
        create_engine,
        providers.Configuration().database_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=providers.Configuration().debug
    )
    
    # Session Factory
    session_factory = providers.Singleton(
        sessionmaker,
        bind=db_engine,
        autocommit=False,
        autoflush=False
    )
    
    # Database Session Provider
    db_session = providers.Resource(
        providers.Factory(session_factory)
    )
    
    # Redis Client
    redis_client = providers.Singleton(
        Redis.from_url,
        providers.Configuration().redis_url,
        decode_responses=True,
        health_check_interval=30,
        socket_keepalive=True,
        retry_on_error=[ConnectionError]
    )
    
    # Supabase Client (replacing Firebase)
    # Supabase initialization is handled in core/supabase_config.py
    # No need for a separate provider here as we use the singleton pattern there
    
    # Repositories
    user_repository = providers.Factory(
        UserRepository,
        session_factory=session_factory
    )
    
    course_repository = providers.Factory(
        CourseRepository,
        session_factory=session_factory
    )
    
    enrollment_repository = providers.Factory(
        EnrollmentRepository,
        session_factory=session_factory
    )
    
    file_repository = providers.Factory(
        FileRepository,
        session_factory=session_factory
    )
    
    module_repository = providers.Factory(
        ModuleRepository,
        session_factory=session_factory
    )
    
    todo_repository = providers.Factory(
        TodoRepository,
        session_factory=session_factory
    )
    
    # Services
    # Auth service is now handled by Supabase - see services.auth.supabase_auth_service
    
    course_service = providers.Factory(
        CourseService,
        course_repo=course_repository,
        enrollment_repo=enrollment_repository,
        user_repo=user_repository,
        module_repo=module_repository
    )
    
    file_service = providers.Factory(
        FileService,
        file_repo=file_repository,
        course_repo=course_repository,
        redis_client=redis_client
    )
    
    module_service = providers.Factory(
        ModuleService,
        module_repo=module_repository,
        course_repo=course_repository,
        file_repo=file_repository
    )
    
    admin_service = providers.Factory(
        AdminService,
        user_repo=user_repository,
        course_repo=course_repository
    )
    
    ai_service = providers.Factory(
        AIService
    )
    
    streaming_service = providers.Factory(
        StreamingService,
        ai_service=ai_service,
        file_service=file_service,
        redis_client=redis_client
    )


# Global container instance
container = Container()


def init_container(app: Flask) -> Container:
    """
    Initialize the dependency container with Flask app configuration
    
    Args:
        app: Flask application instance
        
    Returns:
        Configured container instance
    """
    # Wire container to modules
    container.wire(modules=[
        "api.auth_unified",
        "api.courses",
        "api.files",
        "api.modules",
        "api.admin",
        "api.streaming",
        "api.personalization",
        "api.todos",
        "api.activities",
        "api.test",
        "api.health",
        "api.legacy",
        "api.v2_endpoints.personalization_v2",
        "tasks.file_processing",
        "tasks.embedding",
        "tasks.maintenance"
    ])
    
    # Configure from Flask app
    container.config.from_dict({
        'database_url': app.config.get('SQLALCHEMY_DATABASE_URI'),
        'redis_url': app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
        'debug': app.config.get('DEBUG', False),
        # Firebase credentials no longer needed - using Supabase
        # S3 configuration removed - using Supabase Storage
        'openai_api_key': app.config.get('OPENAI_API_KEY')
    })
    
    # Supabase initialization is handled in core/supabase_config.py
    # No explicit initialization needed here
    
    return container


def get_container() -> Container:
    """Get the global container instance"""
    return container