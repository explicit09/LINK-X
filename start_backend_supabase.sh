#!/bin/bash

echo "🚀 Starting LEARN-X Backend with Supabase..."
echo

# Navigate to backend directory
cd docker-image

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

# Install required packages
echo "📦 Installing dependencies..."
pip install -q flask flask-sqlalchemy flask-jwt-extended flask-cors supabase redis celery

# Set environment variables if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Using .env.supabase"
    cp .env.supabase .env
fi

# Start the application
echo
echo "🔧 Starting Flask application..."
echo "📡 API will be available at: http://localhost:8080"
echo
python src/app.py