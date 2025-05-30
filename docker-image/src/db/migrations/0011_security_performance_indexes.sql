-- Security and Performance Indexes for LEARN-X
-- Critical indexes for authentication, queries, and joins

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE deleted_at IS NULL;

-- Courses table indexes
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_access_code ON courses(access_code) WHERE access_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published) WHERE is_published = true;

-- Enrollments table indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON enrollments(enrolled_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_student_course ON enrollments(student_id, course_id) WHERE dropped_at IS NULL;

-- Modules table indexes
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order_index ON modules(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_modules_created_at ON modules(created_at);
CREATE INDEX IF NOT EXISTS idx_modules_is_published ON modules(is_published) WHERE is_published = true;

-- Files table indexes
CREATE INDEX IF NOT EXISTS idx_files_module_id ON files(module_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_s3_key ON files(s3_key) WHERE s3_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);

-- User sessions table indexes (for JWT blacklisting)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked) WHERE revoked = true;

-- Audit logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Todos table indexes
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);

-- Roles table indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_role_type ON roles(role_type);

-- User roles junction table
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);

-- Student profiles
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_university ON student_profiles(university) WHERE university IS NOT NULL;

-- Instructor profiles
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_user_id ON instructor_profiles(user_id);

-- Admin profiles
CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id ON admin_profiles(user_id);

-- Vector search optimization (if using pgvector)
-- Note: These require the pgvector extension
-- CREATE INDEX IF NOT EXISTS idx_files_embedding_vector ON files USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_files_title_fts ON files USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_files_description_fts ON files USING gin(to_tsvector('english', description)) WHERE description IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_title_fts ON courses USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_courses_description_fts ON courses USING gin(to_tsvector('english', description)) WHERE description IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_files_module_created ON files(module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_enrolled ON enrollments(student_id, enrolled_at DESC);
CREATE INDEX IF NOT EXISTS idx_modules_course_order ON modules(course_id, order_index ASC);

-- Partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_active ON files(module_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(instructor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_active ON enrollments(student_id, course_id) WHERE dropped_at IS NULL;

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE courses;
ANALYZE enrollments;
ANALYZE modules;
ANALYZE files;
ANALYZE todos;
ANALYZE user_sessions;
ANALYZE audit_logs;