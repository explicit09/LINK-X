#!/bin/bash
# Script to remove sensitive files from git history
# WARNING: This will rewrite git history!

set -e

echo "🔒 Git History Security Cleanup Script"
echo "====================================="
echo "This script will remove all traces of sensitive files from git history."
echo "WARNING: This will rewrite git history!"
echo ""
echo "Files to be removed from history:"
echo "- docker-image/src/firebaseKey.json"
echo "- docker-image/config/firebaseKey.json"
echo "- docker-image/.env"
echo "- frontend/.env.local"
echo "- .env.example/.env.example"
echo "- Any file containing 'AKIA2GPPQYMDMOTFYSME' (AWS key)"
echo "- Any file containing 'sk-proj-' (OpenAI key)"
echo ""
echo "Type 'clean-history' to continue: "
read confirmation

if [ "$confirmation" != "clean-history" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

# Create a backup tag before cleaning
echo "Creating backup tag..."
git tag backup-before-cleanup-$(date +%Y%m%d-%H%M%S)

# Remove sensitive files from history
echo "Removing sensitive files from git history..."

# Using git filter-branch (older but more compatible method)
git filter-branch --force --index-filter \
'git rm -rf --cached --ignore-unmatch docker-image/src/firebaseKey.json \
docker-image/config/firebaseKey.json \
docker-image/.env \
frontend/.env.local \
.env.example/' \
--prune-empty --tag-name-filter cat -- --all

# Remove any file containing AWS keys or OpenAI keys
echo "Searching for and removing files containing exposed keys..."

# Create a list of files that contained the exposed keys
git log --all --full-history -- '**/*' | xargs -I {} git show {} 2>/dev/null | \
grep -l "AKIA2GPPQYMDMOTFYSME\|sk-proj-RS-T2XgEmDOMKvBci90pPI1zOqEQcL1YO9OvxzCxTBJB" | \
sort -u > files_with_secrets.txt || true

if [ -s files_with_secrets.txt ]; then
    echo "Found files containing secrets:"
    cat files_with_secrets.txt
    
    # Remove these files from history
    while IFS= read -r file; do
        echo "Removing $file from history..."
        git filter-branch --force --index-filter \
        "git rm -rf --cached --ignore-unmatch '$file'" \
        --prune-empty --tag-name-filter cat -- --all || true
    done < files_with_secrets.txt
fi

# Clean up refs
echo "Cleaning up references..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history has been cleaned!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Review the changes carefully"
echo "2. Force push to all remotes: git push --force --all"
echo "3. Force push tags: git push --force --tags"
echo "4. All team members must re-clone the repository"
echo ""
echo "🔐 SECURITY ACTIONS REQUIRED:"
echo "1. Rotate AWS Access Key: AKIA2GPPQYMDMOTFYSME"
echo "2. Rotate OpenAI API Key (starting with sk-proj-)"
echo "3. Rotate database passwords"
echo "4. Generate new Firebase service account"
echo "5. Generate new JWT secret"
echo ""
echo "Backup tag created: backup-before-cleanup-$(date +%Y%m%d-%H%M%S)"