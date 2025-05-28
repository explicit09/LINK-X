#!/bin/bash
# Script to run file reprocessing for vector embeddings

echo "🚀 Starting File Reprocessing for Vector Embeddings"
echo "=================================================="

# Check if we're in docker or local environment
if [ -f /.dockerenv ]; then
    echo "Running in Docker container..."
    cd /app
    
    # Ensure environment variables are loaded
    source /app/.env 2>/dev/null || true
    
    # Run the enhanced reprocessing script with S3 support
    python3 /app/src/reprocess_all_files_s3.py
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
        echo "⚠️  Warning: No .env file found in src/ or current directory. Make sure environment variables are set!"
    fi
    
    # Check Python availability
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo "❌ Error: Python not found!"
        exit 1
    fi
    
    # Run the enhanced reprocessing script
    echo "Running reprocessing script..."
    $PYTHON_CMD src/reprocess_all_files_s3.py
fi

echo ""
echo "Reprocessing complete!"
echo ""
echo "Next steps:"
echo "1. Check the logs above for any errors"
echo "2. Run monitoring: python3 src/monitor_pgvector.py"
echo "3. Test AI features with your reprocessed content"