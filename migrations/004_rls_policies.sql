-- Authentication System - Row Level Security Policies Migration
-- Phase 1: Supabase Project Setup
-- File: migrations/004_rls_policies.sql

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = OLD.role  -- Prevent users from changing their own role
  );

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Policy: Admins can update any profile (including roles)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Policy: Instructors can view student and instructor profiles
CREATE POLICY "Instructors can view students and instructors" ON public.profiles
  FOR SELECT 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'instructor'
    AND role IN ('student', 'instructor')
  );

-- Policy: New users can insert their initial profile (handled by trigger)
CREATE POLICY "Enable profile creation" ON public.profiles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id
  );

-- =============================================================================
-- AUTH EVENTS TABLE POLICIES
-- =============================================================================

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs" ON security.auth_events
  FOR SELECT 
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Policy: Users can view their own auth events
CREATE POLICY "Users can view own auth events" ON security.auth_events
  FOR SELECT 
  USING (
    auth.uid() = user_id
  );

-- Policy: System can insert auth events (for logging)
CREATE POLICY "Enable auth event logging" ON security.auth_events
  FOR INSERT 
  WITH CHECK (true);  -- Allow system to log events

-- Policy: No one can update or delete auth events (immutable audit log)
-- (No UPDATE or DELETE policies = operations not allowed)

-- =============================================================================
-- HELPER FUNCTIONS FOR POLICIES
-- =============================================================================

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION auth.has_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION auth.has_any_role(roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = ANY(roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'student');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage another user based on role hierarchy
CREATE OR REPLACE FUNCTION auth.can_manage_user(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
  current_role text;
  target_role text;
BEGIN
  -- Get current user's role
  current_role := auth.get_user_role();
  
  -- Get target user's role
  SELECT role INTO target_role 
  FROM public.profiles 
  WHERE id = target_user_id;
  
  -- Admin can manage everyone
  IF current_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Instructor can manage students
  IF current_role = 'instructor' AND target_role = 'student' THEN
    RETURN true;
  END IF;
  
  -- Users can manage themselves
  IF auth.uid() = target_user_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ADDITIONAL SECURITY POLICIES
-- =============================================================================

-- Policy: Enhanced profile management with role hierarchy
CREATE POLICY "Role-based profile management" ON public.profiles
  FOR UPDATE 
  USING (
    auth.can_manage_user(id)
  )
  WITH CHECK (
    auth.can_manage_user(id)
    AND (
      -- Users can't elevate their own role
      (auth.uid() = id AND role = OLD.role) 
      OR 
      -- Admins can change any role
      auth.has_role('admin')
      OR
      -- Instructors can only demote to student
      (auth.has_role('instructor') AND role = 'student')
    )
  );

-- Policy: Prevent deletion of profiles (soft delete should be used instead)
-- (No DELETE policy = deletion not allowed through RLS)

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;

-- Grant audit log access to authenticated users (limited by RLS)
GRANT SELECT ON security.auth_events TO authenticated;
GRANT INSERT ON security.auth_events TO authenticated;

-- Grant access to helper functions
GRANT EXECUTE ON FUNCTION auth.has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.has_any_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.can_manage_user(uuid) TO authenticated;

-- Grant audit logging functions to service role
GRANT EXECUTE ON FUNCTION security.log_auth_event TO service_role;
GRANT EXECUTE ON FUNCTION security.get_user_login_history TO service_role;
GRANT EXECUTE ON FUNCTION security.detect_failed_login_attempts TO service_role;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 
  'Allow users to view their own profile data';

COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 
  'Allow users to update their own profile but prevent role changes';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
  'Give admins full visibility into all user profiles';

COMMENT ON POLICY "Admins can update all profiles" ON public.profiles IS 
  'Allow admins to modify any user profile including roles';

COMMENT ON POLICY "Instructors can view students and instructors" ON public.profiles IS 
  'Allow instructors to view student and other instructor profiles';

COMMENT ON POLICY "Admins can view all audit logs" ON security.auth_events IS 
  'Restrict audit log access to admin users only';

COMMENT ON POLICY "Users can view own auth events" ON security.auth_events IS 
  'Allow users to view their own authentication history';

COMMENT ON POLICY "Enable auth event logging" ON security.auth_events IS 
  'Allow system to insert audit log entries';

COMMENT ON FUNCTION auth.has_role(text) IS 
  'Check if current user has specific role';

COMMENT ON FUNCTION auth.has_any_role(text[]) IS 
  'Check if current user has any of the specified roles';

COMMENT ON FUNCTION auth.get_user_role() IS 
  'Get current user role from JWT token';

COMMENT ON FUNCTION auth.can_manage_user(uuid) IS 
  'Check if current user can manage another user based on role hierarchy';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Uncomment these queries to verify the policies are working correctly

-- Check all policies on profiles table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE tablename = 'profiles';

-- Check all policies on auth_events table  
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE tablename = 'auth_events';

-- Test role functions
-- SELECT auth.get_user_role();
-- SELECT auth.has_role('admin');

-- Verify RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('profiles', 'auth_events');