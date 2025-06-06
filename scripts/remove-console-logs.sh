#!/bin/bash

# Script to remove console.log statements from the codebase
# Usage: ./remove-console-logs.sh

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Removing console.log statements from codebase${NC}"
echo "================================================"

# Function to remove console.log from a directory
remove_console_logs() {
    local dir=$1
    local file_pattern=$2
    
    echo -e "\n${GREEN}Processing $dir...${NC}"
    
    # Count before
    local count_before=$(grep -r "console\.log" "$dir" --include="$file_pattern" 2>/dev/null | wc -l || echo 0)
    echo "Found $count_before console.log statements"
    
    if [ $count_before -gt 0 ]; then
        # Remove console.log statements
        find "$dir" -type f -name "$file_pattern" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/build/*" -exec sed -i.bak '/console\.log/d' {} \;
        
        # Remove backup files
        find "$dir" -name "*.bak" -type f -delete
        
        # Count after
        local count_after=$(grep -r "console\.log" "$dir" --include="$file_pattern" 2>/dev/null | wc -l || echo 0)
        echo -e "${GREEN}Removed $(($count_before - $count_after)) console.log statements${NC}"
    else
        echo "No console.log statements found"
    fi
}

# Remove from frontend TypeScript/JavaScript files
remove_console_logs "frontend" "*.ts"
remove_console_logs "frontend" "*.tsx"
remove_console_logs "frontend" "*.js"
remove_console_logs "frontend" "*.jsx"

# Remove from backend Python files (using print statements)
echo -e "\n${GREEN}Processing backend Python files...${NC}"
count_before=$(grep -r "print(" "docker-image/src" --include="*.py" 2>/dev/null | grep -v "# print" | wc -l || echo 0)
echo "Found $count_before print statements"

if [ $count_before -gt 0 ]; then
    # Remove standalone print statements (not in functions like print_help)
    find "docker-image/src" -type f -name "*.py" -not -path "*/venv/*" -exec sed -i.bak '/^\s*print(/d' {} \;
    
    # Remove backup files
    find "docker-image/src" -name "*.bak" -type f -delete
    
    count_after=$(grep -r "print(" "docker-image/src" --include="*.py" 2>/dev/null | grep -v "# print" | wc -l || echo 0)
    echo -e "${GREEN}Removed $(($count_before - $count_after)) print statements${NC}"
fi

echo -e "\n${GREEN}✅ Console log removal complete!${NC}"
echo -e "${YELLOW}Note: Some console statements may be legitimate (error handling, CLI output)${NC}"
echo -e "${YELLOW}Please review the changes before committing${NC}"