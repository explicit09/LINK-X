-- Migration: Add Row Level Security for multi-tenancy
-- Ensures proper data isolation between users and courses

-- Enable RLS on all relevant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Courses table policies
-- Anyone can view published courses
CREATE POLICY "View published courses" ON courses
    FOR SELECT USING (published = true);

-- Course creators can view/edit their own courses
CREATE POLICY "Creators manage own courses" ON courses
    FOR ALL USING (auth.uid() = creator_id);

-- Enrolled students can view courses
CREATE POLICY "Enrolled students view courses" ON courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.course_id = courses.id 
            AND enrollments.user_id = auth.uid()
        )
    );

-- Modules table policies
-- View modules in accessible courses
CREATE POLICY "View modules in accessible courses" ON modules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = modules.course_id
            AND (
                courses.published = true
                OR courses.creator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM enrollments 
                    WHERE enrollments.course_id = courses.id 
                    AND enrollments.user_id = auth.uid()
                )
            )
        )
    );

-- Course creators can manage modules
CREATE POLICY "Creators manage course modules" ON modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = modules.course_id 
            AND courses.creator_id = auth.uid()
        )
    );

-- Files table policies
-- View files in accessible modules
CREATE POLICY "View files in accessible modules" ON files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM modules 
            JOIN courses ON courses.id = modules.course_id
            WHERE modules.id = files.module_id
            AND (
                courses.published = true
                OR courses.creator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM enrollments 
                    WHERE enrollments.course_id = courses.id 
                    AND enrollments.user_id = auth.uid()
                )
            )
        )
    );

-- Course creators can manage files
CREATE POLICY "Creators manage course files" ON files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM modules 
            JOIN courses ON courses.id = modules.course_id
            WHERE modules.id = files.module_id 
            AND courses.creator_id = auth.uid()
        )
    );

-- Students can upload files to courses they're enrolled in (if allowed)
CREATE POLICY "Students upload to enrolled courses" ON files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM modules 
            JOIN courses ON courses.id = modules.course_id
            JOIN enrollments ON enrollments.course_id = courses.id
            WHERE modules.id = files.module_id 
            AND enrollments.user_id = auth.uid()
            AND courses.allow_student_uploads = true
        )
    );

-- File chunks table policies
-- View chunks for accessible files
CREATE POLICY "View chunks for accessible files" ON file_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM files 
            JOIN modules ON modules.id = files.module_id
            JOIN courses ON courses.id = modules.course_id
            WHERE files.id = file_chunks.file_id
            AND (
                courses.published = true
                OR courses.creator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM enrollments 
                    WHERE enrollments.course_id = courses.id 
                    AND enrollments.user_id = auth.uid()
                )
            )
        )
    );

-- Enrollments table policies
-- Users can view their own enrollments
CREATE POLICY "Users view own enrollments" ON enrollments
    FOR SELECT USING (user_id = auth.uid());

-- Course creators can view enrollments in their courses
CREATE POLICY "Creators view course enrollments" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = enrollments.course_id 
            AND courses.creator_id = auth.uid()
        )
    );

-- Course creators can manage enrollments
CREATE POLICY "Creators manage enrollments" ON enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = enrollments.course_id 
            AND courses.creator_id = auth.uid()
        )
    );

-- Todos table policies
-- Users can only access their own todos
CREATE POLICY "Users manage own todos" ON todos
    FOR ALL USING (user_id = auth.uid());

-- Activities table policies
-- Users can only access their own activities
CREATE POLICY "Users view own activities" ON activities
    FOR SELECT USING (user_id = auth.uid());

-- Course creators can view activities in their courses
CREATE POLICY "Creators view course activities" ON activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = activities.course_id 
            AND courses.creator_id = auth.uid()
        )
    );

-- Create indexes to support RLS performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_courses_creator ON courses(creator_id);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_files_module ON files(module_id);
CREATE INDEX IF NOT EXISTS idx_file_chunks_file ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_course ON activities(course_id);

-- Add helper function for checking course access
CREATE OR REPLACE FUNCTION user_has_course_access(course_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = course_id_param
        AND (
            courses.published = true
            OR courses.creator_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM enrollments 
                WHERE enrollments.course_id = course_id_param 
                AND enrollments.user_id = auth.uid()
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment about RLS
COMMENT ON SCHEMA public IS 'Row Level Security enabled for multi-tenant data isolation';