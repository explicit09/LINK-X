#!/usr/bin/env python3
"""
Migration script to update the application to use the new authentication system
"""
import os
import shutil
from datetime import datetime

def backup_file(filepath):
    """Create a backup of the original file"""
    if os.path.exists(filepath):
        backup_path = f"{filepath}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(filepath, backup_path)
        print(f"Backed up {filepath} to {backup_path}")
        return backup_path
    return None

def update_init_file():
    """Update the __init__.py file to register the new auth blueprint"""
    init_file = '/Users/explicit/Documents/GitHub/LINK-X1/docker-image/src/__init__.py'
    backup_file(init_file)
    
    with open(init_file, 'r') as f:
        content = f.read()
    
    # Add import for auth_v2
    import_line = "from .api import auth, courses, files, streaming, admin, health, todos, activities, modules, legacy, test"
    new_import_line = "from .api import auth, auth_v2, courses, files, streaming, admin, health, todos, activities, modules, legacy, test"
    content = content.replace(import_line, new_import_line)
    
    # Register auth_v2 blueprint
    register_line = "    app.register_blueprint(auth.bp, url_prefix='/api/v1/auth')"
    new_register_lines = """    # Legacy auth endpoints (for backward compatibility)
    app.register_blueprint(auth.bp, url_prefix='/api/v1/auth')
    
    # New auth endpoints (v2)
    app.register_blueprint(auth_v2.bp, url_prefix='/api/v2/auth')"""
    content = content.replace(register_line, new_register_lines)
    
    with open(init_file, 'w') as f:
        f.write(content)
    
    print(f"Updated {init_file}")

def create_frontend_auth_wrapper():
    """Create a wrapper component for gradual migration"""
    wrapper_file = '/Users/explicit/Documents/GitHub/LINK-X1/coralx-frontend/app/(auth)/AuthWrapper.tsx'
    
    content = """'use client';

import { useEffect, useState } from 'react';
import { AuthProvider } from './AuthContext';
import { AuthProviderV2 } from './AuthContextV2';

interface AuthWrapperProps {
  children: React.ReactNode;
  useV2?: boolean;
}

export function AuthWrapper({ children, useV2 = false }: AuthWrapperProps) {
  const [shouldUseV2, setShouldUseV2] = useState(useV2);

  useEffect(() => {
    // Check for feature flag or environment variable
    const v2Enabled = process.env.NEXT_PUBLIC_USE_AUTH_V2 === 'true';
    setShouldUseV2(v2Enabled || useV2);
  }, [useV2]);

  if (shouldUseV2) {
    return <AuthProviderV2>{children}</AuthProviderV2>;
  }

  return <AuthProvider>{children}</AuthProvider>;
}
"""
    
    with open(wrapper_file, 'w') as f:
        f.write(content)
    
    print(f"Created {wrapper_file}")

def create_migration_guide():
    """Create a migration guide for developers"""
    guide_file = '/Users/explicit/Documents/GitHub/LINK-X1/AUTH_V2_MIGRATION_GUIDE.md'
    
    content = """# Authentication V2 Migration Guide

## Overview
The new authentication system (Auth V2) provides improved session management, better error handling, and follows OAuth2/JWT best practices.

## Key Improvements
1. **Proper Token Management**: Separate access and refresh tokens with automatic renewal
2. **Session State Tracking**: Clear authentication states (UNAUTHENTICATED, AUTHENTICATED, REGISTERING, REFRESHING)
3. **Better Error Handling**: Specific error codes for different scenarios
4. **Retry Logic**: Automatic retry with token refresh on 401 errors
5. **Cookie-based Sessions**: Secure HTTP-only cookies for refresh tokens

## Migration Steps

### Backend
1. The new auth endpoints are available at `/api/v2/auth/*`
2. Both v1 and v2 endpoints will run in parallel during migration
3. Database schema remains unchanged

### Frontend
1. Import from `@/lib/api_v2` instead of `@/lib/api`
2. Use `AuthProviderV2` and `useAuthV2` hook
3. Handle the new `needsRegistration` state for unregistered Firebase users

### Environment Variables
Add to your `.env` file:
```
NEXT_PUBLIC_USE_AUTH_V2=true  # Enable v2 authentication
```

## API Changes

### Login Flow
```typescript
// Old way
const response = await sessionLogin();

// New way
import { login } from '@/lib/api_v2';
const success = await login();
```

### Registration Flow
```typescript
// Old way
await api.post('/api/v1/auth/register/student', data);

// New way
import { register } from '@/lib/api_v2';
await register('student', profileData);
```

### Auth Context
```typescript
// Old way
const { user } = useAuth();

// New way
const { firebaseUser, userProfile, needsRegistration } = useAuthV2();
```

## Gradual Migration
1. Start by enabling v2 for new features
2. Migrate existing features one by one
3. Monitor logs for any authentication issues
4. Once stable, deprecate v1 endpoints

## Troubleshooting
- If users get 404 errors, they need to complete registration
- 401 errors should automatically trigger token refresh
- Check browser console for detailed error messages
"""
    
    with open(guide_file, 'w') as f:
        f.write(content)
    
    print(f"Created {guide_file}")

def main():
    print("Starting Auth V2 migration...")
    
    # Update backend
    update_init_file()
    
    # Create frontend wrapper
    create_frontend_auth_wrapper()
    
    # Create migration guide
    create_migration_guide()
    
    print("\nMigration complete!")
    print("\nNext steps:")
    print("1. Restart the backend server")
    print("2. Set NEXT_PUBLIC_USE_AUTH_V2=true in frontend .env")
    print("3. Test the new authentication flow")
    print("4. Monitor logs for any issues")

if __name__ == "__main__":
    main()