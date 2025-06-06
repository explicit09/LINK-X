-- Simple User Creation Without Triggers
-- Run this in Supabase SQL Editor

-- Step 1: Disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Check existing users
SELECT id, email FROM auth.users;

-- Step 3: If no users exist, you can now create them in the dashboard
-- Email: test@example.com
-- Password: testpass123

-- Step 4: After creating users in dashboard, manually create profiles
-- First, get the user IDs
SELECT id, email FROM auth.users WHERE email IN ('test@example.com', 'instructor@example.com');

-- Step 5: Create profiles (replace the IDs with actual ones from step 4)
-- Example:
-- INSERT INTO user_profiles (id, email, role, full_name) VALUES
-- ('actual-user-id-here', 'test@example.com', 'student', 'Test Student'),
-- ('actual-instructor-id-here', 'instructor@example.com', 'instructor', 'Test Instructor');

-- Step 6: Verify everything worked
SELECT u.email, u.created_at, p.role, p.full_name 
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id;