# Authentication Architecture Design

## Core Principles

1. **Single Source of Truth**: One auth service, used everywhere
2. **Seamless Flow**: Auth state persists across pages
3. **Type Safety**: Full TypeScript support
4. **Error Resilience**: Automatic retry and graceful fallbacks
5. **Performance**: Optimistic updates and caching

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│  AuthContext (Global State)                             │
│  ├── useAuth() hook                                     │
│  ├── useRequireAuth() hook                              │
│  └── useAuthActions() hook                              │
├─────────────────────────────────────────────────────────┤
│  AuthService (Business Logic)                           │
│  ├── signIn()                                           │
│  ├── signUp()                                           │
│  ├── signOut()                                          │
│  ├── refreshToken()                                     │
│  └── getSession()                                       │
├─────────────────────────────────────────────────────────┤
│  SupabaseClient (SDK Layer)                             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Flask)                       │
├─────────────────────────────────────────────────────────┤
│  AuthService (Centralized)                              │
│  ├── verify_token()                                     │
│  ├── get_user()                                         │
│  ├── create_user_profile()                              │
│  └── update_last_login()                                │
├─────────────────────────────────────────────────────────┤
│  @require_auth decorator                                │
│  @require_role decorator                                │
├─────────────────────────────────────────────────────────┤
│  SupabaseAdmin (SDK Layer)                              │
└─────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### 1. Core Auth Service (Write Once)
```typescript
// lib/auth/auth-service.ts
export class AuthService {
  private static instance: AuthService
  private supabase: SupabaseClient
  
  // Singleton pattern
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }
  
  // All auth methods in one place
  async signIn(email: string, password: string): Promise<AuthResponse>
  async signUp(email: string, password: string, metadata?: UserMetadata): Promise<AuthResponse>
  async signOut(): Promise<void>
  async resetPassword(email: string): Promise<void>
  async updatePassword(newPassword: string): Promise<void>
  async getSession(): Promise<Session | null>
  async refreshSession(): Promise<Session | null>
}
```

### 2. React Context (Global State)
```typescript
// contexts/auth-context.tsx
interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
  
  // All auth actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthProvider: React.FC = ({ children }) => {
  // Manages auth state for entire app
  // Handles persistence
  // Auto-refreshes tokens
}
```

### 3. Reusable Hooks
```typescript
// hooks/auth/index.ts

// Basic auth state
export function useAuth() {
  const context = useContext(AuthContext)
  return context
}

// Protected routes
export function useRequireAuth(redirectTo = '/login') {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo)
    }
  }, [user, loading])
  
  return { user, loading }
}

// Role-based access
export function useRequireRole(role: UserRole) {
  const { user } = useRequireAuth()
  return user?.role === role
}

// Auth actions without state
export function useAuthActions() {
  const { signIn, signUp, signOut } = useAuth()
  return { signIn, signUp, signOut }
}
```

### 4. Page Integration Pattern
```typescript
// Any page component
export default function CoursePage() {
  // One line to protect the page
  const { user } = useRequireAuth()
  
  // Or for role-specific pages
  const isProfessor = useRequireRole('instructor')
  
  // Use auth actions anywhere
  const { signOut } = useAuthActions()
  
  return <div>Protected content</div>
}
```

## Backend Architecture

### 1. Centralized Auth Service
```python
# docker-image/src/services/auth/supabase_auth_service.py
class SupabaseAuthService:
    """Single source of truth for backend auth"""
    
    def __init__(self):
        self.supabase = get_supabase_admin_client()
        self._user_cache = TTLCache(maxsize=1000, ttl=300)  # 5 min cache
    
    def verify_token(self, token: str) -> Optional[AuthUser]:
        """Verify and decode Supabase JWT"""
        # Check cache first
        # Verify with Supabase
        # Cache result
        # Return user info
    
    def get_user_with_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user with role-specific profile"""
        # Fetch from database with proper joins
        # Return complete user object
    
    def create_user_profile(self, user_id: str, role: str, **kwargs):
        """Create role-specific profile after signup"""
        # Transactional profile creation
        # Handle role-specific fields

# Global instance
auth_service = SupabaseAuthService()
```

### 2. Reusable Decorators
```python
# docker-image/src/core/auth/decorators.py
def require_auth(f):
    """Protect any endpoint with one decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_token_from_request()
        
        if not token:
            return jsonify({"error": "No token provided"}), 401
            
        user = auth_service.verify_token(token)
        if not user:
            return jsonify({"error": "Invalid token"}), 401
            
        # Inject user into request context
        g.current_user = user
        return f(*args, **kwargs)
    
    return decorated_function

def require_role(*allowed_roles):
    """Role-based access control"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            if g.current_user.role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

### 3. Clean Endpoint Pattern
```python
# Any API endpoint
@bp.route('/courses', methods=['POST'])
@require_role('instructor', 'admin')  # One line protection
def create_course():
    # current_user is automatically available
    user = g.current_user
    
    # Your business logic
    course = CourseService.create(
        creator_id=user.id,
        **request.json
    )
    
    return jsonify(course)
```

## Database Schema for Auth

```sql
-- Extend Supabase auth.users with our data
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Metadata
    preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}'
);

-- Role-specific tables reference user_profiles
CREATE TABLE public.instructor_profiles (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id),
    department TEXT,
    bio TEXT,
    expertise TEXT[]
);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());
```

## Authentication Flow

### Sign Up Flow
1. Frontend: `authService.signUp(email, password, { role })`
2. Supabase: Creates auth.users entry
3. Backend webhook: Creates user_profiles entry
4. Frontend: Auto signs in, redirects to dashboard

### Sign In Flow
1. Frontend: `authService.signIn(email, password)`
2. Supabase: Validates, returns session
3. Frontend: Stores session, updates context
4. All API calls include token automatically

### Token Refresh Flow
1. Frontend: Detects token near expiry
2. Auto calls `refreshSession()`
3. Updates stored tokens
4. No user interruption

## Key Benefits

1. **Write Once**: Auth logic in one service
2. **Use Everywhere**: Simple hooks and decorators
3. **Type Safe**: Full TypeScript/Python typing
4. **Maintainable**: Changes in one place
5. **Testable**: Mock one service
6. **Performant**: Caching and optimistic updates
7. **Secure**: Automatic token handling

## Next Steps

1. Implement core auth service
2. Create React context provider
3. Build reusable hooks
4. Update backend decorators
5. Migrate existing endpoints