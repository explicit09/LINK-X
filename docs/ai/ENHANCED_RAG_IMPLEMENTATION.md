# Enhanced RAG Implementation Guide

## Overview

This document describes the enhanced Retrieval-Augmented Generation (RAG) system implemented for LEARN-X. The system includes semantic chunking, hybrid search, hierarchical RAG, and adaptive context windows to provide superior educational content delivery.

## Architecture Components

### 1. Semantic Chunking (`utils/semantic_chunker.py`)

**Purpose**: Intelligently split content by meaning rather than character count.

**Features**:
- Detects document structure (chapters, sections, paragraphs)
- Classifies content types (definition, example, explanation, etc.)
- Extracts key concepts and cross-references
- Preserves context with intelligent overlap

**Usage**:
```python
from utils.semantic_chunker import create_enhanced_chunks

chunks = create_enhanced_chunks(file_id, content, file_type='pdf')
# Returns chunks with metadata in chunk_metadata field
```

### 2. Hybrid Search (`services/ai/hybrid_search_service.py`)

**Purpose**: Combines vector similarity and keyword search for better retrieval.

**Features**:
- Vector search for semantic similarity
- Full-text search for exact term matching
- Reciprocal rank fusion for result combination
- Intent-aware search strategies

**Usage**:
```python
from services.ai.hybrid_search_service import HybridSearchService

hybrid_search = HybridSearchService(embeddings_service)
results = hybrid_search.search(
    query="machine learning definition",
    search_type="hybrid",  # or "vector" or "keyword"
    course_id=course_id,
    limit=10
)
```

### 3. Hierarchical RAG (`services/ai/hierarchical_rag_service.py`)

**Purpose**: Different retrieval strategies for different query types.

**Query Intent Types**:
- **Definition**: Concise, focused retrieval
- **Example**: Diverse, practical instances
- **Procedural**: Sequential, complete processes
- **Conceptual**: Related concepts with context
- **Explanation**: Balanced depth and clarity

**Usage**:
```python
from services.ai.hierarchical_rag_service import HierarchicalRAGService

hierarchical_rag = HierarchicalRAGService(embeddings_service)
results = hierarchical_rag.retrieve(
    query="How do I implement backpropagation?",
    user_expertise="intermediate",
    max_chunks=10
)
```

### 4. Adaptive Context (`services/ai/adaptive_context_service.py`)

**Purpose**: Dynamically adjust context size based on multiple factors.

**Factors Considered**:
- Topic complexity
- User expertise level
- Query type
- Token budget

**Context Window Configuration**:
```python
from services.ai.adaptive_context_service import AdaptiveContextService

adaptive_context = AdaptiveContextService(hierarchical_rag)
chunks, context_window = adaptive_context.get_adaptive_context(
    query="explain quantum computing",
    user_expertise="beginner",
    max_tokens_budget=3000
)

# context_window contains:
# - max_chunks: Optimal number of chunks
# - max_tokens: Token limit
# - include_prerequisites: Whether to add foundational content
# - include_examples: Whether to add examples
# - summarization_level: How much to summarize if needed
```

## Integration with Streaming Service

The enhanced RAG system is integrated into `streaming_personalization_v2.py`:

```python
# In _personalize_section method:
# 1. Determine user expertise
user_expertise = self._get_user_expertise(context.user_profile)

# 2. Get adaptive context
search_results, context_window = self.adaptive_context.get_adaptive_context(
    query=section.title + " " + section.content[:200],
    user_expertise=user_expertise,
    max_tokens_budget=2000,
    course_id=context.course_id
)

# 3. Use retrieved chunks for personalization
# Instead of concatenating ALL chunks from the file
```

## Database Schema Usage

### Existing Fields Utilized

1. **FileChunk.chunk_metadata (JSONB)**:
   ```json
   {
     "chunk_type": "definition|example|explanation|...",
     "hierarchy_level": 0-3,
     "title": "Section Title",
     "concepts": ["concept1", "concept2"],
     "references": ["chunk_0", "chunk_5"]
   }
   ```

