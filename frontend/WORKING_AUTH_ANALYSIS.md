# Working Authentication Flow & Database Connection Analysis

## Overview
This document analyzes the current working authentication flow and database connections in the LINK-X1 frontend to ensure they're preserved during refactoring.

## 1. Working Authentication Flow

### Core Components

#### A. Firebase Authentication Foundation
- **Primary Auth**: Firebase Auth manages user authentication
- **Config**: Located in `firebaseconfig.ts` (referenced but not examined)
- **Domain Handling**: Automatically redirects from `127.0.0.1` to `localhost` for Firebase compatibility

#### B. AuthService (Singleton Pattern) - `/lib/auth-service.ts`
**Key Features:**
- Singleton instance managing authentication state
- JWT token management with automatic refresh
- localStorage persistence for auth state
- Automatic token refresh 5 minutes before expiry

**Critical Methods:**
- `login(firebaseUser)`: Establishes backend session using Firebase ID token
- `getValidToken()`: Returns valid JWT token or Firebase token as fallback
- `refreshTokens()`: Automatically refreshes JWT tokens
- `checkRegistrationStatus()`: Checks if user completed onboarding
- `makeAuthenticatedRequest()`: Wrapper for authenticated API calls

**Authentication Flow:**
1. Firebase authenticates user
2. AuthService gets Firebase ID token
3. Calls `/api/v2/auth/login` with ID token
4. Backend returns JWT access/refresh tokens
5. Tokens stored in localStorage with expiry
6. Auto-refresh scheduled before expiry

#### C. FirebaseAuthProvider - `/components/auth/FirebaseAuthProvider.tsx`
**Responsibilities:**
- Wraps app with Firebase auth state monitoring
- Calls `authAPI.v2.checkRegistration()` when user authenticates
- Redirects to onboarding if user not registered
- Handles domain authorization issues

**Key Flow:**
1. `onAuthStateChanged` triggers when Firebase auth state changes
2. Gets fresh Firebase token: `user.getIdToken(true)`
3. Checks registration: `authAPI.v2.checkRegistration()`
4. If registered: calls `sessionLogin()` to establish backend session
5. If not registered: redirects to `/onboarding`

### Authentication State Management

#### Current Auth State Structure:
```typescript
interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
  } | null;
  user: {
    id: string;
    email: string;
    role: 'student' | 'instructor' | 'admin';
    profile?: {
      name?: string;
      university?: string;
    };
  } | null;
}
```

## 2. API Connection Patterns

### A. API Client - `/lib/api/client.ts`
**Authentication Strategy:**
- Primary: Backend JWT tokens via `Authorization: Bearer {token}`
- Fallback: Firebase tokens via `X-Firebase-Token: {token}`
- Cookie support with `credentials: 'include'`
- Automatic retry on 401 with token refresh

**Key Features:**
- Timeout handling (30s default)
- Retry logic for network/server errors
- FormData detection for file uploads
- Streaming support for real-time content

### B. Working API Endpoints

#### Auth Endpoints (`/lib/api/endpoints/auth.ts`):
- `authAPI.v2.getProfile()`: Gets user profile data
- `authAPI.v2.checkRegistration()`: Checks if user is registered
- `authAPI.v2.register()`: Completes user registration

#### Backend V2 Endpoints (`/docker-image/src/api/v2_endpoints/auth.py`):
- `POST /api/v2/auth/login`: Firebase token → JWT tokens
- `GET /api/v2/auth/check-registration`: Check registration status
- `POST /api/v2/auth/register`: Complete user registration
- `GET /api/v2/auth/me`: Get comprehensive user profile

