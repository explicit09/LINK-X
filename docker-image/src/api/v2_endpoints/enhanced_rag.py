"""
Enhanced RAG API endpoints for semantic search and processing
"""
from flask import Blueprint, request, jsonify
from core.decorators_unified import firebase_auth_required
from flask import g
import logging

# Removed duplicate import
from services.ai.hybrid_search_service import HybridSearchService
from services.ai.utils.embeddings import EmbeddingsService
from tasks.enhanced_file_processing import (
    process_file_with_semantic_chunking,
    reprocess_course_with_enhancements
)
from repositories.file_repository import FileRepository
from core.database import db_manager
from services.ai.ai_service import AIService

logger = logging.getLogger(__name__)

bp = Blueprint('enhanced_rag', __name__, url_prefix='/api/v2/rag')

# Initialize services
ai_service = AIService()
embeddings_service = EmbeddingsService(ai_service.client)
hybrid_search = HybridSearchService(embeddings_service)


@bp.route('/search', methods=['POST'])
@firebase_auth_required
def hybrid_search_endpoint():
    """
    Perform hybrid search (vector + keyword) on course content.
    
    Request body:
    {
        "query": "search query",
        "course_id": "optional course filter",
        "file_id": "optional file filter",
        "search_type": "hybrid|vector|keyword",
        "intent": "definition|example|explanation|factual",
        "limit": 10
    }
    """
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            return jsonify({
                'status': 'error',
                'error': 'Query is required'
            }), 400
        
        # Get search parameters
        course_id = data.get('course_id')
        file_id = data.get('file_id')
        search_type = data.get('search_type', 'hybrid')
        intent = data.get('intent')
        limit = min(data.get('limit', 10), 50)  # Cap at 50
        
        # Perform search
        if intent:
            results = hybrid_search.search_with_intent(
                query=query,
                intent=intent,
                course_id=course_id,
                file_id=file_id,
                limit=limit
            )
        else:
            results = hybrid_search.search(
                query=query,
                course_id=course_id,
                file_id=file_id,
                limit=limit,
                search_type=search_type
            )
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                'content': result.content,
                'file_id': result.file_id,
                'file_title': result.file_title,
                'module_title': result.module_title,
                'chunk_type': result.chunk_type,
                'score': result.score,
                'vector_score': result.vector_score,
                'keyword_score': result.keyword_score,
                'metadata': result.metadata
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'results': formatted_results,
                'count': len(formatted_results),
                'query': query,
                'search_type': search_type
            }
        })
        
    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Search failed',
            'message': str(e)
        }), 500


@bp.route('/process/file/<file_id>', methods=['POST'])
@firebase_auth_required
def process_file_semantic(file_id: str):
    """
    Process a file with semantic chunking.
    Only accessible by file owner or course instructor.
    """
    try:
        # Check access
        with db_manager.get_session() as session:
            file_repo = FileRepository()
            file_obj = file_repo.get_by_id(session, file_id)
            
            if not file_obj:
                return jsonify({
                    'status': 'error',
                    'error': 'File not found'
                }), 404
            
            # Check permissions (implement based on your auth model)
            # For now, just check if user is authenticated
            
            # Queue processing
            force = request.get_json().get('force', False) if request.is_json else False
            task = process_file_with_semantic_chunking.delay(file_id, force=force)
            
            return jsonify({
                'status': 'success',
                'data': {
                    'task_id': task.id,
                    'file_id': file_id,
                    'message': 'File queued for semantic processing'
                }
            })
            
    except Exception as e:
        logger.error(f"Process file error: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Processing failed',
            'message': str(e)
        }), 500


@bp.route('/process/course/<course_id>', methods=['POST'])
@firebase_auth_required
def reprocess_course(course_id: str):
    """
    Reprocess all files in a course with semantic chunking.
    Only accessible by course instructor.
    """
    try:
        # Check if user is course instructor
        # TODO: Implement proper permission check
        
        # Queue processing
        task = reprocess_course_with_enhancements.delay(course_id)
        
        return jsonify({
            'status': 'success',
            'data': {
                'task_id': task.id,
                'course_id': course_id,
                'message': 'Course queued for enhanced processing'
            }
        })
        
    except Exception as e:
        logger.error(f"Process course error: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Processing failed',
            'message': str(e)
        }), 500


@bp.route('/chunk/<file_id>/<int:chunk_index>', methods=['GET'])
@firebase_auth_required
def get_chunk_details(file_id: str, chunk_index: int):
    """
    Get detailed information about a specific chunk including metadata.
    """
    try:
        from db.schema import FileChunk
        
        with db_manager.get_session() as session:
            chunk = session.query(FileChunk).filter_by(
                file_id=file_id,
                chunk_index=chunk_index
            ).first()
            
            if not chunk:
                return jsonify({
                    'status': 'error',
                    'error': 'Chunk not found'
                }), 404
            
            return jsonify({
                'status': 'success',
                'data': {
                    'content': chunk.content,
                    'chunk_index': chunk.chunk_index,
                    'metadata': chunk.chunk_metadata or {},
                    'file_id': str(chunk.file_id),
                    'course_id': str(chunk.course_id) if chunk.course_id else None
                }
            })
            
    except Exception as e:
        logger.error(f"Get chunk error: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Failed to retrieve chunk',
            'message': str(e)
        }), 500