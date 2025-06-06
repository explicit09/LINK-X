#!/bin/bash

echo "🚀 Starting LEARN-X Backend (Stable Mode)"
echo "📋 This runs without Celery/Redis for stability"
echo

# Set environment variables
export FLASK_ENV=development
export DISABLE_CELERY=true
export SUPABASE_URL=https://torsffahnivnzcnjnxgc.supabase.co
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjI2NTEsImV4cCI6MjA2NDY5ODY1MX0.iNmJjrq4rcgj-W8yp-nQ_mbF-NIlR89loPT9bqTVUPI
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTEzNzczNywiZXhwIjoyMDY0NzEzNzM3fQ.bORW1lciqmqC8Q4RPtn3UI4MnW-HnKAibsbiSFHZf5Y
export SUPABASE_JWT_SECRET=EBdk62TNJ2Ku7oMGN4ZXCjIOsg17P9PydhA9/orqUYV+cADaT/ZbTFMpCo90FfG05StLcKdrfH9zDeqLI2xIRg==
export POSTGRES_URL=postgresql://postgres:learnx@2321@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres
export SUPABASE_DB_URL=postgresql://postgres:learnx@2321@db.torsffahnivnzcnjnxgc.supabase.co:5432/postgres

# Change to backend directory
cd docker-image

# Option 1: Try the simple app first (most stable)
echo "Starting simple backend..."
python src/app_simple.py

# If that doesn't work, try the main app
# python src/app.py