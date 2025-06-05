#!/usr/bin/env python3
"""
Simple container startup test to validate environment
"""
import os
import sys

def test_environment():
    """Test basic environment setup"""
    print("🔍 Testing container environment...")
    
    # Check Python version
    print(f"Python version: {sys.version}")
    
    # Check environment variables
    required_vars = [
        'FLASK_ENV',
        'REDIS_URL', 
        'DATABASE_URL',
        'PYTHONPATH'
    ]
    
    print("\n📊 Environment variables:")
    for var in required_vars:
        value = os.getenv(var, 'NOT SET')
        status = "✅" if value != 'NOT SET' else "❌"
        print(f"  {status} {var}: {value}")
    
    # Check working directory
    print(f"\n📂 Working directory: {os.getcwd()}")
    
    # Check if key directories exist
    key_dirs = ['src', 'config', 'docker']
    print("\n📁 Key directories:")
    for dir_name in key_dirs:
        exists = os.path.isdir(dir_name)
        status = "✅" if exists else "❌"
        print(f"  {status} {dir_name}/")
    
    # Check key files
    key_files = [
        'src/app.py',
        'src/wsgi.py', 
        'config/base.txt',
        'config/dev.txt'
    ]
    print("\n📄 Key files:")
    for file_name in key_files:
        exists = os.path.isfile(file_name)
        status = "✅" if exists else "❌"
        print(f"  {status} {file_name}")

def test_minimal_imports():
    """Test minimal critical imports"""
    print("\n🧪 Testing minimal imports...")
    
    minimal_imports = [
        'os',
        'sys',
        'json',
        'time',
        'datetime'
    ]
    
    for module in minimal_imports:
        try:
            __import__(module)
            print(f"  ✅ {module}")
        except ImportError as e:
            print(f"  ❌ {module} - {e}")

def main():
    print("🚀 Container Startup Test")
    print("=" * 40)
    
    test_environment()
    test_minimal_imports()
    
    print("\n" + "=" * 40)
    print("✅ Environment test complete")

if __name__ == "__main__":
    main()