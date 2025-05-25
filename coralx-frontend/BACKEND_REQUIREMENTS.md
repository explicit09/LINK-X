# Backend Requirements for Module-File Association

## Issues Identified

1. **Module name changes don't persist** - Backend doesn't support module title updates
2. **File-module associations don't persist** - Files uploaded to modules don't maintain their relationship after refresh

## Required Backend Changes

### 1. Module Title Updates

**Current Issue**: Module title updates return 405 Method Not Allowed

**Required Endpoints**:
```
PUT /student/modules/{moduleId}
PUT /instructor/modules/{moduleId}
```

**Request Body**:
```json
{
  "title": "New Module Title"
}
```

**Response**:
```json
{
  "id": "module_id",
  "title": "Updated Module Title",
  "courseId": "course_id",
  "updatedAt": "2024-01-01T10:00:00Z"
}
```

### 2. File-Module Association

**Current Issue**: Files uploaded to specific modules don't retain their moduleId relationship

**Required Changes to Existing Endpoints**:

#### Student File Upload
```
POST /student/courses/{courseId}/files
```

**Request FormData Should Include**:
- `file`: The uploaded file
- `title`: File title
- `description`: File description  
- `moduleId`: **CRITICAL** - The module ID this file belongs to

**Backend Must**:
1. Store the `moduleId` in the database with the file record
2. Return the file object with `moduleId` included

#### Instructor File Upload
```
POST /instructor/modules/{moduleId}/files/upload
```

**This endpoint should work correctly** as it already includes moduleId in the URL, but ensure:
1. The `moduleId` is stored in the database with the file record
2. The response includes the `moduleId`

### 3. Material/File Retrieval

**Current Issue**: When materials are fetched, they don't include `moduleId`

**Required**: All file/material endpoints must return `moduleId` in the response:

```json
{
  "id": "file_id",
  "title": "Document.pdf",
  "type": "pdf",
  "size": "1.2MB",
  "uploadedAt": "2024-01-01T10:00:00Z",
  "moduleId": "module_id_here",  // CRITICAL: This must be included
  "moduleName": "Week 1 - Introduction"
}
```

### 4. Database Schema Requirements

**Files/Materials Table Must Have**:
```sql
CREATE TABLE files (
    id VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,
    file_size BIGINT,
    course_id VARCHAR NOT NULL,
    module_id VARCHAR,  -- CRITICAL: Foreign key to modules table
    uploaded_by VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (module_id) REFERENCES modules(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
```

**Modules Table Must Support Updates**:
```sql
CREATE TABLE modules (
    id VARCHAR PRIMARY KEY,
    title VARCHAR NOT NULL,
    course_id VARCHAR NOT NULL,
    created_by VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

## Testing the Fixes

### 1. Test Module Title Updates
```bash
curl -X PUT http://localhost:8081/instructor/modules/module_id \
  -H "Content-Type: application/json" \
  -d '{"title": "New Module Name"}' \
  --cookie "session_cookie"
```

Expected: 200 OK with updated module object

### 2. Test File Upload with Module Association
```bash
curl -X POST http://localhost:8081/student/courses/course_id/files \
  -F "file=@test.pdf" \
  -F "title=Test Document" \
  -F "moduleId=module_id" \
  --cookie "session_cookie"
```

Expected: File object returned with `moduleId` field populated

### 3. Test File Retrieval Includes Module Info
```bash
curl http://localhost:8081/student/courses/course_id/files \
  --cookie "session_cookie"
```

Expected: All files include `moduleId` and `moduleName` fields

## Frontend Changes Made

1. **Added `moduleId` to FormData** - Files now include their target module ID
2. **Enhanced debugging** - Console logs show when materials lack `moduleId`
3. **Improved error handling** - Clear feedback when backend doesn't support operations
4. **Better state management** - Handles edge cases when backend relationships are missing

## Priority Order

1. **HIGH**: Fix file-module association (add `moduleId` to database and responses)
2. **MEDIUM**: Implement module title update endpoints
3. **LOW**: Optimize query performance for large numbers of files/modules

## Validation

After implementing these changes:
1. Upload a file to a specific module
2. Refresh the page
3. Verify the file appears in the same module
4. Rename a module
5. Refresh the page  
6. Verify the module name persists 