from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    Numeric,
    Date,
    Text
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID, BYTEA, ENUM, JSONB
from pgvector.sqlalchemy import Vector
from enum import Enum as PyEnum
import uuid
from datetime import datetime

Base = declarative_base()

# Python enum for role types
class RoleType(PyEnum):
    """User role types"""
    ADMIN = 'admin'
    INSTRUCTOR = 'instructor'
    STUDENT = 'student'

role_enum = ENUM('admin', 'instructor', 'student', name='role_enum', create_type=True)

class User(Base):
    __tablename__ = 'User'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(64), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    firebase_uid = Column(String(128))

    role = relationship('Role', back_populates='user', uselist=False)
    instructor_profile = relationship('InstructorProfile', back_populates='user', uselist=False)
    student_profile = relationship('StudentProfile', back_populates='user', uselist=False)
    admin_profile = relationship('AdminProfile', back_populates='user', uselist=False)

class Role(Base):
    __tablename__ = 'Role'
    user_id = Column(UUID(as_uuid=True),
                     ForeignKey('User.id', ondelete='CASCADE'),
                     primary_key=True)
    role_type = Column(role_enum, nullable=False)

    user = relationship('User', back_populates='role')

class InstructorProfile(Base):
    __tablename__ = 'InstructorProfile'
    user_id = Column(UUID(as_uuid=True),
                     ForeignKey('User.id', ondelete='CASCADE'),
                     primary_key=True)
    name = Column(Text, nullable=False)
    university = Column(String(128))

    user = relationship('User', back_populates='instructor_profile')
    courses = relationship('Course', back_populates='instructor_profile')

class StudentProfile(Base):
    __tablename__ = 'StudentProfile'
    user_id = Column(UUID(as_uuid=True),
                     ForeignKey('User.id', ondelete='CASCADE'),
                     primary_key=True)
    name = Column(Text, nullable=False)
    onboard_answers = Column(JSONB, nullable=False)
    want_quizzes = Column(Boolean, nullable=False, default=False)
    model_preference = Column(String(64), nullable=True)

    user = relationship('User', back_populates='student_profile')
    enrollments = relationship('Enrollment', back_populates='student')
    chats = relationship('Chat', back_populates='student')
    personalized_files = relationship('PersonalizedFile', back_populates='student')

class AdminProfile(Base):
    __tablename__ = 'AdminProfile'
    user_id = Column(UUID(as_uuid=True),
                     ForeignKey('User.id', ondelete='CASCADE'),
                     primary_key=True)
    name = Column(Text, nullable=False)

    user = relationship('User', back_populates='admin_profile')

class Course(Base):
    __tablename__ = 'Course'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(128), nullable=False)
    description = Column(Text)
    code = Column(String(32), nullable=True)      
    term = Column(String(32), nullable=True)
    published = Column(Boolean, nullable=False, default=False)
    last_updated = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    instructor_id = Column(UUID(as_uuid=True),
                           ForeignKey('InstructorProfile.user_id', ondelete='SET NULL'),
                           nullable=True)
    creator_id = Column(UUID(as_uuid=True),
                       ForeignKey('User.id', ondelete='SET NULL'),
                       nullable=True)
    creator = relationship('User')

    instructor_profile = relationship('InstructorProfile', back_populates='courses')
    modules = relationship('Module', back_populates='course')
    access_code = relationship('AccessCode', back_populates='course', uselist=False)
    enrollments = relationship('Enrollment', back_populates='course')
    report = relationship('Report', back_populates='course', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'title': self.title,
            'description': self.description,
            'code': self.code,
            'term': self.term,
            'published': self.published,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'instructor_id': str(self.instructor_id) if self.instructor_id else None,
            'creator_id': str(self.creator_id) if self.creator_id else None
        }

class Module(Base):
    __tablename__ = 'Module'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True),
                       ForeignKey('Course.id', ondelete='CASCADE'),
                       nullable=False)
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    ordering = Column(Integer, nullable=False, default=0)

    course = relationship('Course', back_populates='modules')
    files = relationship('File', back_populates='module')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'course_id': str(self.course_id),
            'title': self.title,
            'description': self.description,
            'ordering': self.ordering
        }

