-- Migration: Add gamification and user stats tables
-- Date: 2025-01-06

-- Create user_stats table for tracking XP, levels, and streaks
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    current_xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    total_xp INTEGER NOT NULL DEFAULT 0,
    daily_streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    weekly_goal INTEGER NOT NULL DEFAULT 5,
    weekly_progress INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_user_stats_user_id UNIQUE(user_id)
);

-- Create user_activities table for tracking XP earning events
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'file_view', 'todo_complete', 'chat_message', 'quiz_complete', 'login'
    xp_earned INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_achievements table for badges and milestones
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL, -- 'first_login', 'streak_5', 'level_10', 'files_viewed_100'
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10), -- emoji or icon identifier
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_user_achievement UNIQUE(user_id, achievement_type)
);

-- Update api_usage_logs to include response status (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'api_usage_logs' AND column_name = 'response_status') THEN
        ALTER TABLE api_usage_logs ADD COLUMN response_status INTEGER;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_level ON user_stats(current_level DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_xp ON user_stats(current_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_streak ON user_stats(daily_streak DESC);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_date ON user_activities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);

-- Create function to calculate XP required for next level
CREATE OR REPLACE FUNCTION calculate_xp_for_level(level_num INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Exponential XP progression: 100 * level^1.5
    RETURN FLOOR(100 * POWER(level_num, 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update user level based on XP
CREATE OR REPLACE FUNCTION update_user_level(p_user_id UUID)
RETURNS void AS $$
DECLARE
    current_stats RECORD;
    new_level INTEGER;
    xp_for_next_level INTEGER;
BEGIN
    -- Get current user stats
    SELECT current_xp, current_level, total_xp INTO current_stats
    FROM user_stats WHERE user_id = p_user_id;
    
    IF current_stats IS NULL THEN
        RETURN;
    END IF;
    
    -- Calculate new level based on total XP
    new_level := 1;
    WHILE current_stats.total_xp >= calculate_xp_for_level(new_level + 1) LOOP
        new_level := new_level + 1;
    END LOOP;
    
    -- Update if level changed
    IF new_level != current_stats.current_level THEN
        xp_for_next_level := calculate_xp_for_level(new_level + 1);
        
        UPDATE user_stats 
        SET current_level = new_level,
            current_xp = current_stats.total_xp - calculate_xp_for_level(new_level),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;
        
        -- Add level up achievement
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, icon)
        VALUES (p_user_id, 'level_' || new_level, 'Level ' || new_level || ' Reached', 
                'Congratulations on reaching level ' || new_level || '!', '🏆')
        ON CONFLICT (user_id, achievement_type) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to award XP
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_xp_amount INTEGER,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    last_activity DATE;
    current_streak INTEGER;
BEGIN
    -- Insert activity record
    INSERT INTO user_activities (user_id, activity_type, xp_earned, description, metadata)
    VALUES (p_user_id, p_activity_type, p_xp_amount, p_description, p_metadata);
    
    -- Initialize user stats if doesn't exist
    INSERT INTO user_stats (user_id, current_xp, total_xp, last_activity_date)
    VALUES (p_user_id, p_xp_amount, p_xp_amount, today_date)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current streak info
    SELECT last_activity_date, daily_streak INTO last_activity, current_streak
    FROM user_stats WHERE user_id = p_user_id;
    
    -- Calculate new streak
    IF last_activity IS NULL OR last_activity < today_date THEN
        -- Update streak
        IF last_activity = today_date - INTERVAL '1 day' THEN
            current_streak := current_streak + 1;
        ELSIF last_activity < today_date - INTERVAL '1 day' THEN
            current_streak := 1; -- Reset streak
        END IF;
        
        -- Update user stats
        UPDATE user_stats 
        SET current_xp = current_xp + p_xp_amount,
            total_xp = total_xp + p_xp_amount,
            daily_streak = current_streak,
            max_streak = GREATEST(max_streak, current_streak),
            last_activity_date = today_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;
    ELSE
        -- Same day, just add XP
        UPDATE user_stats 
        SET current_xp = current_xp + p_xp_amount,
            total_xp = total_xp + p_xp_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;
    END IF;
    
    -- Check for level up
    PERFORM update_user_level(p_user_id);
    
    -- Check for streak achievements
    IF current_streak IN (3, 5, 7, 14, 30) THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, icon)
        VALUES (p_user_id, 'streak_' || current_streak, current_streak || '-Day Streak', 
                'Maintained a ' || current_streak || '-day learning streak!', '🔥')
        ON CONFLICT (user_id, achievement_type) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for leaderboard (anonymized names for privacy)
CREATE OR REPLACE VIEW user_leaderboard AS
SELECT 
    u.id as user_id,
    CASE 
        WHEN sp.name IS NOT NULL THEN 
            CASE 
                WHEN POSITION(' ' IN sp.name) > 0 THEN 
                    SUBSTRING(sp.name FROM 1 FOR POSITION(' ' IN sp.name)) || 
                    SUBSTRING(sp.name FROM POSITION(' ' IN sp.name) + 1 FOR 1) || '.'
                ELSE sp.name
            END
        WHEN ip.name IS NOT NULL THEN 
            CASE 
                WHEN POSITION(' ' IN ip.name) > 0 THEN 
                    SUBSTRING(ip.name FROM 1 FOR POSITION(' ' IN ip.name)) || 
                    SUBSTRING(ip.name FROM POSITION(' ' IN ip.name) + 1 FOR 1) || '.'
                ELSE ip.name
            END
        WHEN ap.name IS NOT NULL THEN 
            CASE 
                WHEN POSITION(' ' IN ap.name) > 0 THEN 
                    SUBSTRING(ap.name FROM 1 FOR POSITION(' ' IN ap.name)) || 
                    SUBSTRING(ap.name FROM POSITION(' ' IN ap.name) + 1 FOR 1) || '.'
                ELSE ap.name
            END
        ELSE 'Anonymous User'
    END as name,
    us.current_level,
    us.total_xp,
    us.daily_streak,
    us.weekly_progress,
    ROW_NUMBER() OVER (ORDER BY us.total_xp DESC) as rank
FROM "User" u
LEFT JOIN user_stats us ON u.id = us.user_id
LEFT JOIN "StudentProfile" sp ON u.id = sp.user_id
LEFT JOIN "InstructorProfile" ip ON u.id = ip.user_id
LEFT JOIN "AdminProfile" ap ON u.id = ap.user_id
WHERE us.user_id IS NOT NULL
ORDER BY us.total_xp DESC;

-- Add comments
COMMENT ON TABLE user_stats IS 'Tracks user XP, levels, and streaks for gamification';
COMMENT ON TABLE user_activities IS 'Records all XP-earning activities';
COMMENT ON TABLE user_achievements IS 'Stores earned badges and achievements';
COMMENT ON FUNCTION award_xp IS 'Awards XP to user and updates stats/achievements';
COMMENT ON VIEW user_leaderboard IS 'Current user rankings by XP';

-- Initialize existing users with default stats
INSERT INTO user_stats (user_id)
SELECT id FROM "User" 
WHERE id NOT IN (SELECT user_id FROM user_stats);