# Authentication System - User Flow Diagrams

## Overview

This document outlines all user flows for the unified Supabase authentication system, covering sign-up, sign-in, password reset, and social authentication.

## 1. Email + Password Sign-Up Flow

```mermaid
flowchart TD
    A[User clicks Sign Up] --> B[Enter email & password]
    B --> C[Submit form]
    C --> D[Supabase creates user]
    D --> E[Send confirmation email]
    E --> F[User receives email]
    F --> G[Click confirmation link]
    G --> H[Email confirmed]
    H --> I[Auto-create profile]
    I --> J[Log auth event]
    J --> K[Redirect to dashboard]
```

**Key Steps:**
1. User fills sign-up form with email/password
2. Supabase creates user in `auth.users` (unconfirmed)
3. Confirmation email sent automatically
4. User clicks email link → email confirmed
5. Database trigger creates `public.profiles` record
6. Auth event logged to `security.auth_events`
7. User redirected to dashboard

## 2. Google OAuth Sign-Up/Sign-In Flow

```mermaid
flowchart TD
    A[User clicks 'Sign in with Google'] --> B[Redirect to Google OAuth]
    B --> C[User authorizes app]
    C --> D[Google redirects to /auth/callback]
    D --> E{User exists?}
    E -->|No| F[Create new user]
    E -->|Yes| G[Update existing user]
    F --> H[Auto-create profile]
    G --> H
    H --> I[Log auth event]
    I --> J[Redirect to dashboard]
```

**Key Steps:**
1. User clicks Google sign-in button
2. Redirect to Google OAuth consent screen
3. User grants permissions
4. Google redirects to `/auth/callback?code=...`
5. Supabase exchanges code for user data
6. If new user: create profile, if existing: update session
7. Log authentication event
8. Redirect to dashboard

## 3. Magic Link Sign-In Flow

```mermaid
flowchart TD
    A[User enters email] --> B[Click 'Send Magic Link']
    B --> C[Supabase sends magic link]
    C --> D[User receives email]
    D --> E[Click magic link]
    E --> F[Redirect to /auth/callback]
    F --> G[Supabase validates token]
    G --> H[Create session]
    H --> I[Log auth event]
    I --> J[Redirect to dashboard]
```

**Key Steps:**
1. User enters email address only
2. Supabase sends magic link to email
3. User clicks link in email
4. Token validated and session created
5. Auth event logged
6. Redirect to intended destination

## 4. Password Reset Flow

```mermaid
flowchart TD
    A[User clicks 'Forgot Password'] --> B[Enter email address]
    B --> C[Submit reset request]
    C --> D[Supabase sends reset email]
    D --> E[User receives email]
    E --> F[Click reset link]
    F --> G[Redirect to reset page]
    G --> H[Enter new password]
    H --> I[Submit new password]
    I --> J[Password updated]
    J --> K[Log auth event]
    K --> L[Auto sign-in]
    L --> M[Redirect to dashboard]
```

**Key Steps:**
1. User requests password reset
2. Reset email sent with secure token
3. User clicks reset link
4. Redirected to password reset form
5. New password submitted and updated
6. User automatically signed in
7. Event logged and redirected

## 5. Session Management Flow

```mermaid
flowchart TD
    A[User visits app] --> B{Has valid session?}
    B -->|Yes| C[Access granted]
    B -->|No| D{Has refresh token?}
    D -->|Yes| E[Auto-refresh session]
    D -->|No| F[Redirect to login]
    E --> G{Refresh successful?}
    G -->|Yes| C
    G -->|No| F
    C --> H[Continue using app]
    F --> I[Show login page]
```

**Key Steps:**
1. Every request checks for valid session
2. If session expired, attempt refresh
3. If refresh fails, redirect to login
4. If refresh succeeds, continue with request

## 6. Role Assignment Flow

```mermaid
flowchart TD
    A[User signs up] --> B[Default role: 'student']
    B --> C[Profile created with role]
    C --> D[Admin wants to change role]
    D --> E[Admin updates user.app_metadata.role]
    E --> F[Trigger updates profiles.role]
    F --> G[Log role change event]
    G --> H[User permissions updated]
```

**Role Assignment Rules:**
- **Default**: All new users get `student` role
- **Instructor**: Must be manually assigned by admin
- **Admin**: Must be manually assigned by existing admin
- **Changes**: Logged in `auth_events` for audit trail

## 7. Authentication Context Flow

```mermaid
flowchart TD
    A[App loads] --> B[AuthProvider initializes]
    B --> C[Check for existing session]
    C --> D{Session found?}
    D -->|Yes| E[Set user state]
    D -->|No| F[Set anonymous state]
    E --> G[Subscribe to auth changes]
    F --> G
    G --> H[Render app with auth state]
    H --> I[User action triggers auth]
    I --> J[Auth state updates]
    J --> K[Components re-render]
```

## 8. Error Handling Flows

### Authentication Errors
```mermaid
flowchart TD
    A[Auth action attempted] --> B{Valid request?}
    B -->|No| C[Show validation error]
    B -->|Yes| D[Send to Supabase]
    D --> E{Supabase response?}
    E -->|Error| F[Show auth error message]
    E -->|Success| G[Continue normal flow]
    F --> H[User can retry]
    C --> H
```

### Network Errors
```mermaid
flowchart TD
    A[Network request fails] --> B[Show retry option]
    B --> C[User clicks retry]
    C --> D[Attempt request again]
    D --> E{Success?}
    E -->|Yes| F[Continue normal flow]
    E -->|No| G[Show offline message]
```

## 9. Security Flow Checkpoints

### Session Validation
1. **Client-side**: Check session on route changes
2. **Server-side**: Validate session on API requests
3. **Middleware**: Refresh tokens automatically
4. **RLS**: Database-level permission checks

### Audit Logging Points
1. **Sign up**: New user creation
2. **Sign in**: Successful authentication
3. **Sign out**: Session termination
4. **Password reset**: Security-sensitive action
5. **Role changes**: Permission modifications
6. **Failed attempts**: Security monitoring

## 10. Integration Points

### Frontend Components
- **AuthProvider**: Manages global auth state
- **useAuth Hook**: Provides auth methods to components
- **AuthGuard**: Protects routes requiring authentication
- **Login/Signup Forms**: User interface components

### Backend Integration
- **Middleware**: Handles auth state in Next.js
- **API Routes**: Server-side authentication checks
- **Database Triggers**: Automatic profile creation
- **Webhooks**: External system notifications

## Implementation Priority

### Phase 1: Core Auth (Week 1)
1. ✅ Email/password authentication
2. ✅ Magic link authentication  
3. ✅ Basic session management
4. ✅ Profile creation trigger

### Phase 2: Social Auth (Week 2)
1. ✅ Google OAuth integration
2. ✅ Callback handling
3. ✅ Account linking

### Phase 3: Security & RBAC (Week 3)
1. ✅ Role-based access control
2. ✅ Audit logging
3. ✅ MFA for admins

### Phase 4: Polish & Monitoring (Week 4)
1. ✅ Error handling refinement
2. ✅ Performance optimization
3. ✅ Monitoring dashboards

---

**Document Version**: v1.0  
**Phase**: 0 - Planning & Design  
**Last Updated**: Phase 0 - User Flow Definition