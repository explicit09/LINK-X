#!/bin/bash

# Script to run backend tests only for LINK-X1 project

set -e

echo "🧪 Running Backend Tests..."
echo "========================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend Tests
echo -e "\n${YELLOW}Running Backend Tests...${NC}"
cd docker-image/src

# Install basic test dependencies if needed
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install pytest pytest-cov flask werkzeug sqlalchemy flask-jwt-extended
else
    source venv/bin/activate
    # Install missing dependencies
    pip install pytest pytest-cov flask werkzeug sqlalchemy flask-jwt-extended 2>/dev/null || true
fi

# Temporarily move __init__.py to avoid import issues
echo -e "\n${GREEN}Preparing test environment...${NC}"
if [ -f "__init__.py" ]; then
    mv __init__.py __init__.py.bak
fi

# Run the basic test
echo -e "\n${GREEN}Running basic pytest test...${NC}"
pytest tests/isolated/ -v

# Restore __init__.py
if [ -f "__init__.py.bak" ]; then
    mv __init__.py.bak __init__.py
fi

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Basic backend tests passed!${NC}"
else
    echo -e "${RED}❌ Basic backend tests failed!${NC}"
    exit 1
fi

# Summary
echo -e "\n${GREEN}==========================${NC}"
echo -e "${GREEN}✅ Backend tests completed!${NC}"
echo -e "${GREEN}==========================${NC}"