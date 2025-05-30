# Large Files Requiring Refactoring

This document lists TypeScript/React and Python files that are over 500 lines (or approaching that threshold) and haven't been refactored yet.

## Frontend Files (TypeScript/React)

### Over 500 Lines
1. **`/frontend/components/course/StudentCourseUpload.tsx`** - 518 lines
   - File upload component for students
   - No refactoring directory found
   
2. **`/frontend/components/learn-x/LearnSidebar.tsx`** - 514 lines
   - Learning interface sidebar
   - No refactoring directory found

### 400-500 Lines (High Priority)
3. **`/frontend/components/ai/FloatingAIAssistant.tsx`** - 497 lines
4. **`/frontend/components/learn/ModernLearnSidebar.tsx`** - 477 lines
5. **`/frontend/components/ai/SmartRecommendations.tsx`** - 471 lines
6. **`/frontend/components/dashboard/ModernSidebar.tsx`** - 434 lines
7. **`/frontend/components/course/EnhancedSidebar.tsx`** - 434 lines
8. **`/frontend/types/api.ts`** - 433 lines
9. **`/frontend/app/courses/[courseId]/components/home/HomeTab.tsx`** - 425 lines
10. **`/frontend/components/sidebar-history.tsx`** - 418 lines

### 300-400 Lines (Medium Priority)
11. **`/frontend/lib/auth-service.ts`** - 399 lines
12. **`/frontend/app/(auth)/register/page.tsx`** - 371 lines
13. **`/frontend/app/my-courses/page.tsx`** - 367 lines
14. **`/frontend/lib/api_v2.ts`** - 361 lines
15. **`/frontend/lib/api/client.ts`** - 318 lines

## Backend Files (Python)

### Over 400 Lines
1. **`/docker-image/src/api/auth_unified.py`** - 465 lines
   - Unified authentication API endpoints
   
2. **`/docker-image/src/core/prompts.py`** - 460 lines
   - AI prompts configuration
   
3. **`/docker-image/src/monitoring/distributed_tracing/exporters.py`** - 451 lines
   - Distributed tracing exporters
   
4. **`/docker-image/src/core/decorators_unified.py`** - 433 lines
   - Unified decorators for the application
   
5. **`/docker-image/src/core/resilience.py`** - 430 lines
   - Resilience patterns implementation
   
6. **`/docker-image/src/services/auth_service_unified.py`** - 405 lines
   - Unified authentication service

### 300-400 Lines (High Priority)
7. **`/docker-image/src/monitoring/storage_audit.py`** - 404 lines
8. **`/docker-image/src/monitoring/api_version_monitor.py`** - 396 lines
9. **`/docker-image/src/core/rate_limiter_v2.py`** - 395 lines
10. **`/docker-image/src/db/queries/__init__.py`** - 392 lines
11. **`/docker-image/src/monitoring/distributed_tracing/sampling.py`** - 379 lines
12. **`/docker-image/src/monitoring/monitor_setup.py`** - 361 lines
13. **`/docker-image/src/api/v2_endpoints/courses.py`** - 357 lines
14. **`/docker-image/src/services/s3_signed_urls.py`** - 334 lines
15. **`/docker-image/src/monitoring/task_monitor.py`** - 333 lines
16. **`/docker-image/src/db/schema.py`** - 326 lines
17. **`/docker-image/src/db/queries/file_queries.py`** - 315 lines
18. **`/docker-image/src/core/settings.py`** - 312 lines

## Refactoring Priority

### Immediate Priority (500+ lines)
- `StudentCourseUpload.tsx` - Complex upload logic that could be split
- `LearnSidebar.tsx` - Large sidebar component needing modularization

### High Priority (400-500 lines)
**Frontend:**
- AI components (`FloatingAIAssistant.tsx`, `SmartRecommendations.tsx`)
- Sidebar components (multiple large sidebar implementations)
- `api.ts` types file

**Backend:**
- Authentication files (`auth_unified.py`, `auth_service_unified.py`)
- Core infrastructure (`prompts.py`, `decorators_unified.py`, `resilience.py`)
- Monitoring components

### Medium Priority (300-400 lines)
- Various API endpoints and services
- Database query files
- Configuration files

## Refactoring Strategies

1. **Component Decomposition**: Break large React components into smaller, focused components
2. **Service Layer Separation**: Split large Python services into domain-specific modules
3. **Hook Extraction**: Extract custom hooks from large React components
4. **Utility Function Extraction**: Move reusable logic to utility modules
5. **Type Definition Separation**: Split large type files into domain-specific type modules
6. **Configuration Modularization**: Break large config files into feature-specific configs