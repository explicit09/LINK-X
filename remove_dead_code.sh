#!/bin/bash

# Dead Code Removal Script
# This script removes identified dead code from the docker-image/src directory

echo "Dead Code Removal Script"
echo "========================"
echo ""
echo "This script will remove the following categories of files:"
echo "1. Test/example files outside of the tests directory"
echo "2. Empty or near-empty files"
echo "3. Old migration scripts with debug code"
echo ""
echo "WARNING: This will permanently delete files. Make sure you have a backup!"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Change to the repository root
cd "$(dirname "$0")"

echo ""
echo "Removing test/example files..."
rm -f docker-image/src/scripts/test_api_endpoint.py
rm -f docker-image/src/api/metrics/test_structure.py
rm -f docker-image/src/utils/simple_server.py
rm -f docker-image/src/utils/simple_tasks.py

echo "Removing empty/abandoned files..."
rm -f docker-image/src/check_endpoints.py

echo "Removing old migration scripts with debug code..."
# These are one-off migration scripts that have already been run
rm -f docker-image/src/db/migrations/add_description.py
rm -f docker-image/src/db/migrations/add_description_sqlalchemy.py
rm -f docker-image/src/db/migrations/add_module_description.py
rm -f docker-image/src/db/migrations/execute_migration.py
rm -f docker-image/src/db/migrations/fix_module_direct.py
rm -f docker-image/src/db/migrations/fix_module_schema.py
rm -f docker-image/src/migrations/add_description_column.py

echo "Removing scripts with debug output..."
rm -f docker-image/src/scripts/check_courses.py
rm -f docker-image/src/scripts/check_data.py

echo ""
echo "Dead code removal complete!"
echo ""
echo "Next steps:"
echo "1. Run 'git status' to see the removed files"
echo "2. Test the application to ensure nothing is broken"
echo "3. Commit the changes if everything works correctly"
echo ""
echo "To address remaining issues:"
echo "- Replace print() statements with proper logging"
echo "- Remove commented-out code blocks"
echo "- Address TODO comments or create issues to track them"