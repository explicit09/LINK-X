# LEARN-X Authentication Flow Documentation

## Overview
This document describes the complete authentication flow using Supabase, from user registration to API access.

## Authentication Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Supabase      │────▶│    Backend      │
│   (Next.js)     │◀────│     Auth        │◀────│    (Flask)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   AuthContext              Session/JWT              AuthService
   useAuth()                Storage                  @require_auth
```

## 1. User Registration Flow

### Frontend
```typescript
// 1. User fills registration form
const { signUp } = useAuth()

try {
  await signUp(email, password, {
    full_name: 'John Doe',
    role: 'student' // or 'instructor'
  })
  // Redirects to onboarding automatically
} catch (error) {
  // Handle errors (email taken, weak password, etc.)
}
```

### What Happens Behind the Scenes
1. **Supabase creates auth.users entry**
2. **Database trigger creates user_profiles entry**
3. **Session is established**
4. **JWT tokens are stored in localStorage**
5. **AuthContext updates with user info**
6. **User redirected to appropriate dashboard**

### Backend Profile Creation
```python
# Automatically triggered by Supabase
# docker-image/src/services/auth/supabase_auth_service.py
def create_user_profile(supabase_user, role='student'):
    # Creates user_profiles entry
    # Creates role-specific profile (student_profiles, etc.)
    # Returns complete user object
```

## 2. User Login Flow

### Frontend
```typescript
// Simple login
const { signIn } = useAuth()

try {
  await signIn(email, password)
  // Auto-redirects based on role
} catch (error) {
  // Handle invalid credentials
}

// OAuth login
const { signInWithGoogle } = useAuth()
await signInWithGoogle() // Redirects to Google
```

### Session Management
- **Access Token**: Short-lived (1 hour default)
- **Refresh Token**: Long-lived (used to get new access tokens)
- **Auto-refresh**: Happens transparently before expiry
- **Persistence**: Sessions survive page refreshes

## 3. Making Authenticated API Calls

### Frontend
```typescript
// Automatic - useApi hook adds auth headers
const { data } = await api.get('/courses')

// Manual - if needed
const token = await getAuthToken()
const response = await fetch('/api/v2/courses', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Backend Receives Request
```python
@bp.route('/courses')
@require_auth  # Automatically validates token
def get_courses():
    user = g.current_user  # Available everywhere
    # user.id, user.email, user.role, etc.
```

## 4. Page Protection

### Frontend - Protecting Routes
```typescript
// In any page component
export default function DashboardPage() {
  // This hook handles everything
  const { user, loading } = useRequireAuth()
  
  if (loading) return <LoadingSpinner />
  
  // If not authenticated, already redirected to login
  return <Dashboard user={user} />
}
```

### Frontend - Role-Based Access
```typescript
export default function InstructorPage() {
  // Only instructors and admins
  const { user, hasRole } = useRequireRole(['instructor', 'admin'])
  
  if (!hasRole) {
    // Already redirected to /unauthorized
    return null
  }
  
  return <InstructorDashboard />
}
```

## 5. Token Lifecycle

### Token Flow
```
Login/Signup → Access Token (1hr) + Refresh Token (long)
     ↓
API Calls use Access Token
     ↓
Before expiry → Auto-refresh using Refresh Token
     ↓
New Access Token → Continue API calls
     ↓
Logout → Tokens cleared
```

### Frontend Token Management
```typescript
// Handled automatically by AuthContext
// But if you need manual control:

const { refreshSession } = useAuth()

// Force refresh
await refreshSession()

// Get current token
const { session } = useAuth()
const token = session?.access_token
```

### Backend Token Validation
```python
# Automatic with decorators
@require_auth
def protected_endpoint():
    # Token already validated
    # User already in g.current_user
    pass

# Manual if needed
from services.auth.supabase_auth_service import verify_token
user = verify_token(token_string)
```

## 6. Logout Flow

### Frontend
```typescript
const { signOut } = useAuth()

await signOut()
// - Clears all tokens
// - Updates AuthContext
// - Redirects to login
```

### What Gets Cleared
1. Supabase session in localStorage
2. AuthContext state
3. Any cached user data
4. Redirects to login page

## 7. Password Reset Flow

### Request Reset
```typescript
const { resetPassword } = useAuth()

await resetPassword(email)
// User receives email with reset link
```

### Complete Reset
```typescript
// On password reset page
const { updatePassword } = useAuth()

await updatePassword(newPassword)
// Password updated, user can login
```

## 8. Error Handling

### Frontend Errors
```typescript
try {
  await signIn(email, password)
} catch (error) {
  if (error.code === 'invalid_credentials') {
    showError('Invalid email or password')
  } else if (error.code === 'email_not_confirmed') {
    showError('Please verify your email first')
  } else {
    showError('An error occurred. Please try again.')
  }
}
```

### Backend Errors
```python
# Automatic with decorators
@require_auth
def endpoint():
    # Returns 401 if no/invalid token
    # Returns 403 if wrong role
    pass

# Standardized error format
{
    "error": "Authentication required",
    "code": "AUTH_REQUIRED"
}
```

## 9. Security Best Practices

### Frontend
1. **Never store sensitive data in localStorage**
2. **Always use HTTPS in production**
3. **Implement auto-logout on inactivity**
4. **Clear tokens on logout**

### Backend
1. **Always validate tokens**
2. **Use role-based decorators**
3. **Check resource ownership**
4. **Rate limit auth endpoints**

### Implementation
```typescript
// Auto-logout after 30 minutes inactivity
function MyApp() {
  useAutoLogout(30)
  // ... rest of app
}

// Secure API calls
const api = createAPIClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000
})
```

## 10. Testing Authentication

### Frontend Testing
```typescript
// Mock auth context
const mockAuth = {
  user: { id: '123', email: 'test@example.com', role: 'student' },
  isAuthenticated: true,
  signIn: jest.fn(),
  signOut: jest.fn()
}

<AuthContext.Provider value={mockAuth}>
  <YourComponent />
</AuthContext.Provider>
```

### Backend Testing
```python
# Mock auth decorator
def mock_auth(user_role='student'):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            g.current_user = AuthUser(
                id='test-id',
                email='test@example.com',
                role=user_role
            )
            return f(*args, **kwargs)
        return decorated
    return decorator

# Use in tests
@mock_auth('instructor')
def test_instructor_endpoint():
    # Test as instructor
    pass
```

## Common Scenarios

### 1. First-Time User Flow
```
Register → Email Verification (optional) → Onboarding → Dashboard
```

### 2. Returning User Flow
```
Login → Check Session → Restore State → Last Page
```

### 3. Role Upgrade Flow
```
Student → Request Instructor → Admin Approves → Role Updated → New Permissions
```

### 4. Session Expired Flow
```
API Call → 401 Error → Auto Refresh → Retry Call → Success
```

## Troubleshooting

### "No auth token" Error
- Check if user is logged in
- Verify AuthProvider wraps app
- Check if token is being sent

### "Invalid token" Error
- Token might be expired
- Try refreshing session
- User might need to re-login

### "Insufficient permissions" Error
- Check user role
- Verify endpoint permissions
- Check resource ownership

## Summary

The authentication system is designed to be:
1. **Seamless**: Auth "just works" across pages
2. **Secure**: Tokens validated on every request
3. **Performant**: Caching and auto-refresh
4. **Developer-Friendly**: Simple hooks and decorators
5. **Maintainable**: Single source of truth

Use the provided hooks and decorators - they handle all the complexity for you!