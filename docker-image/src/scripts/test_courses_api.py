#!/usr/bin/env python3
"""Test courses API directly"""
import sys
sys.path.append('/app/src')

from repositories.course_repository import CourseRepository
from repositories.user_repository import UserRepository
from services.course_service import CourseService

# Test with a known user email
email = "tmbuwa09@gmail.com"

user_repo = UserRepository()
user = user_repo.find_by(email=email)

if user:
    print(f"User found: {user.email} (ID: {user.id})")
    print(f"Role: {user.role.role_type if user.role else 'No role'}")
    
    # Test the repository directly
    course_repo = CourseRepository()
    
    # Test the old method (enrolled only)
    print("\n--- Testing enrolled courses only ---")
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from db.schema import Course, Enrollment
    import os
    
    DATABASE_URL = os.getenv('DATABASE_URL')
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    enrolled = session.query(Course)\
        .join(Enrollment)\
        .filter(Enrollment.user_id == user.id)\
        .all()
    
    print(f"Enrolled courses: {len(enrolled)}")
    for course in enrolled[:3]:
        print(f"  - {course.title} (ID: {course.id})")
    
    session.close()
    
    # Test the service layer
    print("\n--- Testing service layer ---")
    course_service = CourseService()
    service_courses = course_service.get_student_courses(user.id)
    print(f"Service returned: {len(service_courses)} courses")
    for course in service_courses[:3]:
        if hasattr(course, 'title'):
            print(f"  - {course.title}")
        elif isinstance(course, dict):
            print(f"  - {course.get('title', 'Unknown')}")
    
else:
    print(f"User {email} not found")