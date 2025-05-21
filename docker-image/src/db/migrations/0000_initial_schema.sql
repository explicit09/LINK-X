-- Create User table first
CREATE TABLE IF NOT EXISTS "User" (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create InstructorProfile table
CREATE TABLE IF NOT EXISTS "InstructorProfile" (
    user_id UUID PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Course table
CREATE TABLE IF NOT EXISTS "Course" (
    id UUID PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    code VARCHAR(32),
    term VARCHAR(32),
    published BOOLEAN DEFAULT FALSE,
    instructor_id UUID REFERENCES "InstructorProfile"(user_id) ON DELETE CASCADE,
    creator_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    index_pkl BYTEA,
    index_faiss BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Module table
CREATE TABLE IF NOT EXISTS "Module" (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    course_id UUID REFERENCES "Course"(id) ON DELETE CASCADE,
    ordering INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create File table
CREATE TABLE IF NOT EXISTS "File" (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(255),
    file_size BIGINT,
    file_data BYTEA NOT NULL,
    module_id UUID REFERENCES "Module"(id) ON DELETE CASCADE,
    transcription TEXT,
    index_pkl BYTEA,
    index_faiss BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Suggestion table
CREATE TABLE IF NOT EXISTS "Suggestion" (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES "User"(id),
    course_id UUID REFERENCES "Course"(id),
    module_id UUID REFERENCES "Module"(id),
    file_id UUID REFERENCES "File"(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
