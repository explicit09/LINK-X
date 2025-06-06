# Auth Persistence and Course Duplication Fixes

## Summary of Changes

### 1. Auth Persistence Fix

**Problem**: Users had to log in again after refreshing the page because the auth system wasn't checking for existing Supabase sessions on page load.

**Solution**:
- Created `auth-initializer.ts` to check for existing Supabase sessions on app startup
- Updated `useAuthGuard` hook to use the auth initializer on mount
- Created `AuthInitializer` component to wrap the app and ensure auth state is restored
- Added the AuthInitializer to the client layout

**Files Changed**:
- `/frontend/lib/auth/auth-initializer.ts` (new)
- `/frontend/components/auth/AuthInitializer.tsx` (new)
- `/frontend/hooks/useAuthGuard.ts` (updated)
- `/frontend/app/client-layout.tsx` (updated)

### 2. Course Double Creation Fix

**Problem**: Courses were being created twice when users submitted the form.

**Root Causes**:
1. React StrictMode (`reactStrictMode: true` in next.config.js) causes components to render twice in development
2. The `handleCreateCourse` function in `my-courses/page.tsx` was calling `courseAPI.createCourse()` again after the CourseForm had already created the course

**Solution**:
- Enhanced the CourseForm component with better duplicate request prevention using a Map to track form instances
- Fixed the `handleCreateCourse` function in my-courses page to only update local state instead of creating another course
- Added cleanup on component unmount

**Files Changed**:
- `/frontend/components/dashboard/CourseForm.tsx` (updated with better duplicate prevention)
- `/frontend/app/my-courses/page.tsx` (fixed to not create duplicate courses)

## Testing Instructions

### Test Auth Persistence:
1. Log in to the application
2. Refresh the page (F5 or Cmd+R)
3. You should remain logged in and not be redirected to the login page

### Test Course Creation:
1. Go to My Courses or Dashboard
2. Click "Create Course"
3. Fill in the form and submit
4. Check that only ONE course is created (not two)
5. Verify the course appears in your course list

## Additional Notes

- The auth initializer caches the initial auth check to prevent multiple API calls
- The course form now uses a unique instance ID to track requests per form
- React StrictMode will still cause double renders in development, but the fixes prevent duplicate API calls
- The auth state is properly cleared on logout using `resetAuthInitializer()`