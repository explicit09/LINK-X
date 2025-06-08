"""
Supabase Bridge Service
Connects the new Supabase-first architecture with existing Docker backend AI processing.
Polls the Supabase processing_queue and executes jobs using existing infrastructure.
"""
import asyncio
import logging
from typing import Dict, Any, Optional
import json
import os
from datetime import datetime, timedelta

from core.database_supabase import db_manager
from services.embedding_service import EmbeddingService
from tasks.enhanced_file_processing import process_file_with_semantic_chunking
from content_orchestrator import ContentOrchestrator
from services.file_service_supabase import SupabaseFileService
from utils.textUtils import extract_text

logger = logging.getLogger(__name__)


class SupabaseBridge:
    """Bridge between Supabase processing queue and backend AI workers"""
    
    def __init__(self):
        self.running = False
        self.poll_interval = int(os.getenv('BRIDGE_POLL_INTERVAL', '5'))  # seconds
        self.worker_id = os.getenv('WORKER_ID', f'bridge-{os.getpid()}')
        self.content_orchestrator = ContentOrchestrator()
        self.file_service = SupabaseFileService()
        
    async def start(self):
        """Start the bridge service"""
        logger.info(f"🌉 Starting Supabase Bridge {self.worker_id}")
        self.running = True
        
        while self.running:
            try:
                await self._process_queue_batch()
                await asyncio.sleep(self.poll_interval)
            except Exception as e:
                logger.error(f"❌ Bridge error: {e}", exc_info=True)
                await asyncio.sleep(self.poll_interval * 2)  # Back off on error
    
    async def stop(self):
        """Stop the bridge service"""
        logger.info("🛑 Stopping Supabase Bridge")
        self.running = False
    
    async def _process_queue_batch(self) -> int:
        """Process a batch of jobs from the Supabase queue"""
        with db_manager.get_session() as session:
            # Get pending jobs, prioritizing by created time and priority
            jobs = session.execute("""
                SELECT id, job_type, payload, created_at
                FROM processing_queue 
                WHERE status = 'pending'
                ORDER BY 
                    COALESCE((payload->>'priority')::int, 5) ASC,
                    created_at ASC
                LIMIT 5
            """).fetchall()
            
            if not jobs:
                return 0
            
            logger.info(f"📋 Processing {len(jobs)} jobs from Supabase queue")
            
            # Process each job
            processed_count = 0
            for job in jobs:
                try:
                    await self._process_single_job(session, job)
                    processed_count += 1
                except Exception as e:
                    logger.error(f"❌ Failed to process job {job.id}: {e}")
                    await self._mark_job_failed(session, job.id, str(e))
            
            return processed_count
    
    async def _process_single_job(self, session, job):
        """Process a single job based on its type"""
        job_id = job.id
        job_type = job.job_type
        payload = job.payload
        
        logger.info(f"🔄 Processing {job_type} job {job_id}")
        
        # Mark job as processing
        await self._mark_job_processing(session, job_id)
        
        if job_type == 'file_processing':
            await self._process_file_job(session, job_id, payload)
        elif job_type == 'content_generation':
            await self._process_content_generation_job(session, job_id, payload)
        elif job_type == 'embedding_generation':
            await self._process_embedding_job(session, job_id, payload)
        else:
            raise ValueError(f"Unknown job type: {job_type}")
    
    async def _process_file_job(self, session, job_id: str, payload: Dict[str, Any]):
        """Process file upload and chunking job"""
        file_id = payload['file_id']
        course_id = payload['course_id']
        processing_steps = payload.get('processing_steps', ['content_extraction', 'semantic_chunking', 'embedding_generation'])
        
        logger.info(f"📄 Processing file {file_id} with steps: {processing_steps}")
        
        # Get file info
        file_info = session.execute(
            "SELECT * FROM files WHERE id = :file_id",
            {'file_id': file_id}
        ).fetchone()
        
        if not file_info:
            raise ValueError(f"File {file_id} not found")
        
        # Update file status
        session.execute(
            "UPDATE files SET processing_status = 'processing' WHERE id = :file_id",
            {'file_id': file_id}
        )
        session.commit()
        
        try:
            # Step 1: Content Extraction
            if 'content_extraction' in processing_steps:
                logger.info(f"📑 Extracting content from file {file_id}")
                content = await self._extract_file_content(file_info)
                
                # Store extracted content if not already present
                if not file_info.transcription and content:
                    session.execute(
                        "UPDATE files SET transcription = :content WHERE id = :file_id",
                        {'content': content, 'file_id': file_id}
                    )
                    session.commit()
            
            # Step 2: Semantic Chunking
            if 'semantic_chunking' in processing_steps:
                logger.info(f"🧩 Creating semantic chunks for file {file_id}")
                
                # Use existing enhanced file processing
                result = await asyncio.get_event_loop().run_in_executor(
                    None, 
                    lambda: process_file_with_semantic_chunking.apply(
                        args=[file_id], 
                        kwargs={'force': True}
                    ).get()
                )
                
                if result['status'] != 'success':
                    raise ValueError(f"Chunking failed: {result.get('message', 'Unknown error')}")
            
            # Step 3: Embedding Generation (handled by existing PGMQ workers)
            if 'embedding_generation' in processing_steps:
                logger.info(f"🔢 Embeddings will be generated by PGMQ workers")
                # The embedding jobs were created by the chunking process
                # PGMQ workers will pick them up automatically
            
            # Mark file as processed
            session.execute(
                "UPDATE files SET processing_status = 'completed' WHERE id = :file_id",
                {'file_id': file_id}
            )
            session.commit()
            
            # Mark job as completed
            await self._mark_job_completed(session, job_id, {
                'file_id': file_id,
                'steps_completed': processing_steps,
                'chunks_created': result.get('chunks_created', 0) if 'semantic_chunking' in processing_steps else 0
            })
            
            logger.info(f"✅ File processing completed for {file_id}")
            
        except Exception as e:
            # Mark file as failed
            session.execute(
                "UPDATE files SET processing_status = 'failed' WHERE id = :file_id",
                {'file_id': file_id}
            )
            session.commit()
            raise
    
    async def _process_content_generation_job(self, session, job_id: str, payload: Dict[str, Any]):
        """Process AI content generation job"""
        course_id = payload['course_id']
        persona = payload['persona']
        content_type = payload.get('content_type', 'study_guide')
        course_content = payload['course_content']
        
        logger.info(f"🤖 Generating {content_type} content for course {course_id}")
        
        # Generate content using existing orchestrator
        user_profile = {
            'learning_style': 'visual',
            'expertise_level': 'intermediate',
            'interests': 'technology'
        }
        
        result = await self.content_orchestrator.generate_comprehensive_content(
            course_content=course_content,
            persona=persona,
            course_name=f"Course {course_id}",
            user_profile=user_profile
        )
        
        # Store result
        await self._mark_job_completed(session, job_id, {
            'generated_content': result,
            'content_type': content_type,
            'course_id': course_id,
            'persona': persona
        })
        
        logger.info(f"✅ Content generation completed for course {course_id}")
    
    async def _process_embedding_job(self, session, job_id: str, payload: Dict[str, Any]):
        """Process embedding generation job"""
        chunk_ids = payload['chunk_ids']
        
        logger.info(f"🔢 Generating embeddings for {len(chunk_ids)} chunks")
        
        # This should delegate to the existing PGMQ embedding workers
        # For now, we'll create embedding jobs that the workers will pick up
        for chunk_id in chunk_ids:
            session.execute("""
                INSERT INTO embedding_jobs (chunk_id, status, priority, created_at)
                VALUES (:chunk_id, 'pending', 5, NOW())
                ON CONFLICT (chunk_id) DO NOTHING
            """, {'chunk_id': chunk_id})
        
        session.commit()
        
        await self._mark_job_completed(session, job_id, {
            'chunk_ids': chunk_ids,
            'embedding_jobs_created': len(chunk_ids)
        })
        
        logger.info(f"✅ Embedding jobs queued for {len(chunk_ids)} chunks")
    
    async def _extract_file_content(self, file_info) -> Optional[str]:
        """Extract content from file based on type"""
        try:
            # If transcription already exists, use it
            if file_info.transcription:
                return file_info.transcription
            
            # Download file from Supabase Storage
            if file_info.storage_bucket and file_info.storage_path:
                file_data = self.file_service.download_file(
                    file_info.storage_bucket, 
                    file_info.storage_path
                )
                
                # Extract text based on file type
                file_type = file_info.file_type.lower()
                
                if file_type == 'pdf':
                    from utils.textUtils import extract_text_from_pdf
                    return extract_text_from_pdf(file_data)
                elif file_type in ['txt', 'md']:
                    return file_data.decode('utf-8')
                elif file_type in ['mp3', 'wav', 'm4a']:
                    # Audio files need transcription - placeholder for now
                    logger.warning(f"Audio file {file_info.id} needs transcription service")
                    return None
                else:
                    logger.warning(f"Unsupported file type: {file_type}")
                    return None
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract content from file {file_info.id}: {e}")
            return None
    
    async def _mark_job_processing(self, session, job_id: str):
        """Mark job as processing"""
        session.execute(
            "UPDATE processing_queue SET status = 'processing', processed_at = NOW() WHERE id = :job_id",
            {'job_id': job_id}
        )
        session.commit()
    
    async def _mark_job_completed(self, session, job_id: str, result: Dict[str, Any]):
        """Mark job as completed with result"""
        session.execute("""
            UPDATE processing_queue 
            SET status = 'completed', 
                processed_at = NOW(),
                payload = payload || :result::jsonb
            WHERE id = :job_id
        """, {'job_id': job_id, 'result': json.dumps(result)})
        session.commit()
    
    async def _mark_job_failed(self, session, job_id: str, error_message: str):
        """Mark job as failed with error"""
        session.execute("""
            UPDATE processing_queue 
            SET status = 'failed', 
                processed_at = NOW(),
                error_message = :error_message,
                attempts = COALESCE(attempts, 0) + 1
            WHERE id = :job_id
        """, {'job_id': job_id, 'error_message': error_message})
        session.commit()


async def main():
    """Main entry point for the bridge service"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    bridge = SupabaseBridge()
    
    try:
        await bridge.start()
    except KeyboardInterrupt:
        logger.info("🛑 Received interrupt signal")
    finally:
        await bridge.stop()


if __name__ == "__main__":
    asyncio.run(main()) 
 