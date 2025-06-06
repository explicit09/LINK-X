#!/bin/bash

# CRITICAL: Remove sensitive files from git history
# WARNING: This will rewrite git history!

set -e

echo "🚨 CRITICAL SECURITY SCRIPT 🚨"
echo "This script will remove sensitive files from git history"
echo "WARNING: This will rewrite git history!"
echo ""
echo "Files to remove:"
echo "- docker-image/.env"
echo "- frontend/.env.local" 
echo "- docker-image/src/firebaseKey.json"
echo "- docker-image/config/firebaseKey.json"
echo "- Any AWS credentials"
echo ""
read -p "Are you ABSOLUTELY sure you want to continue? (yes/no) " -r
if [[ ! $REPLY == "yes" ]]; then
    echo "Aborted."
    exit 1
fi

# Backup current state
echo "Creating backup branch..."
git branch backup-before-secret-removal

# Files to remove from history
FILES_TO_REMOVE=(
    "docker-image/.env"
    "frontend/.env.local"
    "docker-image/src/firebaseKey.json"
    "docker-image/config/firebaseKey.json"
    ".env"
    ".env.production"
    ".env.development"
    "set_aws_env.sh"
)

echo "Removing sensitive files from history..."
for file in "${FILES_TO_REMOVE[@]}"; do
    echo "Removing $file..."
    git filter-branch --force --index-filter \
        "git rm --cached --ignore-unmatch $file" \
        --prune-empty --tag-name-filter cat -- --all || true
done

echo ""
echo "✅ Files removed from history"
echo ""
echo "NEXT STEPS:"
echo "1. Force push to remote: git push origin --force --all"
echo "2. Force push tags: git push origin --force --tags"
echo "3. Tell all team members to re-clone the repository"
echo "4. IMMEDIATELY rotate all exposed credentials:"
echo "   - Neon database password"
echo "   - Firebase service account"
echo "   - AWS access keys"
echo "   - OpenAI API key"
echo "   - Auth secrets"
echo ""
echo "5. Use environment variables or secret management going forward"