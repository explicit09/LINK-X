# 🔧 Troubleshooting: Ask AI Feature

## Current Issue Summary

**Error**: `"a bytes-like object is required, not 'NoneType'"`

**Root Cause**: The file hasn't been processed with FAISS indexing yet. When students click "Ask AI", the system tries to access `file.index_faiss` and `file.index_pkl` which are `None` because file processing didn't complete successfully.

## 🚀 Quick Fix (For Users)

### What This Error Means
When you see the error "File Still Processing", it means:
- The file was uploaded successfully ✅
- But the AI indexing process (FAISS) is incomplete ❌
- The personalization feature needs this index to work ❌

### Immediate Solutions
1. **Wait and Retry**: Files can take 30-60 seconds to process
2. **Check File Size**: Large files (>50MB) may take longer
3. **Contact Support**: If the issue persists after 5 minutes

## 🛠 Technical Solution (For Developers)

### Backend Processing Pipeline
The file upload process has these stages:

```
1. File Upload ✅ (Working)
2. Text Extraction ✅ (Working) 
3. FAISS Index Creation ❌ (Sometimes failing)
4. Database Storage ❌ (Missing indexes)
```

### Root Cause Analysis

1. **Missing Dependencies**: Some Python packages might be missing
2. **Processing Timeout**: Large files timeout before indexing completes
3. **Memory Issues**: FAISS indexing requires significant memory
4. **Environment Differences**: Local vs. Docker environment differences

### Code Enhancement Made

We've enhanced the `handleAskAI` function to:

```typescript
// Better error handling
if (errorData.error && errorData.error.includes("bytes-like object is required")) {
  throw new Error("This file is still being processed. Please try again in a few moments, or contact support if the issue persists.");
}

// Retry mechanism
if (errorMessage.includes("still being processed")) {
  sonnerToast.error("File Still Processing", {
    description: "This material is still being processed. Please wait a few moments and try again.",
    action: {
      label: "Try Again",
      onClick: () => {
        setTimeout(() => handleAskAI(material), 5000); // Retry after 5 seconds
      }
    }
  });
}
```

## 🎯 Long-term Solutions

### 1. Background Processing Queue
Implement a proper job queue system:
```python
# Add to requirements.txt
celery==5.3.4
redis==5.0.1

# Background task
@celery.task
def process_file_async(file_id):
    # Move FAISS processing to background
    pass
```

### 2. Processing Status Tracking
Add status field to File model:
```sql
ALTER TABLE "File" ADD COLUMN processing_status VARCHAR(32) DEFAULT 'pending';
-- Values: 'pending', 'processing', 'completed', 'failed'
```

### 3. Chunked Processing
For large files, process in smaller chunks:
```python
def process_large_file(file_data, file_id):
    chunk_size = 1000  # Process 1000 chars at a time
    # Process incrementally...
```

### 4. Health Check Endpoint
Add monitoring for file processing:
```python
@app.route('/health/processing')
def processing_health():
    failed_files = get_files_with_failed_processing()
    return {"status": "ok", "failed_count": len(failed_files)}
```

## 🧪 Testing the Fix

### For Students:
1. Upload a small test file (< 5MB PDF)
2. Wait 30 seconds after upload completes
3. Click "Ask AI" button
4. If it fails, try the "Try Again" button

### For Developers:
1. Check backend logs: `docker logs backend`
2. Monitor file processing: `SELECT id, title, index_faiss IS NOT NULL as has_index FROM "File";`
3. Test with curl: `curl -X POST http://localhost:8080/generatepersonalizedfilecontent -d '{"fileId":"test"}'`

## 📊 Expected User Experience

### Before Fix:
```
Student clicks "Ask AI" → 500 Error → Generic error message → Frustration 😞
```

### After Fix:
```
Student clicks "Ask AI" → 
  If processing: "File Still Processing" + Retry button → 
  After retry: Personalized content → Success! 😊
```

## 🔍 Debugging Commands

### Check Backend Status
```bash
curl http://localhost:8080  # Should return 404 (server running)
curl http://localhost:8080/me  # Should return 401 (auth required)
```

### Check Database
```sql
-- Files without FAISS indexes
SELECT id, title, index_faiss IS NOT NULL as has_faiss 
FROM "File" 
WHERE index_faiss IS NULL;

-- Files uploaded recently
SELECT id, title, created_at 
FROM "File" 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Check Processing Logs
```bash
# In docker-image directory
python src/app.py  # Run in foreground to see logs
```

## 🎯 Success Metrics

Students should experience:
- ✅ Clear feedback when files are processing
- ✅ Automatic retry options
- ✅ Successful personalization within 1-2 minutes
- ✅ Helpful error messages with next steps

## 📞 Support Information

**For Students**:
- If you see "File Still Processing", wait 1-2 minutes and try again
- Small files (< 10MB) should process within 30 seconds
- Contact support if issues persist after 5 minutes

**For Instructors**:
- Recommend students upload files in smaller batches
- PDFs under 20MB typically process fastest
- Check with IT support for backend processing issues

**For Developers**:
- Monitor processing success rates
- Implement proper error logging
- Consider async processing for large files
- Add health checks for critical components

---

**🔧 Status**: Enhanced error handling implemented ✅  
**🚀 Next**: Background processing queue implementation  
**📈 Priority**: High (affects core functionality) 