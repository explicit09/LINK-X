#!/bin/bash
# Run storage audit to check data distribution

echo "🔍 Running Storage Architecture Audit"
echo "===================================="

# Check if we're in docker or local environment
if [ -f /.dockerenv ]; then
    echo "Running in Docker container..."
    cd /app
    python3 /app/src/storage_audit.py
else
    echo "Running locally..."
    
    # Get the script directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    cd "$SCRIPT_DIR"
    
    # Check if .env exists in src directory
    if [ -f "src/.env" ]; then
        echo "Loading environment variables from src/.env..."
        export $(cat src/.env | grep -v '^#' | xargs)
    elif [ -f ".env" ]; then
        # Fallback to .env in current directory for backward compatibility
        echo "Loading environment variables from .env..."
        export $(cat .env | grep -v '^#' | xargs)
    else
        echo "Warning: No .env file found in src/ or current directory"
    fi
    
    # Run audit
    python3 src/storage_audit.py
fi