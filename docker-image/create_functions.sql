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
    
    -- Update user stats with XP
    UPDATE user_stats 
    SET current_xp = current_xp + p_xp_amount,
        total_xp = total_xp + p_xp_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create leaderboard view  
CREATE OR REPLACE VIEW user_leaderboard AS
SELECT 
    u.id as user_id,
    COALESCE(sp.name, ip.name, 'Anonymous User') as name,
    us.current_level,
    us.total_xp,
    us.daily_streak,
    us.weekly_progress,
    ROW_NUMBER() OVER (ORDER BY us.total_xp DESC) as rank
FROM "User" u
LEFT JOIN user_stats us ON u.id = us.user_id
LEFT JOIN "StudentProfile" sp ON u.id = sp.user_id
LEFT JOIN "InstructorProfile" ip ON u.id = ip.user_id
WHERE us.user_id IS NOT NULL
ORDER BY us.total_xp DESC;