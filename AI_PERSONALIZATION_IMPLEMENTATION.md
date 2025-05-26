# AI Personalization Implementation Guide

## Overview
The AI personalization feature allows students to create customized learning experiences based on their individual learning profiles. Students can personalize either individual files or entire modules.

## How It Works

### 1. **Student Profile**
Students complete an onboarding process that captures:
- **Role/Job**: Their current position (e.g., student, professional)
- **Traits**: Preferred assistant personality (helpful, encouraging, etc.)
- **Learning Style**: Visual, auditory, kinesthetic, etc.
- **Depth**: Beginner, intermediate, or advanced explanations
- **Interests**: Topics they're interested in
- **Schedule**: When they prefer to study

### 2. **Personalization Options**

#### Single File Personalization
- Click the sparkles (✨) icon on any file
- Select "Personalize for Me" from the dropdown
- System creates a personalized version of that specific file

#### Module Personalization
- Click "Personalize" button on any module
- System combines content from all files in the module
- Creates a comprehensive, integrated study guide

### 3. **Backend Processing**

#### File Personalization (`/generatepersonalizedfilecontent`)
1. Retrieves student profile from database
2. Uses pgvector to find relevant content chunks
3. Sends content + profile to OpenAI GPT-4
4. Generates personalized study material
5. Saves to PersonalizedFile table
6. Returns personalized file ID

#### Module Personalization (`/generatepersonalizedmodulecontent`)
1. Retrieves all files in the module
2. Checks if files have been processed (have embeddings)
3. Combines content from multiple files
4. Creates integrated study guide with GPT-4
5. Saves as PersonalizedFile (without original_file_id)
6. Returns personalized module ID

### 4. **Learn Page Display**
- Receives personalized file ID from URL
- Fetches content from `/student/personalized-files/{id}`
- Displays structured content with:
  - Chapters and subsections
  - Progress tracking
  - Time estimates
  - AI tutor integration

## Technical Architecture

### Frontend Components

#### ModuleStream.tsx
```typescript
// Single file personalization
const handlePersonalizeSingleFile = async (material: Material) => {
  // Fetch student profile
  // Call /generatepersonalizedfilecontent
  // Navigate to /learn/{personalizedId}
}

// Module personalization
const handlePersonalizeAll = async (module: Module) => {
  // Fetch student profile
  // Call /generatepersonalizedmodulecontent with polling
  // Navigate to /learn/{personalizedId}
}
```

#### Learn Page (`/learn/[id]/page.tsx`)
- Fetches personalized content
- Renders chapters and subsections
- Tracks progress and study time
- Provides AI tutor chat

### Backend Endpoints

#### `/generatepersonalizedfilecontent` (POST)
```python
# Request body
{
  "name": "Student Name",
  "userProfile": {
    "role": "student",
    "traits": "helpful",
    "learningStyle": "visual",
    "depth": "intermediate",
    "interests": "technology",
    "personalization": "practical examples",
    "schedule": "flexible"
  },
  "fileId": "uuid"
}

# Response
{
  "id": "personalized-file-uuid",
  "content": {
    "title": "Personalized Title",
    "chapters": [...]
  }
}
```

#### `/generatepersonalizedmodulecontent` (POST)
```python
# Request body
{
  "name": "Student Name",
  "userProfile": {...},
  "moduleId": "uuid"
}

# Response (with polling for 202 status)
{
  "id": "personalized-module-uuid",
  "content": {
    "title": "Module Study Guide",
    "chapters": [...],
    "moduleId": "original-module-id",
    "fileCount": 5
  }
}
```

### Database Schema

#### PersonalizedFile Table
- `id`: UUID (primary key)
- `user_id`: References StudentProfile
- `original_file_id`: References File (null for modules)
- `content`: JSONB with personalized content
- `created_at`: Timestamp

### pgvector Integration
- Uses vector embeddings for content retrieval
- Finds relevant chunks based on user persona
- Similarity search with threshold
- Optimized with HNSW/IVFFlat indexes

## User Experience Flow

1. **Student browses course materials**
   - Sees modules with files
   - Each file shows AI options

2. **Student clicks personalize**
   - Loading state with progress messages
   - Handles processing delays gracefully
   - Shows clear error messages if needed

3. **Personalized content opens**
   - New tab with Learn page
   - Structured, easy-to-read format
   - Personalized explanations throughout

4. **Student learns with AI support**
   - Progress tracking
   - AI tutor for questions
   - Bookmarking and notes (future)

## Error Handling

### Common Issues
1. **File not processed**: Shows 202 status, asks to retry
2. **No profile**: Redirects to onboarding
3. **Network issues**: Retry with exponential backoff
4. **OpenAI failures**: Fallback to structured content

### Status Codes
- `200`: Success
- `202`: Processing, try again
- `400`: Bad request
- `403`: Forbidden
- `404`: Not found
- `500`: Server error

## Performance Optimizations

1. **Caching**: Personalized files are saved for reuse
2. **Chunking**: Limits content to avoid token limits
3. **Indexes**: pgvector indexes for fast retrieval
4. **Polling**: Smart backoff for processing status

## Future Enhancements

1. **Batch personalization**: Personalize entire course
2. **Style preferences**: More granular customization
3. **Progress sync**: Track progress across devices
4. **Collaborative notes**: Share insights with peers
5. **Adaptive learning**: Adjust based on performance
6. **Export options**: PDF, EPUB, etc.

## Testing the Feature

1. **Setup**:
   - Ensure files have been processed (run reprocessing script)
   - Student must complete onboarding
   - pgvector indexes should be created

2. **Test single file**:
   - Navigate to course with files
   - Click sparkles → "Personalize for Me"
   - Verify Learn page opens with content

3. **Test module**:
   - Click "Personalize" on module
   - Wait for processing
   - Verify integrated content

4. **Test error cases**:
   - Try without profile
   - Try with unprocessed files
   - Test network interruptions