2. **Course.metadata (JSONB)** for teaching style:
   ```json
   {
     "teaching_style": {
       "terminology": {"term": frequency},
       "explanation_patterns": [...],
       "example_types": {"real_world": 5, "hypothetical": 3},
       "tone_indicators": {"formal": 10, "informal": 5}
     }
   }
   ```

3. **Full-text Search Indexes**:
   - `idx_filechunk_content_fts` - FTS on chunk content
   - `idx_filechunk_metadata` - GIN index on metadata
   - `idx_filechunk_hybrid_search` - Composite for performance

## API Endpoints

### Enhanced RAG Endpoints (`/api/v2/rag/`)

1. **Hybrid Search**:
   ```
   POST /api/v2/rag/search
   {
     "query": "search query",
     "course_id": "optional",
     "search_type": "hybrid|vector|keyword",
     "intent": "definition|example|explanation",
     "limit": 10
   }
   ```

2. **Process File with Semantic Chunking**:
   ```
   POST /api/v2/rag/process/file/<file_id>
   {
     "force": false  // Force reprocessing
   }
   ```

3. **Reprocess Entire Course**:
   ```
   POST /api/v2/rag/process/course/<course_id>
   ```

## Processing Workflow

### New File Upload
1. File uploaded → stored in S3
2. Task queued: `process_file_with_semantic_chunking`
3. Semantic chunking creates chunks with metadata
4. Embeddings generated for each chunk
5. Chunks stored with semantic metadata
6. Teaching style extracted (if professor content)

### Personalization Request
1. User requests personalized content
2. Outline generated from semantic structure
3. For each section:
   - Analyze query intent
   - Get adaptive context window
   - Retrieve relevant chunks with hierarchical RAG
   - Apply YAML prompt templates
   - Generate personalized content
   - Stream to user

## Performance Optimizations

1. **Caching**:
   - Outlines cached for 24 hours
   - Personalized sections cached per user
   - Search results cached briefly

2. **Token Management**:
   - Adaptive context prevents token waste
   - Summarization when needed
   - Per-section token budgets

3. **Search Efficiency**:
   - Hybrid search balances accuracy and speed
   - Intent-based strategies reduce irrelevant results
   - Diversity selection prevents redundancy

## Testing

Run comprehensive tests:
```bash
# Test all components
python src/test_enhanced_rag_system.py

# Test with specific file
python src/test_enhanced_rag_system.py <file_id>
```

## Migration Guide

### For Existing Files
1. Run migration to add indexes:
   ```bash
   psql $DATABASE_URL < src/db/migrations/0016_add_enhanced_rag_fields.sql
   ```

2. Reprocess files with semantic chunking:
   ```python
   from tasks.enhanced_file_processing import reprocess_course_with_enhancements
   reprocess_course_with_enhancements.delay(course_id)
   ```

### For New Deployments
1. Indexes created automatically
2. New files processed with semantic chunking by default
3. Set environment variable to enable:
   ```bash
   ENABLE_SEMANTIC_CHUNKING=true
   ```

## Best Practices

1. **Content Preparation**:
   - Use clear section headers in documents
   - Include examples after explanations
   - Define terms before using them extensively

2. **Query Design**:
   - Be specific about intent ("define X" vs "explain how X works")
   - Include expertise level in user profiles
   - Use academic terms consistently

3. **Monitoring**:
   - Track token usage per request
   - Monitor search relevance scores
   - A/B test different retrieval strategies

## Future Enhancements (Phase 3 Pending)

1. **Concept Graph**:
   - Build knowledge relationships
   - Prerequisites tracking
   - Learning path optimization

2. **Advanced Style Transfer**:
   - Professor voice matching
   - Terminology consistency
   - Example style adaptation

3. **Cross-Document Retrieval**:
   - Search across multiple courses
   - Find related content in different modules
   - Build comprehensive knowledge base