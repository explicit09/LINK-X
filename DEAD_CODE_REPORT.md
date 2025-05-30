# Dead Code Analysis Report

## Summary
This report identifies dead code, unused files, and candidates for removal in the `docker-image/src` directory.

## Files Already Marked for Deletion (in git status)
These files are already staged for deletion, confirming they're no longer needed:
- `docker-image/src/api/activities.py`
- `docker-image/src/api/admin.py` 
- `docker-image/src/api/courses.py`
- `docker-image/src/api/files.py`
- `docker-image/src/api/modules.py`
- `docker-image/src/api/personalization.py`
- `docker-image/src/api/streaming.py`
- `docker-image/src/api/test.py`
- `docker-image/src/api/todos.py`
- `docker-image/src/api/v1.py`
- `docker-image/src/api/v2.py`
- `docker-image/src/db/queries.py`
- `docker-image/src/repositories/base_repository_v2.py`
- `docker-image/src/scripts/test_api_versioning.py`
- `docker-image/src/scripts/test_courses_api.py`
- `docker-image/src/services/auth_service_resilient.py`
- `docker-image/src/services/auth_sync_service.py`
- `docker-image/src/services/course_service.py`
- `docker-image/src/services/s3_storage.py`

## Additional Files to Remove

### 1. Test/Example Files (Not in tests directory)
- **`docker-image/src/scripts/test_api_endpoint.py`** - Test script for API endpoints
- **`docker-image/src/api/metrics/test_structure.py`** - Test file for metrics structure
- **`docker-image/src/utils/simple_server.py`** - Mock server for testing, contains hardcoded test responses
- **`docker-image/src/utils/simple_tasks.py`** - Simplified test tasks for monitoring dashboard

### 2. Empty or Near-Empty Files
- **`docker-image/src/check_endpoints.py`** - Only 3 non-empty lines, appears abandoned
- Multiple `__init__.py` files that are completely empty (though these are typically kept for Python package structure)

### 3. Old Migration Scripts with Debug Code
These migration files contain print() statements and appear to be one-off scripts:
- **`docker-image/src/db/migrations/add_description.py`**
- **`docker-image/src/db/migrations/add_description_sqlalchemy.py`**
- **`docker-image/src/db/migrations/add_module_description.py`**
- **`docker-image/src/db/migrations/execute_migration.py`**
- **`docker-image/src/db/migrations/fix_module_direct.py`**
- **`docker-image/src/db/migrations/fix_module_schema.py`**

### 4. Scripts with Debug Output
These files contain print() statements that shouldn't be in production:
- **`docker-image/src/scripts/check_courses.py`**
- **`docker-image/src/scripts/check_data.py`**
- **`docker-image/src/migrations/add_description_column.py`**

## Code Quality Issues

### 1. Files with TODO/FIXME Comments (5 occurrences)
- `core/file_validation.py` - TODO: Integrate with ClamAV
- `api/v2_endpoints/activities.py` - TODO: Implement activity logging
- `api/v2_endpoints/auth.py` - TODO: Implement file view tracking and Firebase email update
- `api/v2_endpoints/__init__.py` - TODO compatibility endpoints comment

### 2. Files with Commented-Out Code (43 files found)
Many files contain commented-out imports, functions, or class definitions that should be cleaned up.

### 3. Files with Debug Print Statements (42 files found)
Numerous files contain print() statements that should be replaced with proper logging.

## Recommendations

1. **Immediate Removal**: Delete the test/example files and empty files listed above
2. **Migration Cleanup**: Review and potentially archive old migration scripts
3. **Code Cleanup**: 
   - Remove commented-out code blocks
   - Replace print() statements with proper logging
   - Address TODO comments or create issues to track them
4. **Consider Archiving**: Some migration scripts might be worth keeping in a separate archive directory rather than deleting entirely

## Next Steps
1. Review this list with the team
2. Confirm which files can be safely removed
3. Create a cleanup script or manually remove the identified files
4. Update any imports or references to removed files