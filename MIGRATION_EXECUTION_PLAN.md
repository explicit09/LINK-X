# Supabase Migration Execution Plan

## Executive Summary

**Current State**: Neon + Firebase + S3 (3 vendors, ~$70+/mo growing to $400+/mo)  
**Target State**: Supabase (1 vendor, $25-100/mo)  
**Migration Time**: 2-3 weeks  
**Risk Level**: Low (proven migration path)

## Pre-Migration Checklist

- [ ] Create Supabase account and project
- [ ] Document all current integrations
- [ ] Backup Neon database
- [ ] Export Firebase user list
- [ ] List all S3 buckets and usage

## Week 1: Database Migration

### Day 1-2: Setup Supabase
```bash
# 1. Create new Supabase project
# 2. Save credentials:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
SUPABASE_DB_URL=postgresql://postgres:xxxxx@db.xxxxx.supabase.co:5432/postgres
```

### Day 3: Enable Extensions
```sql
-- In Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
```

### Day 4-5: Migrate Schema & Data
```bash
# Export from Neon (no Market/News tables)
pg_dump $NEON_URL \
  --no-owner \
  --exclude-table=market \
  --exclude-table=news \
  > neon_export.sql

# Import to Supabase
psql $SUPABASE_DB_URL < neon_export.sql

# Verify migration
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM \"User\""
```

### Day 5: Update Backend
```python
# docker-image/src/core/config.py
# Add feature flag for gradual rollout
USE_SUPABASE = os.getenv('USE_SUPABASE', 'false').lower() == 'true'

if USE_SUPABASE:
    SQLALCHEMY_DATABASE_URI = os.getenv('SUPABASE_DB_URL')
else:
    SQLALCHEMY_DATABASE_URI = os.getenv('POSTGRES_URL')  # Neon
```

## Week 2: Authentication Migration

### Day 1: Firebase User Export
```python
# scripts/export_firebase_users.py
import firebase_admin
from firebase_admin import auth
import json

users = []
for user in auth.list_users().iterate_all():
    users.append({
        'id': user.uid,
        'email': user.email,
        'email_verified': user.email_verified,
        'created_at': user.user_metadata.creation_timestamp
    })

with open('firebase_users.json', 'w') as f:
    json.dump(users, f)
```

### Day 2-3: Import to Supabase
```bash
# Use Supabase CLI
supabase auth users import firebase_users.json --provider firebase
```

### Day 4-5: Update Auth Code

Backend changes:
```python
# docker-image/src/core/supabase_config.py
from supabase import create_client, Client
import os

def get_supabase_client() -> Client:
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    return create_client(url, key)

# Update auth middleware
def verify_supabase_token(token: str):
    client = get_supabase_client()
    try:
        user = client.auth.get_user(token)
        return {'uid': user.user.id, 'email': user.user.email}
    except:
        return None
```

Frontend changes:
```typescript
// frontend/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Update hooks/useAuthUser.ts
import { supabase } from '@/lib/supabase'

export function useAuthUser() {
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })
    
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    
    return () => listener.subscription.unsubscribe()
  }, [])
  
  return { user }
}
```

## Week 3: Storage & Cleanup

### Day 1-2: Evaluate Storage Needs
- Keep S3 for existing files initially
- New uploads go to Supabase Storage
- Migrate gradually based on access patterns

### Day 3-4: Testing & Validation
```bash
# Run test suite
cd docker-image && pytest
cd frontend && npm test

# Load testing
k6 run tests/load/k6-load-test.js
```

### Day 5: Cutover
1. **Enable Supabase in production**
   ```bash
   # Update production env
   USE_SUPABASE=true
   ```

2. **Monitor closely**
   - Auth success rates
   - Database performance
   - Error logs

3. **Rollback plan**
   ```bash
   # If issues, immediately:
   USE_SUPABASE=false
   # Restart services
   ```

## Post-Migration

### Week 4: Cleanup
- [ ] Cancel Neon subscription
- [ ] Archive Firebase project
- [ ] Document new architecture
- [ ] Update monitoring dashboards

### Cost Tracking
| Service | Before | After |
|---------|--------|-------|
| Database | Neon $19+ | Supabase $25 |
| Auth | Firebase $0-275 | Included |
| Storage | S3 $50+ | Included* |
| **Total** | **$70-350+** | **$25-100** |

*Can keep S3 if needed

## Success Metrics

1. **All tests passing** ✓
2. **Zero auth failures** ✓
3. **Query performance maintained** ✓
4. **Cost reduction achieved** ✓
5. **Simplified architecture** ✓

## Risk Mitigation

1. **Parallel Run**: Keep both systems for 1 week
2. **Feature Flags**: Gradual rollout by user %
3. **Instant Rollback**: Environment variable switch
4. **Data Integrity**: Automated validation scripts

## Go/No-Go Decision Points

- **After Week 1**: Database working? → Continue
- **After Week 2**: Auth working? → Continue  
- **After Week 3**: All systems stable? → Complete cutover

## Contact Points

- Supabase Support: support.supabase.com
- Migration issues: Create GitHub issue
- Emergency rollback: Follow rollback plan

---

This migration will transform LEARN-X from a complex multi-vendor setup to a streamlined, cost-effective platform ready for scale.