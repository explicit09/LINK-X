-- Migration: Add schedule and session management tables
-- Date: 2025-01-06

-- Create study_sessions table for session scheduling and tracking
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    course_id UUID REFERENCES "Course"(id) ON DELETE SET NULL,
    study_plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,
    study_goal_id UUID REFERENCES study_goals(id) ON DELETE SET NULL,
    
    -- Session Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    session_type VARCHAR(30) DEFAULT 'study', -- 'study', 'assignment', 'meeting', 'lab', 'review'
    
    -- Scheduling
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL, -- Planned duration in minutes
    
    -- AI Optimization Fields
    cognitive_load VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high'
    urgency VARCHAR(10) DEFAULT 'later', -- 'urgent', 'soon', 'later'
    priority_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0 for AI optimization
    
    -- Session Execution
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    actual_duration_minutes INTEGER,
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled', 'missed'
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Rewards and Motivation
    xp_reward INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    
    -- Metadata
    is_ai_suggested BOOLEAN DEFAULT false,
    optimization_score DECIMAL(3,2), -- AI optimization confidence
    calendar_position INTEGER, -- Order in calendar view
    session_notes TEXT,
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    focus_score DECIMAL(3,1) CHECK (focus_score >= 0.0 AND focus_score <= 10.0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_scheduled_times CHECK (scheduled_end > scheduled_start),
    CONSTRAINT check_actual_times CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end > actual_start)
);

-- Create session_notes table for detailed session annotations
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    
    note_type VARCHAR(20) DEFAULT 'general', -- 'general', 'preparation', 'during', 'reflection', 'todo'
    content TEXT NOT NULL,
    note_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata for rich notes
    metadata JSONB, -- For tagging, mood, distractions, etc.
    is_private BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_schedule_preferences table for personalization
