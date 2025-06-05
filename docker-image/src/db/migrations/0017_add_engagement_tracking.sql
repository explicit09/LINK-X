-- Migration: Add engagement tracking fields to existing tables
-- Date: 2025-01-06
-- Purpose: Enhance existing analytics with engagement metrics

-- Add engagement fields to existing session_analytics table
ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS 
    engagement_score DECIMAL(3,2) CHECK (engagement_score >= 0.0 AND engagement_score <= 1.0);

ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS 
    interaction_count INTEGER DEFAULT 0;

ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS 
    scroll_depth_percentage INTEGER DEFAULT 0 CHECK (scroll_depth_percentage >= 0 AND scroll_depth_percentage <= 100);

ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS 
    time_on_content INTEGER DEFAULT 0; -- seconds spent on content

ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS 
    pause_count INTEGER DEFAULT 0; -- number of times user paused/resumed

-- Add learning analytics fields to user_activities table
ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS 
    session_duration INTEGER; -- duration in seconds

ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS 
    content_completion_percentage INTEGER DEFAULT 0 CHECK (content_completion_percentage >= 0 AND content_completion_percentage <= 100);

-- Add engagement tracking to File table for content analytics
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS 
    avg_engagement_score DECIMAL(3,2) DEFAULT 0.0;

ALTER TABLE "File" ADD COLUMN IF NOT EXISTS 
    completion_rate DECIMAL(3,2) DEFAULT 0.0; -- percentage of users who complete this content

ALTER TABLE "File" ADD COLUMN IF NOT EXISTS 
    avg_session_duration INTEGER DEFAULT 0; -- average time spent on this file

-- Add learning insights to Course table
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS 
    course_engagement_score DECIMAL(3,2) DEFAULT 0.0;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS 
    avg_student_progress DECIMAL(3,2) DEFAULT 0.0;

-- Create learning_patterns table for AI insights (lightweight addition)
CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL, -- 'peak_hours', 'learning_style', 'difficulty_preference', 'content_preference'
    pattern_data JSONB NOT NULL, -- flexible storage for different pattern types
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one pattern per type per user
    CONSTRAINT uq_user_pattern_type UNIQUE (user_id, pattern_type)
);

