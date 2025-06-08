# Authentication System Design Document
**Phase 0: Planning & Design**

## Overview
Unified Authentication System with Supabase for LEARN-X platform, designed to provide secure, scalable, and developer-friendly authentication across all apps and services.

## Data Architecture & ERD

### Core Tables Structure

```sql
-- Supabase Auth Schema (managed by Supabase)
auth.users {
  id: uuid (PK)
  email: text
  email_confirmed_at: timestamp
  created_at: timestamp
  updated_at: timestamp
  app_metadata: jsonb {
    role: 'student' | 'instructor' | 'admin'
    provider: 'email' | 'google' | 'microsoft'
  }
  user_metadata: jsonb {
    full_name: text
    avatar_url: text
  }
}

-- Public Schema (our custom tables)
public.profiles {
  id: uuid (PK, FK -> auth.users.id)
  email: text (unique, not null)
  full_name: text
  avatar_url: text
  role: text (default: 'student')
  has_completed_onboarding: boolean (default: false)
  created_at: timestamp (default: now())
  updated_at: timestamp (default: now())
  
  -- RLS Policies:
  -- Users can read their own profile
  -- Users can update their own profile
  -- Admins can read all profiles
}

-- Security/Audit Schema
security.auth_events {
  id: uuid (PK, default: gen_random_uuid())
  user_id: uuid (FK -> auth.users.id)
  event_type: text ('login', 'logout', 'signup', 'password_reset', 'profile_update')
  event_metadata: jsonb {
    ip_address: text
    user_agent: text
    provider: text
    success: boolean
    error_message: text?
  }
  created_at: timestamp (default: now())
  
  -- RLS Policies:
  -- Only admins can read audit logs
  -- System triggers can insert events
}
```

### Role-Based Access Control (RBAC)

#### Role Hierarchy
```
admin
├── Can access all platform features
├── Can view audit logs
├── Can manage user roles
└── MFA enforced

instructor  
├── Can create and manage courses
├── Can view student progress
├── Can access instructor dashboard
└── Optional MFA

student (default)
├── Can enroll in courses
├── Can view own progress
├── Can update own profile
└── No MFA required
```

#### Role Assignment Flow
1. **New User Signup** → Default role: `student`
2. **Admin Promotion** → Manual role change via admin panel
3. **Instructor Invitation** → Role assigned during signup with invite code

## User Flow Diagrams

### 1. New User Registration Flow
```
[Landing Page] 
    ↓ (Click "Sign Up")
[Sign Up Form]
    ├── Email + Password → [Email Verification] → [Onboarding]
    └── Google OAuth → [OAuth Consent] → [Profile Creation] → [Onboarding]
    ↓
[Dashboard] (role-based redirect)
```

### 2. Returning User Login Flow
```
[Login Page]
    ├── Email + Password → [Dashboard]
    ├── Magic Link → [Email] → [Auto Login] → [Dashboard]
    └── Google OAuth → [Dashboard]
    
[Dashboard Redirect Logic]
    ├── student → /student/dashboard
    ├── instructor → /instructor/dashboard  
    └── admin → /admin/dashboard
```

### 3. Session Management Flow
```
[Page Load]
    ↓
[Middleware Check]
    ├── Valid Session → [Continue]
    ├── Expired Session → [Silent Refresh] → [Continue]
    └── No Session → [Redirect to Login]
```

## Authentication Methods Supported

### Primary Methods
1. **Email + Password**
   - Double opt-in verification
   - Password strength requirements
   - Account lockout after failed attempts

2. **Magic Link**
   - Passwordless login
   - Email-based verification
   - One-time use tokens

3. **Google OAuth**
   - One-click signup/signin
   - Profile data import
   - Automatic role assignment

### Future Methods (Phase 2+)
- Microsoft OAuth
- TOTP MFA (required for admins)
- SMS verification

## Security Requirements

### Row Level Security (RLS) Policies
```sql
-- Profiles table policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles  
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        (auth.jwt() ->> 'app_metadata')::json ->> 'role' = 'admin'
    );

-- Auth events policies  
CREATE POLICY "Admins can view audit logs" ON security.auth_events
    FOR SELECT USING (
        (auth.jwt() ->> 'app_metadata')::json ->> 'role' = 'admin'
    );
```

### Security Headers & Configuration
- CSP headers for OAuth protection
- Rate limiting on auth endpoints
- Secure cookie configuration
- HTTPS enforcement in production

## Technical Implementation Plan

### 1. Supabase Client Configuration
```typescript
// lib/supabase/client.ts - Browser client
// lib/supabase/server.ts - Server client  
// lib/supabase/middleware.ts - SSR middleware
```

### 2. Auth Context Provider
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
  
  // Methods
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, metadata: object) => Promise<AuthResult>  
  signInWithGoogle: () => Promise<AuthResult>
  signInWithMagicLink: (email: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  updateProfile: (updates: Partial<Profile>) => Promise<AuthResult>
  
  // State
  isAuthenticated: boolean
  needsOnboarding: boolean
  userRole: 'student' | 'instructor' | 'admin'
}
```

### 3. Database Triggers & Functions
```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_app_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth Providers
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Security
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_MFA=true
NEXT_PUBLIC_ENABLE_AUDIT_LOGS=true
```

## Performance & Monitoring

### Key Metrics to Track
- Authentication success rate (target: ≥95%)
- Login latency P95 (target: <300ms)  
- Session persistence rate
- OAuth conversion rate
- Failed login attempts (security)

### Monitoring Setup
- Supabase built-in analytics
- Custom event tracking for auth flows
- Error boundary for auth components
- Performance monitoring for auth pages

## Next Steps (Phase 1)

1. **Setup Supabase Project**
   - Create database tables and RLS policies
   - Configure OAuth providers
   - Set up audit logging

2. **Implement Core Auth Service**
   - Create authService.ts with typed methods
   - Implement AuthContext provider
   - Add SSR middleware

3. **Build Auth UI Components**
   - Login/signup forms with validation
   - OAuth buttons
   - Password reset flow
   - Profile management

4. **Testing Strategy**
   - Unit tests for auth service
   - Integration tests for auth flows
   - E2E tests with Cypress
   - Security testing

---

**Document Version**: v1.0  
**Last Updated**: Phase 0 - Planning  
**Next Review**: After Phase 1 Implementation