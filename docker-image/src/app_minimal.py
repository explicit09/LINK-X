"""
Minimal Flask app for Railway deployment testing
"""
import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/v2/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'learn-x-backend',
        'version': 'minimal'
    }), 200

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'message': 'LEARN-X Backend API',
        'version': 'minimal',
        'endpoints': {
            'health': '/api/v2/health'
        }
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)