class File(Base):
    __tablename__ = 'File'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True),
                       ForeignKey('Module.id', ondelete='CASCADE'),
                       nullable=False)
    title = Column(String(128), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_data = Column(BYTEA, nullable=True)  # Now nullable for S3 storage
    s3_key = Column(String(512), nullable=True)
    s3_bucket = Column(String(255), nullable=True)
    storage_type = Column(String(20), nullable=False, default='database')
    transcription = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ordering = Column(Integer, nullable=False, default=0)
    view_count_raw = Column(Integer, nullable=False, default=0)
    view_count_personalized = Column(Integer, nullable=False, default=0)
    chat_count = Column(Integer, nullable=False, default=0)

    module = relationship('Module', back_populates='files')
    chats = relationship('Chat', back_populates='file')
    personalized_files = relationship('PersonalizedFile', back_populates='original_file')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'module_id': str(self.module_id),
            'title': self.title,
            'filename': self.filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            's3_key': self.s3_key,
            's3_bucket': self.s3_bucket,
            'storage_type': self.storage_type,
            'transcription': self.transcription,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'ordering': self.ordering,
            'view_count_raw': self.view_count_raw,
            'view_count_personalized': self.view_count_personalized,
            'chat_count': self.chat_count
        }

class FileChunk(Base):
    __tablename__ = 'FileChunk'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=False)
    file_id = Column(UUID(as_uuid=True),
                     ForeignKey('File.id', ondelete='CASCADE'),
                     nullable=False)
    course_id = Column(UUID(as_uuid=True),
                       ForeignKey('Course.id', ondelete='CASCADE'),
                       nullable=False)
    chunk_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    chunk_metadata = Column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint('file_id', 'chunk_index', name='uq_filechunk_file_index'),
    )

    file = relationship('File')
    course = relationship('Course')

class AccessCode(Base):
    __tablename__ = 'AccessCode'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(32), nullable=False, unique=True)
    course_id = Column(UUID(as_uuid=True),
                       ForeignKey('Course.id', ondelete='CASCADE'),
                       nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    course = relationship('Course', back_populates='access_code')

class Enrollment(Base):
    __tablename__ = 'Enrollment'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True),
                     ForeignKey('StudentProfile.user_id', ondelete='CASCADE'),
                     nullable=False)
    course_id = Column(UUID(as_uuid=True),
                       ForeignKey('Course.id', ondelete='CASCADE'),
                       nullable=False)
    enrolled_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'course_id', name='uq_enrollment_student_course'),
    )

    student = relationship('StudentProfile', back_populates='enrollments', foreign_keys=[user_id])
    course = relationship('Course', back_populates='enrollments')

class PersonalizedFile(Base):
    __tablename__ = 'PersonalizedFile'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True),
                     ForeignKey('StudentProfile.user_id', ondelete='CASCADE'),
                     nullable=False)
    original_file_id = Column(UUID(as_uuid=True),
                              ForeignKey('File.id', ondelete='SET NULL'),
                              nullable=True)
    content = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship('StudentProfile', back_populates='personalized_files', foreign_keys=[user_id])
    original_file = relationship('File', back_populates='personalized_files')

class Todo(Base):
    __tablename__ = 'Todo'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True),
                     ForeignKey('User.id', ondelete='CASCADE'),
                     nullable=False)
    title = Column(String(255), nullable=False)
    course = Column(String(255), nullable=True)  # Course name, not ID
    type = Column(String(50), nullable=False)  # quiz, assignment, reading, review
    priority = Column(String(20), nullable=False)  # high, medium, low
    due_date = Column(DateTime, nullable=True)
    completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User')

class Chat(Base):
    __tablename__ = 'Chat'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True),
                     ForeignKey('StudentProfile.user_id', ondelete='CASCADE'),
                     nullable=False)
    file_id = Column(UUID(as_uuid=True),
                     ForeignKey('File.id', ondelete='SET NULL'),
                     nullable=True)
    title = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship('StudentProfile', back_populates='chats', foreign_keys=[user_id])
    file = relationship('File', back_populates='chats')
    messages = relationship('Message', back_populates='chat')

