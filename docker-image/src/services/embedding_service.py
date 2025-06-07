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
                # Use poison detection function for safer chunk creation
                result = session.execute(
                    """
                    SELECT create_chunk_with_poison_detection(
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
                result_json = result.fetchone()[0]
                
                if result_json.get('status') == 'success':
                    chunk_ids.append(str(result_json['chunk_id']))
                elif result_json.get('status') == 'poison_detected':
                    logger.warning(f"Poison detected for chunk {chunk_data['chunk_index']}: {result_json.get('reason')}")
                    # Continue processing other chunks
            
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
    
    @staticmethod
    def get_vector_index_health(session: Session) -> Dict:
        """Get vector index health metrics"""
        try:
            results = session.execute(
                "SELECT * FROM check_vector_index_health()"
            ).fetchall()
            
            health_data = []
            for row in results:
                health_data.append({
                    'partition_name': row[0],
                    'vector_count': row[1],
                    'index_size': row[2],
                    'index_type': row[3],
                    'memory_usage_mb': float(row[4]) if row[4] else 0,
                    'recommended_action': row[5]
                })
            
            return {
                'partitions': health_data,
                'total_partitions': len(health_data),
                'needs_attention': len([p for p in health_data if p['recommended_action'] != 'Healthy'])
            }
        except Exception as e:
            logger.error(f"Failed to get vector index health: {e}")
            return {}
    
    @staticmethod
    def get_vector_performance_recommendations(session: Session) -> List[Dict]:
        """Get performance recommendations for vector operations"""
        try:
            results = session.execute(
                "SELECT * FROM get_vector_performance_recommendations()"
            ).fetchall()
            
            return [
                {
                    'type': row[0],
                    'current_value': row[1],
                    'recommended_value': row[2],
                    'impact': row[3],
                    'priority': row[4]
                }
                for row in results
            ]
        except Exception as e:
            logger.error(f"Failed to get performance recommendations: {e}")
            return []
    
    @staticmethod
    def archive_old_vectors(session: Session, days: int = 90, dry_run: bool = True) -> Dict:
        """Archive old vectors to reduce memory usage"""
        try:
            archive_date = session.execute(
                "SELECT NOW() - INTERVAL '%s days'" % days
            ).fetchone()[0]
            
            results = session.execute(
                "SELECT * FROM archive_old_vectors(:archive_date, :dry_run)",
                {'archive_date': archive_date, 'dry_run': dry_run}
            ).fetchall()
            
            total_vectors = sum(row[1] for row in results)
            
            return {
                'archive_date': archive_date.isoformat(),
                'dry_run': dry_run,
                'partitions_affected': len(results),
                'total_vectors_to_archive': total_vectors,
                'partitions': [
                    {
                        'partition': row[0],
                        'vectors_count': row[1],
                        'estimated_space_saved': row[2]
                    }
                    for row in results
                ]
            }
        except Exception as e:
            logger.error(f"Failed to archive old vectors: {e}")
            session.rollback()
            return {}
    
    @staticmethod
    def reindex_vector_indexes(session: Session, partition_name: str = None) -> bool:
        """Reindex vector indexes for better performance"""
        try:
            if partition_name:
                session.execute(
                    "SELECT reindex_vector_indexes_concurrent(:partition_name)",
                    {'partition_name': partition_name}
                )
                logger.info(f"Reindexed partition: {partition_name}")
            else:
                session.execute("SELECT reindex_vector_indexes_concurrent()")
                logger.info("Reindexed all vector indexes")
            
            session.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to reindex vector indexes: {e}")
            session.rollback()
            return False
    
    @staticmethod
    def validate_schema_integrity(session: Session) -> Dict:
        """Validate that outbox functions match table schemas"""
        try:
            result = session.execute(
                "SELECT validate_all_outbox_functions()"
            ).fetchone()[0]
            
            return result
        except Exception as e:
            logger.error(f"Failed to validate schema integrity: {e}")
            return {'overall_valid': False, 'error': str(e)}
    
    @staticmethod
    def check_schema_drift(session: Session) -> List[Dict]:
        """Check for schema drift between stored and current schemas"""
        try:
            results = session.execute(
                "SELECT * FROM check_schema_drift()"
            ).fetchall()
            
            return [
                {
                    'table_name': row[0],
                    'stored_hash': row[1],
                    'current_hash': row[2],
                    'has_drifted': row[3],
                    'column_count_changed': row[4],
                    'last_validated': row[5].isoformat() if row[5] else None
                }
                for row in results
            ]
        except Exception as e:
            logger.error(f"Failed to check schema drift: {e}")
            return []
    
    @staticmethod
    def get_schema_validation_status(session: Session) -> List[Dict]:
        """Get current schema validation status"""
        try:
            results = session.execute(
                "SELECT * FROM schema_validation_status"
            ).fetchall()
            
            return [
                {
                    'function_name': row[0],
                    'table_name': row[1],
                    'validation_passed': row[2],
                    'schema_drifted': row[3],
                    'issues': row[4],
                    'warnings': row[5],
                    'last_validation': row[6].isoformat() if row[6] else None,
                    'last_drift_check': row[7].isoformat() if row[7] else None,
                    'status': row[8]
                }
                for row in results
            ]
        except Exception as e:
            logger.error(f"Failed to get schema validation status: {e}")
            return []