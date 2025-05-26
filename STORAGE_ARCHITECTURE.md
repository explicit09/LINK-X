# LINK-X Storage Architecture

## 🏗️ Component Responsibilities

### 1. **AWS S3** (File Binary Storage)
- **Stores**: Raw file binaries (PDFs, videos, audio, documents)
- **Does NOT store**: Metadata, text content, embeddings
- **Access**: Via presigned URLs for security
- **Structure**: `courses/{course_id}/modules/{module_id}/{file_id}/{filename}`

### 2. **PostgreSQL** (Metadata & Relationships)
- **Stores**: 
  - File metadata (title, type, size, timestamps)
  - S3 references (s3_key, s3_bucket)
  - User data and profiles
  - Course and module structures
  - Enrollments and access codes
  - Chat histories
- **Does NOT store**: File binaries (when S3 is enabled)

### 3. **pgvector** (AI/Search Infrastructure)
- **Stores**:
  - Text chunks extracted from files
  - Vector embeddings (1536-dimensional)
  - Chunk metadata for context
- **Does NOT store**: Original files or raw content
- **Indexes**: HNSW or IVFFlat for fast similarity search

## 📊 Data Flow Diagram

```
┌─────────────────┐
│   User Upload   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ File Handler    │
└────────┬────────┘
         │
         ├────────────────┬────────────────┬
         ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│   AWS S3        │ │ PostgreSQL  │ │ Background Job  │
│                 │ │             │ │                 │
│ • File binary   │ │ • Metadata  │ │ • Extract text  │
│ • Presigned URL │ │ • Relations │ │ • Create chunks │
│                 │ │ • S3 keys   │ │ • Generate      │
│                 │ │             │ │   embeddings    │
└─────────────────┘ └─────────────┘ └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │    pgvector     │
                                    │                 │
                                    │ • Text chunks   │
                                    │ • Embeddings    │
                                    │ • Vector index  │
                                    └─────────────────┘
```

## 🔍 Storage Decision Matrix

| File Component | S3 Enabled | S3 Disabled | Notes |
|----------------|------------|-------------|-------|
| File Binary | ✅ S3 | ❌ PostgreSQL BYTEA | S3 preferred for scalability |
| File Metadata | ❌ PostgreSQL | ❌ PostgreSQL | Always in DB |
| S3 Keys | ✅ PostgreSQL | ❌ NULL | Reference to S3 location |
| Text Chunks | ❌ pgvector | ❌ pgvector | For AI search |
| Embeddings | ❌ pgvector | ❌ pgvector | Vector similarity |

## ⚠️ Anti-Patterns to Avoid

### ❌ Double Storage
```sql
-- BAD: File stored in both places
SELECT * FROM "File" 
WHERE file_data IS NOT NULL 
AND s3_key IS NOT NULL;
```

### ❌ Missing Storage
```sql
-- BAD: File has no storage location
SELECT * FROM "File" 
WHERE file_data IS NULL 
AND s3_key IS NULL;
```

### ❌ Mismatched Storage Type
```sql
-- BAD: storage_type doesn't match actual storage
SELECT * FROM "File"
WHERE storage_type = 's3' 
AND s3_key IS NULL;
```

## ✅ Proper Storage Patterns

### 1. **S3 Storage (Recommended)**
```python
# Upload to S3
s3_result = s3_storage.upload_file(...)

# Save metadata to PostgreSQL
file = create_file(
    db=db,
    s3_key=s3_result['s3_key'],
    s3_bucket=s3_result['s3_bucket'],
    storage_type='s3',
    file_data=None  # No binary in DB!
)

# Generate embeddings asynchronously
task = index_file.apply_async(args=[file.id])
```

### 2. **Database Storage (Legacy/Small Files)**
```python
# Save to PostgreSQL only
file = create_file(
    db=db,
    file_data=binary_content,
    storage_type='database',
    s3_key=None,  # No S3 reference
    s3_bucket=None
)
```

## 📋 Audit Commands

### Check Storage Distribution
```bash
cd /Users/explicit/Documents/GitHub/LINK-X1/docker-image
python3 src/storage_audit.py
```

### Migrate Database Files to S3
```bash
python3 src/migrate_files_to_s3.py
```

### Generate Missing Embeddings
```bash
./run_reprocessing.sh
```

### Monitor pgvector Performance
```bash
python3 src/monitor_pgvector.py
```

## 🚀 Performance Considerations

1. **S3 Benefits**:
   - Unlimited storage capacity
   - CDN integration possible
   - Reduced database load
   - Better concurrent access

2. **pgvector Optimization**:
   - Create indexes after 100+ chunks
   - Use HNSW for best performance
   - Monitor query times

3. **PostgreSQL Best Practices**:
   - Keep BYTEA usage minimal
   - Index foreign keys
   - Regular VACUUM operations

## 🔐 Security

1. **S3 Access**:
   - Always use presigned URLs
   - Set appropriate expiration times
   - Enable bucket encryption

2. **Database**:
   - Encrypt sensitive data
   - Use proper access controls
   - Regular backups

3. **API**:
   - Validate file uploads
   - Check user permissions
   - Rate limiting