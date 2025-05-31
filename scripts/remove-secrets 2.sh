#!/bin/bash
# Emergency script to remove exposed secrets from the repository

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}🚨 EMERGENCY: Removing exposed secrets from repository${NC}"
echo "=================================================="

# Files to remove
FILES_TO_REMOVE=(
    "docker-image/config/firebaseKey.json"
    "docker-image/src/firebaseKey.json"
    "frontend/.env.local"
    "docker-image/.env"
    ".env"
    ".env.local"
    ".env.production"
    ".env.development"
)

# Remove files
echo -e "\n${YELLOW}Removing sensitive files...${NC}"
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "Removing: $file"
        rm -f "$file"
        git rm -f "$file" 2>/dev/null || true
    fi
done

# Remove from Git history (requires git-filter-repo)
echo -e "\n${YELLOW}Cleaning Git history...${NC}"
echo "To completely remove these files from Git history, run:"
echo ""
echo "git filter-repo --path docker-image/config/firebaseKey.json --invert-paths"
echo "git filter-repo --path docker-image/src/firebaseKey.json --invert-paths"
echo "git filter-repo --path frontend/.env.local --invert-paths"
echo "git filter-repo --path docker-image/.env --invert-paths"
echo ""
echo -e "${RED}⚠️  WARNING: This will rewrite Git history!${NC}"
echo "After running these commands:"
echo "1. Force push to all remotes"
echo "2. All team members must re-clone the repository"
echo "3. Rotate ALL exposed credentials immediately"

# Create secure templates
echo -e "\n${YELLOW}Creating secure templates...${NC}"
if [ ! -f ".env.example" ]; then
    cp ".env.example.secure" ".env.example" 2>/dev/null || echo "Use .env.example.secure as template"
fi

# Verify .gitignore
echo -e "\n${YELLOW}Verifying .gitignore...${NC}"
if ! grep -q "firebaseKey.json" .gitignore; then
    echo -e "${RED}❌ .gitignore needs updating!${NC}"
else
    echo -e "${GREEN}✅ .gitignore is properly configured${NC}"
fi

echo -e "\n${RED}🔐 IMMEDIATE ACTIONS REQUIRED:${NC}"
echo "1. Rotate these credentials NOW:"
echo "   - Firebase service account"
echo "   - AWS access keys"
echo "   - OpenAI API key"
echo "   - Database passwords"
echo "   - All JWT secrets"
echo ""
echo "2. Check for any usage of the exposed keys in logs/monitoring"
echo "3. Enable MFA on all service accounts"
echo "4. Audit AWS CloudTrail for any unauthorized access"
echo "5. Review Firebase audit logs"
echo ""
echo -e "${YELLOW}Run this command to check for any remaining secrets:${NC}"
echo "git grep -E '(AIzaSy|AKIA|npg_|sk-proj-)' --no-index"

# Final check
echo -e "\n${YELLOW}Scanning for remaining secrets...${NC}"
if git grep -E "(AIzaSy|AKIA|npg_|sk-proj-)" --no-index 2>/dev/null; then
    echo -e "${RED}❌ SECRETS STILL FOUND IN REPOSITORY!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No obvious secrets found in tracked files${NC}"
fi