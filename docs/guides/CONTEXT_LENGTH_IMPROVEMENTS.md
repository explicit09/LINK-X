# Context Length Improvements

## Changes Made

### 1. Increased Chunk Retrieval Limits
- **app.py**: Increased from 25-30 chunks to 50-60 chunks
  - `retrieve_chunks_pgvector` calls now use `limit=50` or `limit=60`
  - Streaming endpoint: 25 → 50 chunks
  - Orchestrator function: 30 → 60 chunks
  - Main pgvector function: 25 → 50 chunks

- **prompts.py**: Increased chunk limits
  - Course outline generation: 20 → 40 chunks
  - File content generation: 30 → 50 chunks

### 2. Increased Context Usage
- **Quick generation**: Removed 3000 character limit, now uses full context
- **Multi-pass generation**: Increased per-subsection context from 2000 to 5000 characters
- **Context preparation**: Increased from 25 to 50 chunks used in context string
- **Module generation**: 
  - Files processed: 5 → 10 files
  - Chunks per file: 3 → 5 chunks
  - Content per file: 1000 → 2000 characters

### 3. Removed Artificial Limits
- Removed `context[:3000]` truncation in quick generation
- Increased `context[:2000]` to `context[:5000]` in multi-pass subsections
- Use all retrieved chunks instead of limiting to top 20-25

## Benefits
- **More comprehensive content**: Model has access to more source material
- **Better context understanding**: 2-3x more chunks provide better coverage
- **Improved personalization**: More content allows for better example selection
- **Leverages gpt-4o capabilities**: Takes advantage of 128K context window

## Summary
With gpt-4o's 128K context window, we can now provide much more context to the model without hitting limits. This results in more comprehensive, accurate, and detailed personalized content generation.