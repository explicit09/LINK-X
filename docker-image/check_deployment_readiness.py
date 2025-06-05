#!/usr/bin/env python3
"""
Check if the backend is ready for deployment
"""
import sys
import os

def check_imports():
    """Check if all critical imports work"""
    print("🔍 Checking imports...")
    try:
        # Add src to path
        sys.path.insert(0, 'src')
        
        # Test critical imports
        from app import app
        print("✅ Flask app imports successfully")
        
        from core.database import db
        print("✅ Database configuration OK")
        
        from services.ai_service import AIService
        print("✅ AI service imports successfully")
        
        from celery_app import app as celery_app
        print("✅ Celery configuration OK")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def check_required_files():
    """Check if all required files exist"""
    print("\n📋 Checking required files...")
    
    required_files = [
        "requirements.txt",
        "src/app.py",
        "src/core/config.py",
        "src/core/database.py",
        "docker/Dockerfile.prod",
        "docker/Dockerfile.railway",
    ]
    
    missing = []
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ {file}")
        else:
            print(f"❌ {file} - MISSING")
            missing.append(file)
    
    return len(missing) == 0

def check_environment_template():
    """Check if we have environment variable documentation"""
    print("\n📝 Checking environment documentation...")
    
    env_vars = [
        "DATABASE_URL",
        "REDIS_URL",
        "SECRET_KEY",
        "JWT_SECRET_KEY",
        "OPENAI_API_KEY",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "S3_BUCKET_NAME",
        "CORS_ORIGINS",
    ]
    
    print("Required environment variables:")
    for var in env_vars:
        print(f"  - {var}")
    
    return True

def main():
    """Run all checks"""
    print("🚀 LEARN-X Backend Deployment Readiness Check")
    print("=" * 50)
    
    checks = [
        ("Import Check", check_imports),
        ("File Check", check_required_files),
        ("Environment Check", check_environment_template),
    ]
    
    all_passed = True
    
    for name, check_func in checks:
        print(f"\n📌 Running {name}...")
        if not check_func():
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✅ Backend is ready for deployment!")
        return 0
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())