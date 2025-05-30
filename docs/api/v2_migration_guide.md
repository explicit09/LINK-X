# API v2 Migration Guide

## Overview

API v1 is being deprecated and will be sunset on **December 31, 2025**. This guide will help you migrate from API v1 to API v2.

## Key Changes in v2

### 1. **Standardized Response Format**

All v2 endpoints return responses in a consistent format:

#### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { /* response data */ },
  "timestamp": "2025-05-29T12:00:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": { /* field-specific errors */ },
  "timestamp": "2025-05-29T12:00:00Z"
}
```

#### Paginated Response
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "pages": 5,
    "has_next": true,
    "has_prev": false,
    "next_url": "/api/v2/courses?page=2&per_page=20",
    "prev_url": null
  },
  "timestamp": "2025-05-29T12:00:00Z"
}
```

### 2. **Improved Error Handling**

- Consistent HTTP status codes
- Detailed error messages with field-level validation
- Proper error types (ValidationError, NotFoundError, UnauthorizedError)

### 3. **Enhanced Security**

- Stronger authentication requirements
- Rate limiting on all endpoints
- Improved CORS handling
- Security headers on all responses

### 4. **Better Resource Representations**

- More detailed resource objects
- Nested relationships included where appropriate
- Consistent field naming (camelCase → snake_case)

## Endpoint Changes

### Authentication Endpoints

| v1 Endpoint | v2 Endpoint | Changes |
|-------------|-------------|---------|
| `POST /api/v1/auth/sessionLogin` | `POST /api/v2/auth/login` | - Returns standardized response<br>- Includes user details and token expiration |
| `POST /api/v1/auth/sessionLogout` | `POST /api/v2/auth/logout` | - Properly invalidates tokens |
| `GET /api/v1/auth/me` | `GET /api/v2/auth/me` | - Returns more detailed user profile<br>- Includes role permissions and stats |
| `PATCH /api/v1/auth/me` | `PATCH /api/v2/auth/me` | - Validated field updates<br>- Returns updated fields list |

### Course Endpoints

| v1 Endpoint | v2 Endpoint | Changes |
|-------------|-------------|---------|
| `GET /api/v1/courses` | `GET /api/v2/courses` | - Pagination support<br>- Advanced filtering (search, category, tags)<br>- Includes course statistics |
| `POST /api/v1/courses` | `POST /api/v2/courses` | - Enhanced validation<br>- Standardized response format |
| `GET /api/v1/courses/{id}` | `GET /api/v2/courses/{id}` | - Includes all course details<br>- User enrollment status<br>- Module list with materials |
| `PATCH /api/v1/courses/{id}` | `PUT/PATCH /api/v2/courses/{id}` | - Supports both PUT and PATCH<br>- Field validation<br>- Returns updated fields |
| `GET /api/v1/courses/{id}/moduleswithfiles` | `GET /api/v2/courses/{id}/modules` | - Simplified endpoint name<br>- Better structured response |

### Module Endpoints

| v1 Endpoint | v2 Endpoint | Changes |
|-------------|-------------|---------|
| `GET /api/v1/modules/{id}` | `GET /api/v2/modules/{id}` | - Includes file list<br>- Better error handling |
| `POST /api/v1/courses/{id}/modules` | `POST /api/v2/courses/{id}/modules` | - Required field validation<br>- Automatic ordering |

### File Endpoints

| v1 Endpoint | v2 Endpoint | Changes |
|-------------|-------------|---------|
| `POST /api/v1/files/upload` | `POST /api/v2/files/upload` | - Progress tracking support<br>- Better validation<br>- Returns S3 key |
| `GET /api/v1/files/{id}/content` | `GET /api/v2/files/{id}/content` | - Returns signed URL with expiration<br>- Proper access control |

### Todo Endpoints

| v1 Endpoint | v2 Endpoint | Changes |
|-------------|-------------|---------|
| `GET /api/v1/todo-items` | `GET /api/v2/todos` | - Pagination support<br>- Status and priority filtering |
| `POST /api/v1/todo-items` | `POST /api/v2/todos` | - Field validation<br>- Default values |

## Migration Steps

### 1. Update Base URL

```javascript
// v1
const API_BASE = 'https://api.learn-x.com/api/v1';

// v2
const API_BASE = 'https://api.learn-x.com/api/v2';
```

### 2. Update Request Headers

Add the API version header to all requests:

```javascript
headers: {
  'X-API-Version': 'v2',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```

### 3. Handle New Response Format

```javascript
// v1 handling
fetch(`${API_BASE}/courses`)
  .then(res => res.json())
  .then(data => {
    // data is an array of courses
    const courses = data;
  });

// v2 handling
fetch(`${API_BASE}/courses`)
  .then(res => res.json())
  .then(response => {
    if (response.success) {
      const courses = response.data;
      const pagination = response.pagination;
    } else {
      console.error(response.message, response.errors);
    }
  });
```

### 4. Update Error Handling

```javascript
// v2 error handling
try {
  const response = await fetch(`${API_BASE}/courses`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(courseData)
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    // Handle HTTP errors
    if (response.status === 400 && result.errors) {
      // Field-specific validation errors
      Object.entries(result.errors).forEach(([field, error]) => {
        console.error(`${field}: ${error}`);
      });
    } else {
      // General error
      console.error(result.message);
    }
  } else if (result.success) {
    // Success
    const newCourse = result.data;
  }
} catch (error) {
  // Network or parsing error
  console.error('Request failed:', error);
}
```

### 5. Use Pagination

```javascript
// Fetch paginated data
async function fetchCourses(page = 1, perPage = 20) {
  const response = await fetch(
    `${API_BASE}/courses?page=${page}&per_page=${perPage}`
  );
  const result = await response.json();
  
  if (result.success) {
    return {
      courses: result.data,
      hasMore: result.pagination.has_next,
      total: result.pagination.total
    };
  }
}
```

## Deprecation Timeline

- **May 29, 2025**: API v2 released, v1 deprecation announced
- **August 31, 2025**: Deprecation warnings added to all v1 responses
- **October 31, 2025**: Final reminder sent to all API consumers
- **December 31, 2025**: API v1 sunset, all v1 endpoints return 410 Gone

## Testing Your Migration

1. **Use v2 in Development First**
   - Test all endpoints in your development environment
   - Verify response parsing and error handling

2. **Monitor Deprecation Headers**
   - Check for `X-API-Deprecated: true` header
   - Log any v1 usage in your application

3. **Gradual Migration**
   - Migrate endpoints one at a time
   - Use feature flags to switch between v1 and v2

4. **Validate Data Consistency**
   - Ensure data returned by v2 matches your expectations
   - Test edge cases and error scenarios

## Support

If you need help with migration:

- Documentation: https://api.learn-x.com/docs/v2
- Support Email: api-support@learn-x.com
- Migration Tools: https://github.com/learn-x/api-migration-tools

## FAQ

**Q: Can I use both v1 and v2 simultaneously?**
A: Yes, during the migration period you can use both versions. However, we recommend migrating as soon as possible.

**Q: Will my existing authentication tokens work with v2?**
A: Yes, authentication tokens are compatible between versions.

**Q: Are there any breaking changes in v2?**
A: The main breaking changes are in response format and some endpoint paths. The core functionality remains the same.

**Q: What happens after December 31, 2025?**
A: All v1 endpoints will return 410 Gone status with a message directing to v2.

**Q: Is there a migration tool available?**
A: Yes, we provide SDK updates and migration scripts. Check our GitHub repository.