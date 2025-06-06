#!/bin/bash

# Run the stable backend with Supabase configuration

cd "$(dirname "$0")"

# Export Supabase environment variables
export SUPABASE_URL="https://torsffahnivnzcnjnxgc.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMjEwNDcsImV4cCI6MjA0ODg5NzA0N30.o8IFBafpzBBUdOa3v-yP-d9zqU0gqxFCQb-71tStRxk"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6InNlcnZpY2VfX3JvbGUiLCJpYXQiOjE3MzMzMjEwNDcsImV4cCI6MjA0ODg5NzA0N30.dKKTy9pGA6oEGH6FH65X0Vd-k38iiD8-VX_r-JOL7Xo"
export SUPABASE_JWT_SECRET="EBdk62TNJ2Ku7oMGN4ZXCjIOsg17P9PydhA9/orqUYV+cADaT/ZbTFMpCo90FfG05StLcKdrfH9zDeqLI2xIRg=="
export DATABASE_URL="postgresql://postgres.torsffahnivnzcnjnxgc:rrmHT59V1RqTec4V@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Set other required environment variables
export FLASK_ENV="development"
export FLASK_DEBUG="1"
export PORT="8080"

# Disable Redis/Celery for stability
export DISABLE_REDIS="1"
export DISABLE_CELERY="1"

echo "Starting stable backend on port 8080..."
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Run the main app
python src/app.py