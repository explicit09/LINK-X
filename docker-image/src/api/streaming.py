from flask import Blueprint, request, jsonify, Response, g
import json
import time
from queue import Queue
import threading

from ..core.decorators import firebase_auth_required, validate_json
from ..core.exceptions import NotFoundError, ValidationError
from ..services.streaming_service import StreamingService
from ..services.ai_service import AIService

bp = Blueprint('streaming', __name__)

@bp.route('/learn/<file_id>', methods=['GET'])
@firebase_auth_required
def stream_learning_content(file_id):
    """Stream personalized learning content"""
    streaming_service = StreamingService()
    
    def generate():
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Stream connected'})}\n\n"
            
            # Stream content
            for chunk in streaming_service.stream_personalized_content(
                file_id=file_id,
                user_id=g.current_user.id,
                learning_style=request.args.get('style', 'default')
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
                
            # Send completion message
            yield f"data: {json.dumps({'type': 'complete', 'message': 'Stream complete'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )

@bp.route('/chat', methods=['POST'])
@firebase_auth_required
def stream_chat_response():
    """Stream AI chat responses"""
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({'error': 'Message is required'}), 400
    
    ai_service = AIService()
    response_queue = Queue()
    
    def generate():
        try:
            # Start AI response generation in background
            thread = threading.Thread(
                target=ai_service.generate_chat_response,
                args=(
                    data['message'],
                    g.current_user.id,
                    data.get('context', {}),
                    response_queue
                )
            )
            thread.start()
            
            # Stream responses from queue
            while True:
                chunk = response_queue.get()
                if chunk is None:  # End of stream
                    break
                    
                yield f"data: {json.dumps(chunk)}\n\n"
            
            thread.join()
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@bp.route('/outline/<file_id>', methods=['GET'])
@firebase_auth_required
def get_document_outline(file_id):
    """Get document outline for streaming"""
    streaming_service = StreamingService()
    
    try:
        outline = streaming_service.get_document_outline(
            file_id=file_id,
            user_id=g.current_user.id
        )
        
        return jsonify({
            'outline': outline
        }), 200
        
    except NotFoundError:
        return jsonify({'error': 'File not found'}), 404

@bp.route('/section', methods=['POST'])
@firebase_auth_required
@validate_json(['fileId', 'sectionId'])
def stream_section_content():
    """Stream specific section content"""
    data = request.get_json()
    streaming_service = StreamingService()
    
    def generate():
        try:
            for chunk in streaming_service.stream_section_content(
                file_id=data['fileId'],
                section_id=data['sectionId'],
                user_id=g.current_user.id,
                include_examples=data.get('includeExamples', True)
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@bp.route('/quiz/<file_id>', methods=['GET'])
@firebase_auth_required
def stream_quiz_questions(file_id):
    """Stream quiz questions based on content"""
    streaming_service = StreamingService()
    
    def generate():
        try:
            for question in streaming_service.generate_quiz_questions(
                file_id=file_id,
                user_id=g.current_user.id,
                difficulty=request.args.get('difficulty', 'medium'),
                count=int(request.args.get('count', 5))
            ):
                yield f"data: {json.dumps(question)}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@bp.route('/summary/<file_id>', methods=['GET'])
@firebase_auth_required
def stream_content_summary(file_id):
    """Stream content summary"""
    streaming_service = StreamingService()
    
    def generate():
        try:
            for chunk in streaming_service.generate_summary(
                file_id=file_id,
                user_id=g.current_user.id,
                summary_type=request.args.get('type', 'brief')
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

@bp.route('/progress', methods=['POST'])
@firebase_auth_required
@validate_json(['fileId', 'sectionId', 'progress'])
def update_learning_progress():
    """Update user's learning progress"""
    data = request.get_json()
    streaming_service = StreamingService()
    
    try:
        progress = streaming_service.update_progress(
            file_id=data['fileId'],
            section_id=data['sectionId'],
            user_id=g.current_user.id,
            progress=data['progress']
        )
        
        return jsonify({
            'message': 'Progress updated',
            'progress': progress
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to update progress'}), 500