class Message(Base):
    __tablename__ = 'Message'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True),
                     ForeignKey('Chat.id', ondelete='CASCADE'),
                     nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    chat = relationship('Chat', back_populates='messages')

class Report(Base):
    __tablename__ = 'Report'
    __table_args__ = (
        UniqueConstraint('course_id', name='uq_report_course'),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey('Course.id', ondelete='CASCADE'), nullable=False)
    summary = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    course = relationship('Course', back_populates='report')

class Market(Base):
    __tablename__ = 'Market'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snp500 = Column(Numeric, nullable=False)
    date = Column(Date, nullable=False)


class News(Base):
    __tablename__ = 'News'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(64), nullable=False)
    subject = Column(String(64), nullable=False)
    link = Column(String(120), nullable=False)


class UserStats(Base):
    __tablename__ = 'user_stats'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False, unique=True)
    current_xp = Column(Integer, nullable=False, default=0)
    current_level = Column(Integer, nullable=False, default=1)
    total_xp = Column(Integer, nullable=False, default=0)
    daily_streak = Column(Integer, nullable=False, default=0)
    max_streak = Column(Integer, nullable=False, default=0)
    last_activity_date = Column(Date)
    weekly_goal = Column(Integer, nullable=False, default=5)
    weekly_progress = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship('User')


class UserActivity(Base):
    __tablename__ = 'user_activities'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    activity_type = Column(String(50), nullable=False)  # 'file_view', 'todo_complete', 'chat_message', etc.
    xp_earned = Column(Integer, nullable=False, default=0)
    description = Column(Text)
    activity_metadata = Column(JSONB)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    user = relationship('User')


class UserAchievement(Base):
    __tablename__ = 'user_achievements'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    achievement_type = Column(String(50), nullable=False)
    achievement_name = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(10))  # emoji or icon identifier
    earned_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'achievement_type', name='uq_user_achievement'),
    )
    
    user = relationship('User')


class ApiUsageLog(Base):
    __tablename__ = 'api_usage_logs'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False)
    version = Column(String(10), nullable=False)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='SET NULL'))
    hour = Column(String(13), nullable=False)
    response_status = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship('User')


class StudyPlan(Base):
    __tablename__ = 'study_plans'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    plan_name = Column(String(100), nullable=False, default='My Study Plan')
    weekly_study_hours = Column(Integer, nullable=False, default=12)
    preferred_session_length = Column(Integer, nullable=False, default=45)
    break_length = Column(Integer, nullable=False, default=15)
    peak_hours = Column(JSONB)
    learning_style = Column(String(50))
    difficulty_preference = Column(String(20), default='adaptive')
    reminder_enabled = Column(Boolean, default=True)
    reminder_time = Column(String(8), default='09:00:00')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship('User')
    goals = relationship('StudyGoal', back_populates='study_plan', cascade='all, delete-orphan')