### C. Response Format Standards
**V2 API Responses:**
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Success",
  "timestamp": "ISO timestamp"
}
```

## 3. Working Components Analysis

### A. Dashboard Page (`/app/(dash)/dashboard/page.tsx`)
**Working Patterns:**
- Uses `useAuthGuard(true)` for authentication protection
- Calls `authAPI.v2.getProfile()` to get user data
- Handles wrapped response: `response.data || response`
- Extracts name from `userData.profile?.name`
- Falls back gracefully on API errors

**Data Extraction Pattern:**
```typescript
const response = await authAPI.v2.getProfile();
const userData = response.data; // Handle wrapped response
const userRole = userData.role || 'student';
const name = userData.profile?.name || userData.email?.split('@')[0] || 'User';
```

### B. Study Plan Page (`/app/study-plan/page.tsx`)
**Working Features:**
- Same auth pattern as dashboard
- Uses complex hooks for data fetching (`useStudyPlans.ts`)
- API health checking with fallback states
- Skeleton loading states for UX
- Comprehensive error handling

**Key Hooks Used:**
- `useStudyPlanDashboard()`: Composite hook for all study plan data
- `useApiQuery()` and `useApiMutation()`: Generic API hooks
- Custom hooks for specific actions (create goal, start session, etc.)

### C. Auth Guard Hook (`/hooks/useAuthGuard.ts`)
**Critical Functionality:**
- Monitors Firebase auth state changes
- Checks backend registration status
- Handles routing based on auth/registration state
- Provides loading states for UI

**State Machine:**
1. Loading → Check Firebase auth
2. If no user → Redirect to login
3. If user → Check registration
4. If registered → Set authenticated state
5. If not registered → Redirect to onboarding

## 4. Database Connection Patterns

### A. Backend Auth Service (`/docker-image/src/api/v2_endpoints/auth.py`)
**Working Patterns:**
- Uses repository pattern for database access
- Session factory for database connections
- Comprehensive error handling with proper HTTP codes
- Role-based data fetching (student/instructor/admin profiles)

### B. User Profile Data Structure
**Database Schema Integration:**
```python
# Profile data includes:
profile_data = {
    'id': str(user.id),
    'email': user.email,
    'role': user.role.role_type,
    'profile': {
        'name': user.student_profile.name,  # or instructor_profile.name
        'onboard_answers': user.student_profile.onboard_answers,
        'want_quizzes': user.student_profile.want_quizzes
    },
    'stats': {
        'enrolled_courses': len(enrollments),
        'completed_courses': completed_count
    }
}
```

## 5. Critical Preservation Points for Refactoring

### A. Authentication Flow Preservation
1. **Keep Firebase as primary auth**: All working components expect Firebase
2. **Preserve AuthService singleton**: Components rely on this centralized state
3. **Maintain token refresh mechanism**: Automatic refresh prevents auth failures
4. **Keep registration check flow**: Critical for onboarding redirection

### B. API Client Preservation
1. **Dual token support**: Backend JWT + Firebase token fallback
2. **Automatic retry logic**: Prevents transient failures
3. **Response format handling**: V2 wrapped responses vs direct responses
4. **Error handling patterns**: Specific handling for 401, 404, etc.

### C. Component Data Patterns
1. **Response unwrapping**: `response.data || response` pattern
2. **Profile name extraction**: `userData.profile?.name` fallback chain
3. **Role-based rendering**: Switch between student/instructor/admin
4. **Graceful error fallbacks**: Default values when API fails

### D. Hook Patterns
1. **useAuthGuard**: Critical for page-level auth protection
2. **useApiQuery/Mutation**: Standard pattern for data fetching
3. **Composite hooks**: Like `useStudyPlanDashboard` for complex data
4. **Loading/error states**: Consistent UX patterns

## 6. Environment Configuration
- **API URL**: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'`
- **Firebase Config**: Separate config file (not examined but referenced)
- **CORS**: `credentials: 'include'` for cookie support

## 7. Key Files to Preserve During Refactoring
1. `/lib/auth-service.ts` - Core authentication logic
2. `/lib/api/client.ts` - API client with retry/error handling
3. `/lib/api/endpoints/auth.ts` - Auth API endpoints
4. `/hooks/useAuthGuard.ts` - Page-level auth protection
5. `/hooks/useStudyPlans.ts` - Working study plan hooks
6. `/components/auth/FirebaseAuthProvider.tsx` - Firebase integration

## 8. Testing Working Components
To verify the working flow:
1. Check Firebase authentication works
2. Verify backend session establishment
3. Test user profile fetching
4. Confirm onboarding redirection
5. Validate study plan data loading

This analysis ensures that the working authentication flow and database connections remain functional during any refactoring efforts.