-- Migration to ensure all metrics are properly calculated and persisted in the database
-- This fixes the issue where calculations were happening client-side but not being saved

-- 1. Add missing columns to user_stats for better metric tracking
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS weekly_xp INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS monthly_xp INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_study_minutes INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS weekly_study_minutes INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Function to calculate and update weekly XP
CREATE OR REPLACE FUNCTION calculate_weekly_xp(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_weekly_xp INTEGER;
BEGIN
    SELECT COALESCE(SUM(xp_earned), 0)::INTEGER INTO v_weekly_xp
    FROM user_activities
    WHERE user_id = p_user_id
    AND created_at >= date_trunc('week', CURRENT_DATE)
    AND created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week';
    
    -- Update the user_stats table
    UPDATE user_stats 
    SET weekly_xp = v_weekly_xp,
        last_calculated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN v_weekly_xp;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to calculate and update monthly XP
CREATE OR REPLACE FUNCTION calculate_monthly_xp(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_monthly_xp INTEGER;
BEGIN
    SELECT COALESCE(SUM(xp_earned), 0)::INTEGER INTO v_monthly_xp
    FROM user_activities
    WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
    
    -- Update the user_stats table
    UPDATE user_stats 
    SET monthly_xp = v_monthly_xp,
        last_calculated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN v_monthly_xp;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to calculate and update study time metrics
CREATE OR REPLACE FUNCTION calculate_study_time_metrics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_minutes INTEGER;
    v_weekly_minutes INTEGER;
BEGIN
    -- Calculate total study time
    SELECT COALESCE(SUM(actual_duration), 0)::INTEGER INTO v_total_minutes
    FROM study_sessions
    WHERE user_id = p_user_id
    AND status = 'completed';
    
    -- Calculate weekly study time
    SELECT COALESCE(SUM(actual_duration), 0)::INTEGER INTO v_weekly_minutes
    FROM study_sessions
    WHERE user_id = p_user_id
    AND status = 'completed'
    AND created_at >= date_trunc('week', CURRENT_DATE);
    
    -- Update user_stats
    UPDATE user_stats 
    SET total_study_minutes = v_total_minutes,
        weekly_study_minutes = v_weekly_minutes,
        last_calculated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to update metrics when XP is earned
CREATE OR REPLACE FUNCTION update_user_metrics_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update weekly and monthly XP
    PERFORM calculate_weekly_xp(NEW.user_id);
    PERFORM calculate_monthly_xp(NEW.user_id);
    
    -- Also update the total_xp (this should already be handled by award_xp but let's ensure)
    UPDATE user_stats 
    SET total_xp = total_xp + NEW.xp_earned
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_activities
DROP TRIGGER IF EXISTS update_metrics_on_activity ON user_activities;
CREATE TRIGGER update_metrics_on_activity
AFTER INSERT ON user_activities
FOR EACH ROW
EXECUTE FUNCTION update_user_metrics_on_activity();

-- 6. Trigger to update study time when sessions complete
CREATE OR REPLACE FUNCTION update_study_metrics_on_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if session is being marked as completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        PERFORM calculate_study_time_metrics(NEW.user_id);
        
        -- If XP was earned, create an activity record
        IF NEW.xp_earned > 0 THEN
            INSERT INTO user_activities (user_id, activity_type, xp_earned, metadata)
            VALUES (NEW.user_id, 'study_session', NEW.xp_earned, 
                    jsonb_build_object('session_id', NEW.id, 'duration_minutes', NEW.actual_duration));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for study_sessions
DROP TRIGGER IF EXISTS update_metrics_on_session ON study_sessions;
CREATE TRIGGER update_metrics_on_session
AFTER INSERT OR UPDATE ON study_sessions
FOR EACH ROW
EXECUTE FUNCTION update_study_metrics_on_session();

-- 7. Function to recalculate all metrics for a user (useful for fixing data)
CREATE OR REPLACE FUNCTION recalculate_all_user_metrics(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Recalculate total XP from activities
    UPDATE user_stats 
    SET total_xp = (
        SELECT COALESCE(SUM(xp_earned), 0)
        FROM user_activities
        WHERE user_id = p_user_id
    )
    WHERE user_id = p_user_id;
    
    -- Recalculate weekly and monthly XP
    PERFORM calculate_weekly_xp(p_user_id);
    PERFORM calculate_monthly_xp(p_user_id);
    
    -- Recalculate study time
    PERFORM calculate_study_time_metrics(p_user_id);
    
    -- Update last calculated timestamp
    UPDATE user_stats 
    SET last_calculated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create a scheduled job to recalculate metrics daily (using pg_cron if available)
-- This ensures metrics stay accurate even if triggers miss something
-- Note: pg_cron needs to be enabled separately
/*
SELECT cron.schedule(
    'recalculate-user-metrics',
    '0 1 * * *', -- Run at 1 AM daily
    $$
    SELECT recalculate_all_user_metrics(user_id)
    FROM user_stats
    WHERE last_calculated_at < NOW() - INTERVAL '1 day';
    $$
);
*/

-- 9. Initialize metrics for existing users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT user_id FROM user_stats
    LOOP
        PERFORM recalculate_all_user_metrics(r.user_id);
    END LOOP;
END $$;

-- 10. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activities_weekly ON user_activities(user_id, created_at) 
WHERE created_at >= date_trunc('week', CURRENT_DATE);

CREATE INDEX IF NOT EXISTS idx_study_sessions_weekly ON study_sessions(user_id, created_at) 
WHERE created_at >= date_trunc('week', CURRENT_DATE) AND status = 'completed';

-- 11. Create a view for easy access to current week metrics
CREATE OR REPLACE VIEW user_weekly_metrics AS
SELECT 
    u.id as user_id,
    u.email,
    us.total_xp,
    us.weekly_xp,
    us.monthly_xp,
    us.daily_streak,
    us.total_study_minutes,
    us.weekly_study_minutes,
    ROUND(us.weekly_study_minutes / 60.0, 1) as weekly_study_hours,
    us.last_calculated_at,
    (us.last_calculated_at > NOW() - INTERVAL '1 hour') as metrics_fresh
FROM auth.users u
LEFT JOIN user_stats us ON u.id = us.user_id;

COMMENT ON VIEW user_weekly_metrics IS 'Consolidated view of user metrics with freshness indicator';