CREATE TABLE IF NOT EXISTS user_schedule_preferences (
    user_id UUID PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
    
    -- Core Hours Configuration
    core_start_hour INTEGER DEFAULT 8 CHECK (core_start_hour >= 0 AND core_start_hour <= 23),
    core_end_hour INTEGER DEFAULT 18 CHECK (core_end_hour >= 0 AND core_end_hour <= 23),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Session Preferences
    default_session_length INTEGER DEFAULT 45, -- minutes
    default_break_length INTEGER DEFAULT 15, -- minutes
    max_daily_study_hours INTEGER DEFAULT 8,
    
    -- Cognitive Load Distribution
    preferred_high_cognitive_slots JSONB, -- Array of hour slots for high cognitive load work
    avoided_time_slots JSONB, -- Array of time slots user wants to avoid
    
    -- AI Optimization Settings
    enable_ai_optimization BOOLEAN DEFAULT true,
    enable_ai_suggestions BOOLEAN DEFAULT true,
    optimization_aggressiveness DECIMAL(2,1) DEFAULT 5.0 CHECK (optimization_aggressiveness >= 1.0 AND optimization_aggressiveness <= 10.0),
    
    -- Notification Settings
    enable_session_reminders BOOLEAN DEFAULT true,
    reminder_minutes_before INTEGER DEFAULT 15,
    enable_deadline_alerts BOOLEAN DEFAULT true,
    
    -- Display Preferences
    default_view VARCHAR(20) DEFAULT 'calendar', -- 'calendar', 'stack', 'month'
    show_weekends BOOLEAN DEFAULT false,
    calendar_start_hour INTEGER DEFAULT 6,
    calendar_end_hour INTEGER DEFAULT 22,
    
    -- Course Color Mapping
    course_colors JSONB, -- Custom colors for courses
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create session_analytics table for performance tracking
CREATE TABLE IF NOT EXISTS session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    session_id UUID REFERENCES study_sessions(id) ON DELETE SET NULL,
    
    -- Analytics Event Data
    event_type VARCHAR(50) NOT NULL, -- 'session_start', 'session_complete', 'session_cancel', 'reschedule', 'optimization_applied'
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance Metrics
    planned_vs_actual_duration INTEGER, -- Difference in minutes
    focus_interruptions INTEGER DEFAULT 0,
    context_switches INTEGER DEFAULT 0, -- Number of task switches during session
    
    -- AI Insights
    optimization_followed BOOLEAN, -- Did user follow AI suggestions
    suggestion_effectiveness DECIMAL(3,2), -- How effective was the AI suggestion
    
    -- User Behavior
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    time_to_start INTEGER, -- Minutes between scheduled start and actual start
    session_satisfaction INTEGER CHECK (session_satisfaction >= 1 AND session_satisfaction <= 5),
    
    -- Contextual Data
    metadata JSONB, -- Additional context (weather, mood, location, etc.)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_session_suggestions table for AI recommendations
CREATE TABLE IF NOT EXISTS ai_session_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    
    -- Suggestion Details
    suggestion_type VARCHAR(30) NOT NULL, -- 'optimization', 'autofill', 'time_block', 'break_reminder'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Suggested Session Data
    suggested_start TIMESTAMP WITH TIME ZONE,
    suggested_duration INTEGER, -- minutes
    suggested_course_id UUID REFERENCES "Course"(id) ON DELETE SET NULL,
    suggested_cognitive_load VARCHAR(10),
    
    -- AI Confidence and Reasoning
    confidence_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
    reasoning TEXT, -- AI explanation for the suggestion
    algorithm_version VARCHAR(20), -- Track which AI model generated this
    
    -- User Response
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'modified', 'expired'
    user_feedback TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    priority_score DECIMAL(3,2) DEFAULT 0.5,
    expires_at TIMESTAMP WITH TIME ZONE,
    suggestion_metadata JSONB, -- Algorithm-specific data
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, DATE(scheduled_start));
CREATE INDEX IF NOT EXISTS idx_study_sessions_scheduled_start ON study_sessions(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_study_sessions_course_id ON study_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_urgency ON study_sessions(urgency);
CREATE INDEX IF NOT EXISTS idx_study_sessions_ai_suggested ON study_sessions(is_ai_suggested);

CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_user_timestamp ON session_notes(user_id, note_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_event_type ON session_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_session_analytics_timestamp ON session_analytics(event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_status ON ai_session_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_expires ON ai_session_suggestions(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_confidence ON ai_session_suggestions(confidence_score DESC);

-- Create functions for session management and optimization

-- Function to automatically update session status based on time
CREATE OR REPLACE FUNCTION update_session_status()
RETURNS void AS $$
BEGIN
    -- Mark sessions as missed if they're past scheduled end time and still scheduled
    UPDATE study_sessions 
    SET status = 'missed', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'scheduled' 
    AND scheduled_end < CURRENT_TIMESTAMP - INTERVAL '30 minutes';
    
    -- Mark active sessions as completed if they're past scheduled end time
    UPDATE study_sessions 
    SET status = 'completed', 
        actual_end = COALESCE(actual_end, scheduled_end),
        completion_percentage = 100,
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active' 
    AND scheduled_end < CURRENT_TIMESTAMP - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate session effectiveness score
CREATE OR REPLACE FUNCTION calculate_session_effectiveness(p_session_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    session_record study_sessions%ROWTYPE;
    effectiveness_score DECIMAL := 0.0;
    duration_factor DECIMAL := 1.0;
    focus_factor DECIMAL := 1.0;
    completion_factor DECIMAL := 1.0;
BEGIN
    -- Get session data
    SELECT * INTO session_record FROM study_sessions WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RETURN 0.0;
    END IF;
    
    -- Duration factor (actual vs planned)
    IF session_record.actual_duration_minutes IS NOT NULL AND session_record.duration_minutes > 0 THEN
        duration_factor := LEAST(1.0, session_record.actual_duration_minutes::DECIMAL / session_record.duration_minutes);
    END IF;
    
    -- Focus factor (based on focus score if available)
    IF session_record.focus_score IS NOT NULL THEN
        focus_factor := session_record.focus_score / 10.0;
    END IF;
    
    -- Completion factor
    completion_factor := session_record.completion_percentage / 100.0;
    
    -- Calculate weighted effectiveness score
    effectiveness_score := (duration_factor * 0.3 + focus_factor * 0.4 + completion_factor * 0.3) * 10.0;
    
    RETURN ROUND(effectiveness_score, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to generate AI optimization score for session ordering
CREATE OR REPLACE FUNCTION calculate_optimization_score(
    p_user_id UUID,
    p_cognitive_load VARCHAR(10),
    p_urgency VARCHAR(10),
    p_scheduled_start TIMESTAMP WITH TIME ZONE,
    p_course_id UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    base_score DECIMAL := 0.5;
    urgency_bonus DECIMAL := 0.0;
    cognitive_bonus DECIMAL := 0.0;
    time_bonus DECIMAL := 0.0;
    user_prefs user_schedule_preferences%ROWTYPE;
    hour_of_day INTEGER;
BEGIN
    -- Get user preferences
    SELECT * INTO user_prefs FROM user_schedule_preferences WHERE user_id = p_user_id;
    
    hour_of_day := EXTRACT(HOUR FROM p_scheduled_start);
    
    -- Urgency scoring
    CASE p_urgency
        WHEN 'urgent' THEN urgency_bonus := 0.4;
        WHEN 'soon' THEN urgency_bonus := 0.2;
        WHEN 'later' THEN urgency_bonus := 0.0;
    END CASE;
    
    -- Cognitive load scoring (higher cognitive load in preferred hours gets bonus)
    IF user_prefs.core_start_hour IS NOT NULL AND user_prefs.core_end_hour IS NOT NULL THEN
        IF hour_of_day >= user_prefs.core_start_hour AND hour_of_day <= user_prefs.core_end_hour THEN
            CASE p_cognitive_load
                WHEN 'high' THEN cognitive_bonus := 0.3;
                WHEN 'medium' THEN cognitive_bonus := 0.2;
                WHEN 'low' THEN cognitive_bonus := 0.1;
            END CASE;
        END IF;
    END IF;
    
    -- Time slot scoring (prefer core hours)
    IF user_prefs.core_start_hour IS NOT NULL AND user_prefs.core_end_hour IS NOT NULL THEN
        IF hour_of_day >= user_prefs.core_start_hour AND hour_of_day <= user_prefs.core_end_hour THEN
            time_bonus := 0.2;
        END IF;
    END IF;
    
    -- Calculate final score
    base_score := LEAST(1.0, base_score + urgency_bonus + cognitive_bonus + time_bonus);
    
    RETURN ROUND(base_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to award XP for completed sessions
CREATE OR REPLACE FUNCTION award_session_xp(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
    session_record study_sessions%ROWTYPE;
    xp_amount INTEGER := 0;
    effectiveness DECIMAL;
    bonus_multiplier DECIMAL := 1.0;
BEGIN
    -- Get session data
    SELECT * INTO session_record FROM study_sessions WHERE id = p_session_id;
    
    IF NOT FOUND OR session_record.status != 'completed' THEN
        RETURN 0;
    END IF;
    
    -- Base XP calculation
    xp_amount := GREATEST(10, session_record.duration_minutes / 10); -- 1 XP per 10 minutes, minimum 10
    
    -- Bonus for high cognitive load
    IF session_record.cognitive_load = 'high' THEN
        bonus_multiplier := bonus_multiplier + 0.5;
    ELSIF session_record.cognitive_load = 'medium' THEN
        bonus_multiplier := bonus_multiplier + 0.2;
    END IF;
    
    -- Bonus for urgent tasks
    IF session_record.urgency = 'urgent' THEN
        bonus_multiplier := bonus_multiplier + 0.3;
    ELSIF session_record.urgency = 'soon' THEN
        bonus_multiplier := bonus_multiplier + 0.1;
    END IF;
    
    -- Effectiveness bonus
    IF session_record.effectiveness_rating IS NOT NULL AND session_record.effectiveness_rating >= 4 THEN
        bonus_multiplier := bonus_multiplier + 0.2;
    END IF;
    
    -- Apply bonuses
    xp_amount := ROUND(xp_amount * bonus_multiplier);
    
    -- Update session with earned XP
    UPDATE study_sessions 
    SET xp_earned = xp_amount, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id;
    
    -- Log XP activity
    INSERT INTO user_activities (user_id, activity_type, xp_earned, description, metadata)
    VALUES (
        session_record.user_id,
        'session_complete',
        xp_amount,
        'Completed study session: ' || session_record.title,
        jsonb_build_object(
            'session_id', p_session_id,
            'duration_minutes', session_record.actual_duration_minutes,
            'cognitive_load', session_record.cognitive_load,
            'effectiveness_rating', session_record.effectiveness_rating
        )
    );
    
    RETURN xp_amount;
END;
$$ LANGUAGE plpgsql;

-- Create view for session analytics dashboard
CREATE OR REPLACE VIEW session_performance_summary AS
SELECT 
    s.user_id,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN s.status = 'missed' THEN 1 END) as missed_sessions,
    ROUND(AVG(s.actual_duration_minutes), 1) as avg_actual_duration,
    ROUND(AVG(s.duration_minutes), 1) as avg_planned_duration,
    ROUND(AVG(s.effectiveness_rating), 1) as avg_effectiveness,
    ROUND(AVG(s.focus_score), 1) as avg_focus_score,
    SUM(s.xp_earned) as total_xp_earned,
    MAX(s.updated_at) as last_session_date,
    COUNT(DISTINCT DATE(s.scheduled_start)) as study_days,
    ROUND(AVG(calculate_session_effectiveness(s.id)), 1) as avg_session_effectiveness
FROM study_sessions s
WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.user_id;

-- Add comments
COMMENT ON TABLE study_sessions IS 'Core table for managing study sessions with AI optimization capabilities';
COMMENT ON TABLE session_notes IS 'Detailed notes and annotations for study sessions';
COMMENT ON TABLE user_schedule_preferences IS 'User personalization settings for schedule optimization';
COMMENT ON TABLE session_analytics IS 'Performance tracking and analytics for study sessions';
COMMENT ON TABLE ai_session_suggestions IS 'AI-generated suggestions for session optimization';

COMMENT ON FUNCTION update_session_status IS 'Automatically updates session statuses based on current time';
COMMENT ON FUNCTION calculate_session_effectiveness IS 'Calculates effectiveness score for completed sessions';
COMMENT ON FUNCTION calculate_optimization_score IS 'Generates AI optimization score for session prioritization';
COMMENT ON FUNCTION award_session_xp IS 'Awards XP for completed sessions based on performance metrics';

-- Initialize default preferences for existing users
INSERT INTO user_schedule_preferences (user_id)
SELECT id FROM "User" 
WHERE id NOT IN (SELECT user_id FROM user_schedule_preferences);