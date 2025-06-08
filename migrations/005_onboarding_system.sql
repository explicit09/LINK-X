-- Authentication System - Onboarding System Migration
-- User Journey Enhancement
-- File: migrations/005_onboarding_system.sql

-- Add onboarding fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- Create onboarding completion function
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  user_id UUID,
  onboarding_data JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    onboarding_completed = TRUE,
    onboarding_completed_at = NOW(),
    onboarding_step = 999, -- Mark as completed
    onboarding_data = complete_onboarding.onboarding_data,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Log onboarding completion event
  INSERT INTO security.auth_events (user_id, event_type, event_details)
  VALUES (
    user_id,
    'onboarding_completed',
    jsonb_build_object(
      'completed_at', NOW(),
      'onboarding_data', complete_onboarding.onboarding_data
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update onboarding step
CREATE OR REPLACE FUNCTION public.update_onboarding_step(
  user_id UUID,
  step INTEGER,
  step_data JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    onboarding_step = step,
    onboarding_data = onboarding_data || step_data,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Log onboarding step progress
  INSERT INTO security.auth_events (user_id, event_type, event_details)
  VALUES (
    user_id,
    'onboarding_progress',
    jsonb_build_object(
      'step', step,
      'step_data', step_data,
      'timestamp', NOW()
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to initialize onboarding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for new user with onboarding tracking
  INSERT INTO public.profiles (id, email, full_name, role, onboarding_completed, onboarding_step)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'student')::public.user_role,
    FALSE, -- Always start with onboarding incomplete
    0      -- Start at step 0
  );
  
  -- Log the sign up event
  PERFORM security.log_auth_event(
    NEW.id,
    'sign_up',
    jsonb_build_object(
      'email', NEW.email,
      'provider', COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email'),
      'confirmed', NEW.email_confirmed_at IS NOT NULL,
      'onboarding_required', TRUE
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for efficient onboarding queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON public.profiles(onboarding_step);

-- Update RLS policies to include onboarding data
-- Users can view their own onboarding status
CREATE POLICY "Users can view own onboarding status" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own onboarding progress (but not completion flag directly)
CREATE POLICY "Users can update own onboarding progress" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = OLD.role  -- Can't change role
    AND (
      -- Can update onboarding step and data, but not completion flag directly
      onboarding_completed = OLD.onboarding_completed 
      OR 
      -- Allow completion only if moving from incomplete to complete
      (OLD.onboarding_completed = FALSE AND onboarding_completed = TRUE)
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether user has completed the onboarding process';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current step in onboarding process (0=not started, 999=completed)';
COMMENT ON COLUMN public.profiles.onboarding_data IS 'JSON data collected during onboarding process';

COMMENT ON FUNCTION public.complete_onboarding IS 'Mark user onboarding as completed and log the event';
COMMENT ON FUNCTION public.update_onboarding_step IS 'Update user onboarding step and log progress';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.complete_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_onboarding_step TO authenticated;