# CORS Configuration Guide

## Overview

The LINK-X1 backend now uses a dynamic CORS configuration that:
1. Supports multiple frontend development ports (3000-3010)
2. Properly handles credentials (cookies, authorization headers)
3. Never uses wildcard origins with credentials
4. Provides consistent CORS handling across all endpoints

## Configuration

### Environment Variables

- `ALLOWED_ORIGINS`: Comma-separated list of additional allowed origins
  ```bash
  ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com
  ```

- `PRODUCTION_URL`: Production frontend URL to allow
  ```bash
  PRODUCTION_URL=https://app.example.com
  ```

### Default Configuration

By default, the following origins are allowed:
- `http://localhost:3000` through `http://localhost:3010`
- `http://127.0.0.1:3000` through `http://127.0.0.1:3010`
- Any origins specified in `ALLOWED_ORIGINS`
- The origin specified in `PRODUCTION_URL`

## Implementation Details

### 1. Config Module (`src/config.py`)
- Dynamically builds the allowed origins list
- Supports development ports 3000-3010
- Removes duplicates while preserving order
- Never uses wildcard origins

### 2. CORS Utility (`src/core/cors.py`)
- `get_allowed_origin()`: Validates request origin against allowed list
- `cors_after_request()`: Adds appropriate CORS headers to responses
- `handle_preflight()`: Handles OPTIONS preflight requests
- `cors_enabled`: Decorator for endpoints needing CORS

### 3. Middleware Integration (`src/core/middleware.py`)
- Applies CORS headers to all responses via `after_request` hook
- Ensures consistent CORS handling across the application

### 4. Security Features
- Never sets `Access-Control-Allow-Origin: *` when credentials are used
- Only returns the specific origin if it's in the allowed list
- Logs denied origins for debugging
- Sets appropriate security headers (X-Frame-Options, etc.)

## Testing CORS

Use the provided test script:

```bash
# Test with default backend URL
python docker-image/test_cors.py

# Test with custom backend URL
python docker-image/test_cors.py http://localhost:8080
```

The script will:
1. Test preflight (OPTIONS) requests
2. Test actual GET requests
3. Test multiple frontend ports (3000, 3001, 3002, 3005)
4. Verify that unallowed origins are rejected

## Troubleshooting

### CORS errors in browser console
1. Check that your frontend port is in the allowed range (3000-3010)
2. Verify the backend is running and accessible
3. Check browser network tab for actual response headers
4. Look for denied origin warnings in backend logs

### Adding new allowed origins
1. For development: Use ports in the 3000-3010 range
2. For production: Set `PRODUCTION_URL` environment variable
3. For additional origins: Update `ALLOWED_ORIGINS` environment variable

### Legacy endpoints
The `/courses/<course_id>/moduleswithfiles` and `/student/courses/<course_id>/discussions` endpoints have been updated to use the centralized CORS configuration instead of setting headers manually.

## Best Practices

1. **Never use wildcard origins** with credentials
2. **Always validate origins** against an allowed list
3. **Log denied origins** for debugging
4. **Use environment variables** for production origins
5. **Test CORS configuration** after changes

## Migration Notes

If you're updating from the old CORS configuration:
1. Remove any manual CORS header setting in route handlers
2. Update environment variables if needed
3. Test all frontend applications to ensure they still work
4. Monitor logs for any denied origins that need to be added