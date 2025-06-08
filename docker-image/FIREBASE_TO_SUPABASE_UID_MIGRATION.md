# Firebase UID to Supabase UID Migration Summary

## Overview
This document summarizes the complete migration from `firebase_uid` to `supabase_uid` throughout the codebase.

## Files Updated

### 1. Database Schema Files
- **src/db/schema.py**: Renamed column from `firebase_uid` to `supabase_uid` in User table

### 2. Query Files
- **src/db/queries.py**: 
  - Renamed `get_user_by_firebase_uid()` to `get_user_by_supabase_uid()`
  - Updated `create_user()` function to use `supabase_uid` parameter
  - Updated User instantiation to use `supabase_uid` field

- **src/db/queries/user_queries.py**:
  - Renamed `get_user_by_firebase_uid()` to `get_user_by_supabase_uid()`
  - Updated SQL query to use `supabase_uid` column
  - Updated required fields from `['firebase_uid', 'email']` to `['supabase_uid', 'email']`

- **src/db/queries/__init__.py**: Updated imports and exports to use `get_user_by_supabase_uid`

### 3. Repository Files
- **src/repositories/user_repository.py**:
  - Renamed `find_by_firebase_uid()` to `find_by_supabase_uid()`
  - Renamed `get_by_firebase_uid()` to `get_by_supabase_uid()`
  - Updated all references and filter conditions

### 4. API Endpoints
- **src/api/v2.py**: Removed fallback to `firebase_uid` when getting `supabase_id`

- **src/api/v2_endpoints/auth_unified.py**:
  - Updated all calls from `get_by_firebase_uid()` to `get_by_supabase_uid()`
  - Updated comments to reflect Supabase instead of Firebase
  - Updated JSON response fields from `'firebase_uid'` to `'supabase_uid'`

### 5. Core Files
- **src/core/decorators_unified.py**:
  - Renamed `_get_user_by_firebase_uid()` to `_get_user_by_supabase_uid()`
  - Updated all references and log messages
  - Updated filter condition from `firebase_uid` to `supabase_uid`

### 6. Service Files
- **src/services/interfaces.py**: Updated abstract method parameter from `firebase_uid` to `supabase_uid`

- **src/services/personalization_integration.py**: Updated filter from `User.firebase_uid` to `User.supabase_uid`

- **src/services/streaming/data_processor.py**:
  - Updated import from `get_user_by_firebase_uid` to `get_user_by_supabase_uid`
  - Renamed method parameter from `firebase_uid` to `supabase_uid`
  - Updated all log messages and function calls

- **src/services/streaming/api_handlers.py**:
  - Updated cookie name from `'firebase_uid'` to `'supabase_uid'`
  - Updated all variable names and log messages

### 7. Database Migration Files
- **src/db/migrations/0000_create_tables.sql**: Changed column definition from `"firebase_uid"` to `"supabase_uid"`
- **src/db/migrations/0006_performance_indexes.sql**: Updated index from `idx_user_firebase_uid` to `idx_user_supabase_uid`
- **src/db/migrations/0007_performance_optimization.sql**: Updated index from `idx_user_firebase_uid` to `idx_user_supabase_uid`
- **src/db/migrations/0010_add_performance_indexes.sql**: Updated index from `idx_users_firebase_uid` to `idx_users_supabase_uid`
- **src/db/migrations/0011_security_performance_indexes.sql**: Updated index from `idx_users_firebase_uid` to `idx_users_supabase_uid`

### 8. New Migration File
- **src/db/migrations/0018_rename_firebase_uid_to_supabase_uid.sql**: Created new migration to:
  - Rename the column in existing databases
  - Update indexes
  - Add documentation comment

## Migration Instructions

For existing databases, run the new migration:
```sql
-- Run migration 0018_rename_firebase_uid_to_supabase_uid.sql
```

For new databases, all tables will be created with `supabase_uid` from the start.

## Testing Checklist

After applying these changes:
1. ✓ Test user authentication with Supabase tokens
2. ✓ Test user lookup by Supabase UID
3. ✓ Test user creation with Supabase UID
4. ✓ Test all endpoints that rely on user authentication
5. ✓ Verify database queries work correctly
6. ✓ Check that all indexes are properly created

## Notes
- The migration maintains backward compatibility where possible
- Cookie-based authentication now uses `supabase_uid` instead of `firebase_uid`
- All Firebase authentication references have been removed from the codebase