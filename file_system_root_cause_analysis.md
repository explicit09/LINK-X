# Root Cause Analysis: File System Issues

## The Problem: Multiple Upload Paths, Inconsistent Implementation

### ✅ Working Upload Path (Backend API)
**File**: `docker-image/src/services/file_service_supabase.py`

```python
# This CORRECTLY sets uploaded_by
file_record = self.file_repo.create({
    'uploaded_by': user_id,  # ✅ CORRECT
    'storage_metadata': {...}
})
```

**Endpoint**: `/api/v2/files/upload` (POST)
- ✅ Sets `uploaded_by` field
- ✅ Sets proper storage metadata
- ✅ Triggers processing correctly

### ❌ Broken Upload Paths (Frontend Direct)

#### Frontend Path 1: Enhanced File Upload
**File**: `frontend/components/course/enhanced-file-upload/services/uploadService.ts`

```typescript
// This DOES NOT set uploaded_by
const { data: fileRecord, error: dbError } = await supabase
  .from('files')
  .insert({
    title: uploadFile.file.name,
    filename: uploadFile.file.name,
    // ❌ MISSING: uploaded_by field
    // ❌ MISSING: created_by field
    storage_path: filePath,
  })
```

#### Frontend Path 2: Student Upload Service  
**File**: `frontend/components/course/student-upload/services/uploadService.ts`

```typescript
// Uses fileOperations.uploadFile which also bypasses uploaded_by
const result = await fileOperations.uploadFile(uploadFile.file, moduleId, uploadFile.file.name);
```

#### Frontend Path 3: DB Operations
**File**: `frontend/lib/db/operations.ts`

```typescript
// This DOES NOT set uploaded_by
const { data: fileRecord, error: dbError } = await supabase
  .from('files')
  .insert({
    module_id: moduleId,
    title: title || file.name,
    // ❌ MISSING: uploaded_by field
    // ❌ MISSING: created_by field
    processing_status: 'pending',
  })
```

## Why This Happened

### 1. **Architecture Inconsistency**
- Backend API (`/api/v2/files/upload`) uses proper service layer
- Frontend uploads bypass backend API and write directly to Supabase
- No enforcement of required fields at database level

### 2. **Missing RLS Policy Enforcement**
- RLS policies exist but don't REQUIRE uploaded_by to be set
- Frontend can insert records without authentication fields
- No database constraints forcing ownership tracking

### 3. **Processing Status Issues**
- Files inserted via frontend get `processing_status: 'pending'`
- But processing pipeline may not be running
- No automatic transition from 'pending' to 'processing' to 'completed'

## Technical Evidence

### Current Database State
```sql
SELECT 
    filename,
    uploaded_by,
    created_by,
    processing_status,
    storage_path IS NOT NULL as has_storage
FROM files;
```

**Results**: 
- 5 files total
- 5 files with `uploaded_by: NULL` (100%)
- 5 files with `created_by: NULL` (100%)
- 5 files with `processing_status: 'failed'` (100%)
- 5 files with proper storage paths (100%)

### Upload Method Analysis

| Upload Method | uploaded_by | processing | Used By |
|---------------|-------------|------------|---------|
| Backend API `/api/v2/files/upload` | ✅ Sets correctly | ✅ Works | Some components |
| Frontend Direct Supabase | ❌ Missing | ❌ Broken | Most components |
| Enhanced Upload Service | ❌ Missing | ❌ Broken | Course creators |
| Student Upload Service | ❌ Missing | ❌ Broken | Students |

## The Fix Strategy

### Phase 1: Immediate Database Repair
```sql
-- Get the first authenticated user to assign ownership
DO $$
DECLARE 
    default_user_id UUID;
BEGIN
    -- Get a user ID to assign to orphaned files
    SELECT id INTO default_user_id FROM auth.users LIMIT 1;
    
    -- Assign ownership to existing files
    UPDATE files 
    SET uploaded_by = default_user_id,
        created_by = default_user_id,
        processing_status = 'pending'
    WHERE uploaded_by IS NULL;
END $$;
```

### Phase 2: Frontend Upload Path Consolidation

**Option A**: Update all frontend code to use backend API
```typescript
// Replace direct Supabase inserts with API calls
const response = await fetch('/api/v2/files/upload', {
  method: 'POST',
  body: formData
});
```

**Option B**: Add RLS constraint to force uploaded_by
```sql
-- Add RLS policy that REQUIRES uploaded_by
CREATE POLICY "uploaded_by_required" ON files
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
```

### Phase 3: Processing Pipeline Fix
```typescript
// Ensure processing queue is populated
await supabase.from('processing_queue').insert({
  file_id: fileRecord.id,
  status: 'pending',
  priority: 'high'
});
```

## Recommended Implementation Plan

### 1. **Standardize on Backend API** (Preferred)
- All file uploads go through `/api/v2/files/upload`
- Consistent uploaded_by tracking
- Proper processing triggers
- Better error handling

### 2. **Fix Frontend Direct Uploads** (Alternative)
- Add `auth.uid()` to all frontend inserts
- Add processing queue triggers
- Maintain current architecture

### 3. **Database Constraints** (Required Either Way)
- Add NOT NULL constraint on uploaded_by
- Add RLS policies requiring ownership
- Add processing status validation

## Security Implications

### Current State (Insecure)
- Files have no ownership tracking
- Users cannot delete their own files
- No accountability for uploads
- Potential data leaks

### After Fix (Secure)
- All files have clear ownership
- Users can manage their own files
- Audit trail for all uploads
- Proper access controls

## Testing Plan

1. **Upload via each method** ✅
2. **Verify uploaded_by is set** ✅  
3. **Test file deletion by owner** ✅
4. **Verify processing works** ✅
5. **Test access controls** ✅

## Files That Need Updates

### High Priority
1. `frontend/lib/db/operations.ts` - Add uploaded_by
2. `frontend/components/course/enhanced-file-upload/services/uploadService.ts` - Add auth
3. `frontend/components/course/student-upload/services/uploadService.ts` - Fix API call

### Medium Priority  
4. RLS policies in `docker-image/migrations/`
5. Processing queue triggers
6. Database constraints

### Low Priority
7. Cleanup old/unused upload methods
8. Standardize error handling
9. Add comprehensive tests 