-- Authentication System - Onboarding Systems Sync Migration
-- Bridges old Docker backend onboard_answers with new Supabase onboarding_data
-- File: migrations/006_sync_onboarding_systems.sql

-- Function to convert backend onboard_answers to Supabase onboarding_data format
CREATE OR REPLACE FUNCTION public.convert_backend_to_supabase_onboarding(
  backend_answers JSONB
) RETURNS JSONB AS $$
DECLARE
  supabase_data JSONB;
  interests_array TEXT[];
  goals_array TEXT[];
BEGIN
  -- Initialize empty structure
  supabase_data := '{
    "profile": {},
    "preferences": {},
    "settings": {}
  }'::jsonb;
  
  -- Convert interests string to array
  IF backend_answers ? 'interests' AND backend_answers->>'interests' != '' THEN
    interests_array := string_to_array(backend_answers->>'interests', ', ');
    supabase_data := jsonb_set(supabase_data, '{profile,interests}', to_jsonb(interests_array));
  END IF;
  
  -- Convert learning_goals string to array
  IF backend_answers ? 'learning_goals' AND backend_answers->>'learning_goals' != '' THEN
    goals_array := string_to_array(backend_answers->>'learning_goals', ', ');
    supabase_data := jsonb_set(supabase_data, '{profile,learning_goals}', to_jsonb(goals_array));
  END IF;
  
  -- Copy other profile fields
  IF backend_answers ? 'name' THEN
    supabase_data := jsonb_set(supabase_data, '{profile,name}', backend_answers->'name');
  END IF;
  
  -- Copy preferences
  IF backend_answers ? 'preferences' THEN
    supabase_data := jsonb_set(supabase_data, '{preferences}', backend_answers->'preferences');
  END IF;
  
  -- Copy settings
  IF backend_answers ? 'settings' THEN
    supabase_data := jsonb_set(supabase_data, '{settings}', backend_answers->'settings');
  END IF;
  
  RETURN supabase_data;
END;
$$ LANGUAGE plpgsql;

-- Function to convert Supabase onboarding_data to backend onboard_answers format
CREATE OR REPLACE FUNCTION public.convert_supabase_to_backend_onboarding(
  supabase_data JSONB
) RETURNS JSONB AS $$
DECLARE
  backend_answers JSONB;
  interests_string TEXT;
  goals_string TEXT;
BEGIN
  -- Initialize empty structure
  backend_answers := '{}'::jsonb;
  
  -- Convert interests array to string
  IF supabase_data ? 'profile' AND supabase_data->'profile' ? 'interests' THEN
    SELECT string_agg(value::text, ', ') INTO interests_string
    FROM jsonb_array_elements_text(supabase_data->'profile'->'interests');
    IF interests_string IS NOT NULL THEN
      backend_answers := jsonb_set(backend_answers, '{interests}', to_jsonb(interests_string));
    END IF;
  END IF;
  
  -- Convert learning_goals array to string
  IF supabase_data ? 'profile' AND supabase_data->'profile' ? 'learning_goals' THEN
    SELECT string_agg(value::text, ', ') INTO goals_string
    FROM jsonb_array_elements_text(supabase_data->'profile'->'learning_goals');
    IF goals_string IS NOT NULL THEN
      backend_answers := jsonb_set(backend_answers, '{learning_goals}', to_jsonb(goals_string));
    END IF;
  END IF;
  
  -- Copy other fields
  IF supabase_data ? 'profile' AND supabase_data->'profile' ? 'name' THEN
    backend_answers := jsonb_set(backend_answers, '{name}', supabase_data->'profile'->'name');
  END IF;
  
  IF supabase_data ? 'preferences' THEN
    backend_answers := jsonb_set(backend_answers, '{preferences}', supabase_data->'preferences');
  END IF;
  
  IF supabase_data ? 'settings' THEN
    backend_answers := jsonb_set(backend_answers, '{settings}', supabase_data->'settings');
  END IF;
  
  RETURN backend_answers;
END;
$$ LANGUAGE plpgsql;

-- Add migration tracking
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('006_sync_onboarding_systems', NOW());

-- Add comments for documentation
COMMENT ON FUNCTION public.convert_backend_to_supabase_onboarding IS 'Convert Docker backend onboard_answers format to Supabase onboarding_data format';
COMMENT ON FUNCTION public.convert_supabase_to_backend_onboarding IS 'Convert Supabase onboarding_data format to Docker backend onboard_answers format';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.convert_backend_to_supabase_onboarding TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_supabase_to_backend_onboarding TO authenticated; 