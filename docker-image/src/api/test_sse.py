"""
Test SSE endpoint to verify EventSource works
"""
from flask import Blueprint, Response, request
import json
import time
from typing import Generator

bp = Blueprint('test_sse', __name__)

@bp.route('/test-stream', methods=['GET', 'OPTIONS'])
def test_sse_stream():
    """Simple test SSE endpoint"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = Response()
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    def generate() -> Generator[str, None, None]:
        """Generate test SSE events"""
        # Send initial message
        yield f"data: {json.dumps({'type': 'connected', 'message': 'Test SSE connected'})}\n\n"
        
        # Send a few test messages
        for i in range(5):
            time.sleep(1)  # Wait 1 second between messages
            yield f"data: {json.dumps({'type': 'message', 'count': i + 1, 'message': f'Test message {i + 1}'})}\n\n"
        
        # Send completion
        yield f"data: {json.dumps({'type': 'complete', 'message': 'Test complete'})}\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': request.headers.get('Origin', '*'),
            'Access-Control-Allow-Credentials': 'true'
        }
    )