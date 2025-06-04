# Personalization Database Access Fixes

## Issues Found

### 1. **Multiple Data Sources Confusion**
The system has multiple places where file data can be stored:
- **File table**: Contains metadata with `s3_key`, `s3_bucket`, `storage_type`, and legacy `file_data`
- **FileChunk table**: Contains processed chunks with embeddings (THIS IS THE CORRECT SOURCE)
- **S3 Storage**: Raw files stored in S3

### 2. **Wrong Service Being Used**
- Created a new `student_personalization_service.py` that tried to access files incorrectly
- The EXISTING `personalization_integration.py` service already works correctly with FileChunks

### 3. **Incorrect Attribute Access**
The new service was looking for:
- `file_obj.storage_url` (doesn't exist)
- `file_obj.file_path` (doesn't exist)
- `self.s3_service.download_file_content()` (method doesn't exist)

Correct attributes are:
- `file_obj.s3_key` and `file_obj.s3_bucket` for S3
- `file_obj.file_data` for legacy database storage
- `FileChunk` table for processed content

## Fixes Applied

### 1. **Updated Student Personalization Service**
```python
# Now checks in correct order:
1. FileChunks (preferred) - properly processed content
2. file_data (legacy) - if stored in database
3. S3 download - using correct s3_key and s3_bucket
```

### 2. **Frontend Using Correct Endpoint**
Changed from:
```javascript
// Wrong - new broken endpoint
`/api/v2/personalization/enhanced/stream/${fileId}`
```

To:
```javascript
// Correct - existing working endpoint
`/api/v2/personalization/stream/${fileId}`
```

### 3. **Event Structure Compatibility**
Updated frontend to handle existing event structure:
- `type: 'outline'` → Initialize sections
- `type: 'progress'` → Track progress
- `type: 'content'` → Display personalized content
- `type: 'error'` → Handle errors

## Data Flow (Correct)

1. **File Upload**
   - File uploaded → Stored in S3
   - Background task processes file
   - Text extracted and chunked
   - Chunks saved to FileChunk table with embeddings

2. **Personalization**
   - Fetch FileChunks from database (NOT raw files)
   - Group chunks into logical sections
   - Generate personalized content for each section
   - Stream results to frontend

## Key Takeaways

1. **Always use FileChunks** for personalization - they contain properly processed content
2. **Don't bypass the processing pipeline** - raw files need to be chunked first
3. **Use existing working services** - `personalization_integration.py` already handles this correctly
4. **Check database schema** before accessing attributes - use actual column names

## Testing Checklist

- [ ] Upload a new file and wait for processing to complete
- [ ] Check that FileChunks exist: `SELECT COUNT(*) FROM file_chunk WHERE file_id = ?`
- [ ] Navigate to personalization page
- [ ] Verify content streams properly
- [ ] Check that content comes from chunks, not raw file download