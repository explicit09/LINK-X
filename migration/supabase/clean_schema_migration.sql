-- LEARN-X Database Schema for Supabase
-- Clean migration without data (no test data needed)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE file_storage_type AS ENUM ('database', 's3', 'supabase');

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'student',
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Settings and preferences
    preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    
    -- Onboarding and features
    onboarding_completed BOOLEAN DEFAULT FALSE,
    features_enabled JSONB DEFAULT '{"ai_assistance": true}'
);

-- Role-specific profiles
CREATE TABLE IF NOT EXISTS instructor_profiles (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    department TEXT,
    title TEXT,
    office_hours TEXT,
    expertise TEXT[],
    years_experience INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    student_id TEXT UNIQUE,
    major TEXT,
    year INTEGER,
    gpa DECIMAL(3,2),
    learning_style JSONB DEFAULT '{}',
    interests TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_profiles (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    department TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES user_profiles(id),
    
    -- Course details
    code TEXT,
    credits INTEGER,
    semester TEXT,
    year INTEGER,
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    max_students INTEGER,
    
    -- AI features
    ai_enabled BOOLEAN DEFAULT TRUE,
    embedding_model TEXT DEFAULT 'text-embedding-ada-002',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    start_date DATE,
    end_date DATE
);

-- Modules (course sections)
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    
    -- Content settings
    is_published BOOLEAN DEFAULT FALSE,
    required BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Files (course materials)
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
    
    -- File information
    filename TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    mime_type TEXT,
    
    -- Storage
    storage_type file_storage_type DEFAULT 'supabase',
    storage_path TEXT,
    storage_url TEXT,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File chunks for RAG (with pgvector)
CREATE TABLE IF NOT EXISTS file_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    
    -- Embeddings
    embedding vector(1536),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    token_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(file_id, chunk_index)
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Status
    status enrollment_status DEFAULT 'active',
    grade TEXT,
    
    -- Progress tracking
    progress DECIMAL(5,2) DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    
    -- Timestamps
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    UNIQUE(user_id, course_id)
);

-- Access codes for course enrollment
CREATE TABLE IF NOT EXISTS access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    
    -- Usage limits
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Todos (tasks)
CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Task details
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    
    -- Status
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    
    -- Priority
    priority INTEGER DEFAULT 0,
    tags TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions for AI
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Session info
    title TEXT,
    model TEXT DEFAULT 'gpt-4',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ
);

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    -- Metadata
    tokens_used INTEGER,
    model TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personalized content
CREATE TABLE IF NOT EXISTS personalized_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    
    -- Personalization details
    personalized_content TEXT,
    personalization_metadata JSONB DEFAULT '{}',
    
    -- Performance
    effectiveness_score DECIMAL(3,2),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accessed_at TIMESTAMPTZ,
    
    UNIQUE(user_id, file_id)
);

-- Analytics and tracking
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type TEXT NOT NULL,
    activity_data JSONB DEFAULT '{}',
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study groups (collaboration)
CREATE TABLE IF NOT EXISTS study_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    
    -- Group details
    name TEXT NOT NULL,
    description TEXT,
    max_members INTEGER DEFAULT 10,
    
    -- Settings
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study group members
CREATE TABLE IF NOT EXISTS study_group_members (
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    
    -- Member details
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (group_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_files_course ON files(course_id);
CREATE INDEX idx_files_module ON files(module_id);
CREATE INDEX idx_file_chunks_file ON file_chunks(file_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_todos_user ON todos(user_id);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_user_activity_user ON user_activity(user_id);
CREATE INDEX idx_user_activity_created ON user_activity(created_at);

-- Create vector similarity search index
CREATE INDEX idx_file_chunks_embedding ON file_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create full text search indexes
CREATE INDEX idx_files_search ON files USING gin(to_tsvector('english', filename || ' ' || COALESCE(metadata::text, '')));
CREATE INDEX idx_courses_search ON courses USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Supabase auth integration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, role, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Courses policies
CREATE POLICY "Anyone can view public courses" ON courses
    FOR SELECT USING (is_public = true);
CREATE POLICY "Enrolled users can view private courses" ON courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.course_id = courses.id 
            AND enrollments.user_id = auth.uid()
        )
    );
CREATE POLICY "Instructors can manage own courses" ON courses
    FOR ALL USING (instructor_id = auth.uid());

-- Files policies
CREATE POLICY "Course members can view files" ON files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.course_id = files.course_id 
            AND enrollments.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = files.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create initial admin user function (call after first user signs up)
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
    UPDATE user_profiles 
    SET role = 'admin' 
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;