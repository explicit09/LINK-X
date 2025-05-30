-- Performance indexes for LEARN-X
-- Following PostgreSQL best practices for high-performance applications

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended) WHERE is_suspended = true;

-- Course table indexes
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_access_code ON courses(access_code);

-- Enrollment table indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON enrollments(enrolled_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_student_course ON enrollments(student_id, course_id);

-- Module table indexes
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON modules(course_id, "order");

-- File table indexes
CREATE INDEX IF NOT EXISTS idx_files_module_id ON files(module_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(file_type);

-- File embeddings for vector search
CREATE INDEX IF NOT EXISTS idx_file_embeddings_file_id ON file_embeddings(file_id);
-- pgvector index for similarity search
CREATE INDEX IF NOT EXISTS idx_file_embeddings_vector ON file_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Todo table indexes
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_course_id ON todos(course_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date) WHERE due_date IS NOT NULL;

-- Activity tracking indexes (for future use)
-- CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
-- CREATE INDEX IF NOT EXISTS idx_activities_file_id ON activities(file_id);
-- CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_role_lookup ON users(id, role_id);
CREATE INDEX IF NOT EXISTS idx_course_modules ON modules(course_id, id);
CREATE INDEX IF NOT EXISTS idx_module_files ON files(module_id, id);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_courses_title_search ON courses USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_files_name_search ON files USING gin(to_tsvector('english', name));

-- Analyze tables after creating indexes
ANALYZE users;
ANALYZE courses;
ANALYZE enrollments;
ANALYZE modules;
ANALYZE files;
ANALYZE file_embeddings;
ANALYZE todos;