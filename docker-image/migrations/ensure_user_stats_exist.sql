-- Ensure every user has a user_stats record
-- This prevents issues where calculations fail because the record doesn't exist

-- 1. Function to ensure user_stats exists for a user
CREATE OR REPLACE FUNCTION ensure_user_stats_exists(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_stats (
        user_id, 
        total_xp, 
        weekly_xp,
        monthly_xp,
        daily_streak,
        max_streak,
        total_study_minutes,
        weekly_study_minutes,
        last_activity_date,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        0,  -- total_xp
        0,  -- weekly_xp
        0,  -- monthly_xp
        0,  -- daily_streak
        0,  -- max_streak
        0,  -- total_study_minutes
        0,  -- weekly_study_minutes
        NOW(),  -- last_activity_date
        NOW(),  -- created_at
        NOW()   -- updated_at
    )
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger to create user_stats when a new user signs up
CREATE OR REPLACE FUNCTION create_user_stats_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM ensure_user_stats_exists(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS ensure_user_stats_on_signup ON auth.users;
CREATE TRIGGER ensure_user_stats_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_stats_on_signup();

-- 3. Create user_stats for all existing users who don't have one
INSERT INTO user_stats (user_id, total_xp, weekly_xp, monthly_xp, daily_streak, max_streak, total_study_minutes, weekly_study_minutes, last_activity_date)
SELECT 
    u.id,
    0,  -- total_xp
    0,  -- weekly_xp
    0,  -- monthly_xp
    0,  -- daily_streak
    0,  -- max_streak
    0,  -- total_study_minutes
    0,  -- weekly_study_minutes
    NOW()  -- last_activity_date
FROM auth.users u
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE us.user_id IS NULL;

-- 4. Update the award_xp function to ensure user_stats exists
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_xp_amount INTEGER,
    p_activity_type TEXT,
    p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS INTEGER AS $$
DECLARE
    v_current_level INTEGER;
    v_new_total_xp INTEGER;
    v_level_up BOOLEAN := FALSE;
BEGIN
    -- Ensure user_stats exists
    PERFORM ensure_user_stats_exists(p_user_id);
    
    -- Insert activity record (this will trigger metrics updates)
    INSERT INTO user_activities (user_id, activity_type, xp_earned, metadata)
    VALUES (p_user_id, p_activity_type, p_xp_amount, p_metadata);
    
    -- Get updated total XP and check for level up
    SELECT total_xp, current_level INTO v_new_total_xp, v_current_level
    FROM user_stats
    WHERE user_id = p_user_id;
    
    -- Check if user leveled up (every 100 XP = 1 level)
    IF (v_new_total_xp / 100) > v_current_level THEN
        v_level_up := TRUE;
        UPDATE user_stats 
        SET current_level = v_new_total_xp / 100
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN v_new_total_xp;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to safely get user metrics (creates record if missing)
CREATE OR REPLACE FUNCTION get_user_metrics(p_user_id UUID)
RETURNS TABLE (
    total_xp INTEGER,
    weekly_xp INTEGER,
    monthly_xp INTEGER,
    daily_streak INTEGER,
    total_study_minutes INTEGER,
    weekly_study_minutes INTEGER,
    current_level INTEGER
) AS $$
BEGIN
    -- Ensure the record exists
    PERFORM ensure_user_stats_exists(p_user_id);
    
    -- Return the metrics
    RETURN QUERY
    SELECT 
        us.total_xp,
        us.weekly_xp,
        us.monthly_xp,
        us.daily_streak,
        us.total_study_minutes,
        us.weekly_study_minutes,
        us.current_level
    FROM user_stats us
    WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;