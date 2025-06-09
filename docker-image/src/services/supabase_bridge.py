"""
Supabase Bridge Service
Production-ready bridge between Supabase processing queue and backend AI workers.
Automatically handles database connections and runs as a standalone service.
"""
import asyncio
import logging
from typing import Dict, Any, Optional
import json
import os
import sys
import uuid
from datetime import datetime, timedelta

class UUIDEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles UUID objects"""
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import database manager for standalone use
from core.database_supabase import db_manager
from services.embedding_service import EmbeddingService
from tasks.enhanced_file_processing import process_file_with_semantic_chunking
from content_orchestrator import ContentOrchestrator
from services.file_service_supabase import SupabaseFileService
from utils.textUtils import extract_text

# Import database manager for standalone use
from core.database_supabase import db_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SupabaseBridge:
    """Production-ready bridge between Supabase processing queue and backend AI workers"""
    
    def __init__(self):
        self.running = False
        self.poll_interval = int(os.getenv('BRIDGE_POLL_INTERVAL', '10'))  # seconds
        self.worker_id = os.getenv('WORKER_ID', f'bridge-{os.getpid()}')
        self.max_jobs_per_batch = int(os.getenv('BRIDGE_MAX_JOBS', '3'))
        self.error_count = 0
        self.max_errors = 10
        
        # Initialize database for standalone use
        self._initialize_database()
        
    def _initialize_database(self):
        """Initialize standalone database connection"""
        try:
            logger.info("🔧 Initializing standalone database connection for Supabase Bridge...")
            
            # Initialize database manager for standalone use
            db_manager.init_standalone(worker_id=self.worker_id)
            
            # Test database connection
            with db_manager.get_session() as session:
                result = session.execute("SELECT 1").fetchone()
                logger.info("✅ Database connection verified")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize database connection: {e}")
            raise
        
    async def start(self):
        """Start the bridge service with proper error handling"""
        logger.info(f"🌉 Starting Production Supabase Bridge {self.worker_id}")
        logger.info(f"📊 Configuration: poll_interval={self.poll_interval}s, max_jobs={self.max_jobs_per_batch}")
        
        self.running = True
        consecutive_errors = 0
        
        while self.running:
            try:
                processed_count = await self._process_queue_batch()
                
                if processed_count > 0:
                    logger.info(f"✅ Processed {processed_count} jobs successfully")
                    consecutive_errors = 0  # Reset error counter on success
                    self.error_count = 0
                
                # Dynamic polling - faster when jobs are available
                if processed_count >= self.max_jobs_per_batch:
                    await asyncio.sleep(2)  # Quick turnaround for high volume
                else:
                    await asyncio.sleep(self.poll_interval)
                    
            except Exception as e:
                consecutive_errors += 1
                self.error_count += 1
                
                logger.error(f"❌ Bridge error ({consecutive_errors}/{self.max_errors}): {e}")
                
                # Exponential backoff on errors
                backoff_time = min(60, self.poll_interval * (2 ** consecutive_errors))
                logger.info(f"⏳ Backing off for {backoff_time}s before retry")
                await asyncio.sleep(backoff_time)
                
                # Stop if too many consecutive errors
                if consecutive_errors >= self.max_errors:
                    logger.error(f"🛑 Too many consecutive errors. Stopping bridge service.")
                    break
    
    async def stop(self):
        """Stop the bridge service and clean up"""
        logger.info("🛑 Stopping Supabase Bridge")
        self.running = False
        
        # Clean up database connections
        db_manager.close_all_connections()
    
    async def _process_queue_batch(self) -> int:
        """Process a batch of jobs from the Supabase queue"""
        try:
            with db_manager.get_session() as session:
                # First, reconcile file statuses (detect files with chunks but wrong status)
                await self._reconcile_file_statuses(session)
                
                # Get pending jobs from NEW processing_queue structure
                jobs = session.execute("""
                    SELECT id, file_id, processing_type, priority, created_at, metadata
                    FROM processing_queue 
                    WHERE status = 'pending'
                    ORDER BY 
                        CASE priority
                            WHEN 'urgent' THEN 1
                            WHEN 'high' THEN 2
                            WHEN 'normal' THEN 3
                            WHEN 'low' THEN 4
                        END,
                        created_at ASC
                    LIMIT :limit
                """, {'limit': self.max_jobs_per_batch}).fetchall()
                
                if not jobs:
                    return 0
                
                logger.info(f"📋 Processing {len(jobs)} file processing jobs from Supabase queue")
                
                # Process each job
                processed_count = 0
                for job in jobs:
                    try:
                        await self._process_file_processing_job(session, job)
                        processed_count += 1
                    except Exception as e:
                        logger.error(f"❌ Failed to process job {job.id}: {e}")
                        await self._mark_job_failed(session, job.id, str(e))
                
                return processed_count
                
        except Exception as e:
            logger.error(f"❌ Database error in _process_queue_batch: {e}")
            raise
    
    async def _process_file_processing_job(self, session, job):
        """Process a file processing job with the enhanced file processing system"""
        job_id = job.id
        file_id = job.file_id
        processing_type = job.processing_type
        metadata = job.metadata or {}
        
        logger.info(f"📄 Processing file {file_id} (job {job_id}, type: {processing_type})")
        
        # Mark job as processing
        await self._mark_job_processing(session, job_id)
        
        try:
            # Get file info
            file_result = session.execute(
                "SELECT id, filename, file_type, storage_path FROM files WHERE id = :file_id",
                {'file_id': file_id}
            ).fetchone()
            
            if not file_result:
                raise ValueError(f"File {file_id} not found")
            
            logger.info(f"📁 Processing file: {file_result.filename} ({file_result.file_type})")
            
            # Update file status to processing
            session.execute(
                "UPDATE files SET processing_status = 'processing' WHERE id = :file_id",
                {'file_id': file_id}
            )
            session.commit()
            
            # Use the enhanced file processing system (this handles chunking and creates embedding jobs)
            result = process_file_with_semantic_chunking.apply(
                args=[str(file_id)], 
                kwargs={'force': True}
            ).get()
            
            if result.get('status') == 'success':
                # Update file as completed
                session.execute(
                    "UPDATE files SET processing_status = 'completed', processed = true WHERE id = :file_id",
                    {'file_id': file_id}
                )
                session.commit()
                
                # Mark job as completed with results
                await self._mark_job_completed(session, job_id, {
                    'file_id': file_id,
                    'filename': file_result.filename,
                    'chunks_created': result.get('chunks_created', 0),
                    'embedding_jobs_created': result.get('embedding_jobs_created', 0),
                    'processing_time': result.get('processing_time', 0)
                })
                
                logger.info(f"✅ File processing completed for {file_result.filename}: {result.get('chunks_created', 0)} chunks created")
                
            else:
                error_msg = result.get('message', 'Unknown processing error')
                raise ValueError(f"File processing failed: {error_msg}")
                
        except Exception as e:
            # Mark file as failed
            session.execute(
                "UPDATE files SET processing_status = 'failed' WHERE id = :file_id",
                {'file_id': file_id}
            )
            session.commit()
            raise
    
    async def _mark_job_processing(self, session, job_id: str):
        """Mark job as currently being processed"""
        session.execute(
            "UPDATE processing_queue SET status = 'processing', started_at = NOW() WHERE id = :job_id",
            {'job_id': job_id}
        )
        session.commit()
    
    async def _mark_job_completed(self, session, job_id: str, result: Dict[str, Any]):
        """Mark job as completed with results"""
        session.execute("""
            UPDATE processing_queue 
            SET status = 'completed', 
                completed_at = NOW(),
                metadata = COALESCE(metadata, '{}'::jsonb) || :result::jsonb
            WHERE id = :job_id
        """, {
            'job_id': job_id, 
            'result': json.dumps(result, cls=UUIDEncoder)
        })
        session.commit()
    
    async def _mark_job_failed(self, session, job_id: str, error_message: str):
        """Mark job as failed with error message"""
        session.execute("""
            UPDATE processing_queue 
            SET status = 'failed', 
                completed_at = NOW(),
                error_message = :error_message,
                attempts = attempts + 1
            WHERE id = :job_id
        """, {
            'job_id': job_id, 
            'error_message': error_message
        })
        session.commit()

    async def _reconcile_file_statuses(self, session):
        """
        Reconcile file processing statuses - fix files that have chunks but are still marked as pending.
        This handles cases where processing completed but status wasn't updated due to errors.
        """
        try:
            # Find files that have chunks but are marked as pending/processing
            files_to_fix = session.execute("""
                SELECT DISTINCT f.id, f.filename
                FROM files f
                INNER JOIN file_chunks fc ON f.id = fc.file_id
                WHERE f.processing_status IN ('pending', 'processing')
                AND f.id IN (
                    SELECT file_id 
                    FROM file_chunks 
                    GROUP BY file_id 
                    HAVING COUNT(*) > 0
                )
            """).fetchall()
            
            if files_to_fix:
                logger.info(f"🔧 Found {len(files_to_fix)} files with chunks but incorrect status - fixing...")
                
                for file_row in files_to_fix:
                    file_id = file_row.id
                    filename = file_row.filename
                    
                    # Update file status to completed
                    session.execute("""
                        UPDATE files 
                        SET processing_status = 'completed', processed = true 
                        WHERE id = :file_id
                    """, {'file_id': file_id})
                    
                    logger.info(f"✅ Fixed status for {filename} -> completed")
                
                session.commit()
                logger.info(f"🎉 Fixed {len(files_to_fix)} file statuses")
            
        except Exception as e:
            logger.error(f"❌ Error in status reconciliation: {e}")
            session.rollback()


async def main():
    """Main entry point for the Supabase Bridge service"""
    logger.info("🚀 Starting Production Supabase Bridge Service")
    
    # Handle graceful shutdown
    bridge = None
    try:
        bridge = SupabaseBridge()
        await bridge.start()
    except KeyboardInterrupt:
        logger.info("🔌 Received shutdown signal")
    except Exception as e:
        logger.error(f"💥 Bridge service crashed: {e}", exc_info=True)
    finally:
        if bridge:
            await bridge.stop()
        logger.info("👋 Supabase Bridge service stopped")


if __name__ == "__main__":
    # Run the bridge service
    asyncio.run(main()) 
 