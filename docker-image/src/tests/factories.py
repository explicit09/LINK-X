"""
Test Factories
Factory classes for generating test data
"""

import factory
from factory.alchemy import SQLAlchemyModelFactory
from factory import Faker, SubFactory, LazyAttribute, Sequence
from datetime import datetime
import secrets

from db.schema import User, Role, Course, Module, File, Enrollment, Todo


class RoleFactory(SQLAlchemyModelFactory):
    """Factory for Role model"""
    class Meta:
        model = Role
        sqlalchemy_session_persistence = 'commit'
    
    role_type = factory.Iterator(['student', 'instructor', 'admin'])


class UserFactory(SQLAlchemyModelFactory):
    """Factory for User model"""
    class Meta:
        model = User
        sqlalchemy_session_persistence = 'commit'
    
    user_id = Sequence(lambda n: f"user-{n:04d}")
    email = Faker('email')
    firebase_uid = LazyAttribute(lambda obj: f"firebase-{obj.user_id}")
    role = SubFactory(RoleFactory, role_type='student')
    name = Faker('name')
    created_at = factory.LazyFunction(datetime.utcnow)
    last_login = None
    
    @factory.post_generation
    def password(obj, create, extracted, **kwargs):
        """Set password hash if password provided"""
        if extracted:
            # In real implementation, this would hash the password
            obj.password_hash = f"hashed-{extracted}"


class InstructorFactory(UserFactory):
    """Factory for Instructor users"""
    role = SubFactory(RoleFactory, role_type='instructor')
    email = Sequence(lambda n: f"instructor{n}@test.edu")
    name = Faker('name')


class StudentFactory(UserFactory):
    """Factory for Student users"""
    role = SubFactory(RoleFactory, role_type='student')
    email = Sequence(lambda n: f"student{n}@test.edu")
    name = Faker('name')


class AdminFactory(UserFactory):
    """Factory for Admin users"""
    role = SubFactory(RoleFactory, role_type='admin')
    email = Sequence(lambda n: f"admin{n}@test.edu")
    name = Faker('name')


class CourseFactory(SQLAlchemyModelFactory):
    """Factory for Course model"""
    class Meta:
        model = Course
        sqlalchemy_session_persistence = 'commit'
    
    course_id = Sequence(lambda n: f"course-{n:04d}")
    title = Faker('catch_phrase')
    description = Faker('paragraph')
    instructor_id = None  # Must be set explicitly
    access_code = factory.LazyFunction(lambda: secrets.token_urlsafe(6).upper())
    published = True
    created_at = factory.LazyFunction(datetime.utcnow)
    
    @factory.post_generation
    def modules(obj, create, extracted, **kwargs):
        """Add modules if specified"""
        if not create:
            return
            
        if extracted:
            # If specific modules provided, use them
            for module in extracted:
                module.course_id = obj.course_id
        else:
            # Create default modules if requested
            if kwargs.get('create_modules', False):
                num_modules = kwargs.get('num_modules', 3)
                for i in range(num_modules):
                    ModuleFactory(course_id=obj.course_id, order=i+1)


class ModuleFactory(SQLAlchemyModelFactory):
    """Factory for Module model"""
    class Meta:
        model = Module
        sqlalchemy_session_persistence = 'commit'
    
    module_id = Sequence(lambda n: f"module-{n:04d}")
    course_id = None  # Must be set explicitly
    name = Faker('bs')
    description = Faker('paragraph')
    order = Sequence(int)
    created_at = factory.LazyFunction(datetime.utcnow)
    materials = []
    
    @factory.post_generation
    def files(obj, create, extracted, **kwargs):
        """Add files if specified"""
        if not create:
            return
            
        if extracted:
            # If specific files provided, add their IDs to materials
            obj.materials = [f.file_id for f in extracted]


class FileFactory(SQLAlchemyModelFactory):
    """Factory for File model"""
    class Meta:
        model = File
        sqlalchemy_session_persistence = 'commit'
    
    file_id = Sequence(lambda n: f"file-{n:04d}")
    filename = Faker('file_name', extension='pdf')
    file_type = 'application/pdf'
    file_size = Faker('random_int', min=1000, max=10000000)
    course_id = None  # Must be set explicitly
    module_id = None  # Optional
    s3_key = LazyAttribute(lambda obj: f"courses/{obj.course_id}/{obj.file_id}/{obj.filename}")
    s3_url = LazyAttribute(lambda obj: f"https://test-bucket.s3.amazonaws.com/{obj.s3_key}")
    uploaded_at = factory.LazyFunction(datetime.utcnow)
    processed = False
    embedded = False
    content_extracted = None
    embedding_ids = []


class EnrollmentFactory(SQLAlchemyModelFactory):
    """Factory for Enrollment model"""
    class Meta:
        model = Enrollment
        sqlalchemy_session_persistence = 'commit'
    
    enrollment_id = Sequence(lambda n: f"enrollment-{n:04d}")
    student_id = None  # Must be set explicitly
    course_id = None  # Must be set explicitly
    enrolled_at = factory.LazyFunction(datetime.utcnow)
    completed_at = None
    progress = 0.0


class TodoFactory(SQLAlchemyModelFactory):
    """Factory for Todo model"""
    class Meta:
        model = Todo
        sqlalchemy_session_persistence = 'commit'
    
    todo_id = Sequence(lambda n: f"todo-{n:04d}")
    user_id = None  # Must be set explicitly
    title = Faker('sentence', nb_words=4)
    description = Faker('paragraph')
    status = 'pending'
    priority = factory.Iterator(['low', 'medium', 'high'])
    due_date = Faker('future_datetime', end_date='+30d')
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)
    completed_at = None


# Batch creation helpers

def create_course_with_content(session, instructor=None, num_modules=3, num_files_per_module=2):
    """Create a complete course with modules and files"""
    if not instructor:
        instructor = InstructorFactory()
        
    course = CourseFactory(instructor_id=instructor.user_id)
    
    modules = []
    for i in range(num_modules):
        module = ModuleFactory(
            course_id=course.course_id,
            order=i+1,
            name=f"Module {i+1}: {factory.Faker('bs').generate()}"
        )
        modules.append(module)
        
        # Add files to module
        files = []
        for j in range(num_files_per_module):
            file = FileFactory(
                course_id=course.course_id,
                module_id=module.module_id,
                filename=f"module{i+1}_doc{j+1}.pdf"
            )
            files.append(file)
            
        module.materials = [f.file_id for f in files]
        session.commit()
    
    return course, modules


def create_enrolled_student(session, course, student=None):
    """Create a student and enroll them in a course"""
    if not student:
        student = StudentFactory()
        
    enrollment = EnrollmentFactory(
        student_id=student.user_id,
        course_id=course.course_id
    )
    
    return student, enrollment


def create_course_with_students(session, instructor=None, num_students=5):
    """Create a course with enrolled students"""
    course, modules = create_course_with_content(session, instructor)
    
    students = []
    enrollments = []
    
    for i in range(num_students):
        student, enrollment = create_enrolled_student(session, course)
        students.append(student)
        enrollments.append(enrollment)
    
    return course, students, enrollments


# Register factories with session
def register_session(session):
    """Register SQLAlchemy session with all factories"""
    for factory_class in [
        RoleFactory, UserFactory, CourseFactory, 
        ModuleFactory, FileFactory, EnrollmentFactory, TodoFactory
    ]:
        factory_class._meta.sqlalchemy_session = session