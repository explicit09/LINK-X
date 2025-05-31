#!/usr/bin/env python3
"""Test script to verify repository compatibility constructors"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import all repositories
from repositories.course_repository import CourseRepository
from repositories.user_repository import UserRepository
from repositories.file_repository import FileRepository
from repositories.module_repository import ModuleRepository
from repositories.enrollment_repository import EnrollmentRepository
from repositories.todo_repository import TodoRepository

def test_repository_instantiation():
    """Test that all repositories can be instantiated without session_factory"""
    
    repositories = [
        ('CourseRepository', CourseRepository),
        ('UserRepository', UserRepository),
        ('FileRepository', FileRepository),
        ('ModuleRepository', ModuleRepository),
        ('EnrollmentRepository', EnrollmentRepository),
        ('TodoRepository', TodoRepository),
    ]
    
    print("Testing repository instantiation without session_factory...\n")
    
    all_passed = True
    
    for name, repo_class in repositories:
        try:
            # Attempt to instantiate without session_factory
            repo = repo_class()
            print(f"✓ {name}: Successfully instantiated without session_factory")
            
            # Verify that session_factory is set
            if hasattr(repo, 'session_factory') and repo.session_factory is not None:
                print(f"  - session_factory is properly set")
            else:
                print(f"  - WARNING: session_factory might not be properly set")
                all_passed = False
                
        except Exception as e:
            print(f"✗ {name}: Failed to instantiate - {str(e)}")
            all_passed = False
    
    print("\n" + "="*50)
    if all_passed:
        print("All repositories support compatibility constructor!")
    else:
        print("Some repositories failed the compatibility test.")
    
    return all_passed

if __name__ == "__main__":
    # Note: This test requires the Flask app context to be set up
    # In a real scenario, db_manager.session_factory would be initialized
    # by the Flask app
    print("Note: This test assumes db_manager.session_factory is initialized.")
    print("In production, this happens when the Flask app starts.\n")
    
    test_repository_instantiation()