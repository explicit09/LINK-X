"""
Embedding service with transactional outbox pattern.
Ensures atomicity between chunk creation and embedding job queueing.
"""
import json
import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from core.database_supabase import db_manager

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for managing embeddings with transactional safety"""
    
    @staticmethod
    def create_chunks_with_jobs(
        session: Session,
        file_id: str,
        chunks_data: List[Dict],
        priority: int = 5
    ) -> List[str]:
        """
        Create chunks and embedding jobs atomically.
        
        Args:
            session: Database session
            file_id: ID of the file
            chunks_data: List of chunk data dictionaries
            priority: Job priority (1-10)
            
        Returns:
            List of created chunk IDs
        """
        chunk_ids = []
        
        try:
            for chunk_data in chunks_data:
                # Use the database function to ensure atomicity
                result = session.execute(
                    """
                    SELECT create_chunk_with_embedding_job(
                        :file_id::uuid,
                        :chunk_index,
                        :content,
                        :metadata::jsonb,
                        :priority
                    )
                    """,
                    {
                        'file_id': file_id,
                        'chunk_index': chunk_data['chunk_index'],
                        'content': chunk_data['content'],
                        'metadata': json.dumps(chunk_data.get('metadata', {})),
                        'priority': priority
                    }
                )
                chunk_id = result.fetchone()[0]
                chunk_ids.append(str(chunk_id))
            
            logger.info(f"Created {len(chunk_ids)} chunks with embedding jobs for file {file_id}")
            return chunk_ids
            
        except Exception as e:
            logger.error(f"Failed to create chunks with jobs: {e}")
            session.rollback()
            raise
    
    @staticmethod
    def get_embedding_queue_stats(session: Session) -> Dict:
        """Get embedding queue statistics"""
        try:
            result = session.execute(
                """
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'processing') as processing,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'error') as errors,
                    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) 
                        FILTER (WHERE status = 'completed') as avg_duration_seconds
                FROM embedding_jobs
                WHERE created_at > NOW() - INTERVAL '24 hours'
                """
            ).fetchone()
            
            return {
                'pending': result[0] or 0,
                'processing': result[1] or 0,
                'completed': result[2] or 0,
                'errors': result[3] or 0,
                'avg_duration_seconds': float(result[4]) if result[4] else 0
            }
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {}
    
    @staticmethod
    def get_file_embedding_status(session: Session, file_id: str) -> Dict:
        """Get embedding status for all chunks in a file"""
        try:
            result = session.execute(
                """
                SELECT 
                    fc.embedding_status,
                    COUNT(*) as count,
                    AVG(CASE WHEN fc.embedding IS NOT NULL THEN 1 ELSE 0 END) as completion_rate
                FROM file_chunks fc
                WHERE fc.file_id = :file_id
                GROUP BY fc.embedding_status
                """,
                {'file_id': file_id}
            ).fetchall()
            
            status_counts = {row[0]: row[1] for row in result}
            total_chunks = sum(status_counts.values())
            completed_chunks = status_counts.get('completed', 0)
            
            return {
                'total_chunks': total_chunks,
                'status_counts': status_counts,
                'completion_rate': completed_chunks / total_chunks if total_chunks > 0 else 0,
                'is_complete': completed_chunks == total_chunks
            }
        except Exception as e:
            logger.error(f"Failed to get file embedding status: {e}")
            return {}
    
    @staticmethod
    def is_embeddings_enabled(session: Session) -> bool:
        """Check if embeddings are enabled via kill switch"""
        try:
            result = session.execute(
                "SELECT get_config('EMBEDDINGS_ENABLED')"
            ).fetchone()
            
            return result[0] == 'true' if result else True
        except Exception as e:
            logger.error(f"Failed to check embeddings enabled: {e}")
            return True  # Default to enabled
    
    @staticmethod
    def toggle_embeddings(session: Session, enabled: bool, updated_by: str = None) -> bool:
        """Toggle embeddings on/off via kill switch"""
        try:
            session.execute(
                """
                UPDATE system_config 
                SET value = :value, updated_at = NOW(), updated_by = :updated_by
                WHERE key = 'EMBEDDINGS_ENABLED'
                """,
                {
                    'value': 'true' if enabled else 'false',
                    'updated_by': updated_by
                }
            )
            session.commit()
            
            logger.info(f"Embeddings {'enabled' if enabled else 'disabled'} by {updated_by}")
            return True
        except Exception as e:
            logger.error(f"Failed to toggle embeddings: {e}")
            session.rollback()
            return False
    
    @staticmethod
    def get_system_health(session: Session) -> Dict:
        """Get overall system health"""
        try:
            result = session.execute(
                "SELECT * FROM embedding_system_health"
            ).fetchone()
            
            if result:
                return {
                    'embeddings_enabled': result[0],
                    'healthy_workers': result[1],
                    'total_workers': result[2],
                    'pending_jobs': result[3],
                    'processing_jobs': result[4],
                    'completed_jobs': result[5],
                    'error_jobs': result[6],
                    'avg_completion_time': result[7],
                    'oldest_pending_seconds': result[8],
                    'avg_throughput': result[9],
                    'peak_throughput': result[10],
                    'system_status': result[11]
                }
            return {}
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {}
    
    @staticmethod
    def get_alerts(session: Session) -> List[Dict]:
        """Get current system alerts"""
        try:
            results = session.execute(
                "SELECT * FROM check_embedding_alerts()"
            ).fetchall()
            
            return [
                {
                    'alert_type': row[0],
                    'severity': row[1],
                    'message': row[2],
                    'details': row[3]
                }
                for row in results
            ]
        except Exception as e:
            logger.error(f"Failed to get alerts: {e}")
            return []
    
    @staticmethod
    def cleanup_old_jobs(session: Session, days: int = 30) -> int:
        """Clean up old completed/error jobs"""
        try:
            result = session.execute(
                """
                DELETE FROM embedding_jobs 
                WHERE status IN ('completed', 'error')
                AND completed_at < NOW() - INTERVAL '%s days'
                """,
                (days,)
            )
            
            deleted_count = result.rowcount
            session.commit()
            
            logger.info(f"Cleaned up {deleted_count} old embedding jobs")
            return deleted_count
        except Exception as e:
            logger.error(f"Failed to cleanup old jobs: {e}")
            session.rollback()
            return 0