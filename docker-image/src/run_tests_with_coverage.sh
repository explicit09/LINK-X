#!/bin/bash

# Script to run all tests with coverage reporting
set -e

echo "🧪 Running Comprehensive Test Suite with Coverage"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to src directory
cd "$(dirname "$0")"

# Create coverage directory if it doesn't exist
mkdir -p htmlcov

# Install test dependencies if needed
echo -e "\n${YELLOW}Installing test dependencies...${NC}"
pip install pytest pytest-cov pytest-mock pytest-asyncio

# Clear previous coverage data
echo -e "\n${YELLOW}Clearing previous coverage data...${NC}"
coverage erase

# Run tests with coverage
echo -e "\n${GREEN}Running unit tests with coverage...${NC}"
pytest tests/test_auth_comprehensive.py \
       tests/test_file_operations.py \
       tests/test_course_management.py \
       tests/test_api_integration.py \
       -v \
       --cov=services \
       --cov=api \
       --cov=core \
       --cov=repositories \
       --cov-report=html \
       --cov-report=term-missing \
       --cov-report=xml

# Check coverage threshold
echo -e "\n${YELLOW}Checking coverage threshold...${NC}"
coverage report --fail-under=80 || echo -e "${YELLOW}Warning: Coverage below 80%${NC}"

# Generate detailed HTML report
echo -e "\n${GREEN}Generating HTML coverage report...${NC}"
echo "Report available at: $(pwd)/htmlcov/index.html"

# Summary
echo -e "\n${GREEN}==================================${NC}"
echo -e "${GREEN}✅ Test Coverage Report Complete!${NC}"
echo -e "${GREEN}==================================${NC}"

# Show coverage summary
coverage report --skip-covered --show-missing

# Test results summary
echo -e "\n${YELLOW}Test Results Summary:${NC}"
echo "- Auth Tests: Comprehensive authentication flows"
echo "- File Tests: Upload, validation, and S3 operations"
echo "- Course Tests: Creation, enrollment, and access control"
echo "- API Tests: Integration testing of all endpoints"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Review coverage gaps in htmlcov/index.html"
echo "2. Add tests for uncovered code paths"
echo "3. Aim for 90%+ coverage for production"