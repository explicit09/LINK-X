#!/bin/bash

# Script to update all API URLs from localhost:8080 to localhost:8081

echo "Updating API URLs from localhost:8080 to localhost:8081..."

# Find all TypeScript/JavaScript files and update the URLs
find /Users/tadies/Documents/GitHub/LINK-X1/coralx-frontend -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' 's/localhost:8080/localhost:8081/g' {} \;

echo "Update complete!"
