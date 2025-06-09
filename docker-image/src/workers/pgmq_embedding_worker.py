"""
PGMQ-based embedding worker that stays within Supabase ecosystem.
Processes embeddings with proper atomicity, batching, and monitoring.
"""
import os
import time
import logging
import json
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
import aiohttp
import backoff
from dataclasses import dataclass
from contextlib import asynccontextmanager

import asyncpg
import numpy as np
from openai import AsyncOpenAI
from services.openai_rate_limiter import get_rate_limiter
from services.poison_message_detector import get_poison_detector

logger = logging.getLogger(__name__)

@dataclass
class WorkerConfig:
    """Worker configuration"""
    database_url: str
    openai_api_key: str
    worker_id: str
    batch_size: int = 100
    poll_interval: float = 1.0
    max_retries: int = 3
    embedding_model: str = "text-embedding-3-small"
    kill_switch_key: str = "EMBEDDINGS_ENABLED"
    metrics_interval: int = 60
    
    @classmethod
    def from_env(cls) -> 'WorkerConfig':
        """Create config from environment variables"""
        return cls(
            database_url=os.environ['DATABASE_URL'],
            openai_api_key=os.environ['OPENAI_API_KEY'],
            worker_id=os.environ.get('WORKER_ID', f'worker-{os.getpid()}'),
            batch_size=int(os.environ.get('EMBEDDING_BATCH_SIZE', '100')),
            poll_interval=float(os.environ.get('POLL_INTERVAL', '1.0')),
            embedding_model=os.environ.get('EMBEDDING_MODEL', 'text-embedding-3-small')
        )


