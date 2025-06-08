# Onboarding Systems Integration

## Overview

LINK-X now has **two onboarding systems** that work together:

1. **NEW Supabase Frontend System** - Modern, comprehensive onboarding flow
2. **OLD Docker Backend System** - Legacy system used by backend services

Both systems are maintained and synchronized to ensure platform stability.

## Architecture

### 🔄 **Data Flow**

```
Frontend (Supabase)  ←→  Backend (Docker)
    ↓                      ↓
onboarding_data    ←→  onboard_answers
onboarding_completed   has_completed_onboarding
onboarding_step        (derived from data)
```

### 📊 **Data Structures**

#### **Supabase Frontend** (`profiles` table):
```sql
-- New comprehensive system
onboarding_completed BOOLEAN DEFAULT FALSE
onboarding_completed_at TIMESTAMP WITH TIME ZONE
onboarding_step INTEGER DEFAULT 0
onboarding_data JSONB DEFAULT '{}'
```

#### **Docker Backend** (`StudentProfile` table):
```sql
-- Legacy system still used by backend services
onboard_answers JSONB NOT NULL
want_quizzes BOOLEAN DEFAULT FALSE
```

## Integration Points

### 🔄 **Frontend → Backend Sync**

When a user completes onboarding in the frontend:

1. **AuthService.completeOnboarding()** saves to Supabase
2. **syncOnboardingToBackend()** transforms and sends to Docker backend
3. Data is stored in both systems

```typescript
// Frontend integration
await authService.completeOnboarding(userId, onboardingData)
// Automatically syncs to backend via syncOnboardingToBackend()
```

### 🔄 **Backend → Frontend Sync**

When backend services update onboarding:

1. Backend updates `onboard_answers`
2. **POST /api/v2/auth/sync-to-supabase** endpoint available
3. Data can be synced back to Supabase

## Data Format Mapping

### **Supabase → Backend Transform**
```typescript
// Frontend format
const supabaseData = {
  profile: {
    interests: ['AI', 'Web Dev'],
    learning_goals: ['Master React', 'Learn ML']
  },
  preferences: { want_quizzes: true },
  settings: { notifications: true }
}

// Transforms to backend format
const backendData = {
  onboard_answers: {
    interests: 'AI, Web Dev',
    learning_goals: 'Master React, Learn ML',
    preferences: { want_quizzes: true },
    settings: { notifications: true }
  },
  want_quizzes: true
}
```

### **Backend → Supabase Transform**
```sql
-- SQL functions for data conversion
SELECT convert_backend_to_supabase_onboarding(onboard_answers);
SELECT convert_supabase_to_backend_onboarding(onboarding_data);
```

## API Endpoints

### **Frontend APIs**
- `AuthService.completeOnboarding()` - Complete Supabase onboarding
- `syncOnboardingToBackend()` - Sync to Docker backend

### **Backend APIs**
- `POST /api/v2/auth/onboarding` - Complete backend onboarding
- `POST /api/v2/auth/sync-to-supabase` - Sync to Supabase system
- `GET /api/v2/auth/profile` - Get profile with onboarding status

## Migration Applied

**Migration: `006_sync_onboarding_systems.sql`**
- ✅ Conversion functions between formats
- ✅ Data transformation utilities
- ✅ Bidirectional sync support

## Usage Examples

### **Complete Onboarding (Frontend)**
```typescript
const onboardingData = {
  profile: {
    interests: ['Machine Learning', 'Web Development'],
    learning_goals: ['Master React', 'Learn Python']
  },
  preferences: {
    want_quizzes: true,
    notifications: true
  }
}

await completeOnboarding(onboardingData)
// Automatically syncs to both Supabase and Docker backend
```

### **Check Onboarding Status**
```typescript
// Frontend (Supabase)
const needsOnboarding = user.profile?.onboarding_completed === false

// Backend (Docker)
const hasCompleted = user.student_profile?.onboard_answers && 
                    Object.keys(user.student_profile.onboard_answers).length > 0
```

## Benefits

### ✅ **Platform Stability**
- No breaking changes to existing backend services
- Gradual migration path available
- Both systems work independently

### ✅ **Data Consistency**
- Automatic synchronization between systems
- Data format conversion handles differences
- Error handling prevents data loss

### ✅ **Future Flexibility**
- Can migrate to single system when ready
- Backend services continue working
- Frontend gets modern onboarding UX

## Troubleshooting

### **Sync Failures**
- Frontend onboarding continues even if backend sync fails
- Check browser console for sync errors
- Backend endpoints handle missing data gracefully

### **Data Inconsistency**
- Use conversion functions to transform data formats
- Check both systems if onboarding status unclear
- Manual sync via API endpoints available

## Next Steps

1. **Monitor sync success rates**
2. **Gradually migrate backend services to use Supabase data**
3. **Eventually deprecate old Docker onboarding system**
4. **Maintain data consistency during transition**

## File Locations

- **Frontend Integration**: `frontend/lib/auth/authService.ts`
- **Sync Functions**: `frontend/lib/api/endpoints/auth.ts`
- **Backend APIs**: `docker-image/src/api/v2_endpoints/auth_unified.py`
- **Migrations**: `migrations/006_sync_onboarding_systems.sql`
- **Documentation**: `docs/onboarding-systems-integration.md` 