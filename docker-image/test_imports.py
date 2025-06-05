#!/usr/bin/env python3
"""
Test script to validate all critical imports for the backend
"""
import sys
import traceback

def test_import(module_name, description=""):
    try:
        __import__(module_name)
        print(f"✅ {module_name} {description}")
        return True
    except ImportError as e:
        print(f"❌ {module_name} {description} - {e}")
        return False
    except Exception as e:
        print(f"⚠️  {module_name} {description} - {e}")
        return False

def main():
    print("🔍 Testing critical imports for LEARN-X backend...\n")
    
    failed_imports = []
    
    # Core Flask dependencies
    core_modules = [
        ("flask", "- Core Flask framework"),
        ("flask_socketio", "- WebSocket support for collaboration"),
        ("flask_cors", "- CORS handling"),
        ("flask_sqlalchemy", "- Database ORM"),
        ("flask_jwt_extended", "- JWT authentication"),
    ]
    
    # Database modules
    db_modules = [
        ("psycopg2", "- PostgreSQL adapter"),
        ("sqlalchemy", "- SQL toolkit"),
        ("alembic", "- Database migrations"),
        ("redis", "- Redis client"),
    ]
    
    # AI/ML modules
    ai_modules = [
        ("openai", "- OpenAI API client"),
        ("langchain", "- LangChain framework"),
        ("transformers", "- Hugging Face transformers"),
        ("numpy", "- Numerical computing"),
    ]
    
    # Task queue
    task_modules = [
        ("celery", "- Task queue"),
        ("flower", "- Celery monitoring"),
    ]
    
    # Document processing
    doc_modules = [
        ("PyPDF2", "- PDF processing"),
        ("python_docx", "- Word document processing"),
    ]
    
    # Cloud services
    cloud_modules = [
        ("boto3", "- AWS SDK"),
        ("firebase_admin", "- Firebase Admin SDK"),
    ]
    
    all_modules = [
        ("Core Flask", core_modules),
        ("Database", db_modules), 
        ("AI/ML", ai_modules),
        ("Task Queue", task_modules),
        ("Document Processing", doc_modules),
        ("Cloud Services", cloud_modules),
    ]
    
    total_passed = 0
    total_tested = 0
    
    for category, modules in all_modules:
        print(f"\n📦 {category} Dependencies:")
        print("-" * 40)
        
        for module, desc in modules:
            if test_import(module, desc):
                total_passed += 1
            else:
                failed_imports.append((module, desc))
            total_tested += 1
    
    print(f"\n{'='*50}")
    print(f"📊 Import Test Results:")
    print(f"✅ Passed: {total_passed}/{total_tested}")
    print(f"❌ Failed: {len(failed_imports)}")
    
    if failed_imports:
        print(f"\n🚨 Failed Imports:")
        for module, desc in failed_imports:
            print(f"  - {module} {desc}")
        print(f"\n💡 Run: pip install -r config/base.txt")
        return False
    else:
        print(f"\n🎉 All imports successful!")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)