class EmbeddingWorker:
    """PGMQ-based worker for processing embeddings"""
    
    def __init__(self, config: WorkerConfig):
        self.config = config
        self.rate_limiter = get_rate_limiter()
        self.poison_detector = get_poison_detector()
        self.pool: Optional[asyncpg.Pool] = None
        self.running = False
        self.metrics = {
            'processed': 0,
            'errors': 0,
            'batch_count': 0,
            'total_duration': 0.0,
            'api_calls': 0,
            'api_duration': 0.0
        }
        
    async def start(self):
        """Start the worker"""
        logger.info(f"Starting worker {self.config.worker_id}")
        
        # Create connection pool with statement cache disabled for Supabase PgBouncer
        self.pool = await asyncpg.create_pool(
            self.config.database_url,
            min_size=2,
            max_size=10,
            statement_cache_size=0  # Disable prepared statements for PgBouncer compatibility
        )
        
        self.running = True
        
        # Start background tasks
        tasks = [
            asyncio.create_task(self._process_loop()),
            asyncio.create_task(self._metrics_loop()),
            asyncio.create_task(self._health_check_loop())
        ]
        
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            logger.error(f"Worker error: {e}")
        finally:
            await self.stop()
    
    async def stop(self):
        """Stop the worker gracefully"""
        logger.info("Stopping worker...")
        self.running = False
        
        if self.pool:
            await self.pool.close()
    
    async def _process_loop(self):
        """Main processing loop"""
        while self.running:
            try:
                # Check kill switch
                if not await self._is_enabled():
                    logger.info("Embeddings disabled via kill switch")
                    await asyncio.sleep(10)
                    continue
                
                # Process batch
                processed = await self._process_batch()
                
                # Adaptive polling
                if processed == 0:
                    await asyncio.sleep(self.config.poll_interval)
                else:
                    # Process immediately if there's work
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                logger.error(f"Process loop error: {e}", exc_info=True)
                await asyncio.sleep(5)
    
    async def _process_batch(self) -> int:
        """Process a batch of embedding jobs"""
        start_time = time.time()
        
        async with self.pool.acquire() as conn:
            # Claim jobs atomically
            jobs = await conn.fetch(
                "SELECT * FROM claim_embedding_jobs($1, $2)",
                self.config.worker_id,
                self.config.batch_size
            )
            
            if not jobs:
                return 0
            
            logger.info(f"Processing {len(jobs)} embedding jobs")
            
            # Get chunk contents
            chunk_ids = [job['chunk_id'] for job in jobs]
            chunks = await conn.fetch(
                """
                SELECT id, content 
                FROM file_chunks 
                WHERE id = ANY($1::uuid[])
                """,
                chunk_ids
            )
            
            # Create mapping
            chunk_map = {str(chunk['id']): chunk['content'] for chunk in chunks}
            
            # Prepare texts for embedding with poison detection
            texts = []
            job_chunk_pairs = []
            poison_jobs = []
            
            for job in jobs:
                chunk_id = str(job['chunk_id'])
                if chunk_id in chunk_map:
                    content = chunk_map[chunk_id]
                    
                    # Check for poison messages
                    poison_result = self.poison_detector.detect_poison(content)
                    
                    if poison_result.is_poison:
                        logger.warning(
                            f"Poison message detected in chunk {chunk_id}: "
                            f"{poison_result.reason}"
                        )
                        poison_jobs.append((job['job_id'], chunk_id, poison_result))
                    else:
                        texts.append(content)
                        job_chunk_pairs.append((str(job['job_id']), str(job['chunk_id'])))
            
            # Handle poison messages
            for job_id, chunk_id, poison_result in poison_jobs:
                await self._handle_poison_message(
                    conn, job_id, chunk_id, poison_result
                )
            
            if not texts:
                logger.warning("No safe texts to process after poison detection")
                return len(poison_jobs)  # Count poison handling as "processed"
            
            # Generate embeddings in batches
            all_embeddings = await self._generate_embeddings_batch(texts)
            
            if not all_embeddings:
                # Mark all jobs as failed
                for job_id, _ in job_chunk_pairs:
                    await self._mark_job_failed(
                        conn, job_id, 
                        "Failed to generate embeddings"
                    )
                return 0
            
            # Store embeddings
            success_count = 0
            for (job_id, chunk_id), embedding in zip(job_chunk_pairs, all_embeddings):
                try:
                    await self._store_embedding(
                        conn, job_id, chunk_id, embedding
                    )
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to store embedding: {e}")
                    await self._mark_job_failed(conn, job_id, str(e))
            
            # Update metrics
            duration = time.time() - start_time
            self.metrics['processed'] += success_count
            self.metrics['batch_count'] += 1
            self.metrics['total_duration'] += duration
            
            logger.info(
                f"Processed {success_count}/{len(jobs)} embeddings "
                f"in {duration:.2f}s ({success_count/duration:.1f}/sec)"
            )
            
            return success_count
    
    async def _generate_embeddings_batch(
        self, texts: List[str]
    ) -> Optional[List[List[float]]]:
        """Generate embeddings with adaptive rate limiting"""
        start_time = time.time()
        
        try:
            # Use adaptive rate limiter instead of direct OpenAI calls
            embeddings = await self.rate_limiter.generate_embeddings_adaptive(
                texts, self.config.embedding_model
            )
            
            if embeddings:
                self.metrics['api_calls'] += 1
                self.metrics['api_duration'] += time.time() - start_time
                return embeddings
            else:
                logger.error("Rate limiter returned None - all keys exhausted")
                self.metrics['errors'] += 1
                return None
            
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            self.metrics['errors'] += 1
            return None
    
    async def _handle_poison_message(
        self, conn: asyncpg.Connection,
        job_id: str, chunk_id: str, 
        poison_result
    ):
        """Handle poison message by sending to DLQ"""
        try:
            await conn.execute(
                """
                SELECT send_to_dlq($1, $2, $3, $4, $5)
                """,
                chunk_id,
                job_id,
                poison_result.poison_type.value if poison_result.poison_type else 'unknown',
                poison_result.reason,
                poison_result.suggested_action
            )
            
            logger.info(f"Sent poison message to DLQ: {job_id}")
            
        except Exception as e:
            logger.error(f"Failed to send poison message to DLQ: {e}")
            # Fallback: mark job as failed
            await self._mark_job_failed(conn, job_id, f"Poison message: {poison_result.reason}")
    
    async def _store_embedding(
        self, conn: asyncpg.Connection, 
        job_id: str, chunk_id: str, 
        embedding: List[float]
    ):
        """Store embedding atomically"""
        # Convert to pgvector format
        embedding_str = f"[{','.join(map(str, embedding))}]"
        
        await conn.execute(
            """
            SELECT complete_embedding_job($1, $2::vector, $3)
            """,
            job_id,
            embedding_str,
            self.config.embedding_model
        )
    
    async def _mark_job_failed(
        self, conn: asyncpg.Connection,
        job_id: str, error_message: str
    ):
        """Mark job as failed"""
        await conn.execute(
            "SELECT fail_embedding_job($1, $2)",
            job_id,
            error_message
        )
        self.metrics['errors'] += 1
    
    async def _is_enabled(self) -> bool:
        """Check kill switch"""
        return os.getenv(self.config.kill_switch_key, "true").lower() == "true"
    
    async def _metrics_loop(self):
        """Report metrics periodically"""
        while self.running:
            await asyncio.sleep(self.config.metrics_interval)
            
            async with self.pool.acquire() as conn:
                # Get queue stats
                stats = await conn.fetchrow(
                    """
                    SELECT 
                        (SELECT COUNT(*) FROM embedding_jobs WHERE status = 'pending') as pending,
                        (SELECT COUNT(*) FROM embedding_jobs WHERE status = 'processing') as processing,
                        (SELECT COUNT(*) FROM embedding_jobs WHERE status = 'completed') as completed,
                        (SELECT COUNT(*) FROM embedding_jobs WHERE status = 'error') as errors
                    """
                )
                
                # Calculate rates
                if self.metrics['total_duration'] > 0:
                    throughput = self.metrics['processed'] / self.metrics['total_duration']
                else:
                    throughput = 0
                
                # Get rate limiter status
                rate_limit_status = self.rate_limiter.get_rate_limit_status()
                
                logger.info(
                    f"Worker metrics - "
                    f"Processed: {self.metrics['processed']}, "
                    f"Errors: {self.metrics['errors']}, "
                    f"Throughput: {throughput:.1f}/sec, "
                    f"Queue - Pending: {stats['pending']}, "
                    f"Processing: {stats['processing']}, "
                    f"Completed: {stats['completed']}, "
                    f"Errors: {stats['errors']}, "
                    f"Available Keys: {rate_limit_status['total_available_keys']}, "
                    f"Adaptive Batch: {rate_limit_status['adaptive_batch_size']}"
                )
                
                # Store metrics in database
                await conn.execute(
                    """
                    INSERT INTO worker_metrics (
                        worker_id, metric_type, value, metadata
                    ) VALUES ($1, $2, $3, $4)
                    """,
                    self.config.worker_id,
                    'throughput',
                    throughput,
                    json.dumps({
                        'processed': self.metrics['processed'],
                        'errors': self.metrics['errors'],
                        'api_calls': self.metrics['api_calls'],
                        'queue_stats': {
                            'pending': stats['pending'],
                            'processing': stats['processing'],
                            'completed': stats['completed'],
                            'errors': stats['errors']
                        }
                    })
                )
    
    async def _health_check_loop(self):
        """Periodic health check"""
        while self.running:
            await asyncio.sleep(30)
            
            try:
                async with self.pool.acquire() as conn:
                    # Update worker heartbeat
                    await conn.execute(
                        """
                        INSERT INTO worker_health (
                            worker_id, last_heartbeat, status
                        ) VALUES ($1, $2, $3)
                        ON CONFLICT (worker_id) 
                        DO UPDATE SET 
                            last_heartbeat = $2,
                            status = $3
                        """,
                        self.config.worker_id,
                        datetime.utcnow(),
                        'healthy'
                    )
            except Exception as e:
                logger.error(f"Health check failed: {e}")


async def main():
    """Main entry point"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    config = WorkerConfig.from_env()
    worker = EmbeddingWorker(config)
    
    try:
        await worker.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        await worker.stop()


if __name__ == "__main__":
    asyncio.run(main())