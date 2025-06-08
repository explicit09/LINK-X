# Authentication System - Entity Relationship Diagram (ERD)

## Overview

This document defines the database schema for our unified Supabase authentication system, focusing on simplicity and integration with Supabase's built-in auth system.

## Core Authentication Tables (Supabase Built-in)

### `auth.users` (Supabase managed)
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `email` (string, unique)
  - `email_confirmed_at` (timestamp)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `app_metadata` (jsonb) - For roles and system data
  - `user_metadata` (jsonb) - For user profile data

### `auth.sessions` (Supabase managed)
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `user_id` (UUID, FK to auth.users.id)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `expires_at` (timestamp)

## Custom Application Tables

### `public.profiles`
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Mirror user data for easier querying with RLS policies
**Key Features**:
- 1:1 relationship with auth.users
- Stores display information
- Role-based access control
- Automatic cleanup on user deletion

### `security.auth_events`
```sql
CREATE TABLE security.auth_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Audit trail for all authentication events
**Event Types**:
- `sign_up`
- `sign_in`
- `sign_out`
- `password_reset`
- `email_confirmation`
- `role_change`

## Role System

### Role Hierarchy
```
admin
├── instructor
└── student (default)
```

### Role Storage
- **Location**: `auth.users.app_metadata.role`
- **Mirrored in**: `public.profiles.role`
- **Default**: `student`

### Role Permissions Matrix

| Action | Student | Instructor | Admin |
|--------|---------|------------|-------|
| View own profile | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ |
| View courses | ✅ | ✅ | ✅ |
| Create courses | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |

## Row Level Security (RLS) Policies

### `public.profiles`
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

### `security.auth_events`
```sql
-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON security.auth_events
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

## Database Functions

### Auto-create Profile Trigger
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Auth Event Logger
```sql
CREATE OR REPLACE FUNCTION security.log_auth_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security.auth_events (user_id, event_type, event_details)
  VALUES (
    NEW.user_id,
    TG_ARGV[0],
    jsonb_build_object(
      'old_data', OLD,
      'new_data', NEW,
      'timestamp', NOW()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Action    │    │  Supabase Auth  │    │  Application    │
│                 │    │                 │    │     Tables      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Sign Up         │───▶│ auth.users      │───▶│ public.profiles │
│ Sign In         │    │ auth.sessions   │    │ security.       │
│ Sign Out        │    │                 │    │ auth_events     │
│ Password Reset  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Migration Scripts Location

All database setup scripts will be stored in:
```
/migrations/
├── 001_initial_auth_setup.sql
├── 002_profiles_table.sql
├── 003_audit_logging.sql
└── 004_rls_policies.sql
```

## Next Steps for Phase 1

1. Create Supabase project
2. Run migration scripts
3. Configure OAuth providers
4. Set up RLS policies
5. Test basic auth flow

---

**Document Version**: v1.0  
**Phase**: 0 - Planning & Design  
**Last Updated**: Phase 0 - ERD Definition