-- Create engagement_insights table for professor analytics  
CREATE TABLE IF NOT EXISTS engagement_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- 'struggling_students', 'popular_content', 'completion_rates', 'engagement_trends'
    insight_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Prevent duplicate insights
    CONSTRAINT uq_course_insight_type_date UNIQUE (course_id, insight_type, DATE(generated_at))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_analytics_engagement ON session_analytics(user_id, engagement_score DESC, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_duration ON user_activities(user_id, session_duration DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_user_type ON learning_patterns(user_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_engagement_insights_course_type ON engagement_insights(course_id, insight_type, generated_at DESC);

-- Function to calculate real-time engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    p_interaction_count INTEGER,
    p_scroll_depth INTEGER,
    p_time_on_content INTEGER,
    p_pause_count INTEGER,
    p_session_duration INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
    base_score DECIMAL := 0.0;
    interaction_score DECIMAL := 0.0;
    depth_score DECIMAL := 0.0;
    time_score DECIMAL := 0.0;
    consistency_score DECIMAL := 0.0;
BEGIN
    -- Interaction score (0-0.3): reward active engagement
    interaction_score := LEAST(0.3, (p_interaction_count::DECIMAL / 10.0) * 0.3);
    
    -- Scroll depth score (0-0.25): reward content exploration
    depth_score := (p_scroll_depth::DECIMAL / 100.0) * 0.25;
    
    -- Time score (0-0.3): optimal time on content (not too fast, not too slow)
    IF p_session_duration > 0 THEN
        -- Calculate time ratio (time_on_content / session_duration)
        -- Optimal ratio is around 0.7 (70% focused time)
        time_ratio := p_time_on_content::DECIMAL / p_session_duration::DECIMAL;
        time_score := CASE 
            WHEN time_ratio >= 0.6 AND time_ratio <= 0.9 THEN 0.3
            WHEN time_ratio >= 0.4 AND time_ratio < 0.6 THEN 0.2
            WHEN time_ratio >= 0.2 AND time_ratio < 0.4 THEN 0.1
            ELSE 0.0
        END;
    END IF;
    
    -- Consistency score (0-0.15): penalize excessive pausing
    consistency_score := CASE 
        WHEN p_pause_count <= 2 THEN 0.15
        WHEN p_pause_count <= 5 THEN 0.10
        WHEN p_pause_count <= 10 THEN 0.05
        ELSE 0.0
    END;
    
    base_score := interaction_score + depth_score + time_score + consistency_score;
    
    RETURN ROUND(LEAST(1.0, base_score), 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update file engagement metrics
CREATE OR REPLACE FUNCTION update_file_engagement_metrics(p_file_id UUID)
RETURNS void AS $$
DECLARE
    avg_engagement DECIMAL;
    completion_rate DECIMAL;
    avg_duration INTEGER;
    total_views INTEGER;
    completed_views INTEGER;
BEGIN
    -- Calculate average engagement score for this file
    SELECT 
        COALESCE(AVG(sa.engagement_score), 0.0),
        COALESCE(AVG(sa.time_on_content), 0),
        COUNT(*)
    INTO avg_engagement, avg_duration, total_views
    FROM session_analytics sa
    JOIN user_activities ua ON sa.user_id = ua.user_id
    WHERE ua.activity_metadata->>'file_id' = p_file_id::text
    AND sa.engagement_score IS NOT NULL;
    
    -- Calculate completion rate
    SELECT COUNT(*)
    INTO completed_views
    FROM user_activities ua
    WHERE ua.activity_metadata->>'file_id' = p_file_id::text
    AND ua.content_completion_percentage >= 80;
    
    completion_rate := CASE 
        WHEN total_views > 0 THEN completed_views::DECIMAL / total_views::DECIMAL
        ELSE 0.0
    END;
    
    -- Update file metrics
    UPDATE "File"
    SET 
        avg_engagement_score = avg_engagement,
        completion_rate = completion_rate,
        avg_session_duration = avg_duration
    WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql;

-- Function to detect learning patterns
CREATE OR REPLACE FUNCTION detect_learning_patterns(p_user_id UUID)
RETURNS void AS $$
DECLARE
    peak_hours JSONB;
    learning_style JSONB;
    activity_record RECORD;
    hour_counts JSONB := '{}';
    style_indicators JSONB := '{}';
BEGIN
    -- Detect peak learning hours
    FOR activity_record IN
        SELECT 
            EXTRACT(HOUR FROM created_at) as hour,
            COUNT(*) as activity_count,
            AVG(session_duration) as avg_duration
        FROM user_activities 
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND session_duration IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY activity_count DESC
    LOOP
        hour_counts := hour_counts || jsonb_build_object(
            activity_record.hour::text, 
            jsonb_build_object(
                'count', activity_record.activity_count,
                'avg_duration', activity_record.avg_duration
            )
        );
    END LOOP;
    
    -- Detect learning style preferences
    SELECT jsonb_build_object(
        'visual_preference', COUNT(CASE WHEN activity_metadata->>'content_type' = 'visual' THEN 1 END),
        'text_preference', COUNT(CASE WHEN activity_metadata->>'content_type' = 'text' THEN 1 END),
        'audio_preference', COUNT(CASE WHEN activity_metadata->>'content_type' = 'audio' THEN 1 END),
        'interactive_preference', COUNT(CASE WHEN activity_type = 'chat_message' THEN 1 END),
        'avg_session_length', AVG(session_duration)
    )
    INTO style_indicators
    FROM user_activities
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Upsert peak hours pattern
    INSERT INTO learning_patterns (user_id, pattern_type, pattern_data, confidence_score)
    VALUES (p_user_id, 'peak_hours', hour_counts, 0.8)
    ON CONFLICT (user_id, pattern_type)
    DO UPDATE SET 
        pattern_data = hour_counts,
        confidence_score = 0.8,
        last_updated = CURRENT_TIMESTAMP;
    
    -- Upsert learning style pattern
    INSERT INTO learning_patterns (user_id, pattern_type, pattern_data, confidence_score)
    VALUES (p_user_id, 'learning_style', style_indicators, 0.7)
    ON CONFLICT (user_id, pattern_type)
    DO UPDATE SET 
        pattern_data = style_indicators,
        confidence_score = 0.7,
        last_updated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate engagement insights for professors
CREATE OR REPLACE FUNCTION generate_engagement_insights(p_course_id UUID)
RETURNS void AS $$
DECLARE
    struggling_students JSONB;
    popular_content JSONB;
    completion_rates JSONB;
    engagement_trends JSONB;
BEGIN
    -- Identify struggling students (low engagement, incomplete content)
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', sp.user_id,
            'name', sp.name,
            'avg_engagement', COALESCE(AVG(sa.engagement_score), 0),
            'completion_rate', COALESCE(AVG(ua.content_completion_percentage), 0),
            'last_activity', MAX(ua.created_at)
        )
    )
    INTO struggling_students
    FROM "StudentProfile" sp
    JOIN "Enrollment" e ON e.user_id = sp.user_id
    LEFT JOIN user_activities ua ON ua.user_id = sp.user_id
    LEFT JOIN session_analytics sa ON sa.user_id = sp.user_id
    WHERE e.course_id = p_course_id
    AND (
        COALESCE(AVG(sa.engagement_score), 0) < 0.5 OR
        COALESCE(AVG(ua.content_completion_percentage), 0) < 60
    )
    GROUP BY sp.user_id, sp.name
    LIMIT 10;
    
    -- Identify popular content
    SELECT jsonb_agg(
        jsonb_build_object(
            'file_id', f.id,
            'title', f.title,
            'avg_engagement', f.avg_engagement_score,
            'completion_rate', f.completion_rate,
            'view_count', f.view_count_personalized + f.view_count_raw
        )
    )
    INTO popular_content
    FROM "File" f
    JOIN "Module" m ON m.id = f.module_id
    WHERE m.course_id = p_course_id
    ORDER BY f.avg_engagement_score DESC, f.completion_rate DESC
    LIMIT 5;
    
    -- Calculate overall completion rates by module
    SELECT jsonb_agg(
        jsonb_build_object(
            'module_id', m.id,
            'title', m.title,
            'avg_completion', COALESCE(AVG(f.completion_rate), 0),
            'student_count', COUNT(DISTINCT e.user_id)
        )
    )
    INTO completion_rates
    FROM "Module" m
    LEFT JOIN "File" f ON f.module_id = m.id
    LEFT JOIN "Enrollment" e ON e.course_id = m.course_id
    WHERE m.course_id = p_course_id
    GROUP BY m.id, m.title;
    
    -- Generate engagement trends (last 7 days)
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', date_bucket,
            'avg_engagement', COALESCE(AVG(sa.engagement_score), 0),
            'active_students', COUNT(DISTINCT sa.user_id),
            'total_sessions', COUNT(*)
        )
    )
    INTO engagement_trends
    FROM (
        SELECT DATE(sa.event_timestamp) as date_bucket, sa.*
        FROM session_analytics sa
        JOIN "Enrollment" e ON e.user_id = sa.user_id
        WHERE e.course_id = p_course_id
        AND sa.event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
    ) sa
    GROUP BY date_bucket
    ORDER BY date_bucket;
    
    -- Insert insights
    INSERT INTO engagement_insights (course_id, insight_type, insight_data, expires_at)
    VALUES 
        (p_course_id, 'struggling_students', struggling_students, CURRENT_TIMESTAMP + INTERVAL '24 hours'),
        (p_course_id, 'popular_content', popular_content, CURRENT_TIMESTAMP + INTERVAL '24 hours'),
        (p_course_id, 'completion_rates', completion_rates, CURRENT_TIMESTAMP + INTERVAL '24 hours'),
        (p_course_id, 'engagement_trends', engagement_trends, CURRENT_TIMESTAMP + INTERVAL '6 hours')
    ON CONFLICT (course_id, insight_type, DATE(generated_at))
    DO UPDATE SET 
        insight_data = EXCLUDED.insight_data,
        generated_at = CURRENT_TIMESTAMP,
        expires_at = EXCLUDED.expires_at;
