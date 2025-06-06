#!/usr/bin/env python
"""Start backend with Supabase configuration"""
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'docker-image' / 'src'))

# Set all required environment variables
os.environ.update({
    # Supabase
    'SUPABASE_URL': 'https://torsffahnivnzcnjnxgc.supabase.co',
    'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjI2NTEsImV4cCI6MjA2NDY5ODY1MX0.iNmJjrq4rcgj-W8yp-nQ_mbF-NIlR89loPT9bqTVUPI',
    'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTEzNzczNywiZXhwIjoyMDY0NzEzNzM3fQ.bORW1lciqmqC8Q4RPtn3UI4MnW-HnKAibsbiSFHZf5Y',
    'SUPABASE_JWT_SECRET': 'EBdk62TNJ2Ku7oMGN4ZXCjIOsg17P9PydhA9/orqUYV+cADaT/ZbTFMpCo90FfG05StLcKdrfH9zDeqLI2xIRg==',
    'SUPABASE_DB_URL': 'postgresql://postgres:learnx@2321@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres',
    
    # Database URL
    'DATABASE_URL': 'postgresql://postgres:learnx@2321@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres',
    
    # Flask
    'FLASK_ENV': 'development',
    'SECRET_KEY': 'dev-secret-key-change-in-production',
    'JWT_SECRET_KEY': 'dev-jwt-secret-change-in-production',
    
    # Redis
    'REDIS_URL': 'redis://localhost:6379/0',
    
    # Development
    'PORT': '8080'
})

# Change to docker-image directory
os.chdir(Path(__file__).parent / 'docker-image')

# Start the app
print("🚀 Starting LEARN-X Backend with Supabase...")
print("📡 API will be available at: http://localhost:8080")
print("🔑 Using Supabase for authentication")
print()

# Import and run the app
from app import create_app

app = create_app()
socketio = getattr(app, 'socketio', None)

if socketio:
    socketio.run(
        app,
        host='0.0.0.0',
        port=8080,
        debug=True,
        allow_unsafe_werkzeug=True
    )
else:
    app.run(
        host='0.0.0.0',
        port=8080,
        debug=True
    )