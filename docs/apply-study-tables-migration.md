# Apply Study Tables Migration to Supabase

The 400 errors on `study_sessions` are occurring because these tables don't exist in your Supabase database yet.

## Steps to Apply the Migration:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration**
   - Copy the entire contents of `docker-image/migrations/add_study_and_schedule_tables.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Verify the Tables**
   After running the migration, verify the tables were created:
   ```sql
   -- Check if tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('study_sessions', 'study_plans', 'study_goals', 'user_stats');
   ```

4. **Test the Queries**
   Try a simple query to ensure RLS is working:
   ```sql
   -- This should return empty array (no data yet)
   SELECT * FROM study_sessions LIMIT 1;
   ```

## What This Migration Creates:

- `study_plans` - User study plans
- `study_goals` - Goals within study plans  
- `study_sessions` - Individual study sessions (the main table causing errors)
- `user_schedules_preferences` - User scheduling preferences
- `session_notes` - Notes for study sessions
- `session_analytics` - Analytics data for sessions
- `ai_session_suggestions` - AI-generated schedule suggestions
- `user_stats` - User statistics (XP, streaks, etc.)

All tables have:
- Proper indexes for performance
- Row Level Security (RLS) policies
- Automatic updated_at timestamps
- Proper foreign key relationships

## After Migration:

The 400 errors should be resolved once these tables exist in Supabase. The frontend queries will work properly with the correct table structure and RLS policies in place.