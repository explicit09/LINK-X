# Create Test User in Supabase

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to: https://app.supabase.com/project/torsffahnivnzcnjnxgc/auth/users
2. Click "Add user" → "Create new user"
3. Fill in:
   - Email: `test@example.com`
   - Password: `testpass123`
   - User metadata (click "Add metadata"):
     ```json
     {
       "role": "student",
       "full_name": "Test Student"
     }
     ```
4. Click "Create user"

## Option 2: Create Instructor Account

Same steps but use:
- Email: `instructor@example.com`
- Password: `testpass123`
- User metadata:
  ```json
  {
    "role": "instructor",
    "full_name": "Test Instructor"
  }
  ```

## Option 3: Using SQL (Advanced)

In SQL Editor:
```sql
-- This won't create auth user, but you can verify profiles work
SELECT * FROM user_profiles;
```

## Test Login

After creating user:
1. Start backend: `cd docker-image && python src/app.py`
2. Start frontend: `cd frontend && npm run dev`
3. Go to: http://localhost:3000/login
4. Login with your test credentials

You should be redirected to:
- Students → `/my-courses`
- Instructors → `/dashboard`