-- Migration: Add study plan and goal tracking tables
-- Date: 2025-01-06

-- Create study_plans table for user study plan configurations
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL DEFAULT 'My Study Plan',
    weekly_study_hours INTEGER NOT NULL DEFAULT 12,
    preferred_session_length INTEGER NOT NULL DEFAULT 45, -- minutes
    break_length INTEGER NOT NULL DEFAULT 15, -- minutes
    peak_hours JSONB, -- Array of hour ranges when user is most productive
    learning_style VARCHAR(50), -- 'visual', 'auditory', 'kinesthetic', 'mixed'
    difficulty_preference VARCHAR(20) DEFAULT 'adaptive', -- 'easy', 'medium', 'hard', 'adaptive'
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_time TIME DEFAULT '09:00:00',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_study_plans_user_active UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create study_goals table for weekly/daily goals
CREATE TABLE IF NOT EXISTS study_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    study_plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'assignment', 'review', 'practice'
    priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    estimated_hours DECIMAL(4,2), -- time estimate in hours
    target_date DATE,
    course_id UUID REFERENCES "Course"(id) ON DELETE SET NULL,
    module_id UUID REFERENCES "Module"(id) ON DELETE SET NULL,
    file_id UUID REFERENCES "File"(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    xp_reward INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create study_sessions table for tracking actual study time
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES study_goals(id) ON DELETE SET NULL,
    course_id UUID REFERENCES "Course"(id) ON DELETE SET NULL,
    session_type VARCHAR(30) DEFAULT 'study', -- 'study', 'review', 'practice', 'break', 'focus'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    planned_duration INTEGER, -- minutes
    actual_duration INTEGER, -- minutes (calculated)
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    focus_score DECIMAL(3,1), -- 0.0 to 10.0
    notes TEXT,
    metadata JSONB, -- Store additional session data like distractions, mood, etc.
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create study_recommendations table for AI-generated suggestions
CREATE TABLE IF NOT EXISTS study_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL, -- 'schedule', 'technique', 'content', 'break', 'review'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_text VARCHAR(100),
    priority_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
    confidence_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
    reasoning TEXT,
    suggested_time TIMESTAMP WITH TIME ZONE,
    estimated_impact VARCHAR(20), -- 'low', 'medium', 'high'
    xp_reward INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'applied', 'dismissed', 'expired'
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB, -- Additional context for the recommendation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create goal_progress table for detailed progress tracking
CREATE TABLE IF NOT EXISTS goal_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES study_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    progress_date DATE NOT NULL,
    time_spent_minutes INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    notes TEXT,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_goal_progress_date UNIQUE(goal_id, progress_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_plans_user_active ON study_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_status ON study_goals(status);
CREATE INDEX IF NOT EXISTS idx_study_goals_target_date ON study_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_study_goals_priority ON study_goals(priority);
CREATE INDEX IF NOT EXISTS idx_study_goals_course ON study_goals(course_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_goal_id ON study_sessions(goal_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_course_id ON study_sessions(course_id);

CREATE INDEX IF NOT EXISTS idx_study_recommendations_user_id ON study_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_study_recommendations_status ON study_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_study_recommendations_priority ON study_recommendations(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_study_recommendations_expires ON study_recommendations(expires_at);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(progress_date DESC);

-- Create function to calculate goal completion percentage
CREATE OR REPLACE FUNCTION calculate_goal_completion(p_goal_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_time_estimate DECIMAL;
    time_spent DECIMAL;
    completion_percentage INTEGER;
BEGIN
    -- Get goal's estimated time
    SELECT estimated_hours INTO total_time_estimate
    FROM study_goals WHERE id = p_goal_id;
    
    IF total_time_estimate IS NULL OR total_time_estimate <= 0 THEN
        -- If no time estimate, base on manual completion status
        SELECT COALESCE(completion_percentage, 0) INTO completion_percentage
        FROM study_goals WHERE id = p_goal_id;
        RETURN completion_percentage;
    END IF;
    
    -- Calculate time spent on this goal
    SELECT COALESCE(SUM(time_spent_minutes), 0) / 60.0 INTO time_spent
    FROM goal_progress WHERE goal_id = p_goal_id;
    
    -- Calculate percentage
    completion_percentage := LEAST(100, ROUND((time_spent / total_time_estimate) * 100));
    
    -- Update the goal
    UPDATE study_goals 
    SET completion_percentage = completion_percentage,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_goal_id;
    
    RETURN completion_percentage;
END;
$$ LANGUAGE plpgsql;

-- Create function to update goal status based on completion
CREATE OR REPLACE FUNCTION update_goal_status(p_goal_id UUID)
RETURNS void AS $$
DECLARE
    current_completion INTEGER;
    current_status VARCHAR(20);
    target_date DATE;
BEGIN
    -- Get current goal info
    SELECT completion_percentage, status, target_date 
    INTO current_completion, current_status, target_date
    FROM study_goals WHERE id = p_goal_id;
    
    -- Update status based on completion and dates
    IF current_completion >= 100 THEN
        UPDATE study_goals 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = p_goal_id AND status != 'completed';
        
        -- Award XP for completion
        INSERT INTO user_activities (user_id, activity_type, xp_earned, description, metadata)
        SELECT user_id, 'goal_complete', COALESCE(xp_reward, 20), 
               'Completed goal: ' || title,
               jsonb_build_object('goal_id', p_goal_id, 'completion_percentage', current_completion)
        FROM study_goals WHERE id = p_goal_id;
        
    ELSIF current_completion > 0 AND current_status = 'pending' THEN
        UPDATE study_goals 
        SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
        WHERE id = p_goal_id;
        
    ELSIF target_date < CURRENT_DATE AND current_status NOT IN ('completed', 'cancelled') THEN
        -- Mark as overdue (could add 'overdue' status)
        UPDATE study_goals 
        SET priority = 'urgent', updated_at = CURRENT_TIMESTAMP
        WHERE id = p_goal_id;
    END IF;
    
    -- Recalculate completion percentage
    PERFORM calculate_goal_completion(p_goal_id);
END;
$$ LANGUAGE plpgsql;

-- Create function to log study session and update progress
CREATE OR REPLACE FUNCTION complete_study_session(
    p_user_id UUID,
    p_goal_id UUID,
    p_session_id UUID,
    p_actual_duration INTEGER,
    p_effectiveness_rating INTEGER DEFAULT NULL,
    p_focus_score DECIMAL DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    session_date DATE := CURRENT_DATE;
    xp_to_award INTEGER;
BEGIN
    -- Update session with completion data
    UPDATE study_sessions 
    SET end_time = CURRENT_TIMESTAMP,
        actual_duration = p_actual_duration,
        effectiveness_rating = p_effectiveness_rating,
        focus_score = p_focus_score,
        notes = p_notes
    WHERE id = p_session_id AND user_id = p_user_id;
    
    -- Calculate XP based on session length and effectiveness
    xp_to_award := GREATEST(1, p_actual_duration / 10); -- 1 XP per 10 minutes
    IF p_effectiveness_rating >= 4 THEN
        xp_to_award := xp_to_award * 2; -- Bonus for high effectiveness
    END IF;
    
    -- Update session XP
    UPDATE study_sessions 
    SET xp_earned = xp_to_award
    WHERE id = p_session_id;
    
    -- Award XP to user
    INSERT INTO user_activities (user_id, activity_type, xp_earned, description, metadata)
    VALUES (p_user_id, 'study_session', xp_to_award, 
            'Completed ' || p_actual_duration || ' minute study session',
            jsonb_build_object('session_id', p_session_id, 'duration', p_actual_duration, 'effectiveness', p_effectiveness_rating));
    
    -- Update goal progress if goal is specified
    IF p_goal_id IS NOT NULL THEN
        INSERT INTO goal_progress (goal_id, user_id, progress_date, time_spent_minutes)
        VALUES (p_goal_id, p_user_id, session_date, p_actual_duration)
        ON CONFLICT (goal_id, progress_date) 
        DO UPDATE SET 
            time_spent_minutes = goal_progress.time_spent_minutes + EXCLUDED.time_spent_minutes;
        
        -- Update goal status
        PERFORM update_goal_status(p_goal_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for study plan analytics
CREATE OR REPLACE VIEW study_plan_analytics AS
SELECT 
    sp.user_id,
    sp.id as plan_id,
    sp.plan_name,
    COUNT(sg.id) as total_goals,
    COUNT(CASE WHEN sg.status = 'completed' THEN 1 END) as completed_goals,
    COUNT(CASE WHEN sg.status = 'in_progress' THEN 1 END) as active_goals,
    COUNT(CASE WHEN sg.status = 'pending' THEN 1 END) as pending_goals,
    COALESCE(AVG(sg.completion_percentage), 0) as avg_completion,
    COALESCE(SUM(ss.actual_duration), 0) as total_study_minutes,
    COUNT(DISTINCT DATE(ss.start_time)) as study_days,
    COALESCE(AVG(ss.effectiveness_rating), 0) as avg_effectiveness,
    COALESCE(AVG(ss.focus_score), 0) as avg_focus_score
FROM study_plans sp
LEFT JOIN study_goals sg ON sp.id = sg.study_plan_id
LEFT JOIN study_sessions ss ON sp.user_id = ss.user_id
WHERE sp.is_active = true
GROUP BY sp.user_id, sp.id, sp.plan_name;

-- Add comments
COMMENT ON TABLE study_plans IS 'User study plan configurations and preferences';
COMMENT ON TABLE study_goals IS 'Individual study goals with progress tracking';
COMMENT ON TABLE study_sessions IS 'Actual study session records with effectiveness metrics';
COMMENT ON TABLE study_recommendations IS 'AI-generated study recommendations';
COMMENT ON TABLE goal_progress IS 'Daily progress tracking for study goals';

COMMENT ON FUNCTION calculate_goal_completion IS 'Calculates and updates goal completion percentage';
COMMENT ON FUNCTION update_goal_status IS 'Updates goal status based on completion and dates';
COMMENT ON FUNCTION complete_study_session IS 'Completes study session and awards XP';

-- Initialize existing users with default study plans
INSERT INTO study_plans (user_id, plan_name)
SELECT id, 'My Study Plan'
FROM "User" 
WHERE id NOT IN (SELECT user_id FROM study_plans WHERE is_active = true);