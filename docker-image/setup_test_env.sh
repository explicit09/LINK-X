#!/bin/bash

# Setup script for testing the docker-image cleanup

echo "=== Setting up test environment ==="

# Change to docker-image directory
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies from requirements.txt..."
pip install -r src/requirements.txt

echo ""
echo "=== Environment setup complete ==="
echo ""
echo "To run tests:"
echo "  cd src"
echo "  python -m pytest"
echo ""
echo "To run cleanup scripts:"
echo "  ./cleanup_dead_code.sh"
echo "  python cleanup_requirements.py"
echo ""
echo "To deactivate the virtual environment:"
echo "  deactivate"