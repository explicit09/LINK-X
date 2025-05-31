#!/bin/bash
# LEARN-X Load Testing Script

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 LEARN-X Load Testing Suite${NC}"
echo "=================================="

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed. Please install k6 first:${NC}"
    echo "brew install k6  # macOS"
    echo "or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:8000"}
OUTPUT_DIR="load-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local scenario=${3:-""}
    
    echo -e "\n${YELLOW}Running $test_name...${NC}"
    
    if [ -n "$scenario" ]; then
        k6 run \
            --out json="$OUTPUT_DIR/${test_name}_${TIMESTAMP}.json" \
            --out csv="$OUTPUT_DIR/${test_name}_${TIMESTAMP}.csv" \
            --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)" \
            -e BASE_URL="$BASE_URL" \
            --scenario-executor="$scenario" \
            "$test_file"
    else
        k6 run \
            --out json="$OUTPUT_DIR/${test_name}_${TIMESTAMP}.json" \
            --out csv="$OUTPUT_DIR/${test_name}_${TIMESTAMP}.csv" \
            --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)" \
            -e BASE_URL="$BASE_URL" \
            "$test_file"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Menu
echo -e "\nSelect test to run:"
echo "1. Standard Load Test (gradual ramp-up)"
echo "2. Stress Test (rapid requests)"
echo "3. Spike Test (sudden load)"
echo "4. Soak Test (extended duration)"
echo "5. All Tests"
echo -e "\nEnter choice (1-5): \c"
read -r choice

case $choice in
    1)
        run_test "standard_load" "tests/load/k6-load-test.js"
        ;;
    2)
        run_test "stress_test" "tests/load/k6-load-test.js" "stressTest"
        ;;
    3)
        # Create spike test configuration
        cat > "$OUTPUT_DIR/spike-test.js" << 'EOF'
import loadTest from '../../tests/load/k6-load-test.js';
export { handleResponse, getRandomUser } from '../../tests/load/k6-load-test.js';

export const options = {
  stages: [
    { duration: '10s', target: 0 },
    { duration: '10s', target: 500 },  // Spike to 500 users
    { duration: '1m', target: 500 },   // Stay at 500
    { duration: '10s', target: 0 },
  ],
};

export default loadTest;
EOF
        run_test "spike_test" "$OUTPUT_DIR/spike-test.js"
        ;;
    4)
        # Create soak test configuration
        cat > "$OUTPUT_DIR/soak-test.js" << 'EOF'
import loadTest from '../../tests/load/k6-load-test.js';
export { handleResponse, getRandomUser } from '../../tests/load/k6-load-test.js';

export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up
    { duration: '2h', target: 100 },   // Stay at 100 users for 2 hours
    { duration: '5m', target: 0 },     // Ramp down
  ],
};

export default loadTest;
EOF
        run_test "soak_test" "$OUTPUT_DIR/soak-test.js"
        ;;
    5)
        run_test "standard_load" "tests/load/k6-load-test.js"
        run_test "stress_test" "tests/load/k6-load-test.js" "stressTest"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Generate HTML report
if command -v k6-reporter &> /dev/null; then
    echo -e "\n${YELLOW}Generating HTML report...${NC}"
    k6-reporter < "$OUTPUT_DIR/standard_load_${TIMESTAMP}.json" > "$OUTPUT_DIR/report_${TIMESTAMP}.html"
    echo -e "${GREEN}✅ HTML report generated: $OUTPUT_DIR/report_${TIMESTAMP}.html${NC}"
else
    echo -e "\n${YELLOW}Install k6-reporter for HTML reports:${NC}"
    echo "npm install -g k6-reporter"
fi

# Summary
echo -e "\n${GREEN}✅ Load testing completed!${NC}"
echo -e "Results saved in: ${YELLOW}$OUTPUT_DIR/${NC}"
echo -e "\nKey metrics to review:"
echo "- Response time percentiles (p95, p99)"
echo "- Error rate"
echo "- Requests per second"
echo "- Active virtual users"

# Open results if on macOS
if [[ "$OSTYPE" == "darwin"* ]] && [ -f "$OUTPUT_DIR/report_${TIMESTAMP}.html" ]; then
    echo -e "\n${YELLOW}Opening HTML report...${NC}"
    open "$OUTPUT_DIR/report_${TIMESTAMP}.html"
fi