END;
$$ LANGUAGE plpgsql;

-- Create view for student analytics dashboard
CREATE OR REPLACE VIEW student_learning_analytics AS
SELECT 
    u.id as user_id,
    sp.name,
    -- Weekly metrics
    COUNT(CASE WHEN ua.created_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP) THEN 1 END) as this_week_activities,
    AVG(CASE WHEN ua.created_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP) THEN ua.session_duration END) as this_week_avg_duration,
    AVG(CASE WHEN sa.event_timestamp >= DATE_TRUNC('week', CURRENT_TIMESTAMP) THEN sa.engagement_score END) as this_week_engagement,
    
    -- Overall metrics (last 30 days)
    COUNT(CASE WHEN ua.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_activities,
    AVG(CASE WHEN ua.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN ua.content_completion_percentage END) as avg_completion_rate,
    AVG(CASE WHEN sa.event_timestamp >= CURRENT_DATE - INTERVAL '30 days' THEN sa.engagement_score END) as avg_engagement_score,
    
    -- Learning patterns
    lp_hours.pattern_data as peak_hours,
    lp_style.pattern_data as learning_style,
    
    -- Current stats
    us.current_xp,
    us.current_level,
    us.daily_streak,
    us.weekly_progress

FROM "User" u
JOIN "StudentProfile" sp ON sp.user_id = u.id
LEFT JOIN user_activities ua ON ua.user_id = u.id
LEFT JOIN session_analytics sa ON sa.user_id = u.id
LEFT JOIN user_stats us ON us.user_id = u.id
LEFT JOIN learning_patterns lp_hours ON lp_hours.user_id = u.id AND lp_hours.pattern_type = 'peak_hours'
LEFT JOIN learning_patterns lp_style ON lp_style.user_id = u.id AND lp_style.pattern_type = 'learning_style'
GROUP BY u.id, sp.name, lp_hours.pattern_data, lp_style.pattern_data, us.current_xp, us.current_level, us.daily_streak, us.weekly_progress;

-- Add comments
COMMENT ON TABLE learning_patterns IS 'AI-detected learning patterns and preferences for personalization';
COMMENT ON TABLE engagement_insights IS 'Generated insights for professors about course engagement';
COMMENT ON FUNCTION calculate_engagement_score IS 'Calculate real-time engagement score based on user interactions';
COMMENT ON FUNCTION update_file_engagement_metrics IS 'Update file-level engagement metrics';
COMMENT ON FUNCTION detect_learning_patterns IS 'Detect and store user learning patterns';
COMMENT ON FUNCTION generate_engagement_insights IS 'Generate engagement insights for course instructors';