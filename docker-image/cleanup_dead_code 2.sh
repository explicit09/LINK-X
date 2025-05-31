#!/bin/bash

# Dead Code Cleanup Script for Docker Image
# This script removes identified dead code from the docker-image directory

echo "=== Dead Code Cleanup Script ==="
echo "This script will remove identified dead code files."
echo "Please review each file before confirming deletion."
echo ""

# Change to docker-image directory
cd "$(dirname "$0")"

# Files to remove (low risk - clearly unused)
LOW_RISK_FILES=(
    "src/check_endpoints.py"
    "src/utils/simple_server.py"
    "src/utils/simple_tasks.py"
    "src/api/metrics/test_structure.py"
)

# Files to review (medium risk - need verification)
MEDIUM_RISK_FILES=(
    "src/api/metrics.py"
    "src/services/file_service.py"
    "src/scripts/test_api_endpoint.py"
)

# Function to safely remove files
remove_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo "Found: $file"
        echo "Content preview:"
        head -n 20 "$file" | sed 's/^/  /'
        echo ""
        read -p "Remove this file? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm "$file"
            echo "✓ Removed: $file"
        else
            echo "✗ Skipped: $file"
        fi
    else
        echo "✗ Not found: $file"
    fi
    echo "---"
}

# Remove low risk files
echo "=== Removing Low Risk Files (Clearly Unused) ==="
for file in "${LOW_RISK_FILES[@]}"; do
    remove_file "$file"
done

echo ""
echo "=== Review Medium Risk Files (May Need Verification) ==="
for file in "${MEDIUM_RISK_FILES[@]}"; do
    remove_file "$file"
done

# Check for imports of removed files
echo ""
echo "=== Checking for imports of removed files ==="
for file in "${LOW_RISK_FILES[@]}" "${MEDIUM_RISK_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        # File was removed, check for imports
        filename=$(basename "$file" .py)
        dirname=$(dirname "$file")
        
        echo "Checking imports for: $file"
        # Search for various import patterns
        grep -r "from $dirname import $filename" src/ 2>/dev/null | grep -v "$file:" || true
        grep -r "from $dirname.$filename import" src/ 2>/dev/null | grep -v "$file:" || true
        grep -r "import $dirname.$filename" src/ 2>/dev/null | grep -v "$file:" || true
    fi
done

echo ""
echo "=== Cleanup Complete ==="
echo "Note: You may need to update imports if any were found above."
echo "Also consider:"
echo "1. Running tests to ensure nothing is broken"
echo "2. Updating requirements.txt to remove unused dependencies"
echo "3. Removing old migration scripts that have been executed"