from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    Boolean,
    LargeBinary,
    JSON,
    UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID, BYTEA, JSONB
import uuid
from datetime import datetime

Base = declarative_base()

class Professor(Base):
    __tablename__ = 'Professor'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(64), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    firebase_uid = Column(String(128), nullable=True)

    courses = relationship('Course', back_populates='professor')

class Student(Base):
    __tablename__ = 'Student'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(64), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    firebase_uid = Column(String(128), nullable=True)

    onboarding = relationship('Onboarding', back_populates='student', uselist=False)
    chats = relationship('Chat', back_populates='student')
    enrollments = relationship('Enrollment', back_populates='student')
    personalized_files = relationship('PersonalizedFile', back_populates='student')

class Onboarding(Base):
    __tablename__ = 'Onboarding'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey('Student.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    answers = Column(JSONB, nullable=False)
    quizzes = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship('Student', back_populates='onboarding')

class Course(Base):
    __tablename__ = 'Course'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(128), nullable=False)
    description = Column(String)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    index_pkl = Column(BYTEA, nullable=True)
    professor_id = Column(UUID(as_uuid=True), ForeignKey('Professor.id', ondelete='CASCADE'), nullable=False)

    professor = relationship('Professor', back_populates='courses')
    files = relationship('File', back_populates='course')
    access_code = relationship('AccessCode', back_populates='course', uselist=False)
    enrollments = relationship('Enrollment', back_populates='course')
    reports = relationship('Report', back_populates='course')

class AccessCode(Base):
    __tablename__ = 'AccessCode'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(32), nullable=False, unique=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey('Course.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    course = relationship('Course', back_populates='access_code')

class Enrollment(Base):
    __tablename__ = 'Enrollment'
    student_id = Column(UUID(as_uuid=True), ForeignKey('Student.id', ondelete='CASCADE'), primary_key=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey('Course.id', ondelete='CASCADE'), primary_key=True)
    enrolled_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship('Student', back_populates='enrollments')
    course = relationship('Course', back_populates='enrollments')

class File(Base):
    __tablename__ = 'File'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_data = Column(BYTEA, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    course_id = Column(UUID(as_uuid=True), ForeignKey('Course.id', ondelete='CASCADE'), nullable=False)

    course = relationship('Course', back_populates='files')
    chats = relationship('Chat', back_populates='file')

class PersonalizedFile(Base):
    __tablename__ = 'PersonalizedFile'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey('Student.id', ondelete='CASCADE'), nullable=False)
    original_file_id = Column(UUID(as_uuid=True), ForeignKey('File.id', ondelete='SET NULL'), nullable=True)
    content = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    student = relationship('Student', back_populates='personalized_files')
    original_file = relationship('File')

class Chat(Base):
    __tablename__ = 'Chat'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey('Student.id', ondelete='CASCADE'), nullable=False)
    file_id = Column(UUID(as_uuid=True), ForeignKey('File.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    title = Column(String(128), nullable=False)

    student = relationship('Student', back_populates='chats')
    file = relationship('File', back_populates='chats')
    messages = relationship('Message', back_populates='chat')

class Message(Base):
    __tablename__ = 'Message'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey('Chat.id', ondelete='CASCADE'), nullable=False)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    chat = relationship('Chat', back_populates='messages')

class Report(Base):
    __tablename__ = 'Report'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey('Course.id', ondelete='CASCADE'), nullable=False)
    file_id = Column(UUID(as_uuid=True), ForeignKey('File.id', ondelete='SET NULL'), nullable=True)
    summary = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    course = relationship('Course', back_populates='reports')
    file = relationship('File')