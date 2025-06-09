-- Add Study Plans and Schedule Tables to Supabase
-- This migration adds the missing tables that are causing 400 errors

-- First, let's check if tables exist and create them if they don't

-- Create study_plans table
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Plan Configuration
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    study_hours_per_week INTEGER DEFAULT 10,
    preferred_study_time VARCHAR(20) DEFAULT 'evening', -- 'morning', 'afternoon', 'evening', 'night'
    
    -- Progress Tracking
    total_hours_studied DECIMAL(10,2) DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'draft', 'active', 'paused', 'completed', 'archived'
    is_ai_generated BOOLEAN DEFAULT FALSE,
    
    -- XP and Rewards
    total_xp_earned INTEGER DEFAULT 0,
    milestone_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create study_goals table
CREATE TABLE IF NOT EXISTS study_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Goal Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(30) DEFAULT 'custom', -- 'completion', 'time_based', 'score_based', 'streak', 'custom'
    
    -- Target Metrics
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50), -- 'hours', 'chapters', 'assignments', 'score', 'days', etc.
    
    -- Timing
    deadline DATE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'biweekly'
    
    -- Status and Progress
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'failed', 'paused'
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Rewards
    xp_reward INTEGER DEFAULT 100,
    achievement_badge VARCHAR(100),
    
    -- AI Suggestions
    is_ai_suggested BOOLEAN DEFAULT FALSE,
    ai_rationale TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create study_sessions table (the main one causing errors)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID,
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
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Rewards and Motivation
    xp_reward INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    
    -- Metadata
    is_ai_suggested BOOLEAN DEFAULT FALSE,
    optimization_score DECIMAL(3,2),
    calendar_position INTEGER, -- For UI ordering
    session_notes TEXT,
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    focus_score INTEGER CHECK (focus_score >= 0 AND focus_score <= 10),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_schedules_preferences table
CREATE TABLE IF NOT EXISTS user_schedules_preferences (
    user_id UUID PRIMARY KEY,
    
    -- Core Hours Configuration
    core_start_hour INTEGER DEFAULT 9 CHECK (core_start_hour >= 0 AND core_start_hour <= 23),
    core_end_hour INTEGER DEFAULT 17 CHECK (core_end_hour >= 0 AND core_end_hour <= 23),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Session Preferences
    default_session_length INTEGER DEFAULT 45, -- minutes
    default_break_length INTEGER DEFAULT 15, -- minutes
    min_session_length INTEGER DEFAULT 15, -- minutes
    max_session_length INTEGER DEFAULT 120, -- minutes
    
    -- Scheduling Preferences
    scheduling_method VARCHAR(20) DEFAULT 'manual', -- 'manual', 'ai_assisted', 'full_ai'
    buffer_time INTEGER DEFAULT 5, -- minutes between sessions
    
    -- Study Style
    preferred_cognitive_load VARCHAR(10) DEFAULT 'medium',
    focus_session_ratio DECIMAL(3,2) DEFAULT 0.70, -- Ratio of deep work vs light work
    
    -- Learning Optimization
    peak_performance_time VARCHAR(20), -- 'early_morning', 'morning', 'afternoon', 'evening', 'night'
    attention_span_minutes INTEGER DEFAULT 45,
    
    -- AI Settings
    allow_ai_reschedule BOOLEAN DEFAULT TRUE,
    ai_aggressiveness VARCHAR(20) DEFAULT 'balanced', -- 'conservative', 'balanced', 'aggressive'
    respect_fixed_commitments BOOLEAN DEFAULT TRUE,
    
    -- Notifications
    reminder_minutes_before INTEGER DEFAULT 15,
    daily_summary_enabled BOOLEAN DEFAULT TRUE,
    weekly_review_enabled BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    preferences_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create session_notes table
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Note Details
    note_type VARCHAR(20) DEFAULT 'general', -- 'general', 'reflection', 'issue', 'success'
    content TEXT NOT NULL,
    note_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    is_private BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create session_analytics table
CREATE TABLE IF NOT EXISTS session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Engagement Metrics
    total_interactions INTEGER DEFAULT 0,
    active_time_seconds INTEGER DEFAULT 0,
    idle_time_seconds INTEGER DEFAULT 0,
    
    -- Focus Metrics
    focus_score DECIMAL(3,2), -- 0.0 to 1.0
    distraction_count INTEGER DEFAULT 0,
    break_count INTEGER DEFAULT 0,
    
    -- Performance Metrics
    content_coverage_percentage INTEGER,
    quiz_score_average DECIMAL(5,2),
    notes_taken INTEGER DEFAULT 0,
    
    -- Behavioral Metrics
    pause_count INTEGER DEFAULT 0,
    speed_changes INTEGER DEFAULT 0,
    
    -- Technical Metrics
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(50),
    
    -- AI Analysis
    ai_insights JSONB,
    anomaly_detected BOOLEAN DEFAULT FALSE,
    
    -- Timing
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_session_suggestions table
CREATE TABLE IF NOT EXISTS ai_session_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    original_session_id UUID REFERENCES study_sessions(id) ON DELETE SET NULL,
    
    -- Suggestion Details
    suggestion_type VARCHAR(30) NOT NULL, -- 'new_session', 'reschedule', 'split', 'merge', 'cancel'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    rationale TEXT NOT NULL, -- AI's reasoning
    
    -- Suggested Parameters
    suggested_start TIMESTAMP WITH TIME ZONE,
    suggested_end TIMESTAMP WITH TIME ZONE,
    suggested_duration INTEGER, -- minutes
    suggested_cognitive_load VARCHAR(10),
    
    -- Optimization Scores
    optimization_score DECIMAL(3,2) NOT NULL, -- How much this improves overall schedule
    confidence_score DECIMAL(3,2) NOT NULL, -- AI confidence in suggestion
    
    -- User Response
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
    user_feedback TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    suggestion_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_scheduled_start ON study_sessions(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_study_sessions_course_id ON study_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_session_id ON session_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_session_suggestions(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schedules_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_session_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_sessions (main table)
CREATE POLICY "Users can view their own study sessions"
    ON study_sessions FOR SELECT
    USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create their own study sessions"
    ON study_sessions FOR INSERT
    WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update their own study sessions"
    ON study_sessions FOR UPDATE
    USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete their own study sessions"
    ON study_sessions FOR DELETE
    USING (auth.uid()::uuid = user_id);

-- RLS Policies for study_plans
CREATE POLICY "Users can manage their own study plans"
    ON study_plans FOR ALL
    USING (auth.uid()::uuid = user_id);

-- RLS Policies for study_goals
CREATE POLICY "Users can manage their own study goals"
    ON study_goals FOR ALL
    USING (auth.uid()::uuid = user_id);

-- RLS Policies for user_schedules_preferences
CREATE POLICY "Users can manage their own preferences"
    ON user_schedules_preferences FOR ALL
    USING (auth.uid()::uuid = user_id);

-- RLS Policies for session_notes
CREATE POLICY "Users can manage their own session notes"
    ON session_notes FOR ALL
    USING (auth.uid()::uuid = user_id);

-- RLS Policies for session_analytics
CREATE POLICY "Users can view their own analytics"
    ON session_analytics FOR SELECT
    USING (auth.uid()::uuid = user_id);

CREATE POLICY "System can insert analytics"
    ON session_analytics FOR INSERT
    WITH CHECK (true); -- Allow system to insert analytics

-- RLS Policies for ai_session_suggestions
CREATE POLICY "Users can manage their own AI suggestions"
    ON ai_session_suggestions FOR ALL
    USING (auth.uid()::uuid = user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON study_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_goals_updated_at BEFORE UPDATE ON study_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_schedules_preferences_updated_at BEFORE UPDATE ON user_schedules_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_notes_updated_at BEFORE UPDATE ON session_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add user_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY,
    total_xp INTEGER DEFAULT 0,
    weekly_xp INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy for user_stats
CREATE POLICY "Users can view and update their own stats"
    ON user_stats FOR ALL
    USING (auth.uid()::uuid = user_id);

-- Create trigger for user_stats updated_at
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to authenticated users
GRANT ALL ON study_plans TO authenticated;
GRANT ALL ON study_goals TO authenticated;
GRANT ALL ON study_sessions TO authenticated;
GRANT ALL ON user_schedules_preferences TO authenticated;
GRANT ALL ON session_notes TO authenticated;
GRANT ALL ON session_analytics TO authenticated;
GRANT ALL ON ai_session_suggestions TO authenticated;
GRANT ALL ON user_stats TO authenticated;

-- Grant permissions to service role
GRANT ALL ON study_plans TO service_role;
GRANT ALL ON study_goals TO service_role;
GRANT ALL ON study_sessions TO service_role;
GRANT ALL ON user_schedules_preferences TO service_role;
GRANT ALL ON session_notes TO service_role;
GRANT ALL ON session_analytics TO service_role;
GRANT ALL ON ai_session_suggestions TO service_role;
GRANT ALL ON user_stats TO service_role;