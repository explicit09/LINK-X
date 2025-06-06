#!/usr/bin/env python3
"""
Complete database schema creation script for Supabase
"""

import os
from dotenv import load_dotenv
load_dotenv()

os.environ['FLASK_ENV'] = 'development'

from app import create_app
from sqlalchemy import text

def create_complete_schema():
    app = create_app()
    
    with app.app_context():
        from core.database_supabase import db
        
        print('Creating complete database schema...')
        
        # Drop all existing tables first
        try:
            print('Dropping existing tables...')
            db.session.execute(text('DROP TABLE IF EXISTS file_chunks CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS files CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS modules CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS courses CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS student_profiles CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS instructor_profiles CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS admin_profiles CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS roles CASCADE'))
            db.session.execute(text('DROP TABLE IF EXISTS users CASCADE'))
            db.session.execute(text('DROP TYPE IF EXISTS role_enum CASCADE'))
            db.session.commit()
            print('Existing tables dropped')
        except Exception as e:
            print(f'Drop error (expected): {e}')
            db.session.rollback()

        try:
            # Create enum type
            print('Creating role enum...')
            db.session.execute(text("CREATE TYPE role_enum AS ENUM ('admin', 'instructor', 'student')"))
            
            # Create users table
            print('Creating users table...')
            db.session.execute(text('''
            CREATE TABLE users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255),
                firebase_uid VARCHAR(128),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            '''))
            
            # Create roles table
            print('Creating roles table...')
            db.session.execute(text('''
            CREATE TABLE roles (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                role_type role_enum NOT NULL
            )
            '''))
            
            # Create profile tables
            print('Creating profile tables...')
            db.session.execute(text('''
            CREATE TABLE instructor_profiles (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                bio TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            '''))
            
            db.session.execute(text('''
            CREATE TABLE student_profiles (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                learning_style VARCHAR(50),
                experience_level VARCHAR(50),
                interests TEXT[],
                goals TEXT,
                background TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            '''))
            
            db.session.execute(text('''
            CREATE TABLE admin_profiles (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                permissions JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            '''))
            
            # Create courses table
            print('Creating courses table...')
            db.session.execute(text('''
            CREATE TABLE courses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(128) NOT NULL,
                description TEXT,
                code VARCHAR(32),
                term VARCHAR(32),
                published BOOLEAN DEFAULT FALSE,
                instructor_id UUID REFERENCES instructor_profiles(user_id) ON DELETE CASCADE,
                creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            '''))
            
            # Create modules table
            print('Creating modules table...')
            db.session.execute(text('''
            CREATE TABLE modules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                ordering INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            '''))
            
            # Create files table
            print('Creating files table...')
            db.session.execute(text('''
            CREATE TABLE files (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                filename VARCHAR(255) NOT NULL,
                file_type VARCHAR(255),
                file_size BIGINT,
                file_data BYTEA,
                s3_key VARCHAR(512),
                s3_bucket VARCHAR(255),
                storage_type VARCHAR(20) DEFAULT 'database',
                module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
                transcription TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            '''))
            
            # Create file_chunks table for embeddings
            print('Creating file_chunks table...')
            db.session.execute(text('''
            CREATE TABLE file_chunks (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                file_id UUID REFERENCES files(id) ON DELETE CASCADE,
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding vector(1536),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            '''))
            
            # Create some useful indexes
            print('Creating indexes...')
            db.session.execute(text('CREATE INDEX idx_files_module_id ON files(module_id)'))
            db.session.execute(text('CREATE INDEX idx_modules_course_id ON modules(course_id)'))
            db.session.execute(text('CREATE INDEX idx_file_chunks_file_id ON file_chunks(file_id)'))
            db.session.execute(text('CREATE INDEX idx_file_chunks_course_id ON file_chunks(course_id)'))
            
            db.session.commit()
            print('✅ Complete schema created successfully!')
            
        except Exception as e:
            print(f'❌ Schema creation error: {e}')
            db.session.rollback()
            return False
            
        return True

if __name__ == '__main__':
    success = create_complete_schema()
    if success:
        print('\n🎉 Database schema setup completed successfully!')
        print('You can now run file uploads and AI processing.')
    else:
        print('\n❌ Schema setup failed. Please check the errors above.')