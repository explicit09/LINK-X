# Authentication System - Technical Architecture

## Overview

This document defines the technical architecture for our unified Supabase authentication system, emphasizing simplicity, modularity, and reusability across all LEARN-X applications.

## Core Architecture Principles

### 1. Single Source of Truth
- **Supabase Auth** as the only authentication provider
- **One unified client** for all auth operations
- **Context API** for global state management
- **No custom backend auth logic**

### 2. Modular Design
- **Reusable auth service** across all components
- **Composable hooks** for different auth scenarios
- **Pluggable UI components** with consistent interfaces
- **Environment-agnostic** configuration

### 3. Developer Experience
- **Simple API**: One hook for all auth needs
- **TypeScript first**: Full type safety
- **Zero configuration**: Works out of the box
- **Declarative**: Focus on what, not how

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Components    │    │     Hooks       │                │
│  │                 │    │                 │                │
│  │ • LoginForm     │◄──►│ • useAuth()     │                │
│  │ • SignupForm    │    │ • useAuthGuard()│                │
│  │ • AuthGuard     │    │ • useProfile()  │                │
│  │ • UserProfile   │    │                 │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           └───────────┬───────────┘                        │
│                       ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              AuthContext (Global State)                ││
│  │                                                        ││
│  │ • User session                                         ││
│  │ • Authentication methods                               ││
│  │ • Loading states                                       ││
│  │ • Error handling                                       ││
│  └─────────────────────────────────────────────────────────┘│
│                       │                                    │
├───────────────────────┼────────────────────────────────────┤
│                       ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                Auth Service Layer                      ││
│  │                                                        ││
│  │ • signIn(email, password)                              ││
│  │ • signUp(email, password)                              ││
│  │ • signInWithGoogle()                                   ││
│  │ • signOut()                                            ││
│  │ • resetPassword(email)                                 ││
│  │ • refreshSession()                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                       │                                    │
└───────────────────────┼────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Client                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────┐    ┌─────────────────┐                 │
│ │   Auth Module   │    │   Database      │                 │
│ │                 │    │                 │                 │
│ │ • User mgmt     │◄──►│ • auth.users    │                 │
│ │ • Sessions      │    │ • public.profiles│                │
│ │ • OAuth         │    │ • security.*    │                 │
│ │ • Tokens        │    │ • RLS policies  │                 │
│ └─────────────────┘    └─────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. AuthProvider (Context)

```typescript
// contexts/AuthProvider.tsx
interface AuthContextType {
  // State
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  
  // Methods
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  
  // Computed
  isAuthenticated: boolean
  userRole: 'student' | 'instructor' | 'admin'
  hasPermission: (permission: string) => boolean
}
```

**Responsibilities:**
- Manage global authentication state
- Provide auth methods to all components
- Handle session initialization and updates
- Manage loading and error states
- Subscribe to Supabase auth changes

### 2. AuthService (Business Logic)

```typescript
// lib/auth/authService.ts
class AuthService {
  private supabase: SupabaseClient
  
  async signIn(email: string, password: string): Promise<AuthResponse>
  async signUp(email: string, password: string): Promise<AuthResponse>
  async signInWithOAuth(provider: 'google'): Promise<AuthResponse>
  async signInWithOtp(email: string): Promise<AuthResponse>
  async signOut(): Promise<void>
  async resetPassword(email: string): Promise<void>
  async refreshSession(): Promise<Session | null>
  async getCurrentUser(): Promise<User | null>
  
  // Role & Permission helpers
  getUserRole(user: User): UserRole
  hasPermission(user: User, permission: string): boolean
  
  // Event logging
  private logAuthEvent(event: AuthEvent): Promise<void>
}
```

**Responsibilities:**
- Encapsulate all Supabase auth operations
- Provide consistent error handling
- Log authentication events
- Handle role and permission logic
- Abstract Supabase implementation details

### 3. Hooks Layer

```typescript
// hooks/useAuth.ts
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// hooks/useAuthGuard.ts
export function useAuthGuard(redirectTo: string = '/login') {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, loading, redirectTo])
}

// hooks/usePermission.ts
export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}
```

### 4. UI Components

```typescript
// components/auth/LoginForm.tsx
export function LoginForm() {
  const { signIn, signInWithGoogle, loading, error } = useAuth()
  // Form logic...
}

// components/auth/ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  useAuthGuard()
  const { loading } = useAuth()
  
  if (loading) return <LoadingSpinner />
  return <>{children}</>
}
```

