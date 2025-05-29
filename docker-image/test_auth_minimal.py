#!/usr/bin/env python3
"""
Minimal test of the authentication system structure
Tests the code organization without requiring all dependencies
"""

import sys
import os

# Add src to path
sys.path.insert(0, 'src')

def test_imports():
    """Test that core modules can be imported"""
    print("Testing module imports...")
    
    # Test 1: Core exceptions
    try:
        from core.exceptions import ValidationError, AuthenticationError, NotFoundError
        print("✓ Core exceptions imported successfully")
    except ImportError as e:
        print(f"✗ Core exceptions import failed: {e}")
        return False
    
    # Test 2: Check compatibility wrappers
    try:
        # These should exist and import the unified versions
        import api.auth
        import api.auth_v2
        print("✓ Compatibility wrappers exist")
    except ImportError as e:
        print(f"✗ Compatibility wrappers failed: {e}")
        return False
    
    # Test 3: Check service interfaces
    try:
        from services.interfaces import (
            AuthServiceInterface,
            CourseServiceInterface,
            FileServiceInterface
        )
        print("✓ Service interfaces imported successfully")
    except ImportError as e:
        print(f"✗ Service interfaces import failed: {e}")
        return False
    
    return True

def test_file_structure():
    """Test that all key files exist"""
    print("\nTesting file structure...")
    
    key_files = {
        'Unified Auth': 'src/api/auth_unified.py',
        'Auth Service': 'src/services/auth_service_unified.py',
        'Decorators': 'src/core/decorators_unified.py',
        'DI Container': 'src/core/dependencies.py',
        'Base Service': 'src/services/base_service.py',
        'Service Interfaces': 'src/services/interfaces.py',
    }
    
    all_exist = True
    for name, path in key_files.items():
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"✓ {name}: {path} ({size:,} bytes)")
        else:
            print(f"✗ {name}: {path} NOT FOUND")
            all_exist = False
    
    return all_exist

def test_wrapper_content():
    """Test that compatibility wrappers have correct content"""
    print("\nTesting compatibility wrapper content...")
    
    # Check auth.py wrapper
    with open('src/api/auth.py', 'r') as f:
        content = f.read()
        if 'from api.auth_unified import *' in content and 'deprecated' in content:
            print("✓ auth.py wrapper correctly imports from auth_unified")
        else:
            print("✗ auth.py wrapper has incorrect content")
            return False
    
    # Check auth_service.py wrapper
    with open('src/services/auth_service.py', 'r') as f:
        content = f.read()
        if 'from services.auth_service_unified import *' in content:
            print("✓ auth_service.py wrapper correctly imports from auth_service_unified")
        else:
            print("✗ auth_service.py wrapper has incorrect content")
            return False
    
    return True

def main():
    """Run all tests"""
    print("=" * 60)
    print("Minimal Authentication System Test")
    print("=" * 60)
    
    # Change to docker-image directory if not already there
    if os.path.basename(os.getcwd()) != 'docker-image':
        os.chdir('docker-image')
    
    all_passed = True
    
    # Run tests
    all_passed &= test_imports()
    all_passed &= test_file_structure()
    all_passed &= test_wrapper_content()
    
    # Summary
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All minimal tests passed!")
        print("\nThe authentication system structure is correctly set up.")
        print("Compatibility wrappers are in place for backward compatibility.")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())