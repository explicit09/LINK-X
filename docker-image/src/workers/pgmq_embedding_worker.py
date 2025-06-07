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
        self.openai = AsyncOpenAI(api_key=config.openai_api_key)
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
        
        # Create connection pool
        self.pool = await asyncpg.create_pool(
            self.config.database_url,
            min_size=2,
            max_size=10
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
            
            # Prepare texts for embedding
            texts = []
            job_chunk_pairs = []
            
            for job in jobs:
                chunk_id = str(job['chunk_id'])
                if chunk_id in chunk_map:
                    texts.append(chunk_map[chunk_id])
                    job_chunk_pairs.append((job['job_id'], job['chunk_id']))
            
            if not texts:
                logger.warning("No texts to process")
                return 0
            
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
    
    @backoff.on_exception(
        backoff.expo,
        (aiohttp.ClientError, asyncio.TimeoutError),
        max_tries=3
    )
    async def _generate_embeddings_batch(
        self, texts: List[str]
    ) -> Optional[List[List[float]]]:
        """Generate embeddings with retry logic"""
        start_time = time.time()
        
        try:
            # OpenAI supports up to 2048 inputs, we use 100 for safety
            batch_size = min(100, len(texts))
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                response = await self.openai.embeddings.create(
                    model=self.config.embedding_model,
                    input=batch
                )
                
                embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(embeddings)
                
                self.metrics['api_calls'] += 1
            
            # Update metrics
            self.metrics['api_duration'] += time.time() - start_time
            
            return all_embeddings
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            self.metrics['errors'] += 1
            return None
    
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
                
                logger.info(
                    f"Worker metrics - "
                    f"Processed: {self.metrics['processed']}, "
                    f"Errors: {self.metrics['errors']}, "
                    f"Throughput: {throughput:.1f}/sec, "
                    f"Queue - Pending: {stats['pending']}, "
                    f"Processing: {stats['processing']}, "
                    f"Completed: {stats['completed']}, "
                    f"Errors: {stats['errors']}"
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
                        'queue_stats': dict(stats)
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