## File Structure

```
frontend/
├── contexts/
│   └── AuthProvider.tsx          # Global auth context
├── hooks/
│   ├── useAuth.ts               # Main auth hook
│   ├── useAuthGuard.ts          # Route protection
│   └── usePermission.ts         # Permission checking
├── lib/
│   ├── auth/
│   │   ├── authService.ts       # Core auth service
│   │   ├── types.ts             # TypeScript types
│   │   └── constants.ts         # Auth constants
│   └── supabase/
│       ├── client.ts            # Browser client
│       └── server.ts            # Server client
├── components/
│   └── auth/
│       ├── LoginForm.tsx        # Email/password login
│       ├── SignupForm.tsx       # Registration form
│       ├── GoogleSignin.tsx     # OAuth button
│       ├── ForgotPassword.tsx   # Password reset
│       ├── ProtectedRoute.tsx   # Route guard
│       └── UserProfile.tsx      # Profile display
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   ├── signup/
│   │   │   └── page.tsx         # Signup page
│   │   └── reset-password/
│   │       └── page.tsx         # Password reset
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts         # OAuth callback
│   └── layout.tsx               # Root layout with AuthProvider
└── middleware.ts                # Session handling
```

## Configuration Management

### Environment Variables
```typescript
// lib/auth/config.ts
export const authConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  oauth: {
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  },
  session: {
    refreshThreshold: 300, // 5 minutes
    maxRetries: 3,
  },
  routes: {
    login: '/login',
    signup: '/signup',
    dashboard: '/dashboard',
    unauthorized: '/unauthorized',
  }
}
```

### Type Definitions
```typescript
// lib/auth/types.ts
export type UserRole = 'student' | 'instructor' | 'admin'

export interface AuthUser extends User {
  role: UserRole
  profile?: UserProfile
}

export interface UserProfile {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface AuthError {
  message: string
  code?: string
  details?: any
}

export type AuthEvent = 
  | 'sign_up'
  | 'sign_in' 
  | 'sign_out'
  | 'password_reset'
  | 'email_confirmation'
  | 'role_change'
```

## Integration Patterns

### 1. Page-Level Protection
```typescript
// app/dashboard/page.tsx
export default function DashboardPage() {
  useAuthGuard() // Redirects if not authenticated
  
  const { user } = useAuth()
  return <div>Welcome {user?.email}!</div>
}
```

### 2. Component-Level Protection
```typescript
// components/AdminPanel.tsx
export function AdminPanel() {
  const hasAdminAccess = usePermission('admin:view')
  
  if (!hasAdminAccess) {
    return <div>Access denied</div>
  }
  
  return <div>Admin panel content</div>
}
```

### 3. Conditional Rendering
```typescript
// components/Header.tsx
export function Header() {
  const { isAuthenticated, user, signOut } = useAuth()
  
  return (
    <header>
      {isAuthenticated ? (
        <div>
          <span>Hello, {user?.email}</span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <Link href="/login">Sign In</Link>
      )}
    </header>
  )
}
```

## Performance Considerations

### 1. Lazy Loading
- Auth context initializes only when needed
- OAuth redirects don't block app initialization
- Profile data loaded asynchronously

### 2. Caching Strategy
- Session data cached in localStorage
- User profile cached in React state
- Automatic background refresh

### 3. Bundle Optimization
- Tree-shakeable auth modules
- Conditional OAuth provider loading
- Minimal dependencies

## Security Architecture

### 1. Client-Side Security
- No sensitive data in localStorage
- Automatic token refresh
- Secure cookie configuration
- XSS protection via CSP

### 2. Server-Side Security
- Row Level Security (RLS) policies
- Secure JWT validation
- Rate limiting on auth endpoints
- Audit logging for all actions

### 3. Network Security
- HTTPS enforcement
- CORS configuration
- Request signing
- Token expiration handling

## Testing Strategy

### 1. Unit Tests
- AuthService methods
- Hook behavior
- Component rendering
- Error handling

### 2. Integration Tests
- End-to-end auth flows
- OAuth callback handling
- Session persistence
- Role-based access

### 3. Security Tests
- Token validation
- Permission enforcement
- XSS prevention
- CSRF protection

---

**Document Version**: v1.0  
**Phase**: 0 - Planning & Design  
**Last Updated**: Phase 0 - Architecture Definition