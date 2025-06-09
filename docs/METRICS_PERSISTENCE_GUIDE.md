# Metrics Persistence Guide

## Overview
This guide explains how user metrics and calculations are persisted in the database to ensure long-term data integrity and automatic updates.

## Database Architecture

### Core Tables

1. **user_stats** - Central metrics storage
   - `total_xp` - Cumulative XP across all time
   - `weekly_xp` - XP earned this week (auto-calculated)
   - `monthly_xp` - XP earned this month (auto-calculated)
   - `daily_streak` - Current consecutive days active
   - `max_streak` - Highest streak achieved
   - `total_study_minutes` - Total study time all-time
   - `weekly_study_minutes` - Study time this week
   - `last_activity_date` - Last activity timestamp
   - `last_calculated_at` - When metrics were last updated

2. **user_activities** - Event log for all XP-earning activities
   - Records every action that earns XP
   - Triggers automatic metric updates
   - Stores metadata about each activity

3. **study_sessions** - Detailed study session tracking
   - Duration, focus scores, effectiveness ratings
   - Automatically updates study time metrics on completion

## Automatic Persistence Mechanisms

### 1. Database Triggers
When you insert a record into `user_activities`:
```sql
-- This single insert:
INSERT INTO user_activities (user_id, activity_type, xp_earned, metadata)
VALUES (user_id, 'study_session', 50, {...});

-- Automatically triggers:
-- 1. Updates total_xp in user_stats
-- 2. Recalculates weekly_xp
-- 3. Recalculates monthly_xp
-- 4. Updates last_activity_date
```

### 2. Study Session Completion
When a study session is marked complete:
```sql
UPDATE study_sessions SET status = 'completed' WHERE id = session_id;

-- Automatically triggers:
-- 1. Updates total_study_minutes
-- 2. Updates weekly_study_minutes
-- 3. Creates user_activity record if XP earned
```

### 3. User Registration
When a new user signs up:
- `user_stats` record is automatically created with zero values
- Prevents null reference errors

## Client-Side Integration

### Study Time Hook
```typescript
// When ending a session, just create the activity:
await supabase.from('user_activities').insert({
  user_id: user.id,
  activity_type: 'study_session',
  xp_earned: calculatedXP,
  metadata: { session_id, duration_minutes }
});
// Database handles all metric updates automatically
```

### Course Creation
```typescript
// Creating a course automatically awards XP:
await courseOperations.createCourse(courseData);
// This triggers a user_activity insert → metric updates
```

## Metric Calculations

### Weekly/Monthly XP
- Calculated from `user_activities` table based on date ranges
- Updated automatically via triggers
- Reset at week/month boundaries

### Study Time Metrics
- Summed from `study_sessions` where status = 'completed'
- Weekly metrics filtered by date range
- Updated when sessions complete

### Streaks
- `daily_streak` increments when activity detected on new day
- Resets if no activity for > 24 hours
- `max_streak` preserves highest achievement

## Data Integrity Features

1. **Idempotent Operations** - Multiple updates won't corrupt data
2. **Atomic Updates** - All metrics update together or not at all
3. **Automatic Initialization** - Missing records are created on demand
4. **Recalculation Functions** - Can rebuild metrics from activity history

## Troubleshooting

### Missing Metrics?
```sql
-- Recalculate all metrics for a user:
SELECT recalculate_all_user_metrics('user-uuid-here');
```

### View Current Metrics
```sql
-- Check user's current metrics:
SELECT * FROM user_weekly_metrics WHERE user_id = 'user-uuid';
```

### Verify Triggers Working
```sql
-- Insert test activity and check if metrics update:
INSERT INTO user_activities (user_id, activity_type, xp_earned)
VALUES ('user-uuid', 'test', 10);

-- Then check:
SELECT weekly_xp, total_xp FROM user_stats WHERE user_id = 'user-uuid';
```

## Best Practices

1. **Always use user_activities** for XP events - triggers handle the rest
2. **Don't manually update** total_xp or weekly_xp - let triggers do it
3. **Trust the cascade** - one insert triggers all necessary updates
4. **Check metrics freshness** - use `last_calculated_at` to verify updates

## Summary

All calculations are now:
- ✅ Automatically persisted via database triggers
- ✅ Calculated server-side for consistency  
- ✅ Protected from client-side manipulation
- ✅ Recoverable from activity history
- ✅ Updated in real-time as activities occur