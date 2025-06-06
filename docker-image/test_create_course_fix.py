#!/usr/bin/env python3
"""Test script to verify the create_course fix for Role not bound to Session error"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.course_service import CourseService
from services.course_service_optimized import OptimizedCourseService
from core.database_supabase import db_manager

def test_create_course():
    """Test creating a course with both services"""
    print("Testing course creation fix...")
    
    # Test data
    test_user_id = "550e8400-e29b-41d4-a716-446655440000"  # Replace with a valid user ID from your DB
    test_course_data = {
        "title": "Test Course for Session Fix",
        "description": "This is a test course to verify the session fix works properly",
        "code": "TEST-101",
        "term": "Fall 2024",
        "published": False
    }
    
    # Test regular CourseService
    try:
        print("\n1. Testing CourseService.create_course()...")
        service = CourseService()
        course = service.create_course(
            instructor_id=test_user_id,
            **test_course_data
        )
        print(f"✓ Course created successfully: {course.id}")
        print(f"  Title: {course.title}")
        print(f"  Creator ID: {course.creator_id}")
        print(f"  Instructor ID: {course.instructor_id}")
    except Exception as e:
        print(f"✗ Failed: {type(e).__name__}: {str(e)}")
    
    # Test OptimizedCourseService
    try:
        print("\n2. Testing OptimizedCourseService.create_course()...")
        optimized_service = OptimizedCourseService()
        course2 = optimized_service.create_course(
            instructor_id=test_user_id,
            title=test_course_data["title"] + " (Optimized)",
            description=test_course_data["description"],
            code=test_course_data["code"] + "-OPT",
            term=test_course_data["term"],
            published=test_course_data["published"]
        )
        print(f"✓ Course created successfully: {course2.id}")
        print(f"  Title: {course2.title}")
        print(f"  Creator ID: {course2.creator_id}")
        print(f"  Instructor ID: {getattr(course2, 'instructor_id', 'Not set')}")
    except Exception as e:
        print(f"✗ Failed: {type(e).__name__}: {str(e)}")
    
    # Test update_course
    try:
        print("\n3. Testing CourseService.update_course()...")
        if 'course' in locals():
            updated_course = service.update_course(
                course_id=str(course.id),
                user_id=test_user_id,
                title="Updated Test Course"
            )
            print(f"✓ Course updated successfully: {updated_course['title']}")
    except Exception as e:
        print(f"✗ Failed: {type(e).__name__}: {str(e)}")
    
    # Test delete_course
    try:
        print("\n4. Testing CourseService.delete_course()...")
        if 'course' in locals():
            success = service.delete_course(
                course_id=str(course.id),
                user_id=test_user_id
            )
            print(f"✓ Course deleted successfully: {success}")
    except Exception as e:
        print(f"✗ Failed: {type(e).__name__}: {str(e)}")
    
    print("\nTest completed!")

if __name__ == "__main__":
    test_create_course()