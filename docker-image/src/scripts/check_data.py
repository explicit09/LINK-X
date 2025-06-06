#!/usr/bin/env python3
"""Check database data"""
import sys
sys.path.append('/app/src')

from core.database_supabase import db_manager
from db.schema import Course, Enrollment, User

def check_data():
    session = db_manager.get_session()
    
    try:
        # Check courses
        courses = session.query(Course).all()
        print(f'Total courses: {len(courses)}')
        for course in courses[:5]:
            print(f'- {course.title} (ID: {course.id})')
        
        # Check enrollments
        enrollments = session.query(Enrollment).all()
        print(f'\nTotal enrollments: {len(enrollments)}')
        
        # Check users
        users = session.query(User).all()
        print(f'\nTotal users: {len(users)}')
        for user in users[:3]:
            role_type = user.role.role_type if user.role else "No role"
            print(f'- {user.email} (ID: {user.id}, Role: {role_type})')
            
            # Check enrollments for this user
            user_enrollments = session.query(Enrollment).filter_by(user_id=user.id).all()
            print(f'  Enrolled in {len(user_enrollments)} courses')
            
    finally:
        session.close()

if __name__ == '__main__':
    check_data()