"""
File indexing module - handles text extraction, chunking, and embedding storage.
Uses pgvector for all vector storage and retrieval.
"""
import numpy as np
from sqlalchemy.orm import Session

from textUtils import extract_text, clean_extracted_text, split_text, openai_embed_text
from db.queries import get_file_by_id, insert_file_chunks

def store_file_embeddings(db: Session, file_id: str, s3_content: bytes = None) -> int:
    """
    Extracts, splits, embeds, and persists all chunks for one file.
    
    Args:
        db: Database session
        file_id: UUID of the file to process
        s3_content: Optional file content if already loaded from S3
    
    Returns:
        The number of chunks stored.
    """
    f = get_file_by_id(db, file_id)
    if not f:
        raise ValueError(f"File {file_id} not found")
    
    # Use provided content or load from database
    file_content = s3_content if s3_content is not None else f.file_data
    if not file_content:
        raise ValueError(f"No content available for file {file_id}")
    
    # Extract and clean text
    raw_text = extract_text(file_content, f.filename)
    clean_text = clean_extracted_text(raw_text)
    chunks = split_text(clean_text)

    if not chunks:
        return 0

    # Generate embeddings for all chunks
    vectors = openai_embed_text(chunks)

    # Get course ID from file's module
    course_id = f.module.course_id

    # Store chunks with embeddings in FileChunk table
    return insert_file_chunks(db, file_id, course_id, chunks, vectors)

# Remove deprecated functions that used FAISS
# rebuild_course_index and rebuild_file_index are no longer needed
# All retrieval is now done directly via pgvector queries