#!/usr/bin/env python3
"""Check courses and their relationships"""
import sys
sys.path.append('/app/src')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.schema import Course, User, Enrollment, InstructorProfile
import os

# Get database URL
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

try:
    # Get all courses
    courses = session.query(Course).all()
    print(f"Total courses: {len(courses)}")
    print("\nCourse Details:")
    print("-" * 80)
    
    for course in courses:
        print(f"\nCourse: {course.title}")
        print(f"  ID: {course.id}")
        print(f"  Instructor ID: {course.instructor_id}")
        print(f"  Published: {course.published}")
        print(f"  Created: {course.created_at}")
        
        # Check if instructor_id points to a user
        if course.instructor_id:
            # Check in User table
            user = session.query(User).filter_by(id=course.instructor_id).first()
            if user:
                print(f"  Instructor (User): {user.email} (Role: {user.role.role_type if user.role else 'No role'})")
            
            # Check in InstructorProfile table
            instructor = session.query(InstructorProfile).filter_by(user_id=course.instructor_id).first()
            if instructor:
                print(f"  Instructor Profile: {instructor.name}")
            elif user:
                print(f"  WARNING: User {user.email} created course but has no InstructorProfile")
        
        # Check enrollments
        enrollments = session.query(Enrollment).filter_by(course_id=course.id).all()
        print(f"  Enrollments: {len(enrollments)}")
        
    print("\n" + "-" * 80)
    print("\nUser Summary:")
    users = session.query(User).all()
    for user in users[:5]:
        print(f"\nUser: {user.email}")
        print(f"  ID: {user.id}")
        print(f"  Role: {user.role.role_type if user.role else 'No role'}")
        
        # Count courses where this user is the instructor
        created_courses = session.query(Course).filter_by(instructor_id=user.id).count()
        print(f"  Created courses: {created_courses}")
        
        # Count enrollments
        enrolled_courses = session.query(Enrollment).filter_by(user_id=user.id).count()
        print(f"  Enrolled courses: {enrolled_courses}")
        
finally:
    session.close()