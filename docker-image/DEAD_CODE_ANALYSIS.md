# Dead Code Analysis Report - Docker Image

## Summary

Analysis of the docker-image/src directory reveals the following dead code that can be safely removed:

## 1. Empty or Near-Empty Files

### Can be removed:
- `src/check_endpoints.py` - Empty file with only docstring (11 lines)

### Should be kept (standard Python practice):
- All `__init__.py` files - Required for Python packages

## 2. Test/Development Files in Production Code

### Should be removed or moved to tests/:
- `src/utils/simple_server.py` - Mock Flask server with hardcoded responses
- `src/utils/simple_tasks.py` - Test Celery tasks for monitoring dashboard
- `src/api/metrics/test_structure.py` - Test script for metrics structure
- `src/scripts/test_api_endpoint.py` - API testing script

## 3. Deprecated Files

### Can be removed after verification:
- `src/api/metrics.py` - Deprecated compatibility wrapper (marked as DEPRECATED)
  - Only provides backward compatibility for old imports
  - New code should use `api/metrics/` package directly

## 4. Debug/Development Scripts

### Review for removal:
- `src/scripts/check_courses.py` - Debug script with print statements
- `src/scripts/check_data.py` - Debug script for data verification

## 5. Old Migration Scripts

### Can be archived or removed:
- Various one-off migration scripts in `db/migrations/` that have likely been executed
- Scripts with debug print() statements

## 6. Unused Service Files

### Verify and potentially remove:
- `src/services/file_service.py` - Only 11 lines, might be replaced by `file_service/` directory

## Recommendations

1. **Immediate Removal** (Low Risk):
   - `src/check_endpoints.py`
   - `src/utils/simple_server.py`
   - `src/utils/simple_tasks.py`
   - `src/api/metrics/test_structure.py`

2. **Review and Remove** (Medium Risk):
   - `src/api/metrics.py` (after updating any imports)
   - `src/services/file_service.py` (if replaced by modular version)
   - Debug scripts in `src/scripts/`

3. **Archive** (Historical Value):
   - Old migration scripts that have been executed

## Next Steps

1. Create a cleanup script to remove identified files
2. Update any imports that reference deprecated files
3. Review requirements.txt for unused dependencies
4. Add linting rules to prevent future dead code accumulation