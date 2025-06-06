# Supabase Authentication Test Guide

## Backend Changes Made

✅ **Updated `/api/v2/auth/me` endpoint** to use `@require_auth` decorator from Supabase
✅ **Updated endpoint logic** to work with `AuthUser` from Supabase auth service
✅ **Added proper user lookup** using both `firebase_uid` and direct ID lookup

## Testing the Fix

### 1. Test Authentication Flow

When you run your frontend application now, the authentication flow should be:

1. **Frontend**: User logs in via Supabase OAuth
2. **Frontend**: Gets Supabase access token from callback
3. **Frontend**: Sends token as `Authorization: Bearer <token>` to `/api/v2/auth/me`
4. **Backend**: Validates token using Supabase JWT secret
5. **Backend**: Looks up user in database using Supabase user ID
6. **Backend**: Returns user profile data

### 2. Verify the Fix

Check your browser console - you should no longer see:
- ❌ `Registration check failed with status: 401`
- ❌ `Failed to load resource: the server responded with a status of 401 (UNAUTHORIZED)`

Instead, you should see:
- ✅ OAuth session established
- ✅ User profile loaded successfully
- ✅ Registration status checked successfully

### 3. Backend Requirements

Make sure your backend environment has:

```bash
# Required Supabase environment variables
SUPABASE_URL=https://torsffahnivnzcnjnxgc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SUPABASE_JWT_SECRET=<your_jwt_secret>
```

You can get these from: https://supabase.com/dashboard/project/torsffahnivnzcnjnxgc/settings/api

### 4. Database User Lookup

The backend will look for users in your database using:
1. `user.firebase_uid = supabase_user_id` (recommended)
2. `user.id = supabase_user_id` (fallback)

Make sure your users table has the Supabase user ID stored in the `firebase_uid` field.

### 5. Troubleshooting

If you still get 401 errors:

1. **Check JWT Secret**: Ensure `SUPABASE_JWT_SECRET` matches your Supabase project
2. **Check User Mapping**: Verify users exist in database with correct `firebase_uid`
3. **Check Token Format**: Frontend should send `Authorization: Bearer <token>`
4. **Check Logs**: Backend logs should show token verification attempts

### 6. Expected Response Format

The `/api/v2/auth/me` endpoint now returns:

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "display_name": "User Name",
    "role": "student",
    "verified": true,
    "created_at": "2024-01-01T00:00:00",
    "profile": {
      "name": "User Name",
      "onboard_answers": {},
      "want_quizzes": false
    },
    "stats": {
      "enrolled_courses": 0
    }
  }
}
```

## Next Steps

1. **Test the authentication flow** with your frontend
2. **Verify user profiles load correctly**
3. **Check that all API endpoints work** with Supabase tokens
4. **Update any remaining Firebase decorators** to Supabase as needed

## Migration Status

- ✅ Frontend: Fully migrated to Supabase
- ✅ Backend `/api/v2/auth/me`: Updated to Supabase 
- ⏳ Other endpoints: May need updates based on usage 