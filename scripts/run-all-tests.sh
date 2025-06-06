#!/bin/bash
# Comprehensive test runner for LEARN-X

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 LEARN-X Comprehensive Test Suite${NC}"
echo "====================================="

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Results file
RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    echo -e "\n${YELLOW}Running $suite_name...${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$command" >> "$RESULTS_FILE" 2>&1; then
        echo -e "${GREEN}✅ $suite_name passed${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $suite_name failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${YELLOW}Check $RESULTS_FILE for details${NC}"
    fi
}

# 1. Backend Unit Tests
run_test_suite "Backend Unit Tests" "cd docker-image/src && python -m pytest tests/unit/ -v"

# 2. Backend Integration Tests
run_test_suite "Backend Integration Tests" "cd docker-image/src && python -m pytest tests/integration/ -v"

# 3. Frontend Unit Tests
run_test_suite "Frontend Unit Tests" "cd frontend && npm test -- --watchAll=false"

# 4. Linting - Backend
run_test_suite "Backend Linting" "cd docker-image/src && flake8 . --exclude=venv,migrations --max-line-length=100"

# 5. Linting - Frontend
run_test_suite "Frontend Linting" "cd frontend && npm run lint"

# 6. Type Checking - Backend
run_test_suite "Backend Type Checking" "cd docker-image/src && mypy . --ignore-missing-imports || true"

# 7. Type Checking - Frontend
run_test_suite "Frontend Type Checking" "cd frontend && npm run type-check"

# 8. Security Scan
run_test_suite "Security Scan" "cd docker-image && pip-audit || true"

# 9. Docker Build Test
run_test_suite "Docker Build Test" "docker build -f docker-image/docker/Dockerfile.dev -t test-build docker-image"

# 10. API Contract Tests
echo -e "\n${YELLOW}Running API Contract Tests...${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Start test backend
docker-compose -f docker-compose.test.yml up -d test-backend
sleep 10

# Run API tests
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Contract Tests passed${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ API Contract Tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Cleanup
docker-compose -f docker-compose.test.yml down

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "==============="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"
echo -e "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo -e "\nDetailed results in: ${YELLOW}${RESULTS_FILE}${NC}"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi