"""
Worker-based embedding generation for file chunks.
Processes embeddings outside database transactions for better performance.
"""
from celery import shared_task
import logging
from typing import List, Dict, Optional
import openai
import os
import time
from datetime import datetime
import numpy as np

from core.database_supabase import db_manager
from db.schema import FileChunk
from core.config import get_settings
from services.query_embedding_cache import QueryEmbeddingCache

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize OpenAI client
openai.api_key = settings.openai_api_key

# Initialize cache for embeddings
embedding_cache = QueryEmbeddingCache()

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    rate_limit='100/m',  # OpenAI rate limit
    queue='embeddings'
)
def generate_embeddings_batch(self, chunk_ids: List[str]) -> Dict:
    """
    Generate embeddings for a batch of chunks.
    Processes up to 100 chunks per batch for efficiency.
    """
    try:
        start_time = time.time()
        logger.info(f"Processing embedding batch with {len(chunk_ids)} chunks")
        
        with db_manager.get_session() as session:
            # Fetch chunks that need embeddings
            chunks = session.query(FileChunk).filter(
                FileChunk.id.in_(chunk_ids),
                FileChunk.embedding.is_(None)
            ).all()
            
            if not chunks:
                logger.info("No chunks need embeddings")
                return {
                    "status": "success",
                    "processed": 0,
                    "message": "All chunks already have embeddings"
                }
            
            # Extract texts for batch processing
            texts = [chunk.content for chunk in chunks]
            chunk_map = {chunk.id: chunk for chunk in chunks}
            
            # Generate embeddings in batches (OpenAI supports up to 2048 in one call)
            batch_size = min(100, len(texts))  # Conservative batch size
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                try:
                    # Call OpenAI API
                    response = openai.embeddings.create(
                        model="text-embedding-3-small",
                        input=batch_texts
                    )
                    
                    # Extract embeddings
                    batch_embeddings = [item.embedding for item in response.data]
                    all_embeddings.extend(batch_embeddings)
                    
                except Exception as e:
                    logger.error(f"OpenAI API error: {e}")
                    # Retry with exponential backoff
                    self.retry(countdown=60 * (2 ** self.request.retries))
            
            # Update chunks with embeddings
            updated_count = 0
            for chunk_id, embedding in zip(chunk_ids[:len(all_embeddings)], all_embeddings):
                if chunk_id in chunk_map:
                    chunk = chunk_map[chunk_id]
                    chunk.embedding = embedding
                    chunk.embedding_generated_at = datetime.utcnow()
                    updated_count += 1
            
            # Commit all updates in one transaction
            session.commit()
            
            elapsed_time = time.time() - start_time
            logger.info(f"Generated {updated_count} embeddings in {elapsed_time:.2f}s")
            
            return {
                "status": "success",
                "processed": updated_count,
                "elapsed_time": elapsed_time,
                "throughput": updated_count / elapsed_time if elapsed_time > 0 else 0
            }
            
    except Exception as e:
        logger.error(f"Error in embedding generation: {e}")
        self.retry(countdown=60 * (2 ** self.request.retries))


@shared_task(
    bind=True,
    queue='embeddings'
)
def process_file_embeddings(self, file_id: str) -> Dict:
    """
    Process all chunks for a specific file.
    Queues chunks in batches for efficient processing.
    """
    try:
        logger.info(f"Processing embeddings for file {file_id}")
        
        with db_manager.get_session() as session:
            # Get all chunks without embeddings for this file
            chunks = session.query(FileChunk).filter(
                FileChunk.file_id == file_id,
                FileChunk.embedding.is_(None)
            ).all()
            
            if not chunks:
                return {
                    "status": "success",
                    "message": "All chunks already have embeddings"
                }
            
            chunk_ids = [chunk.id for chunk in chunks]
            logger.info(f"Found {len(chunk_ids)} chunks needing embeddings")
            
            # Process in batches of 100
            batch_size = 100
            tasks = []
            
            for i in range(0, len(chunk_ids), batch_size):
                batch_ids = chunk_ids[i:i + batch_size]
                task = generate_embeddings_batch.apply_async(
                    args=[batch_ids],
                    queue='embeddings'
                )
                tasks.append(task.id)
            
            return {
                "status": "success",
                "queued_batches": len(tasks),
                "total_chunks": len(chunk_ids),
                "task_ids": tasks
            }
            
    except Exception as e:
        logger.error(f"Error processing file embeddings: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@shared_task(
    bind=True,
    queue='embeddings'
)
def scan_missing_embeddings(self) -> Dict:
    """
    Periodic task to find and process chunks without embeddings.
    Should be run by Celery beat schedule.
    """
    try:
        logger.info("Scanning for chunks missing embeddings")
        
        with db_manager.get_session() as session:
            # Find chunks without embeddings (limit to prevent overload)
            chunks = session.query(FileChunk).filter(
                FileChunk.embedding.is_(None)
            ).limit(1000).all()
            
            if not chunks:
                return {
                    "status": "success",
                    "message": "No chunks missing embeddings"
                }
            
            # Group by file for efficient processing
            file_chunks = {}
            for chunk in chunks:
                if chunk.file_id not in file_chunks:
                    file_chunks[chunk.file_id] = []
                file_chunks[chunk.file_id].append(chunk.id)
            
            # Queue processing for each file
            tasks = []
            for file_id in file_chunks:
                task = process_file_embeddings.apply_async(
                    args=[file_id],
                    queue='embeddings'
                )
                tasks.append(task.id)
            
            return {
                "status": "success",
                "files_queued": len(file_chunks),
                "total_chunks": len(chunks),
                "task_ids": tasks
            }
            
    except Exception as e:
        logger.error(f"Error scanning for missing embeddings: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@shared_task(
    bind=True,
    queue='embeddings'
)
def generate_query_embedding(self, query: str, use_cache: bool = True) -> List[float]:
    """
    Generate embedding for a search query.
    Uses cache to improve performance.
    """
    try:
        # Check cache first
        if use_cache:
            cached_embedding = embedding_cache.get_embedding(query)
            if cached_embedding:
                logger.debug(f"Using cached embedding for query: {query[:50]}...")
                return cached_embedding
        
        # Generate new embedding
        response = openai.embeddings.create(
            model="text-embedding-3-small",
            input=query
        )
        
        embedding = response.data[0].embedding
        
        # Cache the result
        if use_cache:
            embedding_cache.cache_embedding(query, embedding)
        
        return embedding
        
    except Exception as e:
        logger.error(f"Error generating query embedding: {e}")
        raise