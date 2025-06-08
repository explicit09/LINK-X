-- Authentication System - Initial Setup Migration
-- Phase 1: Supabase Project Setup
-- File: migrations/001_initial_auth_setup.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create security schema for audit logging
CREATE SCHEMA IF NOT EXISTS security;

-- Grant usage on security schema to authenticated users
GRANT USAGE ON SCHEMA security TO authenticated;
GRANT USAGE ON SCHEMA security TO service_role;

-- Create custom types for authentication events
CREATE TYPE security.auth_event_type AS ENUM (
  'sign_up',
  'sign_in',
  'sign_out',
  'password_reset',
  'email_confirmation',
  'role_change',
  'failed_login',
  'account_locked'
);

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM (
  'student',
  'instructor', 
  'admin'
);

-- Comment on setup
COMMENT ON SCHEMA security IS 'Schema for authentication audit logging and security functions';
COMMENT ON TYPE security.auth_event_type IS 'Enumeration of all possible authentication events for audit logging';
COMMENT ON TYPE public.user_role IS 'User roles for role-based access control (student, instructor, admin)';

-- Verification queries (uncomment to test)
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'security';
-- SELECT unnest(enum_range(NULL::security.auth_event_type));
-- SELECT unnest(enum_range(NULL::public.user_role));