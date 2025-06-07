"""
API endpoints for embedding system monitoring and control.
Provides kill switch, metrics, and health monitoring.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from core.database_supabase import db_manager
from services.embedding_service import EmbeddingService
from core.decorators_unified import handle_api_errors, require_role

logger = logging.getLogger(__name__)

bp = Blueprint('embeddings', __name__)


@bp.route('/status', methods=['GET'])
@jwt_required()
@handle_api_errors
def get_embedding_status():
    """Get overall embedding system status"""
    try:
        with db_manager.get_session() as session:
            health = EmbeddingService.get_system_health(session)
            queue_stats = EmbeddingService.get_embedding_queue_stats(session)
            alerts = EmbeddingService.get_alerts(session)
            
            return jsonify({
                'status': 'success',
                'data': {
                    'system_health': health,
                    'queue_stats': queue_stats,
                    'alerts': alerts,
                    'embeddings_enabled': EmbeddingService.is_embeddings_enabled(session)
                }
            })
    except Exception as e:
        logger.error(f"Error getting embedding status: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get embedding status'
        }), 500


@bp.route('/file/<file_id>/status', methods=['GET'])
@jwt_required()
@handle_api_errors
def get_file_embedding_status(file_id):
    """Get embedding status for a specific file"""
    try:
        with db_manager.get_session() as session:
            status = EmbeddingService.get_file_embedding_status(session, file_id)
            
            return jsonify({
                'status': 'success',
                'data': {
                    'file_id': file_id,
                    'embedding_status': status
                }
            })
    except Exception as e:
        logger.error(f"Error getting file embedding status: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get file embedding status'
        }), 500


@bp.route('/toggle', methods=['POST'])
@jwt_required()
@require_role(['admin', 'professor'])
@handle_api_errors
def toggle_embeddings():
    """Toggle embeddings on/off (kill switch)"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', True)
        current_user = get_jwt_identity()
        
        with db_manager.get_session() as session:
            success = EmbeddingService.toggle_embeddings(
                session, enabled, current_user
            )
            
            if success:
                return jsonify({
                    'status': 'success',
                    'data': {
                        'embeddings_enabled': enabled,
                        'message': f"Embeddings {'enabled' if enabled else 'disabled'}"
                    }
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Failed to toggle embeddings'
                }), 500
                
    except Exception as e:
        logger.error(f"Error toggling embeddings: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to toggle embeddings'
        }), 500


@bp.route('/metrics', methods=['GET'])
@jwt_required()
@require_role(['admin', 'professor'])
@handle_api_errors
def get_embedding_metrics():
    """Get detailed embedding metrics"""
    try:
        with db_manager.get_session() as session:
            # Get comprehensive metrics
            system_health = EmbeddingService.get_system_health(session)
            queue_stats = EmbeddingService.get_embedding_queue_stats(session)
            
            # Get cost estimates
            cost_data = session.execute(
                "SELECT * FROM calculate_embedding_costs()"
            ).fetchone()
            
            # Get worker health
            workers = session.execute(
                """
                SELECT worker_id, status, last_heartbeat,
                       age(NOW(), last_heartbeat) as last_seen_duration
                FROM worker_health
                ORDER BY last_heartbeat DESC
                """
            ).fetchall()
            
            # Get recent throughput
            throughput_data = session.execute(
                """
                SELECT 
                    DATE_TRUNC('hour', created_at) as hour,
                    AVG(value) as avg_throughput,
                    MAX(value) as peak_throughput
                FROM worker_metrics
                WHERE metric_type = 'throughput'
                AND created_at > NOW() - INTERVAL '24 hours'
                GROUP BY hour
                ORDER BY hour
                """
            ).fetchall()
            
            return jsonify({
                'status': 'success',
                'data': {
                    'system_health': system_health,
                    'queue_stats': queue_stats,
                    'cost_estimate': {
                        'total_embeddings': cost_data[0] if cost_data else 0,
                        'total_tokens': cost_data[1] if cost_data else 0,
                        'estimated_cost': float(cost_data[2]) if cost_data and cost_data[2] else 0,
                        'avg_per_day': float(cost_data[3]) if cost_data and cost_data[3] else 0
                    },
                    'workers': [
                        {
                            'worker_id': w[0],
                            'status': w[1],
                            'last_heartbeat': w[2].isoformat() if w[2] else None,
                            'last_seen_duration': str(w[3]) if w[3] else None
                        }
                        for w in workers
                    ],
                    'throughput_history': [
                        {
                            'hour': t[0].isoformat() if t[0] else None,
                            'avg_throughput': float(t[1]) if t[1] else 0,
                            'peak_throughput': float(t[2]) if t[2] else 0
                        }
                        for t in throughput_data
                    ]
                }
            })
            
    except Exception as e:
        logger.error(f"Error getting embedding metrics: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get embedding metrics'
        }), 500


