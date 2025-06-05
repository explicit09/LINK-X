#!/usr/bin/env python3
"""
Debug Flask app for Railway deployment
"""
import os
import sys
import logging
from flask import Flask, jsonify

# Configure logging to stdout
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

logger.info("Starting app_debug.py")
logger.info(f"Python version: {sys.version}")
logger.info(f"Current directory: {os.getcwd()}")
logger.info(f"Environment PORT: {os.environ.get('PORT', 'not set')}")

app = Flask(__name__)
logger.info("Flask app created")

@app.route('/api/v2/health', methods=['GET'])
def health():
    logger.info("Health check endpoint called")
    return jsonify({
        'status': 'healthy',
        'service': 'learn-x-debug',
        'port': os.environ.get('PORT', 'not set'),
        'python_version': sys.version
    }), 200

@app.route('/', methods=['GET'])
def root():
    logger.info("Root endpoint called")
    return jsonify({'message': 'LEARN-X Debug Server Running'}), 200

@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Unhandled error: {str(error)}", exc_info=True)
    return jsonify({'error': str(error)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    logger.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
else:
    logger.info("Running under gunicorn")