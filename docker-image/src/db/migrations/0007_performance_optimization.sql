-- Performance optimization indexes
-- This migration adds indexes to improve query performance

-- User queries
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_user_firebase_uid ON "User"(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);
CREATE INDEX IF NOT EXISTS idx_user_suspended ON "User"(suspended) WHERE suspended = true;
CREATE INDEX IF NOT EXISTS idx_user_last_login ON "User"(last_login DESC);

-- Course queries
CREATE INDEX IF NOT EXISTS idx_course_instructor ON "Course"(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_published ON "Course"(published);
CREATE INDEX IF NOT EXISTS idx_course_created ON "Course"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_published_at ON "Course"(published_at DESC) WHERE published = true;

-- Module queries
CREATE INDEX IF NOT EXISTS idx_module_course ON "Module"(course_id);
CREATE INDEX IF NOT EXISTS idx_module_ordering ON "Module"(course_id, ordering);

-- File queries
CREATE INDEX IF NOT EXISTS idx_file_module ON "File"(module_id);
CREATE INDEX IF NOT EXISTS idx_file_type ON "File"(file_type);
CREATE INDEX IF NOT EXISTS idx_file_processed ON "File"(processed);
CREATE INDEX IF NOT EXISTS idx_file_created ON "File"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_s3_key ON "File"(s3_key) WHERE s3_key IS NOT NULL;

-- Enrollment queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_unique ON "Enrollment"(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_user ON "Enrollment"(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_course ON "Enrollment"(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_date ON "Enrollment"(enrolled_at DESC);

-- Personalized file queries
CREATE INDEX IF NOT EXISTS idx_personalized_file_user ON "PersonalizedFile"(user_id);
CREATE INDEX IF NOT EXISTS idx_personalized_file_original ON "PersonalizedFile"(original_file_id);
CREATE INDEX IF NOT EXISTS idx_personalized_file_processed ON "PersonalizedFile"(processed);

-- Access code queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_code_unique ON "AccessCode"(course_id, code);
CREATE INDEX IF NOT EXISTS idx_access_code_course ON "AccessCode"(course_id);

-- Chat and activity queries
CREATE INDEX IF NOT EXISTS idx_chat_user ON "Chat"(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON "Chat"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON "Activity"(user_id) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Activity');

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_course_search ON "Course" 
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_module_search ON "Module" 
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_file_search ON "File" 
    USING gin(to_tsvector('english', title || ' ' || COALESCE(extracted_text, '')))
    WHERE processed = true;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_course_instructor_published ON "Course"(instructor_id, published);
CREATE INDEX IF NOT EXISTS idx_file_module_processed ON "File"(module_id, processed);
CREATE INDEX IF NOT EXISTS idx_enrollment_user_course_date ON "Enrollment"(user_id, course_id, enrolled_at DESC);

-- Partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_published_recent ON "Course"(created_at DESC) 
    WHERE published = true AND created_at > (CURRENT_DATE - INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_file_unprocessed ON "File"(created_at) 
    WHERE processed = false;

-- Update table statistics for query planner
ANALYZE "User";
ANALYZE "Course";
ANALYZE "Module";
ANALYZE "File";
ANALYZE "Enrollment";
ANALYZE "PersonalizedFile";