-- Authentication System - Profiles Table Migration
-- Phase 1: Supabase Project Setup
-- File: migrations/002_profiles_table.sql

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT profiles_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT profiles_full_name_length CHECK (char_length(full_name) >= 2),
  CONSTRAINT profiles_avatar_url_format CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://.+')
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles table that mirrors auth.users with additional application-specific fields';
COMMENT ON COLUMN public.profiles.id IS 'Primary key that references auth.users.id';
COMMENT ON COLUMN public.profiles.email IS 'User email address (mirrored from auth.users)';
COMMENT ON COLUMN public.profiles.full_name IS 'User display name';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile picture';
COMMENT ON COLUMN public.profiles.role IS 'User role for access control (student, instructor, admin)';
COMMENT ON CONSTRAINT profiles_email_format ON public.profiles IS 'Ensures email follows valid format';
COMMENT ON CONSTRAINT profiles_full_name_length ON public.profiles IS 'Ensures full name is at least 2 characters';
COMMENT ON CONSTRAINT profiles_avatar_url_format ON public.profiles IS 'Ensures avatar URL is a valid HTTP/HTTPS URL';

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verification queries (uncomment to test)
-- SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'profiles';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profiles';