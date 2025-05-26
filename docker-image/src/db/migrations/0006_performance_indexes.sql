-- Performance optimization indexes for LINK-X
-- These indexes target the most common query patterns

-- User authentication lookups
CREATE INDEX IF NOT EXISTS idx_user_firebase_uid ON "User"(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);

-- Role lookups (very frequent)
CREATE INDEX IF NOT EXISTS idx_role_user_id ON "Role"(user_id);

-- Course queries
CREATE INDEX IF NOT EXISTS idx_course_instructor_id ON "Course"(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_creator_id ON "Course"(creator_id);
CREATE INDEX IF NOT EXISTS idx_course_published ON "Course"(published);

-- Enrollment queries (student dashboard loads)
CREATE INDEX IF NOT EXISTS idx_enrollment_user_course ON "Enrollment"(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_course_id ON "Enrollment"(course_id);

-- Module ordering
CREATE INDEX IF NOT EXISTS idx_module_course_ordering ON "Module"(course_id, ordering);

-- File lookups
CREATE INDEX IF NOT EXISTS idx_file_module_ordering ON "File"(module_id, ordering);
CREATE INDEX IF NOT EXISTS idx_file_storage_type ON "File"(storage_type) WHERE storage_type = 's3';

-- Access code lookups
CREATE INDEX IF NOT EXISTS idx_access_code_code ON "AccessCode"(code);
CREATE INDEX IF NOT EXISTS idx_access_code_course_id ON "AccessCode"(course_id);

-- Chat and message queries
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON "Chat"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_chat_created ON "Message"(chat_id, created_at);

-- Todo queries
CREATE INDEX IF NOT EXISTS idx_todo_user_created ON "Todo"(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_todo_user_course ON "Todo"(user_id, course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todo_completed ON "Todo"(completed) WHERE completed = false;

-- Personalized file queries
CREATE INDEX IF NOT EXISTS idx_personalized_file_user ON "PersonalizedFile"(user_id, created_at DESC);

-- FileChunk vector search optimization
CREATE INDEX IF NOT EXISTS idx_filechunk_course_id ON "FileChunk"(course_id);
CREATE INDEX IF NOT EXISTS idx_filechunk_file_id ON "FileChunk"(file_id);