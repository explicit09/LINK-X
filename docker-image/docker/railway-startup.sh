#!/bin/bash

# Railway Startup Script for LINK-X1 Backend
# Handles environment validation, memory monitoring, and resilient startup

set -e

echo "=========================================="
echo "LINK-X1 Backend Railway Startup"
echo "=========================================="

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check environment variables
check_env_vars() {
    log "Checking required environment variables..."
    
    required_vars=(
        "DATABASE_URL"
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "SUPABASE_JWT_SECRET"
        "SECRET_KEY"
        "JWT_SECRET_KEY"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        else
            log "✓ $var is set"
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log "❌ Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        log "Please set these variables in Railway dashboard"
        exit 1
    fi
    
    log "✓ All required environment variables are set"
}

# Function to check memory limits
check_memory() {
    log "Checking memory configuration..."
    
    # Get available memory in MB
    if [ -f /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
        mem_limit=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
        mem_limit_mb=$((mem_limit / 1024 / 1024))
        log "Memory limit: ${mem_limit_mb}MB"
        
        # Adjust workers based on memory
        if [ "$mem_limit_mb" -lt 1024 ]; then
            export GUNICORN_WORKERS=1
            log "Low memory detected, using 1 worker"
        elif [ "$mem_limit_mb" -lt 2048 ]; then
            export GUNICORN_WORKERS=2
            log "Medium memory detected, using 2 workers"
        else
            export GUNICORN_WORKERS=${GUNICORN_WORKERS:-2}
            log "Using ${GUNICORN_WORKERS} workers"
        fi
    else
        log "Cannot detect memory limits, using default configuration"
        export GUNICORN_WORKERS=${GUNICORN_WORKERS:-2}
    fi
}

# Function to validate database connection
check_database() {
    log "Testing database connection..."
    
    # Simple PostgreSQL connection test
    python3 -c "
import os
import psycopg2
from urllib.parse import urlparse

try:
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print('❌ DATABASE_URL not set')
        exit(1)
    
    # Parse URL
    parsed = urlparse(db_url)
    
    # Test connection
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path[1:] if parsed.path else 'postgres',
        user=parsed.username,
        password=parsed.password,
        sslmode='require',
        connect_timeout=10
    )
    
    cursor = conn.cursor()
    cursor.execute('SELECT 1;')
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if result and result[0] == 1:
        print('✓ Database connection successful')
    else:
        print('❌ Database connection test failed')
        exit(1)
        
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    print('Application will start but database operations may fail')
    # Don't exit - allow app to start for debugging
"
    
    if [ $? -eq 0 ]; then
        log "✓ Database connection test passed"
    else
        log "⚠️  Database connection test failed, continuing anyway"
    fi
}

# Function to set memory-optimized Python settings
set_python_memory_settings() {
    log "Setting Python memory optimizations..."
    
    # Python memory optimizations for Railway
    export PYTHONMALLOC=malloc
    export MALLOC_ARENA_MAX=2
    export MALLOC_MMAP_THRESHOLD_=131072
    export MALLOC_TRIM_THRESHOLD_=131072
    export MALLOC_TOP_PAD_=131072
    export MALLOC_MMAP_MAX_=65536
    
    log "✓ Python memory settings configured"
}

# Function to create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    mkdir -p /app/logs
    mkdir -p /app/data
    mkdir -p /tmp/gunicorn
    
    # Set proper permissions
    chmod 755 /app/logs /app/data /tmp/gunicorn
    
    log "✓ Directories created"
}

# Function to display startup summary
display_summary() {
    log "=========================================="
    log "Startup Configuration Summary"
    log "=========================================="
    log "Environment: ${FLASK_ENV:-development}"
    log "Workers: ${GUNICORN_WORKERS:-2}"
    log "Timeout: ${GUNICORN_TIMEOUT:-120}s"
    log "Port: ${PORT:-8000}"
    log "Python Path: ${PYTHONPATH}"
    log "Working Directory: $(pwd)"
    log "=========================================="
}

# Function to start monitoring
start_monitoring() {
    log "Starting background monitoring..."
    
    # Memory monitoring script
    (
        while true; do
            sleep 60
            memory_usage=$(ps aux | awk '{sum+=$6} END {print sum/1024}')
            log "Memory usage: ${memory_usage}MB"
            
            # Log memory usage > 400MB as warning
            if (( $(echo "$memory_usage > 400" | bc -l) )); then
                log "⚠️  High memory usage detected: ${memory_usage}MB"
            fi
        done
    ) &
    
    log "✓ Background monitoring started"
}

# Main execution
main() {
    log "Starting Railway deployment checks..."
    
    # Run all checks
    check_env_vars
    check_memory
    set_python_memory_settings
    setup_directories
    check_database
    display_summary
    start_monitoring
    
    log "✓ All startup checks completed successfully"
    log "Starting Gunicorn server..."
    
    # Start the application with optimized settings
    exec gunicorn \
        --bind 0.0.0.0:${PORT:-8000} \
        --workers ${GUNICORN_WORKERS:-2} \
        --worker-class ${GUNICORN_WORKER_CLASS:-sync} \
        --timeout ${GUNICORN_TIMEOUT:-120} \
        --keep-alive 2 \
        --max-requests ${GUNICORN_MAX_REQUESTS:-1000} \
        --max-requests-jitter ${GUNICORN_MAX_REQUESTS_JITTER:-100} \
        --preload \
        --worker-tmp-dir /tmp/gunicorn \
        --access-logfile - \
        --error-logfile - \
        --log-level info \
        --chdir /app/src \
        "app:create_app()"
}

# Run main function
main "$@" 