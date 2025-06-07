# AI-Related Files Audit Report

## Summary
This audit identifies duplicate, deprecated, and actively used AI-related files in the `/docker-image/src/` directory.

## 1. Embedding Service Implementations

### Currently Active:
- **Supabase Auto-Embeddings**: The system has migrated to Supabase's automatic embedding generation
- `/src/tasks/embedding_worker.py` - High-performance embedding worker (may be redundant with Supabase)
- `/src/services/query_embedding_cache.py` - Query embedding cache service (still useful for caching)

### Deprecated/Unused:
- Previous `EmbeddingsService` class has been removed (references found in comments)
- `/src/utils/indexer.py` - Only imported by `file_upload_handler.py`, contains basic embedding generation

### Recommendation:
- Keep `query_embedding_cache.py` for performance optimization
- Consider removing `embedding_worker.py` if Supabase handles all embeddings
- Remove `indexer.py` as it duplicates functionality

## 2. RAG/Search Implementations

### Currently Active:
- `/src/services/ai/hybrid_search_service.py` - Combines vector + keyword search (used by 5 files)
- `/src/services/ai/hierarchical_rag_service.py` - Intent-aware retrieval (used by 3 files)
- `/src/services/ai/utils/vector_search.py` - Core vector search utilities
- `/src/services/ai/adaptive_context_service.py` - Adaptive context management

### Deprecated/Unused:
- `/src/services/ai/utils/optimized_rag.py` - Contains OptimizedRAG class but not directly imported

### Recommendation:
- Keep all active search services as they provide different search strategies
- Consider removing `optimized_rag.py` if functionality is covered elsewhere

## 3. Chunking Implementations

### Currently Active:
- `/src/utils/semantic_chunker.py` - Semantic chunking with metadata (used by 2 files)
- `/src/utils/textUtils.py` - Basic text splitting and cleaning (used by 7 files)
  - `split_text()` - Token-based chunking
  - `clean_extracted_text()` - Text cleaning
  - `extract_text()` - File text extraction

### Usage Pattern:
- `semantic_chunker.py` is only used by:
  - `tasks/enhanced_file_processing.py`
  - `tasks/file_processing_simple.py`
- `textUtils.py` is widely used across the codebase

### Recommendation:
- Keep both as they serve different purposes
- `textUtils.py` for basic operations
- `semantic_chunker.py` for advanced chunking with metadata

## 4. AI Service Files

### Currently Active:
- `/src/services/ai_service.py` - Backward compatibility wrapper
- `/src/services/ai/ai_service.py` - Main AI service orchestrator
- `/src/services/ai/clients/openai_client.py` - OpenAI API client
- `/src/services/ai/generators/content_generator.py` - Content generation
- `/src/services/ai/generators/quiz_generator.py` - Quiz generation
- `/src/services/ai/chat/chat_service.py` - Chat functionality
- `/src/services/ai/dashboard_ai.py` - Dashboard-specific AI features

### Architecture:
The AI service follows a modular architecture:
```
services/ai_service.py (compatibility wrapper)
    └── services/ai/
        ├── ai_service.py (orchestrator)
        ├── clients/ (API clients)
        ├── generators/ (content generators)
        ├── chat/ (chat services)
        └── utils/ (utilities)
```

### Recommendation:
- Keep all files as they follow a clean modular architecture
- The wrapper at `services/ai_service.py` ensures backward compatibility

## 5. File Processing Tasks

### Currently Active:
- `/src/tasks/file_processing.py` - Main file processing task
- `/src/tasks/file_processing_simple.py` - Simplified version
- `/src/tasks/enhanced_file_processing.py` - Enhanced with semantic chunking

### Usage:
- `file_processing.py` is imported in `tasks/__init__.py`
- All three contain similar functionality with different complexity levels

### Recommendation:
- Consolidate into a single file with configuration options
- Keep `enhanced_file_processing.py` as the main implementation
- Remove `file_processing.py` and `file_processing_simple.py`

## 6. Duplicate Functionality Matrix

| Functionality | Files | Status | Action |
|--------------|-------|---------|---------|
| Embeddings | `embedding_worker.py`, Supabase auto-embeddings | Redundant | Remove worker if Supabase handles all |
| Basic chunking | `textUtils.split_text()` | Active | Keep |
| Semantic chunking | `semantic_chunker.py` | Active | Keep |
| Vector search | `vector_search.py`, `hybrid_search_service.py` | Complementary | Keep both |
| File processing | 3 different implementations | Redundant | Consolidate |
| AI orchestration | Modular architecture | Well-organized | Keep as is |

## 7. Dependencies Analysis

### Most imported files:
1. `textUtils.py` - 7 imports
2. `ai_service.py` - 15 imports (via wrapper)
3. `hybrid_search_service.py` - 5 imports

### Least used files:
1. `indexer.py` - 1 import
2. `optimized_rag.py` - 0 direct imports
3. `file_processing_simple.py` - Only in tasks

## Recommendations Summary

### Remove:
1. `/src/tasks/embedding_worker.py` (if Supabase handles all embeddings)
2. `/src/utils/indexer.py` (redundant basic embedding generation)
3. `/src/services/ai/utils/optimized_rag.py` (unused)
4. `/src/tasks/file_processing.py` and `/src/tasks/file_processing_simple.py` (consolidate with enhanced version)

### Keep:
1. All modular AI service files under `/src/services/ai/`
2. `/src/services/query_embedding_cache.py` (performance optimization)
3. `/src/utils/textUtils.py` (widely used utilities)
4. `/src/utils/semantic_chunker.py` (advanced chunking)
5. All active search services (hybrid, hierarchical, vector)

### Refactor:
1. Update `tasks/__init__.py` to use only the enhanced file processing
2. Remove references to deprecated embedding services
3. Consider creating a unified search interface that can switch between strategies

## Migration Path

1. **Phase 1**: Update imports in `tasks/__init__.py`
2. **Phase 2**: Remove unused files after testing
3. **Phase 3**: Update documentation to reflect new structure
4. **Phase 4**: Consider creating integration tests for remaining services