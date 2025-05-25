#!/bin/bash

echo "🗃️  Database Content Reset Script"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-image/src/reset_db_content.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if force flag is provided
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    echo "⚠️  Force mode enabled - no confirmation prompts"
    echo ""
    cd docker-image/src
    python reset_db_content_force.py
else
    echo "Interactive mode - you will be prompted for confirmation"
    echo ""
    cd docker-image/src
    python reset_db_content.py
fi

echo ""
echo "Script completed." 