@bp.route('/cleanup', methods=['POST'])
@jwt_required()
@require_role(['admin'])
@handle_api_errors
def cleanup_old_jobs():
    """Clean up old embedding jobs"""
    try:
        data = request.get_json()
        days = data.get('days', 30)
        
        with db_manager.get_session() as session:
            deleted_count = EmbeddingService.cleanup_old_jobs(session, days)
            
            return jsonify({
                'status': 'success',
                'data': {
                    'deleted_jobs': deleted_count,
                    'message': f"Cleaned up {deleted_count} jobs older than {days} days"
                }
            })
            
    except Exception as e:
        logger.error(f"Error cleaning up jobs: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to cleanup jobs'
        }), 500


@bp.route('/vectors/health', methods=['GET'])
@jwt_required()
@require_role(['admin', 'professor'])
@handle_api_errors
def get_vector_health():
    """Get vector index health metrics"""
    try:
        with db_manager.get_session() as session:
            health = EmbeddingService.get_vector_index_health(session)
            recommendations = EmbeddingService.get_vector_performance_recommendations(session)
            
            return jsonify({
                'status': 'success',
                'data': {
                    'index_health': health,
                    'recommendations': recommendations
                }
            })
    except Exception as e:
        logger.error(f"Error getting vector health: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get vector health'
        }), 500


@bp.route('/vectors/archive', methods=['POST'])
@jwt_required()
@require_role(['admin'])
@handle_api_errors
def archive_old_vectors():
    """Archive old vectors to reduce memory usage"""
    try:
        data = request.get_json()
        days = data.get('days', 90)
        dry_run = data.get('dry_run', True)
        
        with db_manager.get_session() as session:
            result = EmbeddingService.archive_old_vectors(session, days, dry_run)
            
            return jsonify({
                'status': 'success',
                'data': result
            })
    except Exception as e:
        logger.error(f"Error archiving vectors: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to archive vectors'
        }), 500


@bp.route('/vectors/reindex', methods=['POST'])
@jwt_required()
@require_role(['admin'])
@handle_api_errors
def reindex_vectors():
    """Reindex vector indexes for better performance"""
    try:
        data = request.get_json() or {}
        partition_name = data.get('partition_name')
        
        with db_manager.get_session() as session:
            success = EmbeddingService.reindex_vector_indexes(session, partition_name)
            
            if success:
                return jsonify({
                    'status': 'success',
                    'data': {
                        'message': f"Reindex {'started' if partition_name else 'started for all partitions'}",
                        'partition': partition_name
                    }
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Failed to start reindex'
                }), 500
                
    except Exception as e:
        logger.error(f"Error reindexing vectors: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to reindex vectors'
        }), 500


@bp.route('/test', methods=['POST'])
@jwt_required()
@require_role(['admin'])
@handle_api_errors
def test_kill_switch():
    """Test the kill switch mechanism"""
    try:
        current_user = get_jwt_identity()
        
        with db_manager.get_session() as session:
            # Get current state
            was_enabled = EmbeddingService.is_embeddings_enabled(session)
            
            # Disable embeddings
            EmbeddingService.toggle_embeddings(session, False, f"{current_user}-test")
            
            # Check that it's disabled
            is_disabled = not EmbeddingService.is_embeddings_enabled(session)
            
            # Re-enable if it was originally enabled
            if was_enabled:
                EmbeddingService.toggle_embeddings(session, True, f"{current_user}-test")
            
            return jsonify({
                'status': 'success',
                'data': {
                    'test_passed': is_disabled,
                    'was_enabled': was_enabled,
                    'message': 'Kill switch test completed successfully'
                }
            })
            
    except Exception as e:
        logger.error(f"Error testing kill switch: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Kill switch test failed'
        }), 500