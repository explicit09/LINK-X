#!/usr/bin/env python3
"""
Test the refactored structure to ensure all files are in place
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, 'src')

def check_file_exists(filepath, description):
    """Check if a file exists and report"""
    if os.path.exists(filepath):
        print(f"✓ {description}: {filepath}")
        return True
    else:
        print(f"✗ {description}: {filepath} NOT FOUND")
        return False

def main():
    print("Docker Refactoring Structure Test")
    print("=" * 50)
    
    all_good = True
    
    # Check directory structure
    print("\n1. Directory Structure:")
    directories = [
        ('docker/', "Docker configuration directory"),
        ('scripts/migrations/', "Migration scripts directory"),
        ('scripts/maintenance/', "Maintenance scripts directory"),
        ('scripts/aws/', "AWS scripts directory"),
        ('scripts/debug/', "Debug scripts directory"),
        ('config/', "Requirements directory"),
        ('src/api/', "API directory"),
        ('src/core/', "Core directory"),
        ('src/services/', "Services directory"),
        ('src/repositories/', "Repositories directory"),
        ('src/db/alembic/', "Alembic directory"),
        ('src/tests/', "Tests directory"),
    ]
    
    for dir_path, desc in directories:
        all_good &= check_file_exists(dir_path, desc)
    
    # Check key files
    print("\n2. Key Files:")
    files = [
        # Docker files
        ('docker/Dockerfile', "Main Dockerfile"),
        ('docker/Dockerfile.dev', "Development Dockerfile"),
        ('docker/Dockerfile.multistage', "Multi-stage Dockerfile"),
        ('docker/entrypoint.sh', "Entrypoint script"),
        ('.dockerignore', "Docker ignore file"),
        
        # Requirements
        ('config/base.txt', "Base requirements"),
        ('config/dev.txt', "Dev requirements"),
        ('config/prod.txt', "Prod requirements"),
        
        # Core modules
        ('src/api/auth_unified.py', "Unified auth API"),
        ('src/services/auth_service_unified.py', "Unified auth service"),
        ('src/core/decorators_unified.py', "Unified decorators"),
        ('src/core/dependencies.py', "DI container"),
        ('src/core/settings.py', "Pydantic settings"),
        ('src/core/config.py', "Config adapter"),
        
        # Service layer
        ('src/services/interfaces.py', "Service interfaces"),
        ('src/services/base_service.py', "Base service"),
        ('src/services/course_service_v2.py', "Course service v2"),
        
        # Repositories
        ('src/repositories/base_repository_v2.py', "Base repository v2"),
        
        # Tests
        ('src/tests/conftest_unified.py', "Unified test config"),
        ('src/tests/factories.py', "Test factories"),
        
        # Scripts
        ('scripts/migrations/alembic_manager.py', "Alembic manager"),
        ('scripts/migrations/migrate_to_unified_auth.py', "Auth migration"),
        ('scripts/docker-build-optimize.sh', "Build optimization"),
        
        # Documentation
        ('REFACTORING_COMPLETE.md', "Complete documentation"),
        ('QUICK_REFERENCE.md', "Quick reference"),
        ('MIGRATION_CHECKLIST.md', "Migration checklist"),
    ]
    
    for file_path, desc in files:
        all_good &= check_file_exists(file_path, desc)
    
    # Check compatibility wrappers
    print("\n3. Compatibility Wrappers:")
    wrappers = [
        ('src/api/auth.py', "Auth API wrapper"),
        ('src/api/auth_v2.py', "Auth v2 API wrapper"),
        ('src/services/auth_service.py', "Auth service wrapper"),
        ('src/services/auth_service_v2.py', "Auth service v2 wrapper"),
        ('src/core/decorators.py', "Decorators wrapper"),
        ('src/core/decorators_v2.py', "Decorators v2 wrapper"),
        ('src/config.py', "Config wrapper"),
    ]
    
    for file_path, desc in wrappers:
        all_good &= check_file_exists(file_path, desc)
    
    # Check Alembic setup
    print("\n4. Alembic Setup:")
    alembic_files = [
        ('src/db/alembic.ini', "Alembic config"),
        ('src/db/alembic/env.py', "Alembic environment"),
        ('src/db/alembic/script.py.mako', "Alembic template"),
        ('src/db/alembic/versions/001_initial_migration.py', "Initial migration"),
    ]
    
    for file_path, desc in alembic_files:
        all_good &= check_file_exists(file_path, desc)
    
    # Summary
    print("\n" + "=" * 50)
    if all_good:
        print("✅ All files are in place! The refactoring structure is complete.")
    else:
        print("❌ Some files are missing. Please check the errors above.")
    
    # Additional checks
    print("\n5. Import Test (without dependencies):")
    try:
        from core.exceptions import ValidationError, AuthenticationError, NotFoundError
        print("✓ Core exceptions can be imported")
    except ImportError as e:
        print(f"✗ Core exceptions import failed: {e}")
    
    # Check file sizes
    print("\n6. Key File Sizes:")
    key_files = [
        'src/api/auth_unified.py',
        'src/services/auth_service_unified.py',
        'src/core/dependencies.py',
        'docker/Dockerfile.multistage',
    ]
    
    for filepath in key_files:
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            print(f"  {filepath}: {size:,} bytes")

if __name__ == '__main__':
    main()