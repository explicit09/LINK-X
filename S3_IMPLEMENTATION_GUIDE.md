# S3 File Storage Implementation Guide

## Overview
This implementation adds AWS S3 support to LINK-X for efficient file storage and retrieval, replacing the current database-based file storage system.

## Architecture Changes

### Before (Database Storage)
- Files stored as BYTEA in PostgreSQL `file_data` column
- Entire file loaded into memory for each request
- No caching or CDN support
- Database backups include all file data

### After (S3 Storage)
- Files stored in AWS S3 with structured paths
- Database only stores S3 metadata (key, bucket)
- Presigned URLs for secure, temporary access
- Support for CloudFront CDN (optional)

## Implementation Details

### 1. Database Schema Updates
```sql
-- New columns added to File table
s3_key VARCHAR(512)       -- S3 object key
s3_bucket VARCHAR(255)    -- S3 bucket name
storage_type VARCHAR(20)  -- 'database' or 's3'
```

### 2. S3 File Structure
```
bucket-name/
├── courses/
│   ├── {course_id}/
│   │   ├── modules/
│   │   │   ├── {module_id}/
│   │   │   │   ├── {file_id}/
│   │   │   │   │   └── {filename}
```

### 3. Environment Variables
```bash
# Required for S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=linkx-files

# Enable S3 storage (default: false)
USE_S3_STORAGE=true

# Optional CDN
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
```

## API Changes

### File Upload
The existing upload endpoint now supports both storage types:
- `POST /instructor/modules/{module_id}/files`
- Automatically uses S3 if `USE_S3_STORAGE=true`

### File Retrieval
Updated endpoints return presigned URLs for S3 files:
- `GET /student/files/{file_id}/content`
- `GET /student/files/{file_id}/download`

Response format for S3 files:
```json
{
  "url": "https://s3.amazonaws.com/...",
  "type": "presigned",
  "expires_in": 3600
}
```

### Direct Browser Upload (New)
For large files, use direct S3 upload:

1. Get upload URL:
```bash
POST /instructor/modules/{module_id}/files/upload-url
{
  "filename": "lecture.pdf",
  "content_type": "application/pdf"
}
```

2. Upload directly to S3 using returned URL and fields

3. Confirm upload:
```bash
POST /instructor/modules/{module_id}/files/confirm-upload
{
  "file_id": "...",
  "s3_key": "...",
  "filename": "lecture.pdf",
  "file_size": 1024000
}
```

## Migration Guide

### 1. Run Database Migration
```bash
# Apply schema changes
psql $DATABASE_URL < docker-image/src/db/migrations/0005_add_s3_fields.sql
```

### 2. Configure AWS Credentials
```bash
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export S3_BUCKET_NAME=your-bucket
```

### 3. Migrate Existing Files
```bash
# Dry run (shows what would be migrated)
python docker-image/src/migrate_files_to_s3.py

# Actual migration
python docker-image/src/migrate_files_to_s3.py --execute
```

### 4. Enable S3 Storage
```bash
export USE_S3_STORAGE=true
```

## Frontend Integration

### Handling Presigned URLs
```javascript
// Fetch file content
const response = await fetch(`/student/files/${fileId}/content`);
const data = await response.json();

if (data.type === 'presigned') {
  // Redirect to presigned URL
  window.location.href = data.url;
  // Or fetch directly
  const fileResponse = await fetch(data.url);
}
```

### Direct Upload Example
```javascript
// 1. Get upload URL
const uploadInfo = await fetch(`/instructor/modules/${moduleId}/files/upload-url`, {
  method: 'POST',
  body: JSON.stringify({ filename: file.name, content_type: file.type })
});

// 2. Upload to S3
const formData = new FormData();
Object.entries(uploadInfo.upload_fields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', file);

await fetch(uploadInfo.upload_url, {
  method: 'POST',
  body: formData
});

// 3. Confirm upload
await fetch(`/instructor/modules/${moduleId}/files/confirm-upload`, {
  method: 'POST',
  body: JSON.stringify({
    file_id: uploadInfo.file_id,
    s3_key: uploadInfo.s3_key,
    filename: file.name,
    file_size: file.size
  })
});
```

## Performance Benefits

1. **Reduced Database Size**: Files no longer stored in DB
2. **Faster Uploads**: Direct browser-to-S3 uploads
3. **Global Distribution**: CDN support for worldwide users
4. **Scalability**: S3 handles any file size/volume
5. **Cost Efficiency**: S3 storage cheaper than DB storage

## Security Considerations

1. **Presigned URLs**: Temporary access (1 hour default)
2. **Access Control**: Files only accessible to enrolled students
3. **CORS Configuration**: Restricted to your domains
4. **Encryption**: S3 server-side encryption enabled

## Monitoring

- Track S3 usage in AWS Console
- Monitor presigned URL generation in logs
- Set up CloudWatch alarms for unusual activity

## Rollback Plan

If issues arise:
1. Set `USE_S3_STORAGE=false`
2. Files remain in both locations during migration
3. No data loss as DB storage preserved until confirmed