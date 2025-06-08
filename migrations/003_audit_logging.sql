-- Authentication System - Audit Logging Migration
-- Phase 1: Supabase Project Setup
-- File: migrations/003_audit_logging.sql

-- Create auth events table for audit logging
CREATE TABLE security.auth_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type security.auth_event_type NOT NULL,
  event_details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT auth_events_user_agent_length CHECK (char_length(user_agent) <= 500),
  CONSTRAINT auth_events_error_message_length CHECK (char_length(error_message) <= 1000),
  CONSTRAINT auth_events_session_id_format CHECK (session_id IS NULL OR char_length(session_id) >= 10)
);

-- Create indexes for efficient querying
CREATE INDEX idx_auth_events_user_id ON security.auth_events(user_id);
CREATE INDEX idx_auth_events_event_type ON security.auth_events(event_type);
CREATE INDEX idx_auth_events_created_at ON security.auth_events(created_at);
CREATE INDEX idx_auth_events_ip_address ON security.auth_events(ip_address);
CREATE INDEX idx_auth_events_success ON security.auth_events(success);

-- Composite indexes for common queries
CREATE INDEX idx_auth_events_user_type_time ON security.auth_events(user_id, event_type, created_at DESC);
CREATE INDEX idx_auth_events_failed_attempts ON security.auth_events(user_id, created_at DESC) WHERE success = false;

-- Create function to log authentication events
CREATE OR REPLACE FUNCTION security.log_auth_event(
  p_user_id UUID,
  p_event_type security.auth_event_type,
  p_event_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO security.auth_events (
    user_id,
    event_type,
    event_details,
    ip_address,
    user_agent,
    session_id,
    success,
    error_message
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_details,
    p_ip_address,
    p_user_agent,
    p_session_id,
    p_success,
    p_error_message
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user login history
CREATE OR REPLACE FUNCTION security.get_user_login_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  event_id UUID,
  event_type security.auth_event_type,
  success BOOLEAN,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.id,
    ae.event_type,
    ae.success,
    ae.ip_address,
    ae.user_agent,
    ae.created_at
  FROM security.auth_events ae
  WHERE ae.user_id = p_user_id
    AND ae.event_type IN ('sign_in', 'sign_out', 'failed_login')
  ORDER BY ae.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to detect suspicious activity
CREATE OR REPLACE FUNCTION security.detect_failed_login_attempts(
  p_user_id UUID,
  p_time_window INTERVAL DEFAULT '15 minutes',
  p_max_attempts INTEGER DEFAULT 5
) RETURNS BOOLEAN AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO failed_count
  FROM security.auth_events
  WHERE user_id = p_user_id
    AND event_type = 'failed_login'
    AND created_at > NOW() - p_time_window;
    
  RETURN failed_count >= p_max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create automatic profile creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'student')::public.user_role
  );
  
  -- Log the sign up event
  PERFORM security.log_auth_event(
    NEW.id,
    'sign_up'::security.auth_event_type,
    jsonb_build_object(
      'email', NEW.email,
      'provider', COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email'),
      'confirmed', NEW.email_confirmed_at IS NOT NULL
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security on auth_events
ALTER TABLE security.auth_events ENABLE ROW LEVEL SECURITY;

-- Add table and function comments
COMMENT ON TABLE security.auth_events IS 'Comprehensive audit log for all authentication events';
COMMENT ON COLUMN security.auth_events.user_id IS 'Reference to auth.users.id (nullable for anonymous events)';
COMMENT ON COLUMN security.auth_events.event_type IS 'Type of authentication event';
COMMENT ON COLUMN security.auth_events.event_details IS 'Additional event-specific data in JSON format';
COMMENT ON COLUMN security.auth_events.ip_address IS 'Client IP address when event occurred';
COMMENT ON COLUMN security.auth_events.user_agent IS 'Client user agent string';
COMMENT ON COLUMN security.auth_events.session_id IS 'Session identifier if available';
COMMENT ON COLUMN security.auth_events.success IS 'Whether the event was successful';
COMMENT ON COLUMN security.auth_events.error_message IS 'Error message for failed events';

COMMENT ON FUNCTION security.log_auth_event IS 'Function to log authentication events with full context';
COMMENT ON FUNCTION security.get_user_login_history IS 'Get recent login history for a user';
COMMENT ON FUNCTION security.detect_failed_login_attempts IS 'Detect potential brute force attacks';
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically create profile and log event for new users';

-- Verification queries (uncomment to test)
-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'auth_events' AND table_schema = 'security';
-- SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'security';