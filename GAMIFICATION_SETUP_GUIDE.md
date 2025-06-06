# Gamification System Setup Guide

## Overview
This guide will help you set up and test the XP and Streak gamification system that has been implemented in LINK-X.

## What Has Been Done

### 1. Backend Implementation
- ✅ Database schema with `user_stats`, `user_activities`, and `user_achievements` tables
- ✅ SQL functions for XP calculation and awarding
- ✅ API endpoints at `/api/v2/gamification/*`
- ✅ Simplified XP actions (6 essential actions only)

### 2. Frontend Implementation
- ✅ Updated `GamificationContext` to connect to real API
- ✅ Removed all mock data
- ✅ Created XP tracking hooks
- ✅ XPBar and GamificationWidget components ready

### 3. Simplified XP Actions
Per the 72-hour ship plan, we now have only 6 tracked actions:
- **DAILY_LOGIN**: 3 XP (once per day)
- **CONTENT_VIEW**: 5 XP (file or video view, once per unique content per 24h)
- **QUIZ_COMPLETE**: 15 XP
- **MODULE_COMPLETE**: 40 XP (max once per day typical)
- **HELP_PEER**: 10 XP (only when peer rates 4+ stars)
- **STREAK_BONUS**: XP = streak_days (automatic at midnight)

## What You Need to Do

### 1. Apply Database Migration to Supabase

Since Supabase doesn't allow direct SQL execution via the client, you need to manually run the migration:

1. **Go to your Supabase Dashboard**: https://app.supabase.com/project/torsffahnivnzcnjnxgc
2. **Navigate to SQL Editor** (left sidebar)
3. **Create a new query**
4. **Copy the entire contents** of: `docker-image/src/db/migrations/0013_add_gamification_tables.sql`
5. **Paste and run** the SQL in the editor
6. **Verify tables were created** by running:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('user_stats', 'user_activities', 'user_achievements')
   ORDER BY table_name;
   ```

### 2. Test the Backend API

Once the migration is applied, test the gamification endpoints:

```bash
# Get an auth token first (from your browser's localStorage or network tab)
export AUTH_TOKEN="your-jwt-token-here"

# Run the test script
cd docker-image
python test_gamification_system.py $AUTH_TOKEN
```

### 3. Enable Gamification in Frontend

The gamification system is already integrated, but you need to:

1. **Wrap your app with GamificationProvider** (if not already done):
   ```tsx
   // In app/layout.tsx or client-layout.tsx
   import { GamificationProvider } from '@/contexts/GamificationContext';
   
   <GamificationProvider>
     {children}
   </GamificationProvider>
   ```

2. **Add XP tracking to key actions**:
   ```tsx
   // Example: Track content view
   import { useContentViewXP } from '@/hooks/useXPTracking';
   
   function PDFViewer({ fileId }) {
     const { trackInteraction } = useContentViewXP(fileId, 'file');
     
     useEffect(() => {
       // Track when user interacts with content
       trackInteraction();
     }, []);
   }
   ```

3. **Display XP metrics** in your dashboard header:
   ```tsx
   import { GamificationWidget } from '@/components/gamification/GamificationWidget';
   
   // In your dashboard header
   <GamificationWidget variant="minimal" />
   ```

### 4. Test Frontend Integration

1. **Check if stats are loading**:
   - Open browser DevTools
   - Look for network request to `/api/v2/gamification/stats`
   - Should return user's XP data

2. **Test XP awarding**:
   - Perform an action (e.g., view a file)
   - Check network tab for `/api/v2/gamification/award-xp` request
   - Verify XP animation appears

3. **Verify persistence**:
   - Refresh the page
   - Stats should persist from database

## Common Issues & Solutions

### Issue: "user_stats table does not exist"
**Solution**: Run the migration SQL in Supabase dashboard

### Issue: 401 Unauthorized on API calls
**Solution**: Ensure auth token is being sent in headers

### Issue: XP not updating in UI
**Solution**: Check browser console for errors, verify GamificationProvider is wrapping your app

### Issue: Cooldowns not working
**Solution**: Cooldowns are stored in localStorage - check if it's enabled

## Next Steps (After Basic System Works)

1. **Add more UI feedback**:
   - Level up animations
   - Achievement popups
   - Streak celebrations

2. **Implement leaderboard page**:
   - Use `/api/v2/gamification/leaderboard` endpoint
   - Show top users anonymized

3. **Add weekly goals**:
   - Track progress toward weekly XP target
   - Reset on Sundays

4. **Performance optimization**:
   - Cache stats in Redis
   - Batch XP updates
   - Add request debouncing

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Backend API returns user stats
- [ ] XP can be awarded via API
- [ ] Frontend displays current XP/level
- [ ] XP animations work when earning points
- [ ] Daily login bonus works (once per day)
- [ ] Content view XP works (with cooldown)
- [ ] Stats persist after page refresh
- [ ] Achievements are created on level up

## Support

If you encounter issues:
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify database tables exist in Supabase
4. Ensure backend is running: `docker ps`
5. Check backend logs: `docker logs link-x-backend-1`

The system is designed to be simple and reliable. Once the database migration is applied, everything should work automatically!