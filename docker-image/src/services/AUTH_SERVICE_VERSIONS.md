# Authentication Service Versions Documentation

## Overview
The codebase contains multiple versions of the authentication service, each serving a specific purpose and representing an evolution in functionality and resilience.

## Service Versions

### 1. auth_service_unified.py (Currently in Use)
- **Purpose**: Unified authentication service that handles both v1 and v2 authentication flows
- **Features**:
  - Firebase authentication integration
  - JWT token generation and validation
  - Support for both legacy and modern authentication patterns
  - User profile management
- **Used by**: 
  - `/api/v2_endpoints/auth.py`
  - `/api/auth_unified.py`
  - `/core/dependencies.py`

### 2. auth_service_resilient.py (Available but Not in Use)
- **Purpose**: Enhanced version with resilience patterns for production reliability
- **Features**:
  - All features from unified version
  - Circuit breaker pattern for external service calls
  - Retry logic with exponential backoff
  - Better error handling and logging
  - Chaos engineering fixes applied
- **Status**: Available but not currently integrated
- **Recommendation**: Consider migrating to this version for improved reliability

### 3. auth_sync_service.py (Specialized Service)
- **Purpose**: Handles synchronization between Firebase and PostgreSQL
- **Features**:
  - Two-phase commit (2PC) pattern for distributed transactions
  - Ensures consistency between Firebase and local database
  - Handles user creation and updates across systems
- **Used by**: Should be used alongside the main auth service for sync operations

## Migration Recommendations

1. **Short Term**: Continue using `auth_service_unified.py` as it's stable and integrated
2. **Medium Term**: 
   - Evaluate `auth_service_resilient.py` in a staging environment
   - Test circuit breaker behavior and retry logic
   - Plan migration if testing proves successful
3. **Long Term**: 
   - Consider consolidating sync functionality from `auth_sync_service.py` into the main service
   - Maintain single source of truth for authentication logic

## Technical Notes

- All versions implement the same interface, making them interchangeable
- The resilient version adds defensive programming patterns without changing the API
- The sync service should be used as a companion service, not a replacement

## Decision Log

- **Current Choice**: `auth_service_unified.py` - Stable, well-tested, handles both API versions
- **Future Direction**: Move to `auth_service_resilient.py` after thorough testing
- **Sync Strategy**: Keep `auth_sync_service.py` separate for specialized sync operations