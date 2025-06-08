-- =====================================================
-- LEARN-X Authentication System - Initial Setup
-- Migration: 001_initial_auth_setup.sql
-- Phase: 0 - Foundation Setup
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SECURITY SCHEMA SETUP
-- =====================================================

-- Create security schema for audit logs
CREATE SCHEMA IF NOT EXISTS security;

-- =====================================================
-- PROFILES TABLE
-- =====================================================

-- Create profiles table that mirrors auth.users with additional metadata
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

-- =====================================================
-- AUTH EVENTS TABLE (AUDIT LOG)
-- =====================================================

-- Create auth events table for security auditing
CREATE TABLE security.auth_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'signup', 'login', 'logout', 'password_reset', 
        'profile_update', 'role_change', 'oauth_login',
        'magic_link_login', 'email_verification'
    )),
    event_metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for audit queries
CREATE INDEX idx_auth_events_user_id ON security.auth_events(user_id);
CREATE INDEX idx_auth_events_type ON security.auth_events(event_type);
CREATE INDEX idx_auth_events_created_at ON security.auth_events(created_at);
CREATE INDEX idx_auth_events_success ON security.auth_events(success);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on auth_events table  
ALTER TABLE security.auth_events ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any profile (for role management)
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Auth Events RLS Policies
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON security.auth_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System can insert auth events (via triggers/functions)
CREATE POLICY "System can insert auth events" ON security.auth_events
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Unknown'),
        COALESCE(NEW.raw_app_meta_data->>'role', 'student')
    );
    
    -- Log the signup event
    INSERT INTO security.auth_events (user_id, event_type, event_metadata, success)
    VALUES (
        NEW.id,
        'signup',
        jsonb_build_object(
            'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
            'confirmed', NEW.email_confirmed_at IS NOT NULL
        ),
        true
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle profile updates
CREATE OR REPLACE FUNCTION public.handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    -- Log profile update if significant fields changed
    IF OLD.role != NEW.role OR OLD.full_name != NEW.full_name THEN
        INSERT INTO security.auth_events (user_id, event_type, event_metadata, success)
        VALUES (
            NEW.id,
            CASE WHEN OLD.role != NEW.role THEN 'role_change' ELSE 'profile_update' END,
            jsonb_build_object(
                'old_role', OLD.role,
                'new_role', NEW.role,
                'old_name', OLD.full_name,
                'new_name', NEW.full_name
            ),
            true
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log auth events
CREATE OR REPLACE FUNCTION security.log_auth_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO security.auth_events (
        user_id, event_type, event_metadata, ip_address, 
        user_agent, success, error_message
    )
    VALUES (
        p_user_id, p_event_type, p_metadata, p_ip_address,
        p_user_agent, p_success, p_error_message
    )
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for profile updates
CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_update();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert a default admin user profile (if auth.users already has an admin)
-- This is for development/testing purposes
-- INSERT INTO public.profiles (id, email, full_name, role, has_completed_onboarding)
-- SELECT 
--     id, 
--     email, 
--     COALESCE(raw_user_meta_data->>'full_name', 'System Admin'),
--     'admin',
--     true
-- FROM auth.users 
-- WHERE email = 'admin@learn-x.com'
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA security TO authenticated;

-- Grant permissions on profiles table
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select permission on auth_events for admins (enforced by RLS)
GRANT SELECT ON security.auth_events TO authenticated;

-- Grant execute permission on logging function
GRANT EXECUTE ON FUNCTION security.log_auth_event TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE security.auth_events IS 'Audit log for all authentication-related events';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile and logs signup when new user registers';
COMMENT ON FUNCTION public.handle_profile_update() IS 'Updates timestamp and logs significant profile changes';
COMMENT ON FUNCTION security.log_auth_event IS 'Utility function to log authentication events from application code';

-- =====================================================
-- VERIFY SETUP
-- =====================================================

-- Verify tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Profiles table was not created successfully';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_events' AND table_schema = 'security') THEN
        RAISE EXCEPTION 'Auth events table was not created successfully';
    END IF;
    
    RAISE NOTICE 'Authentication system setup completed successfully!';
END $$;