class StudyGoal(Base):
    __tablename__ = 'study_goals'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    study_plan_id = Column(UUID(as_uuid=True), ForeignKey('study_plans.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    goal_type = Column(String(20), nullable=False)  # 'daily', 'weekly', 'assignment', 'review', 'practice'
    priority = Column(String(10), nullable=False, default='medium')
    estimated_hours = Column(Numeric(4,2))
    target_date = Column(Date)
    course_id = Column(UUID(as_uuid=True), ForeignKey('Course.id', ondelete='SET NULL'))
    module_id = Column(UUID(as_uuid=True), ForeignKey('Module.id', ondelete='SET NULL'))
    file_id = Column(UUID(as_uuid=True), ForeignKey('File.id', ondelete='SET NULL'))
    status = Column(String(20), default='pending')
    completion_percentage = Column(Integer, default=0)
    xp_reward = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship('User')
    study_plan = relationship('StudyPlan', back_populates='goals')
    course = relationship('Course')
    module = relationship('Module')
    file = relationship('File')
    progress_records = relationship('GoalProgress', back_populates='goal', cascade='all, delete-orphan')
    sessions = relationship('StudySession', back_populates='study_goal')


class StudySession(Base):
    __tablename__ = 'study_sessions'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey('Course.id', ondelete='SET NULL'))
    study_plan_id = Column(UUID(as_uuid=True), ForeignKey('study_plans.id', ondelete='SET NULL'))
    study_goal_id = Column(UUID(as_uuid=True), ForeignKey('study_goals.id', ondelete='SET NULL'))
    
    # Session Details
    title = Column(String(255), nullable=False)
    description = Column(Text)
    session_type = Column(String(30), default='study')  # 'study', 'assignment', 'meeting', 'lab', 'review'
    
    # Scheduling
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)  # Planned duration in minutes
    
    # AI Optimization Fields
    cognitive_load = Column(String(10), default='medium')  # 'low', 'medium', 'high'
    urgency = Column(String(10), default='later')  # 'urgent', 'soon', 'later'
    priority_score = Column(Numeric(3,2), default=0.5)  # 0.0 to 1.0 for AI optimization
    
    # Session Execution
    actual_start = Column(DateTime)
    actual_end = Column(DateTime)
    actual_duration_minutes = Column(Integer)
    status = Column(String(20), default='scheduled')  # 'scheduled', 'active', 'completed', 'cancelled', 'missed'
    completion_percentage = Column(Integer, default=0)
    
    # Rewards and Motivation
    xp_reward = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)
    
    # Metadata
    is_ai_suggested = Column(Boolean, default=False)
    optimization_score = Column(Numeric(3,2))  # AI optimization confidence
    calendar_position = Column(Integer)  # Order in calendar view
    session_notes = Column(Text)
    effectiveness_rating = Column(Integer)  # 1-5
    focus_score = Column(Numeric(3,1))  # 0.0-10.0
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User')
    study_goal = relationship('StudyGoal', back_populates='sessions')
    course = relationship('Course')
    notes = relationship('SessionNote', back_populates='session', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert StudySession to dictionary for JSON serialization"""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'course_id': str(self.course_id) if self.course_id else None,
            'study_plan_id': str(self.study_plan_id) if self.study_plan_id else None,
            'study_goal_id': str(self.study_goal_id) if self.study_goal_id else None,
            'title': self.title,
            'description': self.description,
            'session_type': self.session_type,
            'scheduled_start': self.scheduled_start.isoformat() if self.scheduled_start else None,
            'scheduled_end': self.scheduled_end.isoformat() if self.scheduled_end else None,
            'duration_minutes': self.duration_minutes,
            'cognitive_load': self.cognitive_load,
            'urgency': self.urgency,
            'priority_score': float(self.priority_score) if self.priority_score else None,
            'actual_start': self.actual_start.isoformat() if self.actual_start else None,
            'actual_end': self.actual_end.isoformat() if self.actual_end else None,
            'actual_duration_minutes': self.actual_duration_minutes,
            'status': self.status,
            'completion_percentage': self.completion_percentage,
            'xp_reward': self.xp_reward,
            'xp_earned': self.xp_earned,
            'is_ai_suggested': self.is_ai_suggested,
            'optimization_score': float(self.optimization_score) if self.optimization_score else None,
            'calendar_position': self.calendar_position,
            'session_notes': self.session_notes,
            'effectiveness_rating': self.effectiveness_rating,
            'focus_score': float(self.focus_score) if self.focus_score else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class StudyRecommendation(Base):
    __tablename__ = 'study_recommendations'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    recommendation_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    action_text = Column(String(100))
    priority_score = Column(Numeric(3,2), default=0.5)
    confidence_score = Column(Numeric(3,2), default=0.5)
    reasoning = Column(Text)
    suggested_time = Column(DateTime)
    estimated_impact = Column(String(20))
    xp_reward = Column(Integer, default=0)
    status = Column(String(20), default='active')
    expires_at = Column(DateTime)
    recommendation_metadata = Column('metadata', JSONB)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship('User')


class GoalProgress(Base):
    __tablename__ = 'goal_progress'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey('study_goals.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    progress_date = Column(Date, nullable=False)
    time_spent_minutes = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    notes = Column(Text)
    mood_rating = Column(Integer)      # 1-5
    difficulty_rating = Column(Integer) # 1-5
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('goal_id', 'progress_date', name='uq_goal_progress_date'),
    )
    
    goal = relationship('StudyGoal', back_populates='progress_records')
    user = relationship('User')



class SessionNote(Base):
    __tablename__ = 'session_notes'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('study_sessions.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    
    note_type = Column(String(20), default='general')
    content = Column(Text, nullable=False)
    note_timestamp = Column(DateTime, default=datetime.utcnow)
    
    note_metadata = Column(JSONB)
    is_private = Column(Boolean, default=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship('StudySession', back_populates='notes')
    user = relationship('User')


class UserSchedulePreferences(Base):
    __tablename__ = 'user_schedule_preferences'
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), primary_key=True)
    
    # Core Hours Configuration
    core_start_hour = Column(Integer, default=8)
    core_end_hour = Column(Integer, default=18)
    timezone = Column(String(50), default='UTC')
    
    # Session Preferences
    default_session_length = Column(Integer, default=45)
    default_break_length = Column(Integer, default=15)
    max_daily_study_hours = Column(Integer, default=8)
    
    # Cognitive Load Distribution
    preferred_high_cognitive_slots = Column(JSONB)
    avoided_time_slots = Column(JSONB)
    
    # AI Optimization Settings
    enable_ai_optimization = Column(Boolean, default=True)
    enable_ai_suggestions = Column(Boolean, default=True)
    optimization_aggressiveness = Column(Numeric(2,1), default=5.0)
    
    # Notification Settings
    enable_session_reminders = Column(Boolean, default=True)
    reminder_minutes_before = Column(Integer, default=15)
    enable_deadline_alerts = Column(Boolean, default=True)
    
    # Display Preferences
    default_view = Column(String(20), default='calendar')
    show_weekends = Column(Boolean, default=False)
    calendar_start_hour = Column(Integer, default=6)
    calendar_end_hour = Column(Integer, default=22)
    
    # Course Color Mapping
    course_colors = Column(JSONB)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User')


class SessionAnalytics(Base):
    __tablename__ = 'session_analytics'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey('study_sessions.id', ondelete='SET NULL'))
    
    # Analytics Event Data
    event_type = Column(String(50), nullable=False)
    event_timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Performance Metrics
    planned_vs_actual_duration = Column(Integer)
    focus_interruptions = Column(Integer, default=0)
    context_switches = Column(Integer, default=0)
    
    # AI Insights
    optimization_followed = Column(Boolean)
    suggestion_effectiveness = Column(Numeric(3,2))
    
    # User Behavior
    device_type = Column(String(20))
    time_to_start = Column(Integer)
    session_satisfaction = Column(Integer)
    
    # Contextual Data
    analytics_metadata = Column(JSONB)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User')
    session = relationship('StudySession')


class AISessionSuggestion(Base):
    __tablename__ = 'ai_session_suggestions'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    
    # Suggestion Details
    suggestion_type = Column(String(30), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Suggested Session Data
    suggested_start = Column(DateTime)
    suggested_duration = Column(Integer)
    suggested_course_id = Column(UUID(as_uuid=True), ForeignKey('Course.id', ondelete='SET NULL'))
    suggested_cognitive_load = Column(String(10))
    
    # AI Confidence and Reasoning
    confidence_score = Column(Numeric(3,2), nullable=False)
    reasoning = Column(Text)
    algorithm_version = Column(String(20))
    
    # User Response
    status = Column(String(20), default='pending')
    user_feedback = Column(Text)
    applied_at = Column(DateTime)
    
    # Metadata
    priority_score = Column(Numeric(3,2), default=0.5)
    expires_at = Column(DateTime)
    ai_suggestion_metadata = Column(JSONB)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User')
    suggested_course = relationship('Course')