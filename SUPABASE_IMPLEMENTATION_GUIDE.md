# Supabase Migration Implementation Guide

## Step-by-Step Implementation

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Save these credentials:
   - Project URL
   - Anon Key
   - Service Role Key
   - Database Password

### Step 2: Environment Setup

Create `.env.supabase` file:
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:[password]@[host]:[port]/postgres
SUPABASE_JWT_SECRET=your-jwt-secret

# Keep existing configs
OPENAI_API_KEY=existing-key
AWS_ACCESS_KEY_ID=existing-key
AWS_SECRET_ACCESS_KEY=existing-key
REDIS_URL=existing-url
```

### Step 3: Database Migration Scripts

#### 3.1 Create migration directory
```bash
mkdir -p migration/supabase
cd migration/supabase
```

#### 3.2 Export schema from Neon
```bash
# Create schema export script
cat > export_neon_schema.sh << 'EOF'
#!/bin/bash
NEON_URL="$POSTGRES_URL"

# Export schema only (no data)
pg_dump "$NEON_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --exclude-table=market \
  --exclude-table=news \
  > neon_schema.sql

echo "Schema exported to neon_schema.sql"
EOF

chmod +x export_neon_schema.sh
```

#### 3.3 Prepare Supabase schema
```sql
-- supabase_prepare.sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Set up auth schema integration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (id, email, firebase_uid, created_at)
  VALUES (
    gen_random_uuid(),
    NEW.email,
    NEW.id::text,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync Supabase auth with User table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 4: Backend Code Updates

#### 4.1 Create Supabase configuration
```python
# docker-image/src/core/supabase_config.py
import os
from supabase import create_client, Client
from functools import lru_cache

@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Get Supabase client singleton"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        raise ValueError("Supabase credentials not configured")
    
    return create_client(url, key)

def get_supabase_db_url() -> str:
    """Get Supabase database URL"""
    return os.getenv('SUPABASE_DB_URL')
```

#### 4.2 Update database configuration
```python
# docker-image/src/core/database.py
import os
from core.supabase_config import get_supabase_db_url

def get_database_url():
    """Get database URL - Supabase or fallback"""
    # Try Supabase first
    supabase_url = get_supabase_db_url()
    if supabase_url:
        return supabase_url
    
    # Fallback to Neon during migration
    return os.getenv('POSTGRES_URL')
```

#### 4.3 Create new auth service
```python
# docker-image/src/services/supabase_auth_service.py
from typing import Optional, Dict, Any
from core.supabase_config import get_supabase_client
from core.exceptions import AuthenticationError
import logging

logger = logging.getLogger(__name__)

class SupabaseAuthService:
    def __init__(self):
        self.client = get_supabase_client()
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify Supabase JWT token"""
        try:
            # Verify token with Supabase
            user = self.client.auth.get_user(token)
            if not user:
                raise AuthenticationError("Invalid token")
            
            return {
                'uid': user.user.id,
                'email': user.user.email,
                'email_verified': user.user.email_confirmed_at is not None
            }
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise AuthenticationError(str(e))
    
    def create_user(self, email: str, password: str) -> Dict[str, Any]:
        """Create new user in Supabase"""
        try:
            response = self.client.auth.sign_up({
                'email': email,
                'password': password
            })
            
            if response.user:
                return {
                    'uid': response.user.id,
                    'email': response.user.email
                }
            else:
                raise AuthenticationError("Failed to create user")
        except Exception as e:
            logger.error(f"User creation failed: {e}")
            raise AuthenticationError(str(e))
```

#### 4.4 Update auth middleware
```python
# docker-image/src/core/decorators_unified.py
from functools import wraps
from flask import request, g
from services.supabase_auth_service import SupabaseAuthService

auth_service = SupabaseAuthService()

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return {'error': 'No valid auth token'}, 401
        
        token = auth_header.split(' ')[1]
        
        try:
            # Verify with Supabase
            user_info = auth_service.verify_token(token)
            g.current_user = user_info
            return f(*args, **kwargs)
        except Exception as e:
            return {'error': str(e)}, 401
    
    return decorated_function
```

### Step 5: Frontend Code Updates

#### 5.1 Install Supabase client
```bash
cd frontend
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

#### 5.2 Create Supabase client
```typescript
// frontend/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

#### 5.3 Update auth hooks
```typescript
// frontend/hooks/useAuthUser.ts
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

#### 5.4 Update auth service
```typescript
// frontend/lib/auth-service.ts
import { supabase } from './supabase/client'

export class AuthService {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }
}

export const authService = new AuthService()
```

### Step 6: Testing Scripts

#### 6.1 Test database connection
```python
# test_supabase_connection.py
import os
from sqlalchemy import create_engine
from core.supabase_config import get_supabase_db_url

def test_connection():
    url = get_supabase_db_url()
    engine = create_engine(url)
    
    try:
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            print("✅ Database connection successful")
            
            # Test pgvector
            result = conn.execute("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            if result.fetchone():
                print("✅ pgvector extension is enabled")
            else:
                print("❌ pgvector extension not found")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    test_connection()
```

#### 6.2 Test auth flow
```python
# test_supabase_auth.py
from services.supabase_auth_service import SupabaseAuthService

def test_auth():
    service = SupabaseAuthService()
    
    # Test user creation
    try:
        user = service.create_user("test@example.com", "testpass123")
        print(f"✅ User created: {user}")
    except Exception as e:
        print(f"❌ User creation failed: {e}")
    
    # Test token verification
    # (Would need actual token from frontend)

if __name__ == "__main__":
    test_auth()
```

### Step 7: Migration Execution

1. **Set up Supabase project** (online)
2. **Export Neon schema**: `./export_neon_schema.sh`
3. **Import to Supabase**: Run schema in Supabase SQL editor
4. **Update environment variables**
5. **Deploy backend changes**
6. **Deploy frontend changes**
7. **Run tests**

### Step 8: Rollback Procedure

If issues arise:
```bash
# 1. Revert environment variables
cp .env.backup .env

# 2. Restart services
docker-compose restart backend

# 3. Revert code if needed
git checkout main

# 4. Redeploy
```

## Common Issues and Solutions

### Issue 1: Token format differences
- Supabase uses different JWT structure
- Solution: Update token parsing logic

### Issue 2: User ID format
- Firebase: string UIDs
- Supabase: UUID format
- Solution: Update foreign key types or use string representation

### Issue 3: Connection pooling
- Different pooling requirements
- Solution: Adjust SQLAlchemy pool settings

## Verification Checklist

- [ ] Database connection working
- [ ] pgvector queries functioning
- [ ] User registration working
- [ ] User login working
- [ ] API authentication working
- [ ] File uploads working
- [ ] AI features working
- [ ] All tests passing