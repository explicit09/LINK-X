# app.py Removal Notice

## What Happened
- The monolithic `app.py` (4690 lines) has been **moved to `app_legacy_backup.py`** for safekeeping
- A placeholder `app.py` has been created with a clear warning message
- This prevents any accidental code additions to the old file

## New Architecture
All code should now go into the appropriate locations:

### For API Endpoints
- **Authentication**: `src/api/auth_v2.py`
- **Courses**: `src/api/courses.py`
- **Modules**: `src/api/modules.py`
- **Files**: `src/api/files.py`
- **Todos**: `src/api/todos.py`
- **Activities**: `src/api/activities.py`
- **Personalization**: `src/api/personalization.py`
- **Streaming**: `src/api/streaming.py`
- **Admin**: `src/api/admin.py`
- **V1 Compatibility**: `src/api/v1.py`

### For Services and Business Logic
- **AI Operations**: `src/services/ai_service.py`
- **Authentication**: `src/services/auth_service_v2.py`
- **Course Management**: `src/services/course_service.py`
- **File Processing**: `src/services/file_service.py`
- **Module Management**: `src/services/module_service.py`
- **Streaming**: `src/services/streaming_service.py`

### For Core Functionality
- **Database**: `src/core/database.py`
- **CORS**: `src/core/cors.py`
- **Decorators**: `src/core/decorators_v2.py`
- **Middleware**: `src/core/middleware.py`
- **Cache**: `src/core/cache.py`

## Important
- **DO NOT** add any code to `app.py`
- **DO NOT** restore the old app.py content
- **DO** use the blueprint architecture for all new features
- The application now starts from `app_refactored.py` via `wsgi.py`

## Backup Location
If you need to reference the old code, it's available at:
`src/app_legacy_backup.py`