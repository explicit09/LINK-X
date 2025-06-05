import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({"message": "LEARN-X API is running!", "status": "success"})

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/api/v2/health')
def api_health():
    return jsonify({"status": "healthy", "service": "learn-x-backend"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)