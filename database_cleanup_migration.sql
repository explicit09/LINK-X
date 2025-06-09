-- ========================================
-- DATABASE CLEANUP MIGRATION SCRIPT
-- Fixes duplicate tables and missing relationships
-- ========================================

-- PART 1: FIX MISSING FOREIGN KEY RELATIONSHIPS
-- ========================================

-- Add missing foreign key constraints to link user_id columns to profiles table
-- These were missing and causing data integrity issues

-- Files table user relationships (already added above, but including for completeness)
-- ALTER TABLE files ADD CONSTRAINT fk_files_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;
-- ALTER TABLE files ADD CONSTRAINT fk_files_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Study and learning tables
ALTER TABLE study_plans 
ADD CONSTRAINT fk_study_plans_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE study_goals 
ADD CONSTRAINT fk_study_goals_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE study_sessions 
ADD CONSTRAINT fk_study_sessions_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE study_recommendations 
ADD CONSTRAINT fk_study_recommendations_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE goal_progress 
ADD CONSTRAINT fk_goal_progress_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- User data tables
ALTER TABLE user_achievements 
ADD CONSTRAINT fk_user_achievements_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE todos 
ADD CONSTRAINT fk_todos_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Session and analytics tables
ALTER TABLE session_analytics 
ADD CONSTRAINT fk_session_analytics_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE session_notes 
ADD CONSTRAINT fk_session_notes_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Learning analytics
ALTER TABLE module_progress 
ADD CONSTRAINT fk_module_progress_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- PART 2: CONSOLIDATE DUPLICATE API LOGGING TABLES
-- ========================================

-- Since ai_api_logs and request_logs are empty, we can repurpose them or drop them
-- Option 1: Drop empty duplicate tables (recommended)
DROP TABLE IF EXISTS ai_api_logs;
DROP TABLE IF EXISTS request_logs;

-- Option 2: If you want to keep ai_api_logs for future AI-specific logging, 
-- add a foreign key constraint:
-- CREATE TABLE ai_api_logs (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
--     endpoint TEXT NOT NULL,
--     model_used TEXT,
--     tokens_input INTEGER,
--     tokens_output INTEGER,
--     cost_usd DECIMAL(10,6),
--     response_time_ms INTEGER,
--     status_code INTEGER,
--     error_message TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- PART 3: RENAME CONFUSING SESSION TABLES
-- ========================================

-- Rename user_sessions to be more specific about its purpose
-- (assuming it's for authentication/activity tracking)
ALTER TABLE user_sessions RENAME TO auth_sessions;

-- Add a comment to clarify the purpose of each session table
COMMENT ON TABLE study_sessions IS 'Academic study sessions with scheduling and planning data';
COMMENT ON TABLE auth_sessions IS 'User authentication and activity sessions';
COMMENT ON TABLE session_analytics IS 'Analytics data for study sessions';

-- PART 4: ADD MISSING INDEXES FOR PERFORMANCE
-- ========================================

-- Add indexes on foreign key columns for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_created_by ON files(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_todos_user_id ON todos(user_id);

-- PART 5: DATA VALIDATION AND CLEANUP
-- ========================================

-- Check for orphaned user_id references (this will help identify data issues)
-- Run these queries to find orphaned data:

-- Uncomment and run these queries to check for orphaned data:
-- SELECT 'files' as table_name, COUNT(*) as orphaned_records 
-- FROM files 
-- WHERE uploaded_by IS NOT NULL 
--   AND uploaded_by NOT IN (SELECT id FROM profiles);

-- SELECT 'user_stats' as table_name, COUNT(*) as orphaned_records 
-- FROM user_stats 
-- WHERE user_id NOT IN (SELECT id FROM profiles);

-- PART 6: OPTIMIZE TABLE STRUCTURE
-- ========================================

-- Add helpful comments to clarify table purposes
COMMENT ON TABLE profiles IS 'Main user accounts and profiles (primary user table)';
COMMENT ON TABLE api_usage_logs IS 'General API usage tracking and analytics';
COMMENT ON TABLE user_stats IS 'User gamification stats (XP, levels, streaks)';
COMMENT ON TABLE user_activities IS 'User activity logging for XP calculation';
COMMENT ON TABLE user_achievements IS 'User achievement unlocks and badges';

-- PART 7: CREATE VIEW FOR COMMON USER DATA
-- ========================================

-- Create a view that joins common user data for easier queries
CREATE OR REPLACE VIEW user_overview AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at as account_created,
    us.current_xp,
    us.current_level,
    us.daily_streak,
    COUNT(e.id) as enrolled_courses,
    COUNT(ua.id) as total_activities
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
LEFT JOIN enrollments e ON p.id = e.user_id
LEFT JOIN user_activities ua ON p.id = ua.user_id
GROUP BY p.id, p.email, p.full_name, p.role, p.created_at, 
         us.current_xp, us.current_level, us.daily_streak;

COMMENT ON VIEW user_overview IS 'Consolidated view of user data across multiple tables';

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- Summary of changes:
-- 1. Added missing foreign key constraints linking user_id columns to profiles table
-- 2. Dropped duplicate/empty API logging tables (ai_api_logs, request_logs)  
-- 3. Renamed user_sessions to auth_sessions for clarity
-- 4. Added performance indexes on foreign key columns
-- 5. Added table comments for documentation
-- 6. Created user_overview view for easier querying
-- 7. Data integrity is now enforced through